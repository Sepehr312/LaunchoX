import NextAuth, { type NextAuthRequest } from "next-auth";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { getAuthConfig } from "@/lib/auth.config";

const { auth } = NextAuth(() => getAuthConfig());
const handleRequest: (
  request: NextAuthRequest,
  event: NextFetchEvent,
) => NextResponse = (request) => {
  const { pathname, search } = request.nextUrl;
  const protectedPath = /^\/(?:account|admin|checkout)(?:\/|$)/.test(pathname);
  if (protectedPath && !request.auth?.user) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  if (
    request.auth?.user &&
    (pathname === "/login" || pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }
  const requestHeaders = new Headers(request.headers);
  // Overwrite incoming values so the server guard sees the actual requested path.
  requestHeaders.set("x-launchox-path", pathname + search);
  return NextResponse.next({ request: { headers: requestHeaders } });
};
const protectRoute = auth(handleRequest);

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  // Lazy Auth.js initialization resolves the wrapped interceptor asynchronously.
  const handle = await protectRoute;
  return handle(request, event);
}

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/login",
    "/register",
  ],
};
