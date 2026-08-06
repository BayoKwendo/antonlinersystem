import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "./Icons";
import "./service-card.css";

/** Normalized card shape (fed by the API or the offline fallback catalog). */
export interface CardData {
  key: string;
  name: string;
  blurb: string;
  icon: IconName;
  accent: string;
  priceMain: string; // "KES 55,000" or "Guided by Survey" / "Request a Quote"
  priceNote: string; // "Flat Rate" / "Per Meter" / quote helper line
  cta: string;
}

export function ServiceCard({ c }: { c: CardData }) {
  return (
    <div className="sd-card">
      <div className="sd-card__head">
        <div className="sd-card__icon" style={{ color: c.accent, background: `${c.accent}14` }}>
          <Icon name={c.icon} size={26} />
        </div>
        <h3 className="sd-card__title">{c.name}</h3>
      </div>
      <p className="sd-card__blurb">{c.blurb}</p>
      <div className="sd-card__price" style={{ borderColor: `${c.accent}33`, background: `${c.accent}12` }}>
        <span className="sd-card__price-main" style={{ color: c.accent }}>{c.priceMain}</span>
        {c.priceNote && <span className="sd-card__price-note">{c.priceNote}</span>}
      </div>
      <Link
        to={`/request/${c.key}`}
        className="sd-btn sd-btn--block sd-card__cta"
        style={{ ["--c" as string]: c.accent } as CSSProperties}
      >
        {c.cta}
      </Link>
    </div>
  );
}
