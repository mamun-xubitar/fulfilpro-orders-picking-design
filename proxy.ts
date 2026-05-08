import { auth } from '@/auth';
import { evaluateStaffAccess, getAuthPolicy, getSessionExpiresAt } from '@/lib/auth-policy.server';
import { isStaffLikeRole, isTestUserRole } from '@/lib/roles';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
};

const PUBLIC_ROUTES = [
  '/api/auth/.*',
  '/api/shopify-auth',
  '/api/shopify-auth-callback',
  '/api/settings/google/callback',
  '/api/auth/staff-login-approvals/.*',
  '/api/webhooks/.*',
  '/api/fulfillment-requests/.*',
];

const AUTH_ONLY_ROUTES = ['/'];
const DASHBOARD_ROUTE = '/orders';
const LOGIN_ROUTE = '/';
const RESTRICTED_ROUTE = '/restricted';
const SESSION_EXPIRED_ROUTE = '/session-expired';
const STAFF_ALLOWED_PAGE_ROUTES = ['/orders', '/profile'];
const STAFF_ALLOWED_API_ROUTES = [
  '/api/orders',
  '/api/orders/.*',
  '/api/uploads/logos',
  '/api/profile',
  '/api/profile/.*',
  '/api/auth/.*',
  '/api/fulfillment-requests',
  '/api/fulfillment-requests/.*',
];
const STAFF_RESTRICTED_API_ROUTES = ['/api/auth/.*'];
const STAFF_EXPIRED_API_ROUTES = ['/api/auth/.*'];
const TEST_USER_MUTATION_BLOCKED_API_ROUTES = ['/api/orders', '/api/orders/.*', '/api/fulfillment-requests', '/api/fulfillment-requests/.*'];
const TEST_MODE_MESSAGE = 'This action is not allowed in test mode.';

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => {
    // if (route.includes('[')) {
    //   const pattern = route.replace(/\[[^\]]+\]/g, '[^/]+');
    //   return new RegExp(`^${pattern}/?$`).test(pathname);
    // }
    if (route.includes('.*') || route.includes('^') || route.includes('$')) {
      return new RegExp(`^${route}$`).test(pathname);
    }
    return pathname === route || pathname === `${route}/`;
  });
}

function isApiRoute(pathname: string) {
  return pathname.startsWith('/api');
}

function expireStaffSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === SESSION_EXPIRED_ROUTE || matchesRoute(pathname, STAFF_EXPIRED_API_ROUTES)) {
    return NextResponse.next();
  }

  if (isApiRoute(pathname)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Staff session timed out' },
      { status: 401 }
    );
  }

  return NextResponse.redirect(new URL(SESSION_EXPIRED_ROUTE, request.url));
}

export const proxy = auth(async (request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth);
  const userRole = request.auth?.user?.role;
  const isStaffLike = isStaffLikeRole(userRole);
  const isTestUser = isTestUserRole(userRole);

  if (isLoggedIn && isStaffLike) {
    const policy = await getAuthPolicy();
    const loginAt = request.auth?.user?.loginAt;

    if (!loginAt || getSessionExpiresAt(loginAt, policy.sessionTimeoutMinutes) <= Date.now()) {
      return expireStaffSession(request);
    }

    const staffAccess = evaluateStaffAccess(policy);
    if (!staffAccess.allowed) {
      if (pathname === RESTRICTED_ROUTE || matchesRoute(pathname, STAFF_RESTRICTED_API_ROUTES)) {
        return NextResponse.next();
      }

      if (isApiRoute(pathname)) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Staff access is restricted at this time',
            data: staffAccess,
          },
          { status: 403 }
        );
      }

      return NextResponse.redirect(new URL(RESTRICTED_ROUTE, request.url));
    }

    if (pathname === RESTRICTED_ROUTE || pathname === SESSION_EXPIRED_ROUTE) {
      return NextResponse.redirect(new URL(DASHBOARD_ROUTE, request.url));
    }
  }

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

  if (isStaffLike) {
    if (isApiRoute(pathname)) {
      if (!matchesRoute(pathname, STAFF_ALLOWED_API_ROUTES)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Staff users do not have access to this API' },
          { status: 403 }
        );
      }

      if (
        isTestUser &&
        request.method !== 'GET' &&
        matchesRoute(pathname, TEST_USER_MUTATION_BLOCKED_API_ROUTES)
      ) {
        return NextResponse.json(
          { error: 'Forbidden', message: TEST_MODE_MESSAGE },
          { status: 403 }
        );
      }

      return NextResponse.next();
    }

    if (!matchesRoute(pathname, STAFF_ALLOWED_PAGE_ROUTES)) {
      return NextResponse.redirect(new URL(DASHBOARD_ROUTE, request.url));
    }
  }

  if (pathname === RESTRICTED_ROUTE || pathname === SESSION_EXPIRED_ROUTE) {
    return NextResponse.redirect(new URL(DASHBOARD_ROUTE, request.url));
  }

  return NextResponse.next();
});
