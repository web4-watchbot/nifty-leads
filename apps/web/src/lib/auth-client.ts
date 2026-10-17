import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Browser client for the Better Auth server configured in ./auth.ts.
// The emailOTP plugin adds `authClient.emailOtp.*` sign-in methods.
// NOTE: same zod-v4 TS2742 portability issue as ./auth.ts — the inferred type
// references zod v4 internals that TypeScript cannot name. Annotate `any`;
// auth runtime behavior is unaffected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: any = createAuthClient({
  plugins: [emailOTPClient()],
});
