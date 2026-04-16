import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — all rules
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('scoring_rules')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create rule
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, trigger_type, trigger_config, points } = body

  if (!name?.trim() || !trigger_type || points === undefined) {
    return NextResponse.json({ error: 'שם, טריגר וניקוד חובה' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('scoring_rules')
    .insert({
      name: name.trim(),
      trigger_type,
      trigger_config: trigger_config || {},
      points: Number(points),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — update rule (toggle active, edit)
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('scoring_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  await supabaseAdmin.from('scoring_rules').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
