import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — single workflow with steps and logs
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const [{ data: wf }, { data: steps }, { data: logs }] = await Promise.all([
    supabaseAdmin.from('workflows').select('*').eq('id', params.id).single(),
    supabaseAdmin.from('workflow_steps').select('*').eq('workflow_id', params.id).order('step_order'),
    supabaseAdmin.from('workflow_logs').select('*').eq('workflow_id', params.id).order('executed_at', { ascending: false }).limit(50),
  ])

  if (!wf) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

  return NextResponse.json({ ...wf, steps: steps || [], logs: logs || [] })
}

// PUT — update workflow + steps
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const { name, trigger_type, trigger_config, is_active, steps } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name.trim()
  if (trigger_type !== undefined) updates.trigger_type = trigger_type
  if (trigger_config !== undefined) updates.trigger_config = trigger_config
  if (is_active !== undefined) updates.is_active = is_active

  const { data: wf, error } = await supabaseAdmin
    .from('workflows')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Replace steps if provided
  if (steps !== undefined) {
    await supabaseAdmin.from('workflow_steps').delete().eq('workflow_id', params.id)

    if (steps.length > 0) {
      const stepsToInsert = steps.map((s: any, i: number) => ({
        workflow_id: params.id,
        step_order: i,
        action_type: s.action_type,
        action_config: s.action_config || {},
        wait_duration: s.wait_duration || null,
      }))
      await supabaseAdmin.from('workflow_steps').insert(stepsToInsert)
    }
  }

  // Fetch updated steps
  const { data: updatedSteps } = await supabaseAdmin
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', params.id)
    .order('step_order')

  return NextResponse.json({ ...wf, steps: updatedSteps || [] })
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await supabaseAdmin.from('workflow_logs').delete().eq('workflow_id', params.id)
  await supabaseAdmin.from('workflow_steps').delete().eq('workflow_id', params.id)
  await supabaseAdmin.from('workflows').delete().eq('id', params.id)
  return NextResponse.json({ success: true })
}
