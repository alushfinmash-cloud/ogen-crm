import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — messages for a lead or contact
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')
  const contactId = searchParams.get('contact_id')

  let query = supabaseAdmin
    .from('whatsapp_messages')
    .select('*')
    .order('sent_at', { ascending: true })

  if (leadId) query = query.eq('lead_id', leadId)
  else if (contactId) query = query.eq('contact_id', contactId)
  else return NextResponse.json({ error: 'חסר lead_id או contact_id' }, { status: 400 })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — send message
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { lead_id, contact_id, content, phone } = body

  if (!content?.trim()) return NextResponse.json({ error: 'תוכן חובה' }, { status: 400 })

  // Get WhatsApp integration config
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('config, is_active')
    .eq('type', 'whatsapp')
    .single()

  if (!integration?.is_active) {
    return NextResponse.json({ error: 'WhatsApp לא מחובר' }, { status: 400 })
  }

  const config = integration.config as { phone_number_id?: string; access_token?: string }

  // Try sending via Meta API
  let status = 'sent'
  if (config.phone_number_id && config.access_token && phone) {
    try {
      const waPhone = phone.replace(/\D/g, '').replace(/^0/, '972')
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: waPhone,
            type: 'text',
            text: { body: content },
          }),
        }
      )
      if (!res.ok) status = 'failed'
    } catch {
      status = 'failed'
    }
  }

  // Save message
  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      lead_id: lead_id || null,
      contact_id: contact_id || null,
      direction: 'out',
      content: content.trim(),
      status,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
