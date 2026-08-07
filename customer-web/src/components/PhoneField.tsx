import { useMemo, useState } from "react";
import "./phone-field.css";

interface Country { code: string; name: string; dial: string; }

/** Curated list — East Africa first, then common international codes. */
const COUNTRIES: Country[] = [
  { code: "KE", name: "Kenya", dial: "254" },
  { code: "UG", name: "Uganda", dial: "256" },
  { code: "TZ", name: "Tanzania", dial: "255" },
  { code: "RW", name: "Rwanda", dial: "250" },
  { code: "BI", name: "Burundi", dial: "257" },
  { code: "SS", name: "South Sudan", dial: "211" },
  { code: "ET", name: "Ethiopia", dial: "251" },
  { code: "SO", name: "Somalia", dial: "252" },
  { code: "CD", name: "DR Congo", dial: "243" },
  { code: "ZM", name: "Zambia", dial: "260" },
  { code: "ZW", name: "Zimbabwe", dial: "263" },
  { code: "MW", name: "Malawi", dial: "265" },
  { code: "MZ", name: "Mozambique", dial: "258" },
  { code: "ZA", name: "South Africa", dial: "27" },
  { code: "NG", name: "Nigeria", dial: "234" },
  { code: "GH", name: "Ghana", dial: "233" },
  { code: "EG", name: "Egypt", dial: "20" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "SA", name: "Saudi Arabia", dial: "966" },
  { code: "QA", name: "Qatar", dial: "974" },
  { code: "IN", name: "India", dial: "91" },
  { code: "CN", name: "China", dial: "86" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "US", name: "United States", dial: "1" },
  { code: "CA", name: "Canada", dial: "1" },
  { code: "DE", name: "Germany", dial: "49" },
  { code: "FR", name: "France", dial: "33" },
  { code: "IT", name: "Italy", dial: "39" },
  { code: "ES", name: "Spain", dial: "34" },
  { code: "NL", name: "Netherlands", dial: "31" },
  { code: "AU", name: "Australia", dial: "61" },
];

/** ISO country code → flag emoji (regional indicator symbols). */
const flag = (cc: string) => cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

/** IANA timezone → country, for the supported dial codes. Timezone reflects the
 *  user's actual location better than the UI language (e.g. an en-US phone in
 *  Nairobi still reports Africa/Nairobi). */
const TZ_TO_CC: Record<string, string> = {
  "Africa/Nairobi": "KE", "Africa/Kampala": "UG", "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kigali": "RW", "Africa/Bujumbura": "BI", "Africa/Juba": "SS",
  "Africa/Addis_Ababa": "ET", "Africa/Mogadishu": "SO", "Africa/Kinshasa": "CD",
  "Africa/Lubumbashi": "CD", "Africa/Lusaka": "ZM", "Africa/Harare": "ZW",
  "Africa/Blantyre": "MW", "Africa/Maputo": "MZ", "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Cairo": "EG",
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Kolkata": "IN",
  "Asia/Shanghai": "CN", "Europe/London": "GB", "Europe/Berlin": "DE",
  "Europe/Paris": "FR", "Europe/Rome": "IT", "Europe/Madrid": "ES",
  "Europe/Amsterdam": "NL", "Australia/Sydney": "AU",
};

/** Default country from the browser: timezone first (actual location), then the
 *  locale region, else Kenya (the primary market). */
function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const byTz = TZ_TO_CC[tz];
    if (byTz && COUNTRIES.some((c) => c.code === byTz)) return byTz;
  } catch { /* Intl unavailable */ }
  try {
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
    for (const l of langs) {
      const m = /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(l || "");
      if (m) {
        const cc = m[1].toUpperCase();
        if (COUNTRIES.some((c) => c.code === cc)) return cc;
      }
    }
  } catch { /* navigator unavailable */ }
  return "KE";
}

/**
 * International phone input: a flag + dial-code country selector (defaulting to
 * the browser's region) plus the local number. Emits the full E.164-style
 * string (`+<dial><national>`), which the backend's normalizePhone accepts.
 */
export function PhoneField({ value, onChange, id, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const [cc, setCc] = useState<string>(() => detectCountry());
  const dial = useMemo(() => COUNTRIES.find((c) => c.code === cc)?.dial ?? "254", [cc]);

  // Derive the national part shown in the box from the combined value (drop the dial + leading zeros).
  const national = useMemo(() => {
    const digits = (value || "").replace(/[^\d]/g, "");
    const withoutDial = digits.startsWith(dial) ? digits.slice(dial.length) : digits;
    return withoutDial.replace(/^0+/, "");
  }, [value, dial]);

  // Kenyan mobiles are 9 national digits (7XXXXXXXX / 1XXXXXXXX); cap so users
  // can't type extra digits. Other countries get a slightly looser cap.
  const maxNat = dial === "254" ? 9 : 12;
  const emit = (dialX: string, natRaw: string) => {
    const cap = dialX === "254" ? 9 : 12;
    const n = natRaw.replace(/\D/g, "").replace(/^0+/, "").slice(0, cap);
    // Emit WITHOUT a leading "+" — no plus is sent anywhere in the system
    // (e.g. 254717629732). The "+" stays a display-only prefix.
    onChange(n ? `${dialX}${n}` : "");
  };

  return (
    <div className="sd-phone">
      <select
        className="sd-phone__cc"
        aria-label="Country code"
        value={cc}
        onChange={(e) => {
          const next = e.target.value;
          setCc(next);
          emit(COUNTRIES.find((c) => c.code === next)?.dial ?? "254", national);
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>
        ))}
      </select>
      <div className="sd-phone__num">
        <span className="sd-phone__dial">+{dial}</span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          maxLength={maxNat}
          placeholder={placeholder ?? "712 345 678"}
          onChange={(e) => emit(dial, e.target.value)}
        />
      </div>
    </div>
  );
}
