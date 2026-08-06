import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Icon, type IconName } from "../components/Icons";
import { fetchServices } from "../api/services";
import { SERVICES as CATALOG } from "../lib/serviceCatalog";
import { usePageTitle } from "../lib/usePageTitle";
import "./expert-advice.css";

const KNOWN_ICONS: IconName[] = ["survey", "drill", "pump", "water", "equip", "maintenance", "consult"];
const asIcon = (s: string | null | undefined): IconName => (s && KNOWN_ICONS.includes(s as IconName) ? (s as IconName) : "survey");

/* Process-specific copy keyed by service key (the development-process description
   and "what's involved" bullets — editorial detail that isn't in the catalogue).
   Titles, icons, order and the request link all come from GET /services. */
const CONTENT: Record<string, { desc: string; points: string[] }> = {
  geologist: {
    desc: "A hydrogeologist assesses your property to identify the best drilling location, estimate depth and determine the likelihood of finding enough water.",
    points: ["Desktop study of geology and nearby boreholes", "Field geophysical survey (resistivity / VES)", "Report with recommended point, depth and expected yield"],
  },
  drillers: {
    desc: "We drill the borehole to the recommended depth using modern equipment and industry best practices. Geological data is recorded.",
    points: ["Rig mobilization and site setup", "Drilling, casing and gravel packing", "Borehole development and a full drilling log"],
  },
  test_pump: {
    desc: "A test pump is installed to determine the borehole's yield and assess how the aquifer performs under continuous pumping.",
    points: ["Step and constant-rate pumping tests", "Yield, drawdown and recovery measured", "Recommended safe abstraction rate"],
  },
  surveys: {
    desc: "Water samples are analyzed in accredited labs to confirm safety for use and determine if any treatment is required.",
    points: ["Proper sample collection", "Physical, chemical and bacteriological tests", "Treatment recommendation where needed"],
  },
  pump_installer: {
    desc: "We install the right pump, rising main, power system (solar or electric), tanks and accessories for efficient and reliable water supply.",
    points: ["Correct pump sizing and selection", "Rising main, cabling and controls", "Solar / electric power, tank and plumbing"],
  },
  tank_installation: {
    desc: "Regular maintenance and monitoring keeps your borehole working efficiently and extends its lifespan.",
    points: ["Routine inspection and servicing", "Pump and water-level checks", "Timely repairs to extend lifespan"],
  },
};

/* Services that make up the linear development process (consultancy is advisory,
   not a stage). Order follows the catalogue's sort order. */
const PROCESS_KEYS = ["geologist", "drillers", "test_pump", "surveys", "pump_installer", "tank_installation"];

const WHY: { icon: IconName; title: string }[] = [
  { icon: "connect", title: "End-to-end project coordination" },
  { icon: "shield", title: "Verified & accredited service providers" },
  { icon: "card", title: "Transparent, fixed pricing" },
  { icon: "award", title: "Quality assurance at every stage" },
  { icon: "lock", title: "Secure payments" },
  { icon: "bell", title: "Real-time job tracking & updates" },
  { icon: "headset", title: "Ongoing support throughout your journey" },
];

interface Stage { key: string; icon: IconName; title: string; desc: string; points: string[]; }

/** Short label for the journey band. */
const shortLabel = (title: string) =>
  title.replace("Hydrogeological Survey", "Survey").replace(" Analysis", "").replace("Borehole ", "").trim();

export default function ExpertAdvice() {
  usePageTitle("Expert Advice — SMART Drill");
  const [open, setOpen] = useState(0);

  // Stages come from the live catalogue (falls back to the offline catalogue).
  const { data } = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const source = data && data.length
    ? data.map((s) => ({ key: s.key, name: s.name, icon: asIcon(s.icon), desc: s.description ?? "" }))
    : CATALOG.map((s) => ({ key: s.key, name: s.title, icon: s.icon, desc: s.blurb }));

  const stages: Stage[] = source
    .filter((s) => PROCESS_KEYS.includes(s.key))
    .sort((a, b) => PROCESS_KEYS.indexOf(a.key) - PROCESS_KEYS.indexOf(b.key))
    .map((s) => ({
      key: s.key,
      icon: s.icon,
      title: s.name,
      desc: CONTENT[s.key]?.desc ?? s.desc,
      points: CONTENT[s.key]?.points ?? [],
    }));

  return (
    <>
      <Header />

      {/* HERO */}
      <section className="sd-xa-hero">
        <div className="sd-container">
          <h1>Expert Advice</h1>
          <p>Understand the borehole development process. Make informed decisions with confidence.</p>
        </div>
      </section>

      {/* PROCESS */}
      <section className="sd-section">
        <div className="sd-container sd-xa">
          <div className="sd-xa__head">
            <h2>The Borehole Development Process</h2>
            <p>A successful borehole is the result of a well-planned process. Each stage is important and builds on the previous one to ensure you get a reliable and sustainable water source.</p>
          </div>

          <div className="sd-xa__steps">
            {stages.map((s, i) => {
              const isOpen = open === i;
              return (
                <div className={"sd-xa-card" + (isOpen ? " is-open" : "")} key={s.key}>
                  <button type="button" className="sd-xa-card__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span className="sd-xa-card__n">{i + 1}</span>
                    <span className="sd-xa-card__icon"><Icon name={s.icon} size={22} /></span>
                    <span className="sd-xa-card__body">
                      <span className="sd-xa-card__title">{s.title}</span>
                      <span className="sd-xa-card__desc">{s.desc}</span>
                    </span>
                    <span className="sd-xa-card__chev" aria-hidden="true"><Icon name="arrow" size={18} /></span>
                  </button>
                  <div className="sd-xa-card__panel">
                    {s.points.length > 0 && (
                      <ul>
                        {s.points.map((p) => <li key={p}><Icon name="check" size={15} /> {p}</li>)}
                      </ul>
                    )}
                    <Link to={`/request/${s.key}`} className="sd-xa-card__cta">Request {s.title} <Icon name="arrow" size={15} /></Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="sd-section sd-xa-why-sec">
        <div className="sd-container">
          <div className="sd-xa-why">
            <h2>Why Choose SMART Drill?</h2>
            <p>We manage the entire process end-to-end, working with trusted and verified experts to deliver quality, transparency and peace of mind.</p>
            <div className="sd-xa-why__grid">
              {WHY.map((w) => (
                <div className="sd-xa-why__item" key={w.title}>
                  <span className="sd-xa-why__icon"><Icon name={w.icon} size={20} /></span>
                  <span>{w.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* JOURNEY BAND */}
      <section className="sd-xa-journey">
        <div className="sd-container">
          <h2>The Borehole Journey with SMART Drill</h2>
          <div className="sd-xa-journey__row">
            {stages.map((s, i) => (
              <div className="sd-xa-journey__cell" key={s.key}>
                <div className="sd-xa-journey__step">
                  <span className="sd-xa-journey__icon"><Icon name={s.icon} size={22} /></span>
                  <span className="sd-xa-journey__label">{i + 1}. {shortLabel(s.title)}</span>
                </div>
                {i < stages.length - 1 && <span className="sd-xa-journey__arrow" aria-hidden="true"><Icon name="arrow" size={18} /></span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="sd-section">
        <div className="sd-container">
          <div className="sd-xa-final">
            <div className="sd-xa-final__icon"><Icon name="shield" size={26} /></div>
            <div className="sd-xa-final__text">
              <h3>SMART Drill Simplifies the Process</h3>
              <p>One platform. Trusted experts. Quality results. <strong>From start to finish.</strong></p>
            </div>
            <Link to="/#services" className="sd-btn sd-btn--primary sd-btn--lg">Get Started</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
