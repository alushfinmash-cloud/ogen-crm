import { NextRequest, NextResponse } from 'next/server'

// Simple session-based auth middleware
// Protects all pages and API routes except:
// - /login page
// - /api/login (auth endpoint)
// - Webhook endpoints (external services need access)
// - Static files

const PUBLIC_PATHS = [
  '/login',
  '/api/login',
  '/api/inbox/webhook',        // WhatsApp/Facebook/Instagram/Gmail/SMS webhooks
  '/api/comment-auto-reply/webhook', // Comment automation webhook
  '/api/webhooks/',             // Custom webhooks
  '/_next',
  '/favicon.ico',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authToken = request.cookies.get('ogen-auth-token')?.value

  if (!authToken) {
    // API routes: return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Pages: redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Validate token (simple hash check)
  const expectedToken = process.env.AUTH_SECRET_TOKEN
  if (expectedToken && authToken !== expectedToken) {
    // Invalid token — clear cookie and redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('ogen-auth-token')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
