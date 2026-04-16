import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list all rules, optional filter by platform
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')

  let query = supabaseAdmin
    .from('comment_auto_replies')
    .select('*')
    .order('created_at', { ascending: false })

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST — create a new rule
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { platform, post_id, post_url, post_title, keyword, dm_message, public_reply } = body

  if (!platform || !post_id || !keyword || !dm_message) {
    return NextResponse.json(
      { error: 'חסרים שדות חובה: platform, post_id, keyword, dm_message' },
      { status: 400 }
    )
  }

  if (!['facebook', 'instagram'].includes(platform)) {
    return NextResponse.json(
      { error: 'הפלטפורמה חייבת להיות facebook או instagram' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('comment_auto_replies')
    .insert({
      platform,
      post_id,
      post_url: post_url || null,
      post_title: post_title || null,
      keyword: keyword.toLowerCase().trim(),
      dm_message,
      public_reply: public_reply || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH — update a rule
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'חסר id' }, { status: 400 })
  }

  // Normalize keyword if provided
  if (updates.keyword) {
    updates.keyword = updates.keyword.toLowerCase().trim()
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('comment_auto_replies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE — delete a rule
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'חסר id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('comment_auto_replies')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
