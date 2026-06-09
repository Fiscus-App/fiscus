export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/feed/:path*',
    '/markets/:path*',
    '/saved/:path*',
    '/teams/:path*',
    '/profile/:path*',
  ],
}
