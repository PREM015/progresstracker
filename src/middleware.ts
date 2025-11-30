// middleware.ts (keep this name for now)
export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/connections/:path*',
    '/settings/:path*',
  ]
}