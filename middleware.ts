import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Not logged in → redirect to login
  if (!session && pathname !== '/login') {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  if (session) {
    const role = session.user.role

    // Student trying to access teacher routes
    if (pathname.startsWith('/teacher') && role !== 'admin') {
      return NextResponse.redirect(new URL('/student', req.url))
    }

    // Teacher trying to access student routes — allow admin to view student pages
    if (pathname.startsWith('/student') && role !== 'student' && role !== 'admin') {
      return NextResponse.redirect(new URL('/teacher', req.url))
    }

    // Logged in hitting /login → redirect to role home
    if (pathname === '/login') {
      const res = NextResponse.redirect(
        new URL(role === 'admin' ? '/teacher' : '/student', req.url)
      )
      res.headers.set('Cache-Control', 'no-store')
      return res
    }
  }

  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
