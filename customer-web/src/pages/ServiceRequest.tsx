import { Suspense, lazy, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Icon, type IconName } from "../components/Icons";
import { fetchServices, type ApiService } from "../api/services";
import { SERVICES, type ServiceDef } from "../lib/serviceCatalog";
import { getServiceForm, HOW_IT_WORKS_NOTE, TIMELINE_ICONS, DEFAULT_TRUST, type FormField, type TrustItem, type SidebarBlock } from "../lib/serviceForms";
import { submitRequest, requestOtp, uploadFile, type RequestResult } from "../api/requests";
import { RequestStatusView } from "../components/RequestStatus";
import { PhoneField } from "../components/PhoneField";
import { saveRequest } from "../lib/myRequests";
import { usePageTitle } from "../lib/usePageTitle";
import { useOtpCountdown } from "../lib/useOtpCountdown";
import type { LatLng } from "../components/MapPicker";
import "./service-request.css";

// Leaflet is heavy — load the map only when a request page is opened.
const MapPicker = lazy(() => import("../components/MapPicker").then((m) => ({ default: m.MapPicker })));

const KNOWN_ICONS: IconName[] = ["survey", "drill", "pump", "water", "equip", "maintenance", "consult"];
const asIcon = (s: string | null): IconName => (KNOWN_ICONS.includes(s as IconName) ? (s as IconName) : "survey");

interface ServiceView { key: string; title: string; pricingMode: "fixed" | "quote"; icon: IconName; }
const fromApi = (s: ApiService): ServiceView => ({ key: s.key, title: s.name, pricingMode: s.pricing_mode, icon: asIcon(s.icon) });
const fromCatalog = (s: ServiceDef): ServiceView => ({ key: s.key, title: s.title, pricingMode: s.pricingMode, icon: s.icon });

const COMMON = new Set(["full_name", "phone", "email", "location"]);
// Matches the backend's z.string().email() so an invalid address is caught before
// the OTP step rather than failing the request server-side.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ServiceRequest() {
  const { key = "" } = useParams();
  const { data } = useQuery({ queryKey: ["services"], queryFn: fetchServices });

  const view = useMemo<ServiceView | null>(() => {
    const api = data?.find((s) => s.key === key);
    if (api) return fromApi(api);
    const cat = SERVICES.find((s) => s.key === key);
    return cat ? fromCatalog(cat) : null;
  }, [data, key]);

  const form = getServiceForm(key);

  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [location, setLocation] = useState<LatLng | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RequestResult | null>(null);

  // OTP verification gate (before the request is submitted).
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);
  const [otpResendKey, setOtpResendKey] = useState(0);
  const otpCd = useOtpCountdown(otpExpiresIn, otpResendKey);

  // Lock the page behind the OTP modal so the background doesn't scroll under it
  // (matches TrackLookupDialog). Prevents the "page jitters while the code dialog
  // is open" feel on mobile.
  useEffect(() => {
    if (!otpOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [otpOpen]);

  const mutation = useMutation({
    mutationFn: submitRequest,
    onSuccess: (res) => { setResult(res); setOtpOpen(false); window.scrollTo({ top: 0 }); },
    onError: (e: unknown) => setOtpError(e instanceof Error ? e.message : "Something went wrong. Please try again."),
  });

  usePageTitle(view ? `Request ${view.title} — SMART Drill` : "Request a Service — SMART Drill");

  if (!view) {
    return (
      <>
        <Header />
        <section className="sd-section"><div className="sd-container sd-req-missing">
          <h1>Service not found</h1>
          <p>We couldn't find that service. Please choose one from the homepage.</p>
          <Link to="/" className="sd-btn sd-btn--primary sd-btn--lg">Back to Services</Link>
        </div></section>
        <Footer />
      </>
    );
  }

  if (result) return <SuccessPanel view={view} form={form} result={result} name={values.full_name ?? ""} />;

  const clearErr = (name: string) => { if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; }); };
  const setVal = (name: string, v: string) => { setValues((prev) => ({ ...prev, [name]: v })); clearErr(name); };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const f of form.fields) {
      // Email is optional, but when provided it must be a valid address.
      if (f.type === "email") {
        const v = values[f.name]?.trim();
        if (!v) { if (f.required) next[f.name] = "This field is required."; continue; }
        if (!EMAIL_RE.test(v)) next[f.name] = "Enter a valid email address.";
        continue;
      }
      if (!f.required) continue;
      if (f.type === "location") { if (!location) next[f.name] = "Please drop a pin on the map."; continue; }
      if (f.type === "file") { if (!(files[f.name]?.length)) next[f.name] = "Please upload the required document."; continue; }
      if (!values[f.name]?.trim()) next[f.name] = "This field is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (otp_code: string, documents: string[]) => {
    const details: Record<string, string> = { __mode: view.pricingMode };
    for (const f of form.fields) {
      if (COMMON.has(f.name) || f.type === "file") continue;
      if (values[f.name]?.trim()) details[f.name] = values[f.name].trim();
    }
    return {
      service_key: view.key,
      full_name: values.full_name?.trim() ?? "",
      phone: values.phone?.trim() ?? "",
      otp_code,
      email: values.email?.trim() || undefined,
      location,
      details,
      documents,
    };
  };

  // Upload any selected files to the backend (local disk); the form field name is
  // the document purpose (survey_report, test_pump_report, attachments, …).
  const uploadDocuments = async (): Promise<string[]> => {
    const all = Object.entries(files).flatMap(([field, list]) => list.map((f) => ({ field, f })));
    return Promise.all(all.map(async ({ field, f }) => {
      try { return await uploadFile(f, "request", field); } catch { return f.name; }
    }));
  };

  // Step 1: validate the form, then send an OTP and open the verification panel.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      document.querySelector<HTMLElement>(".sd-field__err")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setOtpError(null); setOtpCode(""); setOtpSending(true);
    try {
      const { expires_in } = await requestOtp(values.phone.trim(), values.email?.trim() || undefined);
      setOtpExpiresIn(expires_in || 300); setOtpResendKey((k) => k + 1);
      setOtpOpen(true);
    } catch {
      setOtpError("Couldn't send the code. Check the number and try again.");
      setOtpOpen(true);
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: upload docs, then submit the request with the entered OTP (verified server-side).
  const verifyAndSubmit = async () => {
    setOtpError(null);
    setUploading(true);
    const documents = await uploadDocuments();
    setUploading(false);
    mutation.mutate(buildPayload(otpCode.trim(), documents));
  };

  const resendOtp = async () => {
    setOtpError(null); setOtpSending(true);
    try {
      const { expires_in } = await requestOtp(values.phone.trim(), values.email?.trim() || undefined);
      setOtpExpiresIn(expires_in || 300); setOtpResendKey((k) => k + 1); setOtpCode("");
    } catch { setOtpError("Couldn't resend the code."); }
    finally { setOtpSending(false); }
  };

  const renderForm = (withIcon: boolean) => (
    <form onSubmit={onSubmit} noValidate className={withIcon ? "sd-dh-form" : "sd-req-form"}>
      <div className={withIcon ? "sd-dh-fields" : "sd-form-grid"}>
        {form.fields.map((f) => (
          <Field
            key={f.name}
            field={f}
            withIcon={withIcon}
            value={values[f.name] ?? ""}
            files={files[f.name] ?? []}
            location={location}
            error={errors[f.name]}
            onValue={(v) => setVal(f.name, v)}
            onFiles={(list) => { setFiles((p) => ({ ...p, [f.name]: list })); clearErr(f.name); }}
            onLocation={(v) => { setLocation(v); clearErr(f.name); }}
          />
        ))}
      </div>
      <button type="submit" className="sd-req-submit" disabled={otpSending || mutation.isPending}>
        <Icon name="send" size={17} /> {otpSending ? "Sending code…" : form.submitLabel}
      </button>
      <p className="sd-req-privacy"><Icon name="lock" size={13} /> We'll text you a 6-digit code to verify your number. Your information is secure.</p>
    </form>
  );

  const trust = form.trust ?? DEFAULT_TRUST;
  const rootStyle = { ["--accent"]: form.accent, ["--pa"]: form.pricingAccent ?? form.accent } as CSSProperties;

  const otpModal = otpOpen ? (
    <div className="sd-otp-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget && !mutation.isPending) setOtpOpen(false); }}>
      <div className="sd-otp">
        <button type="button" className="sd-otp__close" onClick={() => setOtpOpen(false)} aria-label="Close">×</button>
        <div className="sd-otp__icon"><Icon name="phone" size={26} /></div>
        <h3>Verify your phone</h3>
        <p>Enter the 6-digit code sent to <strong>{values.phone}</strong>.</p>
        <input
          className="sd-otp__input" value={otpCode} inputMode="numeric" autoComplete="one-time-code"
          placeholder="––––––" maxLength={6} autoFocus
          onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && otpCode.length >= 4) verifyAndSubmit(); }}
        />
        <div className={`sd-otp__count${otpCd.expired ? " sd-otp__count--expired" : ""}`}>
          {otpCd.expired ? "Code expired — tap Resend for a new one" : `Code expires in ${otpCd.label}`}
        </div>
        {otpError && <div className="sd-otp__err">{otpError}</div>}
        <button type="button" className="sd-req-submit" onClick={verifyAndSubmit} disabled={mutation.isPending || uploading || otpCode.length < 6 || otpCd.expired}>
          {uploading ? "Uploading…" : mutation.isPending ? "Verifying…" : "Verify & Submit"}
        </button>
        <button type="button" className="sd-otp__resend" onClick={resendOtp} disabled={otpSending}>
          {otpSending ? "Sending…" : "Didn't get it? Resend code"}
        </button>
      </div>
    </div>
  ) : null;

  // ---- HERO-SIDEBAR LAYOUT ----
  if (form.layout === "hero-sidebar") {
    return (
      <div className="sd-req sd-req--accent" style={rootStyle}>
        <Header />

        <section className="sd-dh-hero">
          <div className="sd-container">
            <div className="sd-dh-banner">
              <div className={"sd-dh-banner__photo" + (form.heroFit === "contain" ? " sd-dh-banner__photo--contain" : "")} style={{ backgroundImage: `url(${form.heroPhoto ?? form.photo})` }} aria-hidden="true" />
              <div className="sd-dh-banner__overlay">
                <Link to="/#services" className="sd-req-back"><Icon name="arrow" size={16} /> Back to Services</Link>
                <h1 className="sd-dh-hero__title">{view.title}</h1>
                <p className="sd-dh-hero__sub">{form.intro}</p>
                {form.pricing && (
                  <div className={"sd-dh-price" + (form.pricingAccentAmount ? " sd-dh-price--amtaccent" : "")}>
                    <div className="sd-dh-price__icon"><Icon name={form.pricingIcon ?? "drill"} size={28} /></div>
                    <div className="sd-dh-price__body">
                      <span className="sd-dh-price__label">Pricing</span>
                      <div className="sd-dh-price__amt">{form.pricing.amount}{form.pricing.unit && <span> {form.pricing.unit}</span>}</div>
                      <div className="sd-dh-price__note">{form.pricing.note}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="sd-dh-body">
          <div className="sd-container sd-dh-grid">
            <div className="sd-dh-card">
              <h2>Request {view.title}</h2>
              <p className="sd-dh-card__sub">{form.cardSub ?? "Please provide the details below so we can match you with the right professional."}</p>
              {renderForm(true)}
            </div>
            <aside className="sd-dh-side">
              {(form.sidebar ?? []).map((b, i) => <SidebarBlockView key={i} block={b} />)}
            </aside>
          </div>
        </section>

        <TrustStrip items={trust} />
        <Footer />
        {otpModal}
      </div>
    );
  }

  // ---- TIMELINE LAYOUT (Hydrogeological Survey) ----
  return (
    <div className="sd-req sd-req--accent" style={rootStyle}>
      <Header />

      <section className="sd-req-main">
        <div className="sd-container">
          <Link to="/#services" className="sd-req-back"><Icon name="arrow" size={16} /> Back to Services</Link>

          <div className="sd-req-grid">
            <div className="sd-req-info">
              <h1 className="sd-req-title">
                {form.headingPrefix}<br /><span className="sd-req-title__name">{view.title}</span>
              </h1>
              <p className="sd-req-intro">{form.intro}</p>

              <div className="sd-req-note">
                <div className="sd-req-note__icon"><Icon name="usercheck" size={20} /></div>
                <div>
                  <strong>How It Works</strong>
                  <p>{HOW_IT_WORKS_NOTE}</p>
                </div>
              </div>

              <ol className="sd-timeline">
                {form.timeline.map((step, i) => (
                  <li className="sd-timeline__step" key={step.title}>
                    <div className="sd-timeline__icon"><Icon name={TIMELINE_ICONS[i] as IconName} size={18} /></div>
                    <div className="sd-timeline__body">
                      <strong>{i + 1}. {step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="sd-req-secure">
                <div className="sd-req-secure__icon"><Icon name="shield" size={22} /></div>
                <div>
                  <strong>Secure. Reliable. Professional.</strong>
                  <p>Your project is in safe hands with Smart Drill.</p>
                </div>
              </div>
            </div>

            <div className="sd-req-card">
              <div className="sd-req-card__head">
                <div className="sd-req-card__icon"><Icon name="pin" size={24} /></div>
                <div>
                  <h2>Your Details</h2>
                  <p>Please provide accurate information so we can connect you with the right expert.</p>
                </div>
              </div>
              {renderForm(false)}
            </div>
          </div>
        </div>
        <div className="sd-req-photo-bg" style={{ backgroundImage: `url(${form.photo})` }} aria-hidden="true" />
      </section>

      <TrustStrip items={trust} />
      <Footer />
      {otpModal}
    </div>
  );
}

/* ---- Bottom trust strip (shared) ---- */
function TrustStrip({ items }: { items: TrustItem[] }) {
  return (
    <section className="sd-req-trust">
      <div className="sd-container sd-req-trust__grid">
        {items.map((t) => (
          <div className="sd-req-trust__item" key={t.title}>
            <div className="sd-req-trust__icon"><Icon name={t.icon} size={22} /></div>
            <div>
              <strong>{t.title}</strong>
              <span>{t.text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- Sidebar block renderer (hero-sidebar) ---- */
function SidebarBlockView({ block }: { block: SidebarBlock }) {
  if (block.kind === "checklist") {
    return (
      <div className="sd-dh-card2">
        {block.icon
          ? <div className="sd-dh-side__head"><span className="sd-dh-side__icon"><Icon name={block.icon} size={20} /></span><h3>{block.title}</h3></div>
          : <h3 className="sd-dh-card2__title--center">{block.title}</h3>}
        {block.intro && <p className="sd-dh-side__intro">{block.intro}</p>}
        <ul className={"sd-dh-checks " + (block.check === "green" ? "sd-dh-checks--green" : "sd-dh-checks--accent")}>
          {block.items.map((it) => <li key={it}><span className="ic"><Icon name="check" size={13} /></span>{it}</li>)}
        </ul>
      </div>
    );
  }
  if (block.kind === "note") {
    return (
      <div className={"sd-dh-note" + (block.tint ? " sd-dh-note--tint" : "") + (block.iconColor === "pricing" ? " sd-dh-note--pricing" : "")}>
        <div className="sd-dh-note__icon"><Icon name={block.icon} size={22} /></div>
        <div><strong>{block.title}</strong><p>{block.text}</p></div>
      </div>
    );
  }
  if (block.kind === "tips") {
    return (
      <div className="sd-dh-card2">
        <div className="sd-dh-side__head"><span className="sd-dh-side__icon"><Icon name={block.icon} size={20} /></span><h3>{block.title}</h3></div>
        <ul className="sd-dh-tips">{block.items.map((it) => <li key={it}>{it}</li>)}</ul>
      </div>
    );
  }
  if (block.kind === "steps") {
    return (
      <div className="sd-dh-card2">
        <div className="sd-dh-side__head">{block.icon && <span className="sd-dh-side__icon"><Icon name={block.icon} size={20} /></span>}<h3>{block.title}</h3></div>
        <ol className="sd-dh-steps">{block.items.map((it) => <li key={it}>{it}</li>)}</ol>
      </div>
    );
  }
  // help
  const isPhone = block.cta.trim().startsWith("+");
  return (
    <div className="sd-dh-help">
      <div className="sd-dh-help__head"><span className="sd-dh-help__icon"><Icon name={block.icon ?? "headset"} size={22} /></span><strong>{block.title}</strong></div>
      <p>{block.text}</p>
      <a href={isPhone ? `tel:${block.cta.replace(/\s/g, "")}` : "tel:+254700000000"} className="sd-dh-help__btn">
        {isPhone && <Icon name="phone" size={15} />} {block.cta}
      </a>
      {block.note && <div className="sd-dh-help__note">{block.note}</div>}
    </div>
  );
}

/* ---- Field renderer (plain or icon-prefixed) ---- */
function Field(props: {
  field: FormField;
  withIcon?: boolean;
  value: string;
  files: File[];
  location: LatLng | null;
  error?: string;
  onValue: (v: string) => void;
  onFiles: (list: File[]) => void;
  onLocation: (v: LatLng) => void;
}) {
  const { field: f, withIcon, value, files, location, error, onValue, onFiles, onLocation } = props;
  const id = `f-${f.name}`;
  const helpAboveControl = f.type === "location" || f.type === "file" || f.type === "radio-cards";

  const control = (() => {
    if (f.type === "tel") {
      return <PhoneField id={id} value={value} placeholder={f.placeholder} onChange={onValue} />;
    }
    if (f.type === "text" || f.type === "email" || f.type === "date") {
      return <input id={id} type={f.type} value={value} placeholder={f.placeholder} onChange={(e) => onValue(e.target.value)} />;
    }
    if (f.type === "textarea") {
      return (
        <>
          <textarea id={id} rows={4} value={value} placeholder={f.placeholder} maxLength={f.maxLength} onChange={(e) => onValue(e.target.value)} />
          {f.maxLength && <div className="sd-field__count">{value.length}/{f.maxLength}</div>}
        </>
      );
    }
    if (f.type === "select") {
      return (
        <select id={id} value={value} className={value ? "" : "sd-field--placeholder"} onChange={(e) => onValue(e.target.value)}>
          <option value="">{f.placeholder ?? "Select…"}</option>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === "radio") {
      return (
        <div className="sd-radio-row">
          {f.options?.map((o) => (
            <button type="button" key={o} className={"sd-radio" + (value === o ? " sd-radio--on" : "")} onClick={() => onValue(o)}>
              <span className="sd-radio__dot" aria-hidden="true" />{o}
            </button>
          ))}
        </div>
      );
    }
    if (f.type === "radio-cards") {
      return (
        <div className="sd-rcards">
          {f.cards?.map((c) => (
            <button type="button" key={c.value} className={"sd-rcard" + (value === c.value ? " sd-rcard--on" : "")} onClick={() => onValue(c.value)}>
              <div className="sd-rcard__icon"><Icon name={c.icon} size={22} /></div>
              <div className="sd-rcard__body"><strong>{c.title}</strong><span>{c.desc}</span></div>
              <span className="sd-rcard__dot" aria-hidden="true" />
            </button>
          ))}
        </div>
      );
    }
    if (f.type === "location") {
      return (
        <Suspense fallback={<div className="sd-map sd-map--loading">Loading map…</div>}>
          <MapPicker value={location} onChange={onLocation} />
        </Suspense>
      );
    }
    // file
    if (withIcon) {
      const onDrop = (e: React.DragEvent) => { e.preventDefault(); const list = Array.from(e.dataTransfer.files ?? []); if (list.length) onFiles(f.multiple ? list : list.slice(0, 1)); };
      return (
        <label className="sd-dropzone" htmlFor={id} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <input id={id} type="file" accept={f.accept} multiple={f.multiple} hidden onChange={(e) => onFiles(Array.from(e.target.files ?? []))} />
          <div className="sd-dropzone__icon"><Icon name="upload" size={26} /></div>
          <div className="sd-dropzone__text">
            {files.length ? files.map((x) => x.name).join(", ") : <><strong>Click to upload</strong> or drag and drop</>}
          </div>
          <div className="sd-dropzone__sub">{f.accept === "application/pdf" ? "PDF only (Max 10MB)" : "Max 10MB"}</div>
        </label>
      );
    }
    return (
      <label className="sd-file" htmlFor={id}>
        <input id={id} type="file" accept={f.accept} multiple={f.multiple} hidden onChange={(e) => onFiles(Array.from(e.target.files ?? []))} />
        <span className="sd-file__btn"><Icon name="doc" size={16} /> Choose file{f.multiple ? "s" : ""}</span>
        <span className="sd-file__names">{files.length ? files.map((x) => x.name).join(", ") : "No file selected"}</span>
      </label>
    );
  })();

  const label = <label htmlFor={id}>{f.label}{f.required && <span className="req"> *</span>}</label>;
  const helpTop = f.help && helpAboveControl ? <div className="sd-field__sub">{f.help}</div> : null;
  const helpBottom = f.help && !helpAboveControl && !error ? <div className="sd-field__help">{f.help}</div> : null;
  const err = error ? <div className="sd-field__err">{error}</div> : null;

  if (withIcon) {
    return (
      <div className="sd-ifield">
        <div className="sd-ifield__icon">{f.icon && <Icon name={f.icon} size={20} />}</div>
        <div className="sd-ifield__body">{label}{helpTop}{control}{helpBottom}{err}</div>
      </div>
    );
  }

  return (
    <div className={"sd-field" + (f.half ? "" : " sd-field--full")}>
      {label}{helpTop}{control}{helpBottom}{err}
    </div>
  );
}

/* ---- Success state (rich post-submission landing) ---- */
function SuccessPanel({ view, form, result, name }: { view: ServiceView; form: { accent: string }; result: RequestResult; name: string }) {
  const submittedAt = useMemo(() => new Date(), []);
  const trackHref = `/track/${result.tracking_token}`;

  // Persist the tracking token on this device so the customer can return to the
  // order later (Header shows a "Track Request" shortcut when one is saved).
  useEffect(() => {
    saveRequest({
      requestNo: result.request_no,
      token: result.tracking_token,
      service: view.title,
      serviceKey: view.key,
      ts: Date.now(),
    });
  }, [result.request_no, result.tracking_token, view.title, view.key]);

  return (
    <div className="sd-req">
      <Header />
      <RequestStatusView
        name={name}
        serviceName={view.title}
        requestNo={result.request_no}
        submittedAt={submittedAt}
        status={result.pricing_mode === "fixed" ? "pending_payment" : "submitted"}
        serviceKey={view.key}
        accent={form.accent}
        title="Your request has been submitted successfully."
        subtitle="Thank you for choosing SMART Drill. We've received your request and our team will get to work right away."
        token={result.tracking_token}
        providerName={null}
        providerPhone={null}
        siteLocation={null}
        providerLocation={null}
      />
      <div className="sd-req__track-cta" style={{ ["--accent" as string]: form.accent }}>
        <Link to={trackHref} className="sd-btn sd-btn--primary sd-btn--lg">Track My Request</Link>
        <p>Bookmark this page, or use the tracking link we've sent to your phone by SMS, to check progress anytime.</p>
        <p className="sd-req__email-note">
          <Icon name="mail" size={15} /> We'll send your invoice and updates to your email. Questions or documents? Reach us anytime at{" "}
          <a href="mailto:info@smartdrill.co.ke">info@smartdrill.co.ke</a>.
        </p>
      </div>
      <Footer />
    </div>
  );
}
