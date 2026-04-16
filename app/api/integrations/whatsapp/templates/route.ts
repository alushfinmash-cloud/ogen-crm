import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list templates
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create template
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, content } = body

  if (!name?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'שם ותוכן חובה' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('whatsapp_templates')
    .insert({ name: name.trim(), content: content.trim() })
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

  await supabaseAdmin.from('whatsapp_templates').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
