import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'ff_authed';
const STATUS_COOKIE = 'ff_status';
const ROLE_COOKIE = 'ff_role';

function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/api')
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const authed = req.cookies.get(AUTH_COOKIE)?.value === '1';
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const status = (req.cookies.get(STATUS_COOKIE)?.value ?? 'pending') as
    | 'pending'
    | 'token_sent'
    | 'verified';
  const role = req.cookies.get(ROLE_COOKIE)?.value ?? '';

  // Admin routes require admin role cookie
  if (pathname.startsWith('/admin') && role !== 'admin') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Status-based verification gating
  if (status === 'pending') {
    if (!pathname.startsWith('/verify/request')) {
      const url = req.nextUrl.clone();
      url.pathname = '/verify/request';
      return NextResponse.redirect(url);
    }
  }

  if (status === 'token_sent') {
    if (!pathname.startsWith('/verify/token')) {
      const url = req.nextUrl.clone();
      url.pathname = '/verify/token';
      return NextResponse.redirect(url);
    }
  }

  if (status === 'verified') {
    if (pathname.startsWith('/verify')) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

