"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!/^\d{10}$/.test(digits)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!supabaseConfigured) {
      setError("SMS OTP service is not connected yet. Login is not active.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+91${digits}`,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;
      setPhone(digits);
      setOtpSent(true);
      setNotice("OTP sent to the registered mobile number.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      router.replace("/traffic-dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-form-wrap">
      {!supabaseConfigured && (
        <div className="login-config-warning">
          <strong>Setup required</strong>
          <span>The secure login screen is ready, but the SMS authentication service has not been connected yet.</span>
        </div>
      )}

      {!otpSent ? (
        <form onSubmit={sendOtp} className="login-form">
          <label htmlFor="login-phone">REGISTERED MOBILE NUMBER</label>
          <div className="login-phone-field">
            <span>+91</span>
            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              disabled={!supabaseConfigured || busy}
              required
            />
          </div>
          <button type="submit" disabled={!supabaseConfigured || busy}>
            {busy ? "SENDING..." : "SEND OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="login-form">
          <label htmlFor="login-otp">6-DIGIT SMS OTP</label>
          <input
            id="login-otp"
            className="login-otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter OTP"
            disabled={busy}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? "VERIFYING..." : "VERIFY & OPEN DASHBOARD"}
          </button>
          <button
            className="login-change-number"
            type="button"
            onClick={() => { setOtpSent(false); setOtp(""); setError(""); setNotice(""); }}
            disabled={busy}
          >
            Change mobile number
          </button>
        </form>
      )}

      {notice && <p className="login-notice" role="status">{notice}</p>}
      {error && <p className="login-error" role="alert">{error}</p>}
    </div>
  );
}
