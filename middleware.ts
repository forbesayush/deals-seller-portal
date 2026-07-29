import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route matching
  const isAdminPath = pathname.startsWith('/admin');
  const isBuyerPath = pathname.startsWith('/buyer');
  const isCustomerPath = pathname.startsWith('/customer');
  const isProtectedPath = isAdminPath || isBuyerPath || isCustomerPath;

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // Retrieve token from all cookie aliases or authorization header
  const dsToken = request.cookies.get('ds_token')?.value;
  const dsJwtToken = request.cookies.get('ds_jwt_token')?.value;
  const token = request.cookies.get('token')?.value;
  const authHeader = request.headers.get('authorization');

  const activeToken = dsToken || dsJwtToken || token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  // If no token is present in Incognito / unauthenticated mode, immediately redirect to login
  if (!activeToken) {
    const loginPath = (pathname.endsWith('.html') || isCustomerPath) ? '/login.html' : '/login';
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/buyer/:path*',
    '/customer/:path*',
  ],
};
