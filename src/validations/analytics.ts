import { z } from "zod";

export const analyticsQuerySchema = z
  .object({
    days: z.enum(["realtime", "7", "30"]).default("7"),
  })
  .strict();

export const analyticsCredentialsSchema = z.object({
  GA4_PROPERTY_ID: z.string().regex(/^[1-9]\d{0,19}$/),
  GOOGLE_CLIENT_EMAIL: z.email(),
  GOOGLE_PRIVATE_KEY: z
    .string()
    .transform((value) => value.replace(/\\n/g, "\n").trim())
    .pipe(
      z
        .string()
        .startsWith("-----BEGIN PRIVATE KEY-----")
        .endsWith("-----END PRIVATE KEY-----"),
    ),
});
