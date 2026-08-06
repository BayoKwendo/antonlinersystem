import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon } from "./Icons";
import { etaDaysFor } from "../lib/serviceForms";
import "./request-status.css";

// The 4 customer-facing milestones. `done` is derived from the backend status.
const STEPS = [
  { label: "Request Received", text: "We have received your request and it is being reviewed." },
  { label: "Request Confirmed", text: "Your request has been confirmed and a provider assigned." },
  { label: "Payment Received", text: "Payment has been received successfully." },
  { label: "Service Delivery", text: "Your provider will contact you and schedule the site visit." },
];

// How many of the 4 milestones are complete for a given backend status.
const STATUS_DONE: Record<string, number> = {
  submitted: 1, pending_payment: 1, quoted: 1,
  booked: 3, en_route: 3, arrived: 3, in_progress: 3, completed: 3,
  confirmed: 4, cancelled: 1, disputed: 3,
};

const firstName = (n: string) => (n?.trim().split(/\s+/)[0]) || "there";
const two = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d: Date) => d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86400000),
    hrs: Math.floor(diff / 3600000) % 24,
    mins: Math.floor(diff / 60000) % 60,
    secs: Math.floor(diff / 1000) % 60,
    done: diff === 0,
  };
}

export interface RequestStatusProps {
  name: string;
  serviceName: string;
  requestNo: string;
  submittedAt: Date;
  status: string;
  serviceKey: string;
  accent: string;
  title: string;
  subtitle: string;
}

export function RequestStatusView(p: RequestStatusProps) {
  const target = useMemo(() => p.submittedAt.getTime() + etaDaysFor(p.serviceKey) * 86400000, [p.submittedAt, p.serviceKey]);
  const cd = useCountdown(target);
  const doneCount = STATUS_DONE[p.status] ?? 1;
  const finished = p.status === "confirmed" || p.status === "completed";
  const rootStyle = { ["--accent"]: p.accent } as CSSProperties;

  return (
    <section className="sd-succ" style={rootStyle}>
      <div className="sd-container">
        {/* header */}
        <div className="sd-succ__hero">
          <div className="sd-succ__check"><Icon name="check" size={34} /></div>
          <h1>Hi {firstName(p.name)}!</h1>
          <p className="sd-succ__title">{p.title}</p>
          <p className="sd-succ__sub">{p.subtitle}</p>
        </div>

        {/* service card */}
        <div className="sd-succ__service">
          <div className="sd-succ__svc-left">
            <div className="sd-succ__svc-icon"><Icon name="form" size={22} /></div>
            <div>
              <span className="sd-succ__label">Service Requested</span>
              <strong>{p.serviceName}</strong>
              <small>Request ID: {p.requestNo}</small>
            </div>
          </div>
          <div className="sd-succ__svc-right">
            <div className="sd-succ__svc-icon sd-succ__svc-icon--muted"><Icon name="calendar" size={20} /></div>
            <div>
              <span className="sd-succ__label">Submitted On</span>
              <strong>{fmtDate(p.submittedAt)}</strong>
              <small>{fmtTime(p.submittedAt)}</small>
            </div>
          </div>
        </div>

        {/* countdown */}
        {!finished && (
          <div className="sd-succ__eta">
            <div className="sd-succ__eta-head"><Icon name="clock" size={18} /> Estimated Service Delivery in</div>
            <div className="sd-succ__cd">
              {[["Days", cd.days], ["Hrs", cd.hrs], ["Mins", cd.mins], ["Secs", cd.secs]].map(([lbl, val]) => (
                <div className="sd-succ__cd-cell" key={lbl as string}>
                  <span className="sd-succ__cd-num">{two(val as number)}</span>
                  <span className="sd-succ__cd-lbl">{(lbl as string).toUpperCase()}</span>
                </div>
              ))}
            </div>
            <p className="sd-succ__eta-note">This is an estimated time. We'll keep you updated at every step.</p>
            {/* Drilling-rig art (public/request.png), keyed onto the light card. */}
            <img className="sd-succ__rig" src="/request.png" alt="" aria-hidden="true" />
          </div>
        )}

        {/* timeline */}
        <div className="sd-succ__timeline">
          <ol>
            {STEPS.map((s, i) => {
              const state = i < doneCount ? "done" : i === doneCount ? "active" : "todo";
              const isDelivery = i === 3;
              return (
                <li key={s.label} className={"sd-succ__step sd-succ__step--" + state}>
                  <div className="sd-succ__dot">{state === "done" ? <Icon name="check" size={14} /> : null}</div>
                  <div className="sd-succ__step-body">
                    <strong>{s.label}</strong>
                    <span>{s.text}</span>
                  </div>
                  <div className="sd-succ__step-meta">
                    {state === "done" && i === 0 && (<>{fmtDate(p.submittedAt)}<br />{fmtTime(p.submittedAt)}</>)}
                    {isDelivery && !finished && state !== "done" && (
                      <span className="sd-succ__eta-inline">In {cd.days}d {cd.hrs}h {cd.mins}m</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* need help */}
        <div className="sd-succ__help">
          <div className="sd-succ__help-icon"><Icon name="headset" size={22} /></div>
          <div className="sd-succ__help-body">
            <strong>Need Help?</strong>
            <p>Our support team is here for you.</p>
          </div>
          <div className="sd-succ__help-cta">
            <a href="tel:+254700123456" className="sd-btn sd-btn--ghost"><Icon name="phone" size={15} /> +254 700 123 456</a>
            <span>Mon – Sat, 7:00 AM – 7:00 PM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
