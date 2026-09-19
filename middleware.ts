import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Critical: update BOTH request and response cookies. Updating
          // only the response means a refreshed session never reaches
          // downstream Route Handlers in this same request cycle — they'd
          // keep reading the old (expired) cookie from `request`, which
          // is exactly what caused intermittent "please sign in again"
          // errors on chat/API calls even right after a successful login.
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/chat") ||
    request.nextUrl.pathname.startsWith("/api/conversations") ||
    request.nextUrl.pathname.startsWith("/api/generate-image") ||
    request.nextUrl.pathname.startsWith("/api/generate-document") ||
    request.nextUrl.pathname.startsWith("/api/profile") ||
    request.nextUrl.pathname.startsWith("/api/folders") ||
    request.nextUrl.pathname.startsWith("/api/templates");

  if (!user && isProtectedRoute) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return Response.json({ error: "Please sign in to continue." }, { status: 401 });
    }
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
    "/api/chat/:path*",
    "/api/conversations/:path*",
    "/api/generate-image/:path*",
    "/api/generate-document/:path*",
    "/api/profile/:path*",
    "/api/folders/:path*",
    "/api/templates/:path*",
  ],
};
