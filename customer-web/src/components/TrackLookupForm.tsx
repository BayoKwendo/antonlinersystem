import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { lookupRequest, lookupVerify } from "../api/requests";
import { useOtpCountdown } from "../lib/useOtpCountdown";
import { PhoneField } from "./PhoneField";

/**
 * Two-step order lookup. Step 1: order number + phone → sends an OTP to the
 * phone that placed the order. Step 2: enter the OTP (with a live 5-minute
 * countdown) → resolves the tracking token and opens /track/:token.
 */
export function TrackLookupForm({ onDone }: { onDone?: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(300);
  const [resendKey, setResendKey] = useState(0);
  const cd = useOtpCountdown(expiresIn, resendKey);

  async function sendCode() {
    const { expires_in } = await lookupRequest(orderId.trim(), phone.trim());
    setExpiresIn(expires_in || 300);
    setResendKey((k) => k + 1);
  }

  async function onSubmitDetails(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!orderId.trim() || !phone.trim()) {
      setError("Please enter your Order ID and phone number.");
      return;
    }
    setLoading(true);
    try {
      await sendCode();
      setOtp("");
      setStep("otp");
    } catch {
      setError("We couldn't find a request with those details. Check your Order ID and phone number.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp() {
    if (cd.expired) {
      setError("That code has expired. Tap “Resend code” for a new one.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { tracking_token } = await lookupVerify(orderId.trim(), phone.trim(), otp.trim());
      onDone?.();
      navigate(`/track/${tracking_token}`);
    } catch {
      setError("That code is incorrect or has expired. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // "OTP friendly": submit automatically once all 6 digits are entered.
  useEffect(() => {
    if (step === "otp" && otp.length === 6 && !cd.expired && !loading) void submitOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  async function resend() {
    setError(null);
    setLoading(true);
    try {
      await sendCode();
      setOtp("");
    } catch {
      setError("We couldn't resend the code. Please go back and check your details.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <form className="sd-tl__form" onSubmit={(e) => { e.preventDefault(); void submitOtp(); }}>
        <div className="sd-tl__fields">
          <p className="sd-tl__info">We've sent a 6-digit code to <strong>{phone.trim()}</strong>.</p>
          <input
            className="sd-tl__input sd-tl__input--otp"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
            aria-label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={loading}
          />
          <p className={`sd-tl__count${cd.expired ? " sd-tl__count--expired" : ""}`}>
            {cd.expired ? "Code expired — request a new one" : `Code expires in ${cd.label}`}
          </p>
          <button className="sd-btn sd-btn--primary sd-btn--lg" disabled={loading || cd.expired || otp.length < 6}>
            {loading ? "Verifying…" : "View Status"}
          </button>
        </div>
        {error && <p className="sd-tl__err" role="alert">{error}</p>}
        <div className="sd-tl__row">
          <button type="button" className="sd-tl__linkbtn" onClick={() => { setStep("details"); setOtp(""); setError(null); }}>
            ← Change details
          </button>
          <button type="button" className="sd-tl__linkbtn" onClick={resend} disabled={loading}>
            Resend code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="sd-tl__form" onSubmit={onSubmitDetails}>
      <div className="sd-tl__fields">
        <input
          className="sd-tl__input"
          placeholder="Order ID (e.g. SDGE-260806-0007)"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          aria-label="Order ID"
          autoComplete="off"
        />
        <PhoneField value={phone} onChange={setPhone} placeholder="Phone number" />
        <button className="sd-btn sd-btn--primary sd-btn--lg" disabled={loading}>
          {loading ? "Sending code…" : "Track Order"}
        </button>
      </div>
      {error && <p className="sd-tl__err" role="alert">{error}</p>}
    </form>
  );
}
