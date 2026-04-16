import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — incoming SMS via Twilio webhook
// Set this URL as your Twilio webhook: https://yourdomain.com/api/inbox/webhook/sms
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString() || ''
    const messageSid = formData.get('MessageSid')?.toString() || ''
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0')

    if (!from) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Normalize phone number
    const cleanPhone = from.replace(/\D/g, '')

    // Find or create conversation
    let conversation = null
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('contact_phone', cleanPhone)
      .eq('channel', 'sms')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      conversation = existing
    } else {
      // Try to find contact name from contacts table
      let contactName = from
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('first_name, last_name, id')
        .or(`phone.eq.${cleanPhone},phone.eq.${from}`)
        .single()

      if (contact) {
        contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || from
      }

      const { data: newConv } = await supabaseAdmin
        .from('conversations')
        .insert({
          channel: 'sms',
          contact_name: contactName,
          contact_phone: cleanPhone,
          contact_id: contact?.id || null,
          status: 'open',
        })
        .select()
        .single()
      conversation = newConv

      // Try to link to lead
      if (newConv && contact?.id) {
        const { data: lead } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lead) {
          await supabaseAdmin
            .from('conversations')
            .update({ lead_id: lead.id })
            .eq('id', newConv.id)
        }
      }
    }

    if (!conversation) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Handle media attachments
    let content = body
    let mediaUrl: string | null = null
    let mediaType: string | null = null

    if (numMedia > 0) {
      const mediaContentType = formData.get('MediaContentType0')?.toString() || ''
      mediaUrl = formData.get('MediaUrl0')?.toString() || null

      if (mediaContentType.startsWith('image/')) {
        mediaType = 'image'
        if (!content) content = '📷 תמונה'
      } else if (mediaContentType.startsWith('video/')) {
        mediaType = 'video'
        if (!content) content = '🎬 סרטון'
      } else if (mediaContentType.startsWith('audio/')) {
        mediaType = 'audio'
        if (!content) content = '🎵 אודיו'
      } else {
        mediaType = 'document'
        if (!content) content = '📎 קובץ'
      }
    }

    if (!content) content = '(הודעה ריקה)'

    // Save message
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversation.id,
      direction: 'in',
      channel: 'sms',
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      sender_name: conversation.contact_name,
      external_id: messageSid,
      status: 'delivered',
    })

    // Update conversation
    await supabaseAdmin
      .from('conversations')
      .update({
        last_message: content.substring(0, 200),
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
        status: 'open',
      })
      .eq('id', conversation.id)

    // Return TwiML empty response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (err) {
    console.error('SMS webhook error:', err)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
