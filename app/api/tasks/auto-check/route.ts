import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — auto-create tasks for leads untouched for 48+ hours
export async function POST() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Find leads updated before cutoff that are not in terminal statuses
  const { data: staleLeads, error } = await supabaseAdmin
    .from('leads')
    .select('id, name, phone, updated_at')
    .lt('updated_at', cutoff)
    .not('status', 'in', '("סגור - הצלחה","סגור - נכשל")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!staleLeads || staleLeads.length === 0) {
    return NextResponse.json({ created: 0, message: 'אין לידים שדורשים מעקב' })
  }

  let created = 0
  for (const lead of staleLeads) {
    // Check if there's already an open system task for this lead
    const { data: existing } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('source', 'system')
      .in('status', ['פתוחה', 'בטיפול'])
      .limit(1)

    if (existing && existing.length > 0) continue

    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin.from('tasks').insert({
      title: `מעקב: ${lead.name}`,
      description: `ליד לא טופל מעל 48 שעות. עדכון אחרון: ${new Date(lead.updated_at).toLocaleDateString('he-IL')}`,
      lead_id: lead.id,
      assigned_to: 'מנהל המערכת',
      due_date: dueDate,
      priority: 'גבוהה',
      source: 'system',
    })
    created++
  }

  return NextResponse.json({ created, message: `נוצרו ${created} משימות מעקב` })
}
