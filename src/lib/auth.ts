import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getAuthConfig } from "@/lib/auth.config";
import { consumeAuthAttempt, getClientIp } from "@/lib/rate-limit";
import { authenticateUser } from "@/services/auth.service";
import { loginSchema, safeCallbackUrl } from "@/validations/auth";

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
        if (!consumeAuthAttempt("login", getClientIp(request.headers)))
          throw new TooManyAttempts();
        const parsed = loginSchema.safeParse(credentials);
        return parsed.success ? authenticateUser(parsed.data) : null;
      },
    }),
  ],
}));

export async function getCurrentUser() {
  return (await auth())?.user ?? null;
}

export async function consumeCurrentAuthAttempt(scope: "login" | "register") {
  return consumeAuthAttempt(scope, getClientIp(await headers()));
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

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
