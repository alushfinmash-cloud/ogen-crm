import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — incoming Gmail notification (Google Pub/Sub push)
// Gmail uses Pub/Sub to send push notifications when new emails arrive
export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    // Google Pub/Sub sends base64-encoded data
    const messageData = body.message?.data
    if (!messageData) {
      return NextResponse.json({ status: 'no data' })
    }

    const decoded = JSON.parse(Buffer.from(messageData, 'base64').toString())
    const emailAddress = decoded.emailAddress
    const historyId = decoded.historyId

    if (!emailAddress) {
      return NextResponse.json({ status: 'no email' })
    }

    // Get Gmail integration config
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('config, is_active')
      .eq('type', 'gmail')
      .single()

    if (!integration?.is_active) {
      return NextResponse.json({ status: 'integration inactive' })
    }

    const config = integration.config as Record<string, string>
    const accessToken = config.access_token
    const refreshToken = config.refresh_token

    if (!accessToken) {
      return NextResponse.json({ status: 'no access token' })
    }

    // Fetch new messages from Gmail API using history
    let token = accessToken
    const lastHistoryId = config.last_history_id || historyId

    // Try to get history changes
    let historyRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastHistoryId}&historyTypes=messageAdded`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    // If 401, try refresh token
    if (historyRes.status === 401 && refreshToken) {
      const clientId = config.client_id
      const clientSecret = config.client_secret

      if (clientId && clientSecret) {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        })

        if (refreshRes.ok) {
          const tokens = await refreshRes.json()
          token = tokens.access_token

          // Save new access token
          await supabaseAdmin
            .from('integrations')
            .update({ config: { ...config, access_token: token } })
            .eq('type', 'gmail')

          // Retry history request
          historyRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastHistoryId}&historyTypes=messageAdded`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        }
      }
    }

    if (!historyRes.ok) {
      return NextResponse.json({ status: 'history fetch failed' })
    }

    const historyData = await historyRes.json()
    const histories = historyData.history || []

    // Process new messages
    for (const hist of histories) {
      const addedMessages = hist.messagesAdded || []

      for (const added of addedMessages) {
        const msgId = added.message?.id
        if (!msgId) continue

        // Skip if already processed
        const { data: existingMsg } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('external_id', msgId)
          .single()

        if (existingMsg) continue

        // Fetch full message
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (!msgRes.ok) continue
        const gmailMsg = await msgRes.json()

        // Check if INBOX label (skip sent, trash, etc.)
        const labels = gmailMsg.labelIds || []
        if (!labels.includes('INBOX')) continue

        // Parse headers
        const headers = gmailMsg.payload?.headers || []
        const fromHeader = headers.find((h: { name: string }) => h.name.toLowerCase() === 'from')?.value || ''
        const subjectHeader = headers.find((h: { name: string }) => h.name.toLowerCase() === 'subject')?.value || '(ללא נושא)'

        // Parse from: "Name <email@example.com>"
        const fromMatch = fromHeader.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/)
        const senderName = fromMatch?.[1]?.trim() || fromHeader
        const senderEmail = fromMatch?.[2]?.trim() || fromHeader

        // Extract body text
        let bodyText = ''
        const extractText = (part: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }): string => {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64url').toString()
          }
          if (part.parts) {
            for (const sub of part.parts) {
              const text = extractText(sub as typeof part)
              if (text) return text
            }
          }
          return ''
        }
        bodyText = extractText(gmailMsg.payload || {})

        // Limit content length
        const content = bodyText.trim()
          ? `📧 ${subjectHeader}\n\n${bodyText.substring(0, 1000)}`
          : `📧 ${subjectHeader}`

        // Find or create conversation
        let conversation = null
        const { data: existing } = await supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('contact_email', senderEmail)
          .eq('channel', 'gmail')
          .neq('status', 'archived')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (existing) {
          conversation = existing
        } else {
          const { data: newConv } = await supabaseAdmin
            .from('conversations')
            .insert({
              channel: 'gmail',
              contact_name: senderName,
              contact_email: senderEmail,
              status: 'open',
            })
            .select()
            .single()
          conversation = newConv

          // Try to link to existing contact
          if (newConv) {
            const { data: contact } = await supabaseAdmin
              .from('contacts')
              .select('id')
              .eq('email', senderEmail)
              .single()

            if (contact) {
              await supabaseAdmin
                .from('conversations')
                .update({ contact_id: contact.id })
                .eq('id', newConv.id)
            }
          }
        }

        if (!conversation) continue

        // Save message
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversation.id,
          direction: 'in',
          channel: 'gmail',
          content,
          sender_name: senderName,
          external_id: msgId,
          status: 'delivered',
        })

        // Update conversation
        await supabaseAdmin
          .from('conversations')
          .update({
            last_message: `📧 ${subjectHeader}`.substring(0, 200),
            last_message_at: new Date().toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
            contact_name: senderName,
            status: 'open',
          })
          .eq('id', conversation.id)
      }
    }

    // Save latest history ID
    if (historyData.historyId) {
      await supabaseAdmin
        .from('integrations')
        .update({ config: { ...config, last_history_id: historyData.historyId } })
        .eq('type', 'gmail')
    }
  } catch (err) {
    console.error('Gmail webhook error:', err)
  }

  return NextResponse.json({ status: 'ok' })
}
