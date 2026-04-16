import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — get leads and tasks related to a contact by phone
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  if (!phone) return NextResponse.json({ error: 'חסר טלפון' }, { status: 400 })

  // Find leads with same phone
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, name, phone, status, source, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })

  // Find tasks linked to those leads
  const leadIds = (leads || []).map((l) => l.id)
  let tasks: unknown[] = []
  if (leadIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .in('lead_id', leadIds)
      .order('due_date', { ascending: true })
    tasks = data || []
  }

  return NextResponse.json({ leads: leads || [], tasks })
}
