import { useEffect, useMemo, useState } from "react";

/**
 * Counts down `seconds` (the server's OTP TTL) to zero, ticking every second.
 * Bump `resetKey` (e.g. each time a code is sent/resent) to restart the timer.
 * Returns the seconds remaining, an `expired` flag, and an "M:SS" label.
 */
export function useOtpCountdown(seconds: number, resetKey: number) {
  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000);
  useEffect(() => {
    setDeadline(Date.now() + seconds * 1000);
  }, [resetKey, seconds]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    const remaining = Math.max(0, Math.round((deadline - now) / 1000));
    const mm = Math.floor(remaining / 60);
    const ss = remaining % 60;
    return { remaining, expired: remaining === 0, label: `${mm}:${String(ss).padStart(2, "0")}` };
  }, [deadline, now]);
}
