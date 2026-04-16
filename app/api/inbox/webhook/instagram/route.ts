import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — Instagram webhook verification (same as Facebook)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('config')
    .eq('type', 'instagram')
    .single()

  const verifyToken = (integration?.config as Record<string, string>)?.webhook_verify_token || 'ogen-crm-ig-verify'

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — incoming Instagram DM messages
export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    if (body.object !== 'instagram') {
      return NextResponse.json({ status: 'ignored' })
    }

    const entries = body.entry || []

    for (const entry of entries) {
      const messaging = entry.messaging || []

      for (const event of messaging) {
        if (!event.message) continue

        const senderId = event.sender?.id
        if (!senderId) continue

        // Get sender profile
        let senderName = senderId
        try {
          const { data: integration } = await supabaseAdmin
            .from('integrations')
            .select('config')
            .eq('type', 'instagram')
            .single()

          const accessToken = (integration?.config as Record<string, string>)?.access_token
          if (accessToken) {
            const profileRes = await fetch(
              `https://graph.facebook.com/v18.0/${senderId}?fields=name,username&access_token=${accessToken}`
            )
            if (profileRes.ok) {
              const profile = await profileRes.json()
              senderName = profile.name || profile.username || senderId
            }
          }
        } catch { /* fallback to ID */ }

        // Find or create conversation
        let conversation = null
        const { data: existing } = await supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('contact_phone', senderId)
          .eq('channel', 'instagram')
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
              channel: 'instagram',
              contact_name: senderName,
              contact_phone: senderId,
              status: 'open',
            })
            .select()
            .single()
          conversation = newConv
        }

        if (!conversation) continue

        // Extract content
        let content = ''
        let mediaUrl: string | null = null
        let mediaType: string | null = null

        if (event.message.text) {
          content = event.message.text
        } else if (event.message.attachments) {
          const att = event.message.attachments[0]
          if (att.type === 'image') {
            content = '📷 תמונה'
            mediaUrl = att.payload?.url || null
            mediaType = 'image'
          } else if (att.type === 'video') {
            content = '🎬 סרטון'
            mediaUrl = att.payload?.url || null
            mediaType = 'video'
          } else if (att.type === 'audio') {
            content = '🎵 הודעה קולית'
            mediaUrl = att.payload?.url || null
            mediaType = 'audio'
          } else if (att.type === 'share') {
            content = '🔗 שיתוף'
            mediaUrl = att.payload?.url || null
          } else if (att.type === 'story_mention') {
            content = '📖 אזכור בסטורי'
          } else {
            content = `[${att.type}]`
          }
        }

        // Save message
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversation.id,
          direction: 'in',
          channel: 'instagram',
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
            last_message_at: new Date().toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
            contact_name: senderName,
            status: 'open',
          })
          .eq('id', conversation.id)
      }
    }
  } catch (err) {
    console.error('Instagram webhook error:', err)
  }

  return NextResponse.json({ status: 'ok' })
}
