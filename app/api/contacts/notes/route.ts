import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET notes for a contact
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const contactId = searchParams.get('contact_id')
  if (!contactId) return NextResponse.json({ error: 'חסר contact_id' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contact_notes')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — add note
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { contact_id, content } = body

  if (!contact_id || !content?.trim()) {
    return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('contact_notes')
    .insert({ contact_id, content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  await supabaseAdmin.from('contact_notes').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
