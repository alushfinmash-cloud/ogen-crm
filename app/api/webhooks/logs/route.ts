import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get('webhook_id')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  let query = supabaseAdmin
    .from('webhook_logs')
    .select('*, webhooks(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (webhookId) {
    query = query.eq('webhook_id', webhookId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
