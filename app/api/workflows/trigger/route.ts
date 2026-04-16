import { NextRequest, NextResponse } from 'next/server'
import { executeWorkflows } from '@/lib/workflow-engine'

// POST — trigger workflow execution (called internally)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { trigger_type, lead, meta } = body

  if (!trigger_type || !lead?.id) {
    return NextResponse.json({ error: 'Missing trigger_type or lead' }, { status: 400 })
  }

  try {
    await executeWorkflows(trigger_type, lead, meta || {})
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
