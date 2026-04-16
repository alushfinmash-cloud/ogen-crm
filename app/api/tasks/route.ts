import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list tasks with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assigned = searchParams.get('assigned_to')
  const leadId = searchParams.get('lead_id')

  let query = supabaseAdmin
    .from('tasks')
    .select('*, leads(name, phone)')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (assigned) query = query.eq('assigned_to', assigned)
  if (leadId) query = query.eq('lead_id', leadId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create task
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description, lead_id, assigned_to, due_date, priority, source } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'כותרת חובה' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title: title.trim(),
      description: description || null,
      lead_id: lead_id || null,
      assigned_to: assigned_to || 'מנהל המערכת',
      due_date: due_date || null,
      priority: priority || 'בינונית',
      source: source || 'manual',
    })
    .select('*, leads(name, phone)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create reminder 30 min before due
  if (due_date) {
    const remindAt = new Date(new Date(due_date).getTime() - 30 * 60000).toISOString()
    await supabaseAdmin.from('task_reminders').insert({ task_id: data.id, remind_at: remindAt })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH — update task
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select('*, leads(name, phone)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסר ID' }, { status: 400 })

  await supabaseAdmin.from('task_reminders').delete().eq('task_id', id)
  await supabaseAdmin.from('tasks').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
