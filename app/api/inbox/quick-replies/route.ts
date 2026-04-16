import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — all active quick replies
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('quick_replies')
    .select('*')
    .eq('is_active', true)
    .order('usage_count', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create quick reply
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, content, category, shortcut } = body

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'כותרת ותוכן חובה' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('quick_replies')
    .insert({
      title: title.trim(),
      content: content.trim(),
      category: category || 'general',
      shortcut: shortcut || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — update quick reply or increment usage
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, increment_usage, ...updates } = body

  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  if (increment_usage) {
    // Increment usage count
    const { data: current } = await supabaseAdmin
      .from('quick_replies')
      .select('usage_count')
      .eq('id', id)
      .single()

    const { data, error } = await supabaseAdmin
      .from('quick_replies')
      .update({ usage_count: (current?.usage_count || 0) + 1 })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('quick_replies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — remove quick reply
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('quick_replies')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
