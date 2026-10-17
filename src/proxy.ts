import NextAuth, { type NextAuthRequest } from "next-auth";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { getOrderForUser } from "@/services/order.service";
import { getProductBySlug } from "@/services/product.service";
import { objectIdSchema, slugSchema } from "@/validations/common";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { getAuthConfig } from "@/lib/auth.config";

const { auth } = NextAuth(() => getAuthConfig());
const handleRequest: (
  request: NextAuthRequest,
  event: NextFetchEvent,
) => Promise<NextResponse> = async (request) => {
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
    const destination =
      request.auth.user.role === "admin" ? "/admin" : "/account";
    return NextResponse.redirect(new URL(destination, request.nextUrl));
  }
  if (
    request.auth?.user.role === "admin" &&
    (pathname === "/account" || pathname === "/account/")
  ) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl));
  }
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
  const productPath = /^\/products\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  if (productPath) {
    let slug: string;
    try {
      slug = decodeURIComponent(productPath[1]);
    } catch {
      slug = "";
    }
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success || !(await getProductBySlug(parsed.data))) {
      // Resolve missing products before loading boundaries commit HTTP 200.
      const url = request.nextUrl.clone();
      url.pathname = "/_not-found";
      url.search = "";
      return NextResponse.rewrite(url, {
        status: 404,
        headers: { "cache-control": "no-store" },
      });
    }
    return NextResponse.next();
  }
  // Lazy Auth.js initialization resolves the wrapped interceptor asynchronously.
  const handle = await protectRoute;
  return handle(request, event);
}

export const config = {
  matcher: [
    "/products/:slug",
    "/account/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/login",
    "/register",
  ],
};
