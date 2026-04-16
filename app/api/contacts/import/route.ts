import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// POST — bulk import contacts
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { rows } = body as { rows: { first_name: string; last_name?: string; phone: string; email?: string; tags?: string }[] }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'אין נתונים לייבוא' }, { status: 400 })
  }

  let created = 0
  let updated = 0
  let failed = 0

  for (const row of rows) {
    if (!row.phone?.trim() || !row.first_name?.trim()) {
      failed++
      continue
    }

    const phone = row.phone.trim()
    const tags = row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []

    // Check existing
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .limit(1)

    if (existing && existing.length > 0) {
      const { error } = await supabaseAdmin
        .from('contacts')
        .update({
          first_name: row.first_name.trim(),
          last_name: row.last_name?.trim() || null,
          email: row.email?.trim() || null,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)

      if (error) failed++
      else updated++
    } else {
      const { error } = await supabaseAdmin
        .from('contacts')
        .insert({
          first_name: row.first_name.trim(),
          last_name: row.last_name?.trim() || null,
          phone,
          email: row.email?.trim() || null,
          tags,
          source: 'import',
        })

      if (error) failed++
      else created++
    }
  }

  return NextResponse.json({ created, updated, failed, total: rows.length })
}
