import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — list all pipelines (distinct from pipeline_columns)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pipeline_columns')
      .select('pipeline_id')

    if (error) {
      return NextResponse.json([{ id: '00000000-0000-0000-0000-000000000001', name: 'ברירת מחדל' }])
    }

    // Get unique pipeline IDs
    const uniqueIds = [...new Set((data || []).map(d => d.pipeline_id))]

    if (uniqueIds.length === 0) {
      return NextResponse.json([{ id: '00000000-0000-0000-0000-000000000001', name: 'ברירת מחדל' }])
    }

    const pipelines = uniqueIds.map((id, i) => ({
      id,
      name: i === 0 ? 'ברירת מחדל' : `פייפליין ${i + 1}`,
    }))

    return NextResponse.json(pipelines)
  } catch {
    return NextResponse.json([{ id: '00000000-0000-0000-0000-000000000001', name: 'ברירת מחדל' }])
  }
}
