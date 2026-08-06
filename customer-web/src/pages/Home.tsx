import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ServiceCard, type CardData } from "../components/ServiceCard";
import { HeroScene } from "../components/HeroScene";
import { Icon, type IconName } from "../components/Icons";
import { SERVICES, type ServiceDef } from "../lib/serviceCatalog";
import { fetchServices, type ApiService } from "../api/services";
import "./home.css";

// The 7 icon keys the API may send; anything else falls back to a safe default.
const KNOWN_ICONS: IconName[] = ["survey", "drill", "pump", "water", "equip", "maintenance", "consult"];
const asIcon = (s: string | null): IconName => (KNOWN_ICONS.includes(s as IconName) ? (s as IconName) : "survey");
const money = (n: string) => "KES " + Number(n).toLocaleString("en-KE");

/** API service → card. Fixed shows "KES x" + unit; quote shows the unit + a helper note. */
function apiToCard(s: ApiService): CardData {
  const fixed = s.pricing_mode === "fixed" && s.price != null;
  return {
    key: s.key, name: s.name, blurb: s.description ?? "", icon: asIcon(s.icon),
    accent: s.accent ?? "#1656c7",
    priceMain: fixed ? money(s.price as string) : (s.price_unit ?? "Request a Quote"),
    priceNote: fixed ? (s.price_unit ?? "") : (s.price_note ?? ""),
    cta: s.cta_label ?? "Request Service",
  };
}
/** Offline fallback catalog → card. */
const catalogToCard = (s: ServiceDef): CardData => ({
  key: s.key, name: s.title, blurb: s.blurb, icon: s.icon, accent: s.accent,
  priceMain: s.pricing, priceNote: s.pricingNote, cta: s.cta,
});

const TRUST: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: "Verified Professionals", text: "Access qualified and experienced borehole service providers." },
  { icon: "handshake", title: "End-to-End Support", text: "From survey to maintenance, we're with you every step of the way." },
  { icon: "chart", title: "Clear Project Tracking", text: "Track your project progress and stay updated at every stage." },
  { icon: "phone", title: "Convenient Access", text: "Request and manage borehole services easily in one place." },
  { icon: "pin", title: "Local Expertise", text: "Built with deep knowledge of the borehole industry and your local needs." },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "tap", title: "Select a Service", text: "Choose the borehole service you need." },
  { icon: "form", title: "Tell Us About Your Project", text: "Share your location and a few project details." },
  { icon: "connect", title: "Get Connected", text: "We match you with the right service provider." },
  { icon: "bell", title: "Track Your Project", text: "Receive updates and track your project progress." },
];

export default function Home() {
  // Services come from the backend (GET /api/v1/services); the offline catalog
  // is a fallback while loading or if the API is unreachable.
  const { data } = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const cards: CardData[] = data && data.length ? data.map(apiToCard) : SERVICES.map(catalogToCard);
  const primary = cards.slice(0, 4);
  const secondary = cards.slice(4);
  return (
    <>
      <Header />

      {/* HERO — contained banner (square corners) with overlaid headline */}
      <section className="sd-hero">
        <div className="sd-container">
          <div className="sd-hero__banner">
            <HeroScene />
            <div className="sd-hero__photo" />
            <div className="sd-hero__overlay">
              <h1>Your <span className="sd-blue-text">One-Stop Shop</span><br />for Borehole Services</h1>
              <p>
                From the first survey to drilling, testing, equipping and maintenance,
                SMART Drill connects you with the professionals you need to complete your borehole project.
              </p>
              <div className="sd-hero__cta">
                <a href="#services" className="sd-btn sd-btn--primary sd-btn--lg">Get Started</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="sd-section" id="services">
        <div className="sd-container">
          <div className="sd-section__head">
            <h2>Which Service Are You Interested In?</h2>
          </div>
          <div className="sd-services__grid sd-services__grid--4">
            {primary.map((c) => <ServiceCard key={c.key} c={c} />)}
          </div>
          <div className="sd-services__grid sd-services__grid--3">
            {secondary.map((c) => <ServiceCard key={c.key} c={c} />)}
          </div>
        </div>
      </section>

      {/* TRUST STRIP (light, after services) */}
      <section className="sd-trust">
        <div className="sd-container sd-trust__grid">
          {TRUST.map((t) => (
            <div key={t.title} className="sd-trust__item">
              <div className="sd-trust__icon"><Icon name={t.icon} size={20} /></div>
              <div className="sd-trust__body">
                <strong>{t.title}</strong>
                <span>{t.text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (full-width light band, compact, square) */}
      <section className="sd-section sd-how" id="how">
        <div className="sd-container">
          <div className="sd-section__head"><h2>How It Works</h2></div>
          <div className="sd-how__row">
            {STEPS.map((s, i) => (
              <div className="sd-how__cell" key={s.title}>
                <div className="sd-how__step">
                  <div className="sd-how__icon"><Icon name={s.icon} size={22} /></div>
                  <div className="sd-how__body">
                    <h3>{i + 1}. {s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="sd-how__arrow" aria-hidden="true"><Icon name="arrow" size={22} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER (full-width light band, square) */}
      <section className="sd-cta-band">
        <div className="sd-container sd-cta-inner">
          <div className="sd-cta-banner__avatar"><img src="/worker.png" alt="SMART Drill expert" /></div>
          <div className="sd-cta-banner__text">
            <h2>Not Sure Where to Begin?</h2>
            <p>Tell us what you're trying to achieve or describe the problem you're experiencing. We'll guide you towards the right borehole service.</p>
          </div>
          <Link to="/expert-advice" className="sd-btn sd-btn--primary sd-btn--lg">Get Expert Guidance</Link>
          <svg className="sd-cta-banner__wave" viewBox="0 0 120 60" aria-hidden="true">
            <path d="M4 40 Q24 16 44 40 T84 40 T124 40" fill="none" stroke="#2f7be6" stroke-width="4" opacity="0.35" stroke-linecap="round"/>
            <path d="M4 52 Q24 30 44 52 T84 52 T124 52" fill="none" stroke="#2f7be6" stroke-width="4" opacity="0.2" stroke-linecap="round"/>
          </svg>
        </div>
      </section>

      <Footer />
    </>
  );
}
