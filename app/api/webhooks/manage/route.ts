import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list all webhooks
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .select('*, pipelines(name, color), pipeline_columns(name, color)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — create a new webhook
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, pipeline_id, column_id } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'שם ה-webhook חובה' }, { status: 400 })
  }
  if (!pipeline_id) {
    return NextResponse.json({ error: 'יש לבחור פייפליין' }, { status: 400 })
  }
  if (!column_id) {
    return NextResponse.json({ error: 'יש לבחור עמודה יעד' }, { status: 400 })
  }

  // Generate slug
  const slug = name.trim().toLowerCase()
    .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 8)

  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .insert({ name: name.trim(), slug, pipeline_id, column_id })
    .select('*, pipelines(name, color), pipeline_columns(name, color)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH — toggle active / update webhook
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'חסר ID' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('webhooks')
    .update(updates)
    .eq('id', id)
    .select('*, pipelines(name, color), pipeline_columns(name, color)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE — remove a webhook
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'חסר ID' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('webhooks').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
