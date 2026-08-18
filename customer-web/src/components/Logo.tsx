/** SMART Drill wordmark: blue water-drop + "SMART DRILL" ("SMART" ink, "DRILL" blue).
 *  Sizing is em-based off the container font-size so callers can scale it either
 *  with the `size` prop or, responsively, by setting `--sd-logo-size` in CSS.
 *  "SMART" uses var(--sd-ink) so it adapts to light/dark automatically; pass
 *  onDark for always-dark surfaces (e.g. the footer) where it must stay white. */
export function Logo({
  size = 34,
  tagline = true,
  onDark = false,
  className,
}: { size?: number; tagline?: boolean; onDark?: boolean; className?: string }) {
  const smart = onDark ? "#ffffff" : "var(--sd-ink)";
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.29em", fontSize: `var(--sd-logo-size, ${size}px)` }}
    >
      <svg width="1em" height="1em" viewBox="0 0 512 512" aria-hidden="true" style={{ flex: "none" }}>
        <path fill="#1656c7" d="M256 44 C256 44 108 232 108 340 a148 148 0 1 0 296 0 C404 232 256 44 256 44 Z" />
        <path fill="#fff" opacity="0.9" d="M300 300 C300 300 232 386 232 430 a34 34 0 1 0 68 0 C300 386 300 300 300 300 Z" />
      </svg>
      <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontWeight: 800, fontSize: "0.62em", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
          <span style={{ color: smart }}>SMART</span>
          <span style={{ color: "#2f7be6" }}> DRILL</span>
        </span>
        {tagline && (
          <span style={{ fontSize: "0.24em", letterSpacing: "0.03em", color: onDark ? "rgba(255,255,255,.7)" : "var(--sd-muted)", marginTop: "0.09em" }}>
            Your One-Stop Shop for Borehole Services
          </span>
        )}
      </span>
    </span>
  );
}
