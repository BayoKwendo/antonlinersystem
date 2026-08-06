import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Icon, type IconName } from "../components/Icons";
import { usePageTitle } from "../lib/usePageTitle";
import "./expert-advice.css";

interface Stage {
  key: string;
  icon: IconName;
  title: string;
  desc: string;
  points: string[];
}

const STAGES: Stage[] = [
  {
    key: "geologist", icon: "survey", title: "Hydrogeological Survey",
    desc: "A hydrogeologist assesses your property to identify the best drilling location, estimate depth and determine the likelihood of finding enough water.",
    points: ["Desktop study of geology and nearby boreholes", "Field geophysical survey (resistivity / VES)", "Report with recommended point, depth and expected yield"],
  },
  {
    key: "drillers", icon: "drill", title: "Borehole Drilling",
    desc: "We drill the borehole to the recommended depth using modern equipment and industry best practices. Geological data is recorded.",
    points: ["Rig mobilization and site setup", "Drilling, casing and gravel packing", "Borehole development and a full drilling log"],
  },
  {
    key: "test_pump", icon: "pump", title: "Test Pumping",
    desc: "A test pump is installed to determine the borehole's yield and assess how the aquifer performs under continuous pumping.",
    points: ["Step and constant-rate pumping tests", "Yield, drawdown and recovery measured", "Recommended safe abstraction rate"],
  },
  {
    key: "surveys", icon: "water", title: "Water Quality Analysis",
    desc: "Water samples are analyzed in accredited labs to confirm safety for use and determine if any treatment is required.",
    points: ["Proper sample collection", "Physical, chemical and bacteriological tests", "Treatment recommendation where needed"],
  },
  {
    key: "pump_installer", icon: "equip", title: "Borehole Equipping",
    desc: "We install the right pump, rising main, power system (solar or electric), tanks and accessories for efficient and reliable water supply.",
    points: ["Correct pump sizing and selection", "Rising main, cabling and controls", "Solar / electric power, tank and plumbing"],
  },
  {
    key: "tank_installation", icon: "maintenance", title: "Borehole Maintenance",
    desc: "Regular maintenance and monitoring keeps your borehole working efficiently and extends its lifespan.",
    points: ["Routine inspection and servicing", "Pump and water-level checks", "Timely repairs to extend lifespan"],
  },
];

const WHY: { icon: IconName; title: string }[] = [
  { icon: "connect", title: "End-to-end project coordination" },
  { icon: "shield", title: "Verified & accredited service providers" },
  { icon: "card", title: "Transparent, fixed pricing" },
  { icon: "award", title: "Quality assurance at every stage" },
  { icon: "lock", title: "Secure payments" },
  { icon: "bell", title: "Real-time job tracking & updates" },
  { icon: "headset", title: "Ongoing support throughout your journey" },
];

export default function ExpertAdvice() {
  usePageTitle("Expert Advice — SMART Drill");
  const [open, setOpen] = useState(0);

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
            {STAGES.map((s, i) => {
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
                    <ul>
                      {s.points.map((p) => <li key={p}><Icon name="check" size={15} /> {p}</li>)}
                    </ul>
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
            {STAGES.map((s, i) => (
              <div className="sd-xa-journey__cell" key={s.key}>
                <div className="sd-xa-journey__step">
                  <span className="sd-xa-journey__icon"><Icon name={s.icon} size={22} /></span>
                  <span className="sd-xa-journey__label">{i + 1}. {s.title.replace("Hydrogeological ", "").replace("Analysis", "").replace("Borehole ", "").trim()}</span>
                </div>
                {i < STAGES.length - 1 && <span className="sd-xa-journey__arrow" aria-hidden="true"><Icon name="arrow" size={18} /></span>}
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
