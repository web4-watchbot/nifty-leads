/**
 * Better Auth handler (SPEC Section 4).
 * All auth routes: /api/auth/sign-up, /api/auth/sign-in, /api/auth/verify-email, etc.
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
