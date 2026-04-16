import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { executeWorkflows } from '@/lib/workflow-engine'


export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  // 1. Find webhook config
  const { data: webhook, error: whErr } = await supabaseAdmin
    .from('webhooks')
    .select('*, pipeline_columns(name)')
    .eq('slug', slug)
    .single()

  if (whErr || !webhook) {
    return NextResponse.json(
      { error: 'Webhook לא נמצא', code: 'WEBHOOK_NOT_FOUND' },
      { status: 404 }
    )
  }

  if (!webhook.is_active) {
    return NextResponse.json(
      { error: 'Webhook מושבת כרגע', code: 'WEBHOOK_DISABLED' },
      { status: 403 }
    )
  }

  // 2. Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    await logWebhook(webhook.id, null, {}, 'error', 'גוף הבקשה אינו JSON תקין', ip)
    return NextResponse.json(
      { error: 'גוף הבקשה אינו JSON תקין', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  // 3. Validate required fields
  const name = String(body.name || '').trim()
  if (!name) {
    await logWebhook(webhook.id, null, body, 'error', 'שדה name חובה', ip)
    return NextResponse.json(
      { error: 'שדה name חובה', code: 'MISSING_NAME', required: ['name'] },
      { status: 400 }
    )
  }

  // 4. Build lead record
  const leadData = {
    name,
    phone: String(body.phone || '').trim() || null,
    email: String(body.email || '').trim() || null,
    source: String(body.source || 'Webhook').trim(),
    status: 'חדש',
    notes: body.notes ? String(body.notes).trim() : null,
    value: body.value ? Number(body.value) : null,
    column_id: (body.stage_id as string) || webhook.column_id,
    position: 0,
  }

  // If pipeline_id is provided, validate the column belongs to that pipeline
  if (body.pipeline_id) {
    const { data: col } = await supabaseAdmin
      .from('pipeline_columns')
      .select('id')
      .eq('id', leadData.column_id)
      .eq('pipeline_id', body.pipeline_id)
      .single()

    if (!col) {
      await logWebhook(webhook.id, null, body, 'error', 'העמודה לא שייכת לפייפליין שצוין', ip)
      return NextResponse.json(
        { error: 'העמודה לא שייכת לפייפליין שצוין', code: 'COLUMN_PIPELINE_MISMATCH' },
        { status: 400 }
      )
    }
  }

  // 5. Create lead
  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .insert(leadData)
    .select()
    .single()

  if (leadErr || !lead) {
    await logWebhook(webhook.id, null, body, 'error', leadErr?.message || 'שגיאה ביצירת ליד', ip)
    return NextResponse.json(
      { error: 'שגיאה ביצירת ליד', code: 'CREATE_FAILED', details: leadErr?.message },
      { status: 500 }
    )
  }

  // 6. Add to lead history
  await supabaseAdmin.from('lead_history').insert({
    lead_id: lead.id,
    action: 'create',
    description: `ליד נוצר דרך Webhook: ${webhook.name}`,
    user_name: 'Webhook',
  })

  // 7. Auto-create contact if phone exists and contact doesn't
  if (lead.phone) {
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('phone', lead.phone)
      .limit(1)

    if (!existingContact || existingContact.length === 0) {
      const nameParts = lead.name.trim().split(/\s+/)
      await supabaseAdmin.from('contacts').insert({
        first_name: nameParts[0] || lead.name,
        last_name: nameParts.slice(1).join(' ') || null,
        phone: lead.phone,
        email: lead.email || null,
        source: 'webhook',
      })
    }
  }

  // 8. Trigger workflows
  executeWorkflows('webhook_lead', lead, {
    webhook_id: webhook.id,
    pipeline_id: webhook.pipeline_id,
    column_id: webhook.column_id,
  }).catch(() => {}) // fire-and-forget

  // 9. Log success
  await logWebhook(webhook.id, lead.id, body, 'success', null, ip)

  return NextResponse.json({
    success: true,
    lead_id: lead.id,
    name: lead.name,
    column: webhook.pipeline_columns?.name || webhook.column_id,
    message: 'ליד נוצר בהצלחה',
  }, { status: 201 })
}

async function logWebhook(
  webhookId: string,
  leadId: string | null,
  payload: unknown,
  status: 'success' | 'error',
  errorMessage: string | null,
  ipAddress: string
) {
  await supabaseAdmin.from('webhook_logs').insert({
    webhook_id: webhookId,
    lead_id: leadId,
    payload,
    status,
    error_message: errorMessage,
    ip_address: ipAddress,
  })
}

// GET — return webhook info (useful for testing)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { data: webhook } = await supabaseAdmin
    .from('webhooks')
    .select('id, name, is_active, created_at')
    .eq('slug', params.slug)
    .single()

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook לא נמצא' }, { status: 404 })
  }

  return NextResponse.json({
    name: webhook.name,
    active: webhook.is_active,
    method: 'POST',
    required_fields: ['name'],
    optional_fields: ['phone', 'email', 'source', 'notes', 'value', 'pipeline_id', 'stage_id'],
    example: {
      name: 'ישראל ישראלי',
      phone: '050-0000000',
      email: 'israel@example.com',
      source: 'Landing Page',
    },
  })
}
