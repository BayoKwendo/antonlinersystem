import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import "./footer.css";

/* Services map to their request pages so the footer is real navigation. */
const SERVICES: { label: string; to: string }[] = [
  { label: "Hydrogeological Surveys", to: "/request/geologist" },
  { label: "Borehole Drilling", to: "/request/drillers" },
  { label: "Test Pumping", to: "/request/test_pump" },
  { label: "Water Quality Analysis", to: "/request/surveys" },
  { label: "Borehole Equipping", to: "/request/pump_installer" },
  { label: "Borehole Maintenance", to: "/request/tank_installation" },
  { label: "Borehole Assessment and Consultancy", to: "/request/other_services" },
];

export function Footer() {
  return (
    <footer className="sd-footer" id="contact">
      <div className="sd-container sd-footer__grid">
        <div className="sd-footer__brand">
          <Logo size={34} tagline={false} onDark />
          <p>Your One-Stop Shop for Borehole Services</p>
          <div className="sd-footer__social">
            <a href="/#" aria-label="Facebook"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z" /></svg></a>
            <a href="/#" aria-label="Instagram"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a>
            <a href="/#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.94 8.5H4V20h2.94V8.5zM5.47 4a1.7 1.7 0 100 3.4 1.7 1.7 0 000-3.4zM20 13.6c0-3-1.6-4.4-3.7-4.4-1.7 0-2.5.9-2.9 1.6V8.5H10.5V20h2.9v-6.1c0-1.3.6-2.1 1.7-2.1s1.6.8 1.6 2.1V20H20v-6.4z" /></svg></a>
            <a href="/#" aria-label="YouTube"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22 8.2a3 3 0 00-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 002 8.2 31 31 0 002 12a31 31 0 00.1 3.8 3 3 0 002.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 002.1-2.1A31 31 0 0022 12a31 31 0 00-.1-3.8zM10 15V9l5 3-5 3z" /></svg></a>
          </div>
        </div>

        <div>
          <h4>Services</h4>
          {SERVICES.map((s) => (
            <Link key={s.to} to={s.to}>{s.label}</Link>
          ))}
        </div>

        <div>
          <h4>For Service Providers</h4>
          <a href="/#providers">Join SMART Drill</a>
          <a href="/#providers">Service Provider Login</a>
          <a href="/#providers">Provider Support</a>
        </div>

        <div>
          <h4>Support</h4>
          <a href="/#how">How SMART Drill Works</a>
          <a href="/#faqs">Frequently Asked Questions</a>
          <a href="/#contact">Contact Us</a>
          <a href="/#contact">Report an Issue</a>
        </div>

        <div>
          <h4>Legal</h4>
          <a href="/#legal">Terms and Conditions</a>
          <a href="/#legal">Privacy Policy</a>
          <a href="/#legal">Service Provider Terms</a>
          <a href="/#legal">Cookie Policy</a>
        </div>

        <div>
          <h4>Contact</h4>
          <p className="sd-footer__contact">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" /></svg>
            +254 700 123 456
          </p>
          <p className="sd-footer__contact">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            info@smartdrill.co.ke
          </p>
          <p className="sd-footer__contact">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
            Nairobi, Kenya
          </p>
        </div>
      </div>

      <div className="sd-footer__bottom">
        <div className="sd-container">
          <p>© {new Date().getFullYear()} SMART Drill. All rights reserved.</p>
          <p>SMART Drill connects customers with independent borehole service providers.</p>
          <p>Service availability may vary depending on location and project requirements.</p>
        </div>
      </div>
    </footer>
  );
}
