import type { NextAuthConfig } from "next-auth";
import { getEnv } from "@/lib/env";
import { safeCallbackUrl } from "@/validations/auth";

export function getAuthConfig(): NextAuthConfig {
  return {
    secret: getEnv().AUTH_SECRET,
    trustHost: true,
    providers: [],
    pages: { signIn: "/login", error: "/login" },
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.sessionVersion = user.sessionVersion ?? 0;
        }
        return token;
      },
      session({ session, token }) {
        if (
          typeof token.id === "string" &&
          (token.role === "admin" || token.role === "customer")
        ) {
          session.user.id = token.id;
          session.user.role = token.role;
          session.user.sessionVersion = token.sessionVersion ?? 0;
        }
        return session;
      },
      redirect({ url, baseUrl }) {
        const relative = url.startsWith(baseUrl + "/")
          ? url.slice(baseUrl.length)
          : url;
        return new URL(safeCallbackUrl(relative), baseUrl).toString();
      },
    },
  };
}
