import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — Facebook webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('config')
    .eq('type', 'facebook')
    .single()

  const verifyToken = (integration?.config as Record<string, string>)?.webhook_verify_token || 'ogen-crm-fb-verify'

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — incoming Facebook Messenger messages
export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }

    const entries = body.entry || []

    for (const entry of entries) {
      const messaging = entry.messaging || []

      for (const event of messaging) {
        // Skip non-message events (delivery, read receipts, etc.)
        if (!event.message) continue

        const senderId = event.sender?.id
        if (!senderId) continue

        const pageId = event.recipient?.id
        const timestamp = event.timestamp

        // Get sender profile from Facebook
        let senderName = senderId
        try {
          const { data: integration } = await supabaseAdmin
            .from('integrations')
            .select('config')
            .eq('type', 'facebook')
            .single()

          const accessToken = (integration?.config as Record<string, string>)?.page_access_token
          if (accessToken) {
            const profileRes = await fetch(
              `https://graph.facebook.com/v18.0/${senderId}?fields=first_name,last_name&access_token=${accessToken}`
            )
            if (profileRes.ok) {
              const profile = await profileRes.json()
              senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || senderId
            }
          }
        } catch {
          // Use sender ID as fallback name
        }

        // Find or create conversation
        let conversation = null
        const { data: existing } = await supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('contact_phone', senderId) // Using contact_phone to store FB sender ID
          .eq('channel', 'facebook')
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
              channel: 'facebook',
              contact_name: senderName,
              contact_phone: senderId, // Store FB user ID
              status: 'open',
            })
            .select()
            .single()
          conversation = newConv
        }

        if (!conversation) continue

        // Extract message content
        let content = ''
        let mediaUrl: string | null = null
        let mediaType: string | null = null

        if (event.message.text) {
          content = event.message.text
        } else if (event.message.attachments) {
          const attachment = event.message.attachments[0]
          if (attachment.type === 'image') {
            content = '📷 תמונה'
            mediaUrl = attachment.payload?.url || null
            mediaType = 'image'
          } else if (attachment.type === 'video') {
            content = '🎬 סרטון'
            mediaUrl = attachment.payload?.url || null
            mediaType = 'video'
          } else if (attachment.type === 'audio') {
            content = '🎵 הודעה קולית'
            mediaUrl = attachment.payload?.url || null
            mediaType = 'audio'
          } else if (attachment.type === 'file') {
            content = '📎 קובץ'
            mediaUrl = attachment.payload?.url || null
            mediaType = 'document'
          } else if (attachment.type === 'location') {
            content = '📍 מיקום'
          } else {
            content = `[${attachment.type}]`
          }
        } else if (event.message.sticker_id) {
          content = '🏷️ סטיקר'
        }

        // Save message
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversation.id,
          direction: 'in',
          channel: 'facebook',
          content,
          media_url: mediaUrl,
          media_type: mediaType,
          sender_name: senderName,
          external_id: event.message.mid,
          status: 'delivered',
        })

        // Update conversation
        await supabaseAdmin
          .from('conversations')
          .update({
            last_message: content.substring(0, 200),
            last_message_at: new Date(timestamp).toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
            contact_name: senderName,
            status: 'open',
          })
          .eq('id', conversation.id)
      }
    }
  } catch (err) {
    console.error('Facebook webhook error:', err)
  }

  return NextResponse.json({ status: 'ok' })
}
