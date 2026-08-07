/** Inline stroke-icon set, drawn to match the SMART Drill service iconography.
 *  Keeps the bundle free of an icon library. */
type P = { size?: number; className?: string };
const base = (size = 24, className?: string) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const, className,
});

export function Icon({ name, size, className }: { name: IconName } & P) {
  const p = base(size, className);
  switch (name) {
    // pin over a small map/grid — hydrogeological survey
    case "survey": return <svg {...p}><path d="M4 15.5l4-1.5 8 3 4-1.5"/><path d="M4 15.5V20l4-1.5 8 3 4-1.5V15.5"/><path d="M8 14V9M16 17v-3"/><path d="M12 3a3.5 3.5 0 0 0-3.5 3.5c0 2.4 3.5 5 3.5 5s3.5-2.6 3.5-5A3.5 3.5 0 0 0 12 3Z"/><circle cx="12" cy="6.5" r="1.2"/></svg>;
    // rig on a truck — borehole drilling
    case "drill": return <svg {...p}><path d="M6 13 L9 3 L12 13"/><path d="M7 8h4"/><path d="M9 3v-1"/><path d="M3 17h11v-4H3z"/><path d="M14 17v-4h2l2 2v2z"/><circle cx="6" cy="18.5" r="1.6"/><circle cx="16" cy="18.5" r="1.6"/></svg>;
    // canister + gauge — test pumping
    case "pump": return <svg {...p}><circle cx="12" cy="4.5" r="2.3"/><path d="M12 3.2v2.6M10.7 4.5h2.6"/><path d="M8.5 10a3.5 3.5 0 0 1 7 0v7.5a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M8.5 13.5h7"/></svg>;
    // erlenmeyer flask — water quality
    case "water": return <svg {...p}><path d="M9 3h6"/><path d="M10 3v5l-4.2 8.4A2 2 0 0 0 7.6 20h8.8a2 2 0 0 0 1.8-3.6L14 8V3"/><path d="M7.5 16h9"/></svg>;
    // pump dispenser — borehole equipping
    case "equip": return <svg {...p}><rect x="6.5" y="3" width="8" height="18" rx="2"/><rect x="8.5" y="6" width="4" height="3" rx="1"/><path d="M14.5 10h2a1 1 0 0 1 1 1v4a1.5 1.5 0 0 0 3 0V9l-2-2"/><path d="M6 21h9"/></svg>;
    // gear — borehole maintenance
    case "maintenance": return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 7.9 5.4l.1.1a1.6 1.6 0 0 0 2.7-1.1V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-1.1 2.7H20a2 2 0 1 1 0 4Z"/></svg>;
    // person — consultancy
    case "consult": return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>;
    // trust strip
    case "shield": return <svg {...p}><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "handshake": return <svg {...p}><path d="M3 12l3.4-3.4a2 2 0 0 1 2.8 0L12 11l2.8-2.4a2 2 0 0 1 2.8 0L21 12"/><path d="M8 13.5l2.4 2.4a1.6 1.6 0 0 0 2.3 0l3.8-3.8"/><path d="M3 12v4M21 12v4"/></svg>;
    case "chart": return <svg {...p}><path d="M4 4v16h16"/><rect x="7.2" y="13" width="2.4" height="4"/><rect x="11.4" y="10" width="2.4" height="7"/><rect x="15.6" y="7" width="2.4" height="10"/><path d="M7 11.5l3.4-2.6 3 1.8L20 6"/></svg>;
    case "phone": return <svg {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>;
    case "pin": return <svg {...p}><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
    // how-it-works
    case "tap": return <svg {...p}><path d="M9 10.5V5.5a1.5 1.5 0 0 1 3 0v4.5"/><path d="M12 10V4.2a1.5 1.5 0 0 1 3 0V10"/><path d="M15 10.2V6.7a1.5 1.5 0 0 1 3 0V15a4 4 0 0 1-4 4h-2.2a4 4 0 0 1-2.9-1.3l-2.6-2.8a1.6 1.6 0 0 1 2.3-2.2L9 12.6"/></svg>;
    case "cursor": return <svg {...p}><path d="M5 3l6 18 2.2-7.8L21 11z"/></svg>;
    case "form": return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
    case "connect": return <svg {...p}><circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 20a5 5 0 0 1 10 0"/><path d="M14.5 20a4 4 0 0 1 6.5-3.1"/></svg>;
    case "bell": return <svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>;
    case "arrow": return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "check": return <svg {...p}><path d="m5 12 5 5 9-11"/></svg>;
    // invoice / document with a folded corner
    case "doc": return <svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>;
    // payment card
    case "card": return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9.5h18"/><path d="M7 15h4"/></svg>;
    case "mail": return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>;
    // single person — provider contact
    case "user": return <svg {...p}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>;
    // clock — fast response
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>;
    // padlock — secure payments / privacy
    case "lock": return <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/></svg>;
    // magnifier — map search
    case "search": return <svg {...p}><circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/></svg>;
    // paper plane — submit
    case "send": return <svg {...p}><path d="M21 3 10.5 13.5"/><path d="M21 3 14 21l-3.6-7.4L3 10z"/></svg>;
    // headset — support
    case "headset": return <svg {...p}><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M20 19a4 4 0 0 1-4 3h-2"/></svg>;
    // person with a check — "we create an account for you"
    case "usercheck": return <svg {...p}><circle cx="9.5" cy="8" r="3.3"/><path d="M4 19a5.5 5.5 0 0 1 9.5-3.8"/><path d="m14.5 18 2 2 4-4.2"/></svg>;
    // cloud upload — drag & drop dropzone
    case "upload": return <svg {...p}><path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.5 9.5a3.5 3.5 0 0 1 .5 6.96"/><path d="M12 12v7"/><path d="m9 15 3-3 3 3"/></svg>;
    // calendar — sampling date
    case "calendar": return <svg {...p}><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>;
    // sun — solar power
    case "sun": return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>;
    // plug — electric grid
    case "plug": return <svg {...p}><path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/></svg>;
    // bolt — power source
    case "bolt": return <svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>;
    // speech bubble — describe the issue
    case "chat": return <svg {...p}><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>;
    // medal — industry standard / quality
    case "award": return <svg {...p}><circle cx="12" cy="9" r="5"/><path d="m8.5 13-1.2 8L12 18.4 16.7 21l-1.2-8"/></svg>;
    // wrench — professional installation
    case "wrench": return <svg {...p}><path d="M14.7 6.3a3.6 3.6 0 0 0-4.6 4.6l-5.4 5.4a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a3.6 3.6 0 0 0 4.6-4.6l-2.4 2.4-2-.5-.5-2z"/></svg>;
    default: return null;
  }
}

export type IconName =
  | "survey" | "drill" | "pump" | "water" | "equip" | "maintenance" | "consult"
  | "shield" | "handshake" | "chart" | "phone" | "pin"
  | "tap" | "cursor" | "form" | "connect" | "bell" | "arrow" | "check"
  | "doc" | "card" | "mail" | "user" | "clock" | "lock" | "search" | "send" | "headset" | "usercheck" | "upload"
  | "calendar" | "sun" | "plug" | "bolt" | "chat" | "award" | "wrench";
