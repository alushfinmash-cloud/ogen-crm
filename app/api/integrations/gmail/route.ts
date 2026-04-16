import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — send email (saves to emails_sent)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { lead_id, contact_id, to, subject, body: emailBody } = body

  if (!to || !subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json({ error: 'נמען, נושא וגוף המייל חובה' }, { status: 400 })
  }

  // Check Gmail integration
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('config, is_active')
    .eq('type', 'gmail')
    .single()

  if (!integration?.is_active) {
    return NextResponse.json({ error: 'Gmail לא מחובר' }, { status: 400 })
  }

  // Save email record
  const { data, error } = await supabaseAdmin
    .from('emails_sent')
    .insert({
      lead_id: lead_id || null,
      contact_id: contact_id || null,
      subject: subject.trim(),
      body: emailBody.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET — email history for a lead/contact
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')
  const contactId = searchParams.get('contact_id')

  let query = supabaseAdmin
    .from('emails_sent')
    .select('*')
    .order('sent_at', { ascending: false })

  if (leadId) query = query.eq('lead_id', leadId)
  else if (contactId) query = query.eq('contact_id', contactId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
