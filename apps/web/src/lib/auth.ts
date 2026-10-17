/**
 * Better Auth setup (SPEC Section 4: Better Auth with email OTP plugin).
 * Admin emails come from ADMIN_EMAILS env; those users get the `admin` role.
 */

import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dbSchema from "@nifty-leads/db";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: dbSchema });

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// NOTE: better-auth 1.x bundles zod v4 while this app uses zod v3, which makes
// the inferred type of `betterAuth()` unnameable (TS2742). Annotate with `any`
// to keep the build portable. Auth runtime behavior is unaffected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = betterAuth({
  // better-auth 1.7: the drizzleAdapter factory is passed as `database`.
  // (The old `databaseAdapter` option was removed and is silently ignored,
  // which makes better-auth mis-resolve the driver at runtime.)
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users: dbSchema.users,
      sessions: dbSchema.sessions,
      accounts: dbSchema.accounts,
      verifications: dbSchema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user }: { user: { email: string } }) => {
      // System email (Section 8.5): login codes / reset URLs.
      // Log in dev; send via configured provider in prod.
      console.log(`[auth] email for ${user.email}: check your inbox`);
    },
  },
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        // System email (Section 8.5): login codes. Resend is the bootstrap
        // provider here (the full provider picker moves to Admin Settings in
        // Phase 1). Without RESEND_API_KEY the code is only logged — read it
        // from the server logs (Vercel Dashboard → Deployments → Logs).
        // Per better-auth docs: do not await the send (timing attacks); the
        // fire-and-forget fetch completes before the serverless function
        // freezes.
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const from =
            process.env.RESEND_FROM ?? "Nifty Leads <onboarding@resend.dev>";
          void fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: [email],
              subject: `Your Nifty Leads code: ${otp}`,
              html: `<p>Your Nifty Leads sign-in code:</p><p style="font-size: 24px; letter-spacing: 4px;"><strong>${otp}</strong></p><p>The code is valid for 5 minutes. If you did not request it, ignore this email.</p>`,
              text: `Your Nifty Leads sign-in code: ${otp}. The code is valid for 5 minutes.`,
            }),
          }).catch((err) => {
            console.error(`[auth] ${type} OTP email failed for ${email}:`, err);
          });
        } else {
          console.log(`[auth] ${type} OTP for ${email}: ${otp}`);
        }
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        // Admin bootstrap (Section 4): first sign-ups from ADMIN_EMAILS get
        // the `admin` role; everyone else is a normal user.
        before: async (user) => ({
          data: {
            ...user,
            role: isAdminEmail(user.email ?? "") ? "admin" : "user",
          },
        }),
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  user: {
    fields: {
      // better-auth's default column is `image`; our column is `imageUrl`.
      image: "imageUrl",
    },
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
    },
  },
});

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null | undefined;
  role: string;
};

export async function getUserRole(userId: string | number): Promise<string> {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, Number(userId)),
  });
  return user?.role ?? "user";
}

export { isAdminEmail };
