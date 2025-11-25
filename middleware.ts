import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Skip RBAC checks for static files, auth routes, and API routes
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.includes('.') // static files
  ) {
    return supabaseResponse
  }

  // Protected routes - redirect to login if not authenticated
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/jobs') || pathname.startsWith('/settings'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if already logged in
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Role-based route protection
  if (user) {
    const protectedRoutes = {
      '/settings/roles': ['owner', 'project_manager'],
      '/admin': ['owner'],
      '/api/admin': ['owner'],
    }

    // Check if current path requires specific roles
    const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
      pathname.startsWith(route)
    )?.[1] as string[] | undefined

    if (requiredRoles && requiredRoles.length > 0) {
      try {
        // Fetch user roles from database
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            roles(name)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError)
          const redirectUrl = new URL('/login', request.url)
          return NextResponse.redirect(redirectUrl)
        }

        const userRoleNames = userRoles?.map(ur => ur.roles?.name).filter(Boolean) || []

        // Check if user has any of the required roles
        const hasRequiredRole = requiredRoles.some(role => userRoleNames.includes(role))

        if (!hasRequiredRole) {
          // Redirect to dashboard with access denied message
          const redirectUrl = new URL('/dashboard', request.url)
          redirectUrl.searchParams.set('error', 'access_denied')
          redirectUrl.searchParams.set('message', `This page requires ${requiredRoles.join(' or ')} role`)
          return NextResponse.redirect(redirectUrl)
        }
      } catch (error) {
        console.error('Error in role-based middleware:', error)
        const redirectUrl = new URL('/login', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Add security headers to authenticated responses
    supabaseResponse.headers.set('X-Frame-Options', 'DENY')
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
    supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')

    supabaseResponse.headers.set('Content-Security-Policy', csp)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
