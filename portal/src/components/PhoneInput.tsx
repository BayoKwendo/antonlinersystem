import { TextInput } from "@mantine/core";
import type { ReactNode } from "react";

/** Local national digits from any stored form (254…, 0…, 7…), capped at 9. */
function nationalOf(value: string): string {
  const d = (value || "").replace(/\D/g, "");
  const wo = d.startsWith("254") ? d.slice(3) : d;
  return wo.replace(/^0+/, "").slice(0, 9);
}

/**
 * Kenyan phone input: a 🇰🇪 +254 flag prefix + local entry. The user just types
 * 0717629732 (or 717629732); the value emitted is the normalised 254717629732.
 * Extra digits are blocked (9 national digits max).
 */
export function PhoneInput({ value, onChange, label, error, required, placeholder, mb }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  error?: ReactNode;
  required?: boolean;
  placeholder?: string;
  mb?: string;
}) {
  const national = nationalOf(value);
  return (
    <TextInput
      label={label}
      required={required}
      error={error}
      mb={mb}
      inputMode="tel"
      leftSection={<span style={{ fontSize: 13, whiteSpace: "nowrap" }}>🇰🇪 +254</span>}
      leftSectionWidth={64}
      maxLength={9}
      value={national}
      placeholder={placeholder ?? "712 345 678"}
      onChange={(e) => {
        const nat = e.currentTarget.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
        onChange(nat ? `254${nat}` : "");
      }}
    />
  );
}
