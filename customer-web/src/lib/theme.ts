/** Light/dark theme handling for the SMART Drill customer web app.
 *
 *  No stored choice → the app follows the OS (`prefers-color-scheme`, handled in
 *  tokens.css). Picking a theme sets `data-theme` on <html> and persists it, so
 *  the choice overrides the OS and survives reloads. A tiny inline script in
 *  index.html applies the stored value before first paint to avoid a flash. */
export type Theme = "light" | "dark";
const KEY = "sd-theme";

/** The user's explicit choice, or null when they follow the OS. */
export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** The theme actually on screen: the explicit choice, else the OS preference. */
export function activeTheme(): Theme {
  const stored = storedTheme();
  if (stored) return stored;
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Persist and apply an explicit theme choice. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  document.documentElement.setAttribute("data-theme", theme);
}
