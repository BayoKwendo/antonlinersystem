import { useState } from "react";
import { Icon } from "./Icons";
import { activeTheme, setTheme, type Theme } from "../lib/theme";

/** Header light/dark toggle. Reflects the theme on screen (explicit choice or OS
 *  default) and flips to the opposite, persisting the choice. */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() => activeTheme());
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };
  return (
    <button
      type="button"
      className="sd-theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
