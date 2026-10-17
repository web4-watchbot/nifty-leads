import { describe, it, expect } from "vitest";
import { creditEntry, isCreditReason, DEFAULT_CREDIT_COSTS } from "../src/credits";

describe("creditEntry", () => {
  it("creates a ledger entry", () => {
    const e = creditEntry(42, -1, "run_save_lead", 7);
    expect(e.userId).toBe(42);
    expect(e.amount).toBe(-1);
    expect(e.reason).toBe("run_save_lead");
    expect(e.runId).toBe(7);
  });
});

describe("isCreditReason", () => {
  it("accepts valid reasons", () => {
    expect(isCreditReason("run_save_lead")).toBe(true);
    expect(isCreditReason("admin_grant")).toBe(true);
  });
  it("rejects invalid reasons", () => {
    expect(isCreditReason("nonsense")).toBe(false);
  });
});

describe("DEFAULT_CREDIT_COSTS", () => {
  it("has expected defaults from SPEC Section 7.2", () => {
    expect(DEFAULT_CREDIT_COSTS.leadSavedFreeSource).toBe(1);
    expect(DEFAULT_CREDIT_COSTS.leadSavedPaidSource).toBe(2);
    expect(DEFAULT_CREDIT_COSTS.aiDraft).toBe(1);
  });
});
