import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — add knowledge item
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { type, ...item } = body
  const agentId = params.id

  let table = ''
  if (type === 'text') table = 'agent_knowledge_text'
  else if (type === 'faq') table = 'agent_knowledge_faq'
  else if (type === 'link') table = 'agent_knowledge_links'
  else return NextResponse.json({ error: 'סוג לא תקין' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert({ ...item, agent_id: agentId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — remove knowledge item
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const itemId = searchParams.get('item_id')

  if (!type || !itemId) return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })

  let table = ''
  if (type === 'text') table = 'agent_knowledge_text'
  else if (type === 'faq') table = 'agent_knowledge_faq'
  else if (type === 'link') table = 'agent_knowledge_links'
  else return NextResponse.json({ error: 'סוג לא תקין' }, { status: 400 })

  await supabaseAdmin.from(table).delete().eq('id', itemId)
  return NextResponse.json({ success: true })
}
