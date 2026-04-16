import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — tags for a conversation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')

  if (!conversationId) {
    return NextResponse.json({ error: 'חסר conversation_id' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('conversation_tags')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — add tag
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { conversation_id, tag, color } = body

  if (!conversation_id || !tag?.trim()) {
    return NextResponse.json({ error: 'conversation_id ותגית חובה' }, { status: 400 })
  }

  const TAG_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280']
  const tagColor = color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]

  const { data, error } = await supabaseAdmin
    .from('conversation_tags')
    .upsert({
      conversation_id,
      tag: tag.trim(),
      color: tagColor,
    }, { onConflict: 'conversation_id,tag' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — remove tag
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('conversation_tags')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
