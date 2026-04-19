import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { instance_id, api_token, api_url } = await req.json()

    if (!instance_id || !api_token) {
      return NextResponse.json({ success: false, error: 'חסרים פרטים' }, { status: 400 })
    }

    const baseUrl = api_url || `https://${instance_id}.api.greenapi.com`
    const url = `${baseUrl}/waInstance${instance_id}/getStateInstance/${api_token}`

    const res = await fetch(url, { method: 'GET' })
    const data = await res.json()

    if (data?.stateInstance === 'authorized') {
      return NextResponse.json({ success: true, state: data.stateInstance })
    } else {
      return NextResponse.json({ success: false, state: data?.stateInstance || 'unknown' })
    }
  } catch {
    return NextResponse.json({ success: false, error: 'שגיאת חיבור' }, { status: 500 })
  }
}
