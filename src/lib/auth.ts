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
import { safeCallbackUrl } from "@/validations/auth";
import { guestIdSchema } from "@/validations/cart";
import { mergeGuestCart } from "@/services/cart.service";
import { authenticateOtp } from "@/services/otp.service";
import { mobilePasswordSchema, otpVerifySchema } from "@/validations/otp";

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limit";
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...getAuthConfig(),
  providers: [
    Credentials({
      name: "شماره موبایل و رمز عبور",
      credentials: {
        mobile: { type: "tel" },
        password: { type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = mobilePasswordSchema.safeParse(credentials);
        if (
          !(await consumeStoredAuthAttempt(
            "login",
            getClientIp(
              request.headers,
              Boolean(getEnv().AUTH_TRUST_PROXY_HEADERS),
            ),
            credentials?.mobile,
          ))
        )
          throw new TooManyAttempts();
        const user = parsed.success
          ? await authenticateUser(parsed.data)
          : null;
        if (user) {
          const store = await cookies();
          const guest = guestIdSchema.safeParse(store.get("cart_id")?.value);
          if (guest.success) {
            await mergeGuestCart(user.id, guest.data);
            store.delete("cart_id");
          }
          store.delete("initial_password");
        }
        return user;
      },
    }),
    Credentials({
      id: "otp",
      name: "کد پیامکی",
      credentials: { mobile: {}, code: {}, challengeId: {}, purpose: {} },
      async authorize(credentials, request) {
        const parsed = otpVerifySchema.safeParse(credentials);
        if (!parsed.success || parsed.data.purpose !== "login") return null;
        try {
          const { initialPasswordGrant, ...user } = await authenticateOtp(
            parsed.data,
            getClientIp(request.headers, getEnv().AUTH_TRUST_PROXY_HEADERS),
          );
          const store = await cookies();
          const guest = guestIdSchema.safeParse(store.get("cart_id")?.value);
          if (guest.success) {
            await mergeGuestCart(user.id, guest.data);
            store.delete("cart_id");
          }
          if (initialPasswordGrant)
            store.set("initial_password", initialPasswordGrant, {
              httpOnly: true,
              secure: getEnv().NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 300,
            });
          else store.delete("initial_password");
          return user;
        } catch {
          // Auth.js may log thrown provider errors, so expose no service error details.
          return null;
        }
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
