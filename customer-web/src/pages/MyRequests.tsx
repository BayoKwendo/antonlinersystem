import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Icon, type IconName } from "../components/Icons";
import { fetchTrack } from "../api/requests";
import { getServiceForm } from "../lib/serviceForms";
import { getRequests, removeRequest, type SavedRequest } from "../lib/myRequests";
import { usePageTitle } from "../lib/usePageTitle";
import "./my-requests.css";

/** Backend status -> friendly label + tone for the badge. */
const STATUS_META: Record<string, { label: string; tone: string }> = {
  submitted: { label: "In review", tone: "info" },
  pending_payment: { label: "Awaiting payment", tone: "warn" },
  quoted: { label: "Quote ready", tone: "warn" },
  booked: { label: "Provider assigned", tone: "info" },
  en_route: { label: "Provider en route", tone: "info" },
  arrived: { label: "Provider arrived", tone: "info" },
  in_progress: { label: "In progress", tone: "info" },
  completed: { label: "Confirm completion", tone: "warn" },
  confirmed: { label: "Completed", tone: "done" },
  cancelled: { label: "Cancelled", tone: "muted" },
  disputed: { label: "In dispute", tone: "warn" },
};

const ICON_BY_KEY: Record<string, IconName> = {
  geologist: "survey", drillers: "drill", test_pump: "pump", surveys: "water",
  pump_installer: "equip", tank_installation: "maintenance", other_services: "consult",
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });

function accentFor(key?: string): string {
  try {
    return key ? getServiceForm(key).accent : "#1656c7";
  } catch {
    return "#1656c7";
  }
}

function OrderRow({ r, onRemove }: { r: SavedRequest; onRemove: (token: string) => void }) {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["track", r.token],
    queryFn: () => fetchTrack(r.token),
    retry: false,
    staleTime: 30000,
  });
  const meta = data ? (STATUS_META[data.status] ?? { label: data.status, tone: "info" }) : null;
  const accent = accentFor(r.serviceKey);

  return (
    <div className="sd-orders__row" style={{ ["--accent" as string]: accent }}>
      <Link to={`/track/${r.token}`} className="sd-orders__link">
        <span className="sd-orders__icon"><Icon name={ICON_BY_KEY[r.serviceKey ?? ""] ?? "form"} size={20} /></span>
        <span className="sd-orders__main">
          <span className="sd-orders__title">{r.service}</span>
          <span className="sd-orders__meta">{r.requestNo} · {fmtDate(r.ts)}</span>
        </span>
        <span className={`sd-orders__badge sd-orders__badge--${meta?.tone ?? (isError ? "muted" : "info")}`}>
          {isError ? "Status unavailable" : isLoading ? "Loading…" : meta?.label}
        </span>
        <span className="sd-orders__chev"><Icon name="arrow" size={18} /></span>
      </Link>
      <button
        type="button"
        className="sd-orders__remove"
        aria-label="Remove from this device"
        onClick={() => onRemove(r.token)}
      >
        ×
      </button>
    </div>
  );
}

export default function MyRequests() {
  usePageTitle("My requests — SMART Drill");
  const [list, setList] = useState<SavedRequest[]>(() => getRequests());

  return (
    <>
      <Header />
      <main className="sd-section">
        <div className="sd-container sd-orders">
          <div className="sd-orders__head">
            <h1>My Requests</h1>
            <p>Track the status of requests you've submitted from this device.</p>
          </div>

          {list.length === 0 ? (
            <div className="sd-orders__empty">
              <div className="sd-orders__empty-icon"><Icon name="form" size={30} /></div>
              <h2>No requests yet</h2>
              <p>Once you submit a service request, it will appear here so you can follow its progress.</p>
              <Link to="/#services" className="sd-btn sd-btn--primary sd-btn--lg">Browse Services</Link>
            </div>
          ) : (
            <div className="sd-orders__list">
              {list.map((r) => (
                <OrderRow key={r.token} r={r} onRemove={(t) => setList(removeRequest(t))} />
              ))}
              <p className="sd-orders__note">
                Requests are remembered on this device only. We've also sent each tracking link to your phone by SMS.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
