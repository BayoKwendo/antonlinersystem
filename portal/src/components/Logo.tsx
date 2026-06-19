/**
 * AntonLiner wordmark, drawn as an inline SVG vector.
 *  - The "a" mark and divider bar stay brand-orange in both schemes.
 *  - "anton liner" / "SYSTEMS LIMITED" use `currentColor`, which we set via
 *    CSS `light-dark()` so the text flips to a light tone in dark mode.
 */
const VB_W = 268;
const VB_H = 64;
const ORANGE = "#e14d16";

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const height = size === "sm" ? 28 : 40;
  const width = (height * VB_W) / VB_H;
  return (
    <svg
      height={height}
      width={width}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label="AntonLiner Systems Limited"
      style={{
        display: "block",
        color: "light-dark(var(--mantine-color-ink-9), var(--mantine-color-gray-0))",
      }}
    >
      {/* mark */}
      <text
        x="0"
        y="50"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="62"
        fontWeight="800"
        fill={ORANGE}
      >
        a
      </text>
      <rect x="44" y="10" width="6" height="44" rx="3" fill={ORANGE} />

      {/* wordmark (adapts to color scheme) */}
      <text
        x="62"
        y="40"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="34"
        fontWeight="700"
        letterSpacing="-0.5"
        fill="currentColor"
      >
        anton liner
      </text>
      <text
        x="64"
        y="57"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="11.5"
        letterSpacing="4"
        fill="currentColor"
        opacity="0.75"
      >
        SYSTEMS LIMITED
      </text>
    </svg>
  );
}
