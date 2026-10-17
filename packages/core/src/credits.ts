/**
 * Credit ledger helpers (SPEC Section 7.3).
 * Record each Credit change in the credit_ledger table.
 */

export interface CreditEntry {
  userId: number;
  runId?: number;
  amount: number; // positive = credit, negative = charge
  reason: string; // run_save_lead | run_reserve | run_refund | admin_grant | ...
}

/**
 * Default Credit costs (SPEC Section 7.2). The Admin can change all values.
 */
export const DEFAULT_CREDIT_COSTS = {
  leadSavedFreeSource: 1,
  leadSavedPaidSource: 2,
  emailFoundEnrichment: 1,
  fullEmailVerification: 1,
  aiDraft: 1,
  aiExtractionPerPage: 0, // AI token limit applies instead
} as const;

export type CreditReason =
  | "run_save_lead"
  | "run_reserve"
  | "run_refund"
  | "admin_grant"
  | "email_found"
  | "email_verification"
  | "ai_draft";

export function creditEntry(
  userId: number,
  amount: number,
  reason: CreditReason,
  runId?: number
): CreditEntry {
  return { userId, runId, amount, reason };
}

export function isCreditReason(reason: string): reason is CreditReason {
  return [
    "run_save_lead", "run_reserve", "run_refund", "admin_grant",
    "email_found", "email_verification", "ai_draft",
  ].includes(reason);
}
