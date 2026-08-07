/**
 * SMART Drill admin-portal wordmark: a blue water-drop mark + "SMART DRILL"
 * wordmark and an "ADMIN PORTAL" line. The mark is a single brand blue; the
 * text uses currentColor (set via light-dark()) so it reads on light or dark.
 */
const BLUE = "#2f7be6";

export function Logo({ size = "md", onDark = false }: { size?: "sm" | "md"; onDark?: boolean }) {
  const height = size === "sm" ? 30 : 40;
  const textColor = onDark ? "#ffffff" : "light-dark(var(--mantine-color-ink-9), var(--mantine-color-gray-0))";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={height} height={height} viewBox="0 0 512 512" role="img" aria-label="SMART Drill Admin Portal" style={{ display: "block" }}>
        <path fill={BLUE} d="M256 44 C256 44 108 232 108 340 a148 148 0 1 0 296 0 C404 232 256 44 256 44 Z" />
        <path fill="#ffffff" opacity="0.9" d="M300 300 C300 300 232 386 232 430 a34 34 0 1 0 68 0 C300 386 300 300 300 300 Z" />
      </svg>
      <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1, color: textColor }}>
        <span style={{ fontWeight: 800, fontSize: size === "sm" ? 17 : 20, letterSpacing: "-0.01em" }}>
          SMART <span style={{ color: onDark ? "#6ea8f0" : BLUE }}>DRILL</span>
        </span>
        <span style={{ fontSize: size === "sm" ? 8.5 : 10, letterSpacing: "0.22em", opacity: 0.7, marginTop: 3 }}>
          ADMIN PORTAL
        </span>
      </span>
    </span>
  );
}
