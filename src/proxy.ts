import NextAuth, { type NextAuthRequest } from "next-auth";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { getOrderForUser } from "@/services/order.service";
import { objectIdSchema } from "@/validations/common";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { getAuthConfig } from "@/lib/auth.config";

const { auth } = NextAuth(() => getAuthConfig());
const handleRequest: (
  request: NextAuthRequest,
  event: NextFetchEvent,
) => Promise<NextResponse> = async (request) => {
  const { pathname, search } = request.nextUrl;
  const protectedPath =
    /^\/(?:account|admin|checkout|test\/dashboard)(?:\/|$)/.test(pathname);
  if (protectedPath && !request.auth?.user) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  // Role-based redirects run on the server with current database access.
  // Resolve ownership before React streams loading boundaries and commits HTTP 200.
  const orderPath = /^\/account\/orders\/([^/]+)\/?$/.exec(pathname);
  if (orderPath && request.auth?.user) {
    const id = objectIdSchema.safeParse(orderPath[1]);
    const missing = async () => {
      // Keep the HTTP status explicit before React streams the public error page.
      const page = await fetch(
        new URL("/_not-found", getEnv().NEXT_PUBLIC_SITE_URL),
        { cache: "no-store" },
      );
      return new NextResponse(page.body, {
        status: 404,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "private, no-store",
        },
      });
    };
    if (!id.success) return missing();
    try {
      await getOrderForUser(request.auth.user.id, id.data);
    } catch (error: unknown) {
      if (error instanceof AppError && error.code === "NOT_FOUND")
        return missing();
      throw error;
    }
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
    "/test/dashboard/:path*",
  ],
};
