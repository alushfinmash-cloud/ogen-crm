import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — export contacts as CSV
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag')

  let query = supabaseAdmin.from('contacts').select('*').order('created_at', { ascending: false })
  if (tag) query = query.contains('tags', [tag])

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'אין אנשי קשר לייצוא' }, { status: 404 })
  }

  // Build CSV
  const headers = ['שם פרטי', 'שם משפחה', 'טלפון', 'דוא"ל', 'תגיות', 'מקור', 'נוצר ב']
  const rows = data.map((c) => [
    c.first_name,
    c.last_name || '',
    c.phone,
    c.email || '',
    (c.tags || []).join(', '),
    c.source,
    new Date(c.created_at).toLocaleDateString('he-IL'),
  ])

  const bom = '\uFEFF'
  const csv = bom + [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
