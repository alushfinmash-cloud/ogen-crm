import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — single agent with all related data
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const [agent, texts, faqs, links, actions, conversations] = await Promise.all([
    supabaseAdmin.from('agents').select('*').eq('id', id).single(),
    supabaseAdmin.from('agent_knowledge_text').select('*').eq('agent_id', id).order('created_at'),
    supabaseAdmin.from('agent_knowledge_faq').select('*').eq('agent_id', id).order('created_at'),
    supabaseAdmin.from('agent_knowledge_links').select('*').eq('agent_id', id).order('created_at'),
    supabaseAdmin.from('agent_actions').select('*').eq('agent_id', id).order('created_at'),
    supabaseAdmin.from('agent_conversations').select('*, leads(name, phone)').eq('agent_id', id).order('started_at', { ascending: false }).limit(50),
  ])

  if (agent.error) return NextResponse.json({ error: agent.error.message }, { status: 500 })

  return NextResponse.json({
    ...agent.data,
    knowledge_texts: texts.data || [],
    knowledge_faqs: faqs.data || [],
    knowledge_links: links.data || [],
    actions: actions.data || [],
    conversations: conversations.data || [],
  })
}

// PUT — update agent
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { id } = params

  body.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('agents')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — delete agent and all related data (cascade)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const { error } = await supabaseAdmin.from('agents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
