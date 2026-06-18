import dayjs from "dayjs";

export const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export const money = (v: string | number | null | undefined) => KES.format(Number(v ?? 0));

export const date = (v: string | null | undefined) => (v ? dayjs(v).format("DD MMM YYYY, HH:mm") : "—");

export const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Color for a booking/availability status badge. */
export function statusColor(status: string): string {
  switch (status) {
    case "available":
    case "completed":
      return "teal";
    case "booked":
    case "in_progress":
      return "blue";
    case "en_route":
    case "arrived":
      return "indigo";
    case "pending_payment":
      return "yellow";
    case "cancelled":
    case "offline":
    case "suspended":
      return "red";
    default:
      return "gray";
  }
}
