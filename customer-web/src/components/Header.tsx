import { useState } from "react";
import { Link } from "react-router-dom";
import { TrackLookupDialog } from "./TrackLookupDialog";
import "./header.css";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "How It Works", href: "/#how" },
  { label: "About Us", href: "/#about" },
  { label: "For Providers", href: "/#providers" },
  { label: "Contact Us", href: "/#contact" },
];

export function Header() {
  // Also open the tracker via a `?track=1` deep link (handy for SMS/QR shortcuts).
  const [trackOpen, setTrackOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("track") === "1",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sd-header">
      <div className="sd-container sd-header__bar">
        <Link to="/" aria-label="SMART Drill home" className="sd-header__logo" onClick={closeMenu}>
          <img src="/logo.png" alt="SMART Drill" />
        </Link>

        <nav className="sd-header__nav">
          {NAV.map((n) => (
            <a key={n.label} href={n.href}>{n.label}</a>
          ))}
        </nav>

        <div className="sd-header__actions">
          <button type="button" className="sd-header__track" onClick={() => setTrackOpen(true)}>Track Order</button>
          <button
            type="button"
            className={"sd-header__burger" + (menuOpen ? " is-open" : "")}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div className={"sd-header__mobile" + (menuOpen ? " is-open" : "")}>
        {NAV.map((n) => (
          <a key={n.label} href={n.href} onClick={closeMenu}>{n.label}</a>
        ))}
        <button
          type="button"
          className="sd-header__mobile-cta"
          onClick={() => { closeMenu(); setTrackOpen(true); }}
        >
          Track an Order
        </button>
      </div>
      {menuOpen && <button type="button" className="sd-header__scrim" aria-hidden="true" tabIndex={-1} onClick={closeMenu} />}

      <TrackLookupDialog open={trackOpen} onClose={() => setTrackOpen(false)} />
    </header>
  );
}
