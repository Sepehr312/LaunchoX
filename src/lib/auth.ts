import "server-only";
import { cache } from "react";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getAuthConfig } from "@/lib/auth.config";
import { getClientIp } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { consumeStoredAuthAttempt } from "@/services/auth-attempt.service";
import { authenticateUser, getUserAccess } from "@/services/auth.service";
import { loginSchema, safeCallbackUrl } from "@/validations/auth";
import { guestIdSchema } from "@/validations/cart";
import { mergeGuestCart } from "@/services/cart.service";

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limit";
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...getAuthConfig(),
  providers: [
    Credentials({
      name: "ایمیل و رمز عبور",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (
          !(await consumeStoredAuthAttempt(
            "login",
            getClientIp(
              request.headers,
              Boolean(getEnv().AUTH_TRUST_PROXY_HEADERS),
            ),
            credentials?.email,
          ))
        )
          throw new TooManyAttempts();
        const user = parsed.success
          ? await authenticateUser(parsed.data)
          : null;
        if (user) {
          const store = await cookies();
          const guest = guestIdSchema.safeParse(store.get("cart_id")?.value);
          if (guest.success) await mergeGuestCart(user.id, guest.data);
          if (store.has("cart_id")) store.delete("cart_id");
        }
        return user;
      },
    }),
  ],
}));

export async function getCurrentUser() {
  const user = (await auth())?.user;
  if (!user) return null;
  // The JWT identifies the user; its role may predate access changes.
  const access = await getUserAccess(user.id);
  if (
    !access?.isActive ||
    (user.sessionVersion ?? 0) !== (access.sessionVersion ?? 0)
  )
    return null;
  return { ...user, role: access.role };
}

export async function consumeCurrentAuthAttempt(
  scope: "login" | "register",
  identifier?: unknown,
) {
  return consumeStoredAuthAttempt(
    scope,
    getClientIp(await headers(), Boolean(getEnv().AUTH_TRUST_PROXY_HEADERS)),
    identifier,
  );
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const path = safeCallbackUrl(
      (await headers()).get("x-launchox-path") ?? "/account",
    );
    redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  }
  return user;
}

export const requireAdmin = cache(async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
});
