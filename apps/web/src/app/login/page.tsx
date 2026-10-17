"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "otp";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    if (err) {
      setError(err.message ?? "Could not send the code. Try again.");
      setBusy(false);
    } else {
      setStep("otp");
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // First sign-in with this email creates the account (better-auth default).
    const { error: err } = await authClient.signIn.emailOtp({ email, otp });
    if (err) {
      setError(err.message ?? "Wrong or expired code.");
      setBusy(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {step === "email" ? (
          <>
            <p className="text-muted-foreground">
              Enter your email to receive a login code.
            </p>
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border rounded-md p-2"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full py-2"
              >
                {busy ? "Sending…" : "Send code"}
              </button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium">{email}</span>. It is valid for 5
              minutes.
            </p>
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium">
                  Login code
                </label>
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-1 block w-full border rounded-md p-2"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full py-2"
              >
                {busy ? "Verifying…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                className="text-sm underline"
              >
                Use a different email
              </button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
