import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Multi-tenant Middleware
 * Determines tenant from hostname and adds to headers
 */
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Clone the URL to modify
  const url = request.nextUrl.clone();

  // Add tenant hostname to header for use in app
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-host', hostname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
