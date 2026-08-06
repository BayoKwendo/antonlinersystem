/** Wide hero backdrop (savanna + drilling rig on the right, open sky on the left
 *  for the overlaid headline). Self-contained SVG so the PWA works offline.
 *  Swap for a real photo by setting a background-image on .sd-hero__banner. */
export function HeroScene() {
  return (
    <svg className="sd-hero__scene" viewBox="0 0 1200 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#cfe0f7" /><stop offset="1" stop-color="#eaf1fc" />
        </linearGradient>
        <linearGradient id="hrig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2f7be6" /><stop offset="1" stop-color="#0e3e93" />
        </linearGradient>
      </defs>
      <rect width="1200" height="440" fill="url(#hsky)" />
      {/* sun */}
      <circle cx="980" cy="96" r="52" fill="#ffe0cc" />
      <circle cx="980" cy="96" r="32" fill="#e14d16" opacity="0.85" />
      {/* distant hills */}
      <path d="M0 300 Q260 236 520 296 T1040 288 T1200 300 V440 H0 Z" fill="#cdb89a" opacity="0.7" />
      {/* ground */}
      <path d="M0 330 H1200 V440 H0 Z" fill="#e2cfb2" />
      <path d="M0 372 H1200 V440 H0 Z" fill="#d3ba95" />
      {/* acacia tree (left, savanna) */}
      <g stroke="#7c5f3a" stroke-width="6" fill="none"><path d="M150 332 V270 M150 292 l-22 -16 M150 300 l24 -14" /></g>
      <ellipse cx="150" cy="258" rx="60" ry="16" fill="#6f8f4a" opacity="0.85" />
      {/* rig tower + truck (right) */}
      <g transform="translate(760 0)">
        <g stroke="url(#hrig)" stroke-width="8" stroke-linecap="round" fill="none">
          <path d="M150 322 L206 70 L262 322" />
          <path d="M170 230 L242 230 M162 276 L250 276 M180 176 L232 176 M190 122 L222 122" />
          <path d="M164 230 L242 276 M180 176 L232 230 M190 122 L222 176 M170 276 L250 230" opacity="0.55" />
        </g>
        <circle cx="206" cy="66" r="11" fill="#0e3e93" />
        <line x1="206" y1="77" x2="206" y2="416" stroke="#14384f" stroke-width="5" />
        <path d="M206 322 C206 322 154 366 190 402 a20 20 0 0 0 38 -9 c0 -24 -22 -44 -22 -60 Z" fill="#2f7be6" opacity="0.9" />
        <circle cx="256" cy="356" r="8" fill="#2f7be6" opacity="0.65" />
        <rect x="120" y="298" width="168" height="34" rx="7" fill="#14384f" />
        <circle cx="154" cy="334" r="16" fill="#0c2436" /><circle cx="154" cy="334" r="7" fill="#6b7a87" />
        <circle cx="252" cy="334" r="16" fill="#0c2436" /><circle cx="252" cy="334" r="7" fill="#6b7a87" />
      </g>
      {/* hard-hat worker silhouette */}
      <g transform="translate(690 236)" fill="#14384f">
        <path d="M20 18 a20 20 0 0 1 40 0 Z" fill="#e14d16" />
        <circle cx="40" cy="34" r="15" fill="#3a2a20" />
        <path d="M18 96 q22 -44 44 0 V96 Z" fill="#0e3e93" />
        <rect x="30" y="52" width="20" height="30" rx="8" fill="#0e3e93" />
      </g>
    </svg>
  );
}
