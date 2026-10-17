/**
 * Better Auth handler (SPEC Section 4).
 * All auth routes: /api/auth/sign-up, /api/auth/sign-in, /api/auth/verify-email, etc.
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// better-auth 1.7: toNextJsHandler returns per-method handlers —
// exporting the whole object as a route handler crashes at runtime.
const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
