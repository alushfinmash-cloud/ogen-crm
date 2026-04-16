import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — WhatsApp webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Get verify token from integration config
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('config')
    .eq('type', 'whatsapp')
    .single()

  const verifyToken = (integration?.config as Record<string, string>)?.webhook_verify_token || process.env.META_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — incoming WhatsApp messages
export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    // Meta webhook format
    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []

      for (const change of changes) {
        if (change.field !== 'messages') continue
        const value = change.value

        // Process incoming messages
        const incomingMessages = value.messages || []
        const contacts = value.contacts || []

        for (const msg of incomingMessages) {
          const from = msg.from // phone number
          const contactInfo = contacts.find((c: { wa_id: string }) => c.wa_id === from)
          const contactName = contactInfo?.profile?.name || from

          // Find or create conversation
          let conversation = null
          const { data: existing } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('contact_phone', from)
            .eq('channel', 'whatsapp')
            .neq('status', 'archived')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (existing) {
            conversation = existing
          } else {
            // Create new conversation
            const { data: newConv } = await supabaseAdmin
              .from('conversations')
              .insert({
                channel: 'whatsapp',
                contact_name: contactName,
                contact_phone: from,
                status: 'open',
              })
              .select()
              .single()

            conversation = newConv

            // Try to link to existing contact/lead
            if (newConv) {
              const { data: contact } = await supabaseAdmin
                .from('contacts')
                .select('id')
                .eq('phone', from)
                .single()

              if (contact) {
                await supabaseAdmin
                  .from('conversations')
                  .update({ contact_id: contact.id })
                  .eq('id', newConv.id)
              }

              const { data: lead } = await supabaseAdmin
                .from('leads')
                .select('id')
                .eq('phone', from)
                .single()

              if (lead) {
                await supabaseAdmin
                  .from('conversations')
                  .update({ lead_id: lead.id })
                  .eq('id', newConv.id)
              }
            }
          }

          if (!conversation) continue

          // Extract message content
          let content = ''
          let mediaUrl: string | null = null
          let mediaType: string | null = null

          if (msg.type === 'text') {
            content = msg.text?.body || ''
          } else if (msg.type === 'image') {
            content = msg.image?.caption || '📷 תמונה'
            mediaType = 'image'
          } else if (msg.type === 'video') {
            content = '🎬 סרטון'
            mediaType = 'video'
          } else if (msg.type === 'audio') {
            content = '🎵 הודעה קולית'
            mediaType = 'audio'
          } else if (msg.type === 'document') {
            content = msg.document?.filename || '📎 מסמך'
            mediaType = 'document'
          } else if (msg.type === 'location') {
            content = '📍 מיקום'
          } else if (msg.type === 'sticker') {
            content = '🏷️ סטיקר'
          } else {
            content = `[${msg.type}]`
          }

          // Save message
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversation.id,
            direction: 'in',
            channel: 'whatsapp',
            content,
            media_url: mediaUrl,
            media_type: mediaType,
            sender_name: contactName,
            external_id: msg.id,
            status: 'delivered',
          })

          // Update conversation
          await supabaseAdmin
            .from('conversations')
            .update({
              last_message: content.substring(0, 200),
              last_message_at: new Date().toISOString(),
              unread_count: (conversation.unread_count || 0) + 1,
              contact_name: contactName,
              status: 'open',
            })
            .eq('id', conversation.id)

          // Apply lead scoring if applicable
          if (conversation.lead_id) {
            try {
              await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'http://localhost:3000' : ''}/api/scoring`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lead_id: conversation.lead_id,
                  trigger_type: 'whatsapp_replied',
                }),
              })
            } catch {
              // silent
            }
          }
        }

        // Process status updates
        const statuses = value.statuses || []
        for (const statusUpdate of statuses) {
          if (statusUpdate.id) {
            await supabaseAdmin
              .from('messages')
              .update({ status: statusUpdate.status })
              .eq('external_id', statusUpdate.id)
          }
        }
      }
    }
  } catch (err) {
    console.error('Webhook error:', err)
  }

  return NextResponse.json({ status: 'ok' })
}
