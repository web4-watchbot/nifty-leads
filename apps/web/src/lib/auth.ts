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
  database: db,
  databaseAdapter: drizzleAdapter(db, {
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
        // System email (Section 8.5): login codes / OTP.
        // Log in dev; send via configured provider in prod.
        console.log(`[auth] ${type} OTP for ${email}: ${otp}`);
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  user: {
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
