import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
};

const PUBLIC_ROUTES = [
  '/api/auth/.*',
  '/api/shopify-auth-callback',
  '/api/settings/google/callback',
  '/api/webhooks/.*',
];

const AUTH_ONLY_ROUTES = ['/'];
const DASHBOARD_ROUTE = '/orders';
const LOGIN_ROUTE = '/';

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => {
    if (route.includes('.*') || route.includes('^') || route.includes('$')) {
      return new RegExp(`^${route}$`).test(pathname);
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function isApiRoute(pathname: string) {
  return pathname.startsWith('/api');
}

export const proxy = auth(async (request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth);

  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  if (matchesRoute(pathname, AUTH_ONLY_ROUTES)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DASHBOARD_ROUTE, request.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});
