import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list workflows with steps count and log stats
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('workflows')
    .select('*, workflow_steps(id)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create workflow
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, trigger_type, trigger_config, steps } = body

  if (!name?.trim()) return NextResponse.json({ error: 'שם חובה' }, { status: 400 })
  if (!trigger_type) return NextResponse.json({ error: 'סוג טריגר חובה' }, { status: 400 })

  const { data: wf, error: wfErr } = await supabaseAdmin
    .from('workflows')
    .insert({ name: name.trim(), trigger_type, trigger_config: trigger_config || {} })
    .select()
    .single()

  if (wfErr) return NextResponse.json({ error: wfErr.message }, { status: 500 })

  // Insert steps
  if (steps?.length > 0) {
    const stepsToInsert = steps.map((s: any, i: number) => ({
      workflow_id: wf.id,
      step_order: i,
      action_type: s.action_type,
      action_config: s.action_config || {},
      wait_duration: s.wait_duration || null,
    }))
    await supabaseAdmin.from('workflow_steps').insert(stepsToInsert)
  }

  return NextResponse.json(wf, { status: 201 })
}
