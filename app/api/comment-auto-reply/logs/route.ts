import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list logs, optional filter by rule_id
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rule_id = searchParams.get('rule_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabaseAdmin
    .from('comment_auto_reply_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (rule_id) {
    query = query.eq('rule_id', rule_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
