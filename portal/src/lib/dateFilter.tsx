import { createContext, useContext, useState, type ReactNode } from "react";

export type DateRange = [Date | null, Date | null];

interface Ctx {
  range: DateRange;
  setRange: (r: DateRange) => void;
}

const DateFilterContext = createContext<Ctx | null>(null);

/** Shares the dashboard date-range filter (default: today) across the header
 *  control and the pages that scope their data by it. */
export function DateFilterProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  const [range, setRange] = useState<DateRange>([today, today]);
  return <DateFilterContext.Provider value={{ range, setRange }}>{children}</DateFilterContext.Provider>;
}

export function useDateFilter(): Ctx {
  const c = useContext(DateFilterContext);
  if (!c) throw new Error("useDateFilter must be used within DateFilterProvider");
  return c;
}

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Convert the range to backend query params (YYYY-MM-DD); a single date sets from=to. */
export function rangeToParams(range: DateRange): { from?: string; to?: string } {
  const [a, b] = range;
  if (!a) return {};
  return { from: fmt(a), to: fmt(b ?? a) };
}

const sameDay = (x: Date, y: Date) => x.toDateString() === y.toDateString();

/** True when the range is a single day equal to today (default state). */
export function isTodayRange(range: DateRange): boolean {
  const [a, b] = range;
  return !!a && (!b || sameDay(a, b)) && sameDay(a, new Date());
}
