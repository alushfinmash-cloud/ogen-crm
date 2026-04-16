import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — score + history for a lead
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')

  if (!leadId) {
    // Return all scores (for pipeline view)
    const { data, error } = await supabaseAdmin
      .from('lead_scores')
      .select('*')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Get score for specific lead
  const { data: score } = await supabaseAdmin
    .from('lead_scores')
    .select('*')
    .eq('lead_id', leadId)
    .single()

  // Get history
  const { data: history } = await supabaseAdmin
    .from('lead_score_history')
    .select('*, scoring_rules(name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    score: score?.current_score ?? 0,
    updated_at: score?.updated_at ?? null,
    history: history || [],
  })
}

// POST — apply score change (trigger-based or manual)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { lead_id, trigger_type, points_override, reason_override } = body

  if (!lead_id) {
    return NextResponse.json({ error: 'חסר lead_id' }, { status: 400 })
  }

  let pointsChange = 0
  let reason = ''
  let ruleId: string | null = null

  if (trigger_type) {
    // Find matching active rule
    const { data: rule } = await supabaseAdmin
      .from('scoring_rules')
      .select('*')
      .eq('trigger_type', trigger_type)
      .eq('is_active', true)
      .single()

    if (!rule) {
      return NextResponse.json({ error: 'לא נמצא כלל פעיל לטריגר זה' }, { status: 404 })
    }

    pointsChange = rule.points
    reason = rule.name
    ruleId = rule.id
  } else if (points_override !== undefined) {
    // Manual score change
    pointsChange = Number(points_override)
    reason = reason_override || 'שינוי ידני'
  } else {
    return NextResponse.json({ error: 'חסר trigger_type או points_override' }, { status: 400 })
  }

  // Get current score
  const { data: existing } = await supabaseAdmin
    .from('lead_scores')
    .select('current_score')
    .eq('lead_id', lead_id)
    .single()

  const currentScore = existing?.current_score ?? 0
  const newScore = Math.max(0, Math.min(100, currentScore + pointsChange))

  // Upsert score
  await supabaseAdmin
    .from('lead_scores')
    .upsert({
      lead_id,
      current_score: newScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'lead_id' })

  // Add history entry
  await supabaseAdmin
    .from('lead_score_history')
    .insert({
      lead_id,
      rule_id: ruleId,
      points_change: pointsChange,
      reason,
    })

  // Check for alerts
  const alerts: string[] = []
  if (newScore >= 70 && currentScore < 70) {
    alerts.push('ליד חם! כדאי ליצור קשר עכשיו')
  }
  if (newScore <= 20 && currentScore > 20) {
    alerts.push('ליד מתקרר — שקול פעולה')
  }

  return NextResponse.json({
    lead_id,
    previous_score: currentScore,
    points_change: pointsChange,
    new_score: newScore,
    reason,
    alerts,
  })
}
