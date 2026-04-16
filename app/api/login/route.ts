import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 })
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
  }

  // Use AUTH_SECRET_TOKEN as session token
  const token = process.env.AUTH_SECRET_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'AUTH_SECRET_TOKEN not configured' }, { status: 500 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('ogen-auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('ogen-auth-token')
  return response
}
