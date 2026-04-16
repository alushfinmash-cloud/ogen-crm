import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list contacts with search, tag filter, pagination
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const tag = searchParams.get('tag')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')
  const sortBy = searchParams.get('sort_by') || 'created_at'
  const sortDir = searchParams.get('sort_dir') === 'asc'
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('contacts')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: sortDir })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count || 0, page, limit })
}

// POST — create contact
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { first_name, last_name, phone, email, tags, source } = body

  if (!first_name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'שם פרטי ומספר טלפון חובה' }, { status: 400 })
  }

  // Check for existing contact by phone
  const { data: existing } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('phone', phone.trim())
    .limit(1)

  if (existing && existing.length > 0) {
    // Update existing
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({
        first_name: first_name.trim(),
        last_name: last_name?.trim() || null,
        email: email?.trim() || null,
        tags: tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, _action: 'updated' })
  }

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert({
      first_name: first_name.trim(),
      last_name: last_name?.trim() || null,
      phone: phone.trim(),
      email: email?.trim() || null,
      tags: tags || [],
      source: source || 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, _action: 'created' }, { status: 201 })
}

// PATCH — update contact
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('contacts')
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

  await supabaseAdmin.from('contact_notes').delete().eq('contact_id', id)
  await supabaseAdmin.from('contacts').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
