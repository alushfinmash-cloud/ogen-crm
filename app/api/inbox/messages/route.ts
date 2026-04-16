import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — messages for a conversation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')

  if (!conversationId) {
    return NextResponse.json({ error: 'חסר conversation_id' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark conversation as read
  await supabaseAdmin
    .from('conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId)

  return NextResponse.json(data)
}

// POST — send a message
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { conversation_id, content, channel, media_url, media_type } = body

  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'conversation_id ותוכן חובה' }, { status: 400 })
  }

  // Get conversation details
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('id', conversation_id)
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'שיחה לא נמצאה' }, { status: 404 })
  }

  const msgChannel = channel || conv.channel || 'whatsapp'
  let externalId: string | null = null
  let status = 'sent'

  // Try to send via WhatsApp if channel is whatsapp
  if (msgChannel === 'whatsapp' && conv.contact_phone) {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('config, is_active')
        .eq('type', 'whatsapp')
        .single()

      if (integration?.is_active) {
        const config = integration.config as Record<string, string>
        const phoneNumberId = config.phone_number_id
        const accessToken = config.access_token

        if (phoneNumberId && accessToken) {
          const cleanPhone = conv.contact_phone.replace(/\D/g, '')
          const fullPhone = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone.replace(/^0/, '')}`

          const waRes = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: fullPhone,
                type: 'text',
                text: { body: content },
              }),
            }
          )

          if (waRes.ok) {
            const waData = await waRes.json()
            externalId = waData.messages?.[0]?.id || null
            status = 'delivered'
          } else {
            status = 'failed'
          }
        }
      }
    } catch {
      status = 'failed'
    }
  }

  // Try to send via Facebook Messenger
  if (msgChannel === 'facebook' && conv.contact_phone) {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('config, is_active')
        .eq('type', 'facebook')
        .single()

      if (integration?.is_active) {
        const config = integration.config as Record<string, string>
        const pageAccessToken = config.page_access_token

        if (pageAccessToken) {
          const fbRes = await fetch(
            `https://graph.facebook.com/v18.0/me/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${pageAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recipient: { id: conv.contact_phone },
                message: { text: content },
              }),
            }
          )

          if (fbRes.ok) {
            const fbData = await fbRes.json()
            externalId = fbData.message_id || null
            status = 'delivered'
          } else {
            status = 'failed'
          }
        }
      }
    } catch {
      status = 'failed'
    }
  }

  // Try to send via Gmail
  if (msgChannel === 'gmail' && conv.contact_email) {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('config, is_active')
        .eq('type', 'gmail')
        .single()

      if (integration?.is_active) {
        const config = integration.config as Record<string, string>
        const accessToken = config.access_token
        const senderEmail = config.email || 'noreply@ogen.co.il'

        if (accessToken) {
          // Build raw email
          const emailLines = [
            `To: ${conv.contact_email}`,
            `From: ${senderEmail}`,
            `Subject: Re: שיחה עם ${conv.contact_name}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            content,
          ]
          const rawEmail = Buffer.from(emailLines.join('\r\n')).toString('base64url')

          const gmailRes = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ raw: rawEmail }),
            }
          )

          if (gmailRes.ok) {
            const gmailData = await gmailRes.json()
            externalId = gmailData.id || null
            status = 'delivered'
          } else {
            status = 'failed'
          }
        }
      }
    } catch {
      status = 'failed'
    }
  }

  // Try to send via Instagram DM
  if (msgChannel === 'instagram' && conv.contact_phone) {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('config, is_active')
        .eq('type', 'instagram')
        .single()

      if (integration?.is_active) {
        const config = integration.config as Record<string, string>
        const accessToken = config.access_token

        if (accessToken) {
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/me/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recipient: { id: conv.contact_phone },
                message: { text: content },
              }),
            }
          )

          if (igRes.ok) {
            const igData = await igRes.json()
            externalId = igData.message_id || null
            status = 'delivered'
          } else {
            status = 'failed'
          }
        }
      }
    } catch {
      status = 'failed'
    }
  }

  // Try to send via SMS (Twilio)
  if (msgChannel === 'sms' && conv.contact_phone) {
    try {
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('config, is_active')
        .eq('type', 'sms')
        .single()

      if (integration?.is_active) {
        const config = integration.config as Record<string, string>
        const accountSid = config.account_sid
        const authToken = config.auth_token
        const fromNumber = config.from_number

        if (accountSid && authToken && fromNumber) {
          const cleanPhone = conv.contact_phone.replace(/\D/g, '')
          const toNumber = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`

          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: toNumber,
                From: fromNumber,
                Body: content,
              }),
            }
          )

          if (twilioRes.ok) {
            const twilioData = await twilioRes.json()
            externalId = twilioData.sid || null
            status = 'delivered'
          } else {
            status = 'failed'
          }
        }
      }
    } catch {
      status = 'failed'
    }
  }

  // Save message
  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id,
      direction: 'out',
      channel: msgChannel,
      content: content.trim(),
      media_url: media_url || null,
      media_type: media_type || null,
      status,
      sender_name: 'מנהל המערכת',
      external_id: externalId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update conversation
  await supabaseAdmin
    .from('conversations')
    .update({
      last_message: content.trim().substring(0, 200),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversation_id)

  return NextResponse.json(message, { status: 201 })
}
