import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list all agents
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create agent
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, role, model, avatar } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'שם הסוכן חובה' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert({
      name: name.trim(),
      role: role || 'שירות לקוחות',
      model: model || 'claude-sonnet',
      avatar: avatar || '🤖',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
