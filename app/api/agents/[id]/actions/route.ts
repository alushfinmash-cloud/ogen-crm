import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — add action
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .insert({ ...body, agent_id: params.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — toggle action
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  const { data, error } = await supabaseAdmin
    .from('agent_actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — remove action
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const actionId = searchParams.get('action_id')
  if (!actionId) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  await supabaseAdmin.from('agent_actions').delete().eq('id', actionId)
  return NextResponse.json({ success: true })
}
