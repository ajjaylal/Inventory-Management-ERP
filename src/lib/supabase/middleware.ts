import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session if it's expired — DO NOT remove this line.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/forgot-password');
  const isRootPage = pathname === '/';

  // Not logged in and trying to access a protected route → redirect to login
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Already logged in and hitting auth pages or root → redirect to dashboard
  if (user && (isAuthPage || isRootPage)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
};
