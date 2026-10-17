import { describe, it, expect } from "vitest";
import { verifyEmailBasic } from "../src/email-verify";

describe("verifyEmailBasic", () => {
  it("accepts a valid person email with mx", async () => {
    const r = await verifyEmailBasic("john@example.com");
    expect(r.status).toBe("valid");
    expect(r.type).toBe("person");
  });

  it("flags role emails", async () => {
    const r = await verifyEmailBasic("info@gmail.com");
    expect(r.type).toBe("role");
  });

  it("rejects disposable domains", async () => {
    const r = await verifyEmailBasic("test@mailinator.com");
    expect(r.status).toBe("invalid");
    expect(r.reason).toBe("disposable domain");
  });

  it("rejects invalid syntax", async () => {
    const r = await verifyEmailBasic("not-an-email");
    expect(r.status).toBe("invalid");
  });

  it("rejects image filenames", async () => {
    const r = await verifyEmailBasic("logo@2x.png");
    expect(r.status).toBe("invalid");
  });
});
