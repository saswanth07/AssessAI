import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role as string | undefined

  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')
  const isAuthRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/register' || nextUrl.pathname === '/reset-password' || nextUrl.pathname === '/forgot-password'
  const isInstructorRoute = nextUrl.pathname.startsWith('/instructor')
  const isStudentRoute = nextUrl.pathname.startsWith('/student')
  
  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      if (role === 'INSTRUCTOR') {
        return Response.redirect(new URL('/instructor/dashboard', nextUrl))
      }
      return Response.redirect(new URL('/student/dashboard', nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn && (isInstructorRoute || isStudentRoute)) {
    return Response.redirect(new URL('/login', nextUrl))
  }

  if (isInstructorRoute && role !== 'INSTRUCTOR') {
    return Response.redirect(new URL('/student/dashboard', nextUrl))
  }

  if (isStudentRoute && role !== 'STUDENT') {
    return Response.redirect(new URL('/instructor/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
