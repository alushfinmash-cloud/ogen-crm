import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list all integrations
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('integrations')
    .select('*')
    .order('type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create or update integration
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { type, config, is_active } = body

  if (!type) return NextResponse.json({ error: 'חסר סוג אינטגרציה' }, { status: 400 })

  // Upsert
  const { data: existing } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('type', type)
    .limit(1)

  if (existing && existing.length > 0) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (config !== undefined) updates.config = config
    if (is_active !== undefined) {
      updates.is_active = is_active
      if (is_active) updates.connected_at = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('integrations')
      .update(updates)
      .eq('id', existing[0].id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('integrations')
    .insert({
      type,
      config: config || {},
      is_active: is_active || false,
      connected_at: is_active ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — disconnect integration
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  if (!type) return NextResponse.json({ error: 'חסר סוג' }, { status: 400 })

  await supabaseAdmin
    .from('integrations')
    .update({ is_active: false, config: {}, connected_at: null, updated_at: new Date().toISOString() })
    .eq('type', type)

  return NextResponse.json({ success: true })
}
