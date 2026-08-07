// Per-service request-form config, keyed by the backend service_categories.key.
// Two layouts:
//   - "timeline":     left info column (heading, intro, "How It Works" timeline,
//                     photo) + right "Your Details" form card. (Hydro)
//   - "hero-sidebar": contained hero banner (title, pricing, photo) + left form
//                     card with icon-prefixed fields + right sidebar of blocks.
//                     (all other services; accent-aware per service)

import type { IconName } from "../components/Icons";

export type FieldType =
  | "text" | "tel" | "email" | "date" | "textarea"
  | "select" | "radio" | "radio-cards" | "location" | "file";

export interface RadioCard { value: string; icon: IconName; title: string; desc: string; }

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];        // select / radio
  cards?: RadioCard[];       // radio-cards
  accept?: string;           // file
  multiple?: boolean;        // file
  maxLength?: number;        // textarea counter
  half?: boolean;            // half width (timeline grid)
  icon?: IconName;           // leading icon (hero-sidebar)
}

export interface TimelineStep { title: string; text: string; }
export interface PricingBox { amount: string; unit: string; note: string; }
export interface TrustItem { icon: IconName; title: string; text: string; }

// Sidebar cards for the hero-sidebar layout.
export type SidebarBlock =
  | { kind: "checklist"; icon?: IconName; title: string; intro?: string; items: string[]; check?: "green" | "accent" }
  | { kind: "note"; icon: IconName; iconColor?: "accent" | "pricing"; tint?: boolean; title: string; text: string }
  | { kind: "tips"; icon: IconName; title: string; items: string[] }
  | { kind: "steps"; icon?: IconName; title: string; items: string[] }
  | { kind: "help"; icon?: IconName; title: string; text: string; cta: string; note?: string };

export interface ServiceForm {
  layout: "timeline" | "hero-sidebar";
  accent: string;            // page accent hex (hero-sidebar)
  pricingAccent?: string;    // pricing-box accent (defaults to accent)
  pricingAccentAmount?: boolean; // colour the amount with the pricing accent
  headingPrefix: string;     // line 1 of the heading (timeline)
  intro: string;             // paragraph under the heading / hero subtitle
  providerPlural: string;
  timeline: TimelineStep[];
  fields: FormField[];
  submitLabel: string;
  photo: string;             // timeline bottom band
  // hero-sidebar:
  pricing?: PricingBox;
  pricingIcon?: IconName;
  cardSub?: string;
  sidebar?: SidebarBlock[];
  heroPhoto?: string;
  heroFit?: "cover" | "contain"; // how the hero photo fills the banner (default cover)
  trust?: TrustItem[];
}

// Estimated service-delivery lead time per service (days) — drives the countdown.
export const ETA_DAYS: Record<string, number> = {
  geologist: 3, drillers: 7, test_pump: 2, surveys: 2,
  pump_installer: 5, tank_installation: 3, other_services: 2,
};
export const etaDaysFor = (key: string): number => ETA_DAYS[key] ?? 3;

export const HOW_IT_WORKS_NOTE =
  "We'll create an account for you using the information you provide, so you can track your project and access support anytime.";

export const DEFAULT_TRUST: TrustItem[] = [
  { icon: "shield", title: "Verified Professionals", text: "Access experienced and qualified providers." },
  { icon: "clock", title: "Fast Response", text: "Get connected quickly with experts in your area." },
  { icon: "lock", title: "Secure Payments", text: "Your payments are protected and secure." },
  { icon: "headset", title: "Support", text: "We're here to help you every step of the way." },
];

export const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa",
  "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
  "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

// ---- reusable icon-prefixed fields (hero-sidebar) ----
const F_NAME: FormField = { name: "full_name", label: "Full Name", type: "text", required: true, placeholder: "Enter your full name", icon: "user" };
const F_PHONE: FormField = { name: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "07XX XXX XXX", icon: "phone" };
const F_LOC = (label = "Property / Site Location"): FormField => ({ name: "location", label, type: "location", required: true, help: "Drop a pin on the map or search for your location.", icon: "pin" });

// ---- optional contact fields injected into every service (hero-sidebar + timeline) ----
// Email: where we send the invoice/updates. KRA PIN: used to prepare the invoice.
// Both optional — the customer can add them now or later.
const F_EMAIL: FormField = { name: "email", label: "Email Address (Optional)", type: "email", required: false, placeholder: "Enter your email address", help: "We'll send your invoice and updates here.", icon: "mail" };
const F_KRA: FormField = { name: "kra_pin", label: "KRA PIN (Optional)", type: "text", required: false, placeholder: "e.g. A012345678Z", help: "Used to prepare your invoice. You can provide it later.", icon: "card" };

// ---- reusable timeline fields (Hydro top grid) ----
const T_NAME: FormField = { name: "full_name", label: "Full Name", type: "text", required: true, placeholder: "Enter your full name", half: true };
const T_PHONE: FormField = { name: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "07XX XXX XXX", half: true };
const T_EMAIL: FormField = { name: "email", label: "Email Address (Optional)", type: "email", required: false, placeholder: "Enter your email address", help: "We'll send your invoice and updates here.", half: true };
const T_KRA: FormField = { name: "kra_pin", label: "KRA PIN (Optional)", type: "text", required: false, placeholder: "e.g. A012345678Z", help: "Used to prepare your invoice. You can provide it later.", half: true };
const T_COUNTY: FormField = { name: "county", label: "County", type: "select", required: true, placeholder: "Select your county", options: COUNTIES, half: true };
const T_HEAD: FormField[] = [T_NAME, T_PHONE, T_EMAIL, T_COUNTY];
const T_LOC = (label = "Property / Site Location"): FormField => ({ name: "location", label, type: "location", required: true, help: "Drop a pin on the map or search for your location" });
const T_NOTES = (placeholder: string): FormField => ({ name: "notes", label: "Any Additional Notes (Optional)", type: "textarea", required: false, placeholder });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function buildTimeline(o: { mode: "fixed" | "quote"; providerPlural: string; providerNoun: string; schedule: string; completedTitle: string; completedText: string; }): TimelineStep[] {
  return [
    { title: "You Submit a Request", text: "Fill in the form with your details and location." },
    { title: `${cap(o.providerPlural)} Get Notified`, text: o.mode === "fixed" ? `Nearby ${o.providerPlural} are alerted and one will accept your job.` : `Nearby ${o.providerPlural} review your request and prepare a quote.` },
    o.mode === "fixed" ? { title: "You Receive an Invoice", text: "We email you an invoice and payment instructions." } : { title: "You Receive a Quote", text: "We email you a tailored quote and payment instructions." },
    o.mode === "fixed" ? { title: "You Make Payment", text: "Securely pay Smart Drill to confirm your request." } : { title: "You Approve & Pay", text: "Approve the quote and securely pay Smart Drill to confirm." },
    { title: `${cap(o.providerNoun)} Contacts You`, text: `The ${o.providerNoun} will contact you ${o.schedule}.` },
    { title: o.completedTitle, text: o.completedText },
  ];
}

export const TIMELINE_ICONS = ["form", "bell", "doc", "phone", "user", "shield"] as const;

const BLUE = "#1656c7";

export const SERVICE_FORMS: Record<string, ServiceForm> = {
  // 1. Hydrogeological Survey — TIMELINE layout.
  geologist: {
    layout: "timeline", accent: BLUE,
    headingPrefix: "Request a",
    intro: "Fill in the form and our network of qualified geologists will get notified. We'll connect you with the right professional to assess your site.",
    providerPlural: "geologists",
    timeline: buildTimeline({ mode: "fixed", providerPlural: "geologists", providerNoun: "geologist", schedule: "to schedule a site visit", completedTitle: "Survey Completed", completedText: "You'll receive the survey report and recommendations." }),
    fields: [...T_HEAD, T_LOC(), T_NOTES("Tell us anything else that will help the geologist understand your site (e.g. land size, access, existing boreholes, specific concerns, etc.)")],
    submitLabel: "Request Hydrogeological Survey",
    photo: "/down.jpg",
  },

  // 2. Borehole Drilling — HERO-SIDEBAR (blue).
  drillers: {
    layout: "hero-sidebar", accent: BLUE,
    headingPrefix: "Request", providerPlural: "drillers",
    intro: "Professional drilling services to access reliable underground water for your home, farm or business.",
    timeline: [],
    fields: [
      F_NAME, F_LOC("Property Location"), F_PHONE,
      { name: "survey_report", label: "Upload Hydrogeological Survey", type: "file", required: true, accept: "application/pdf", help: "Please upload the hydrogeological survey report for your site.", icon: "doc" },
    ],
    submitLabel: "Confirm & Submit Request",
    photo: "/hero.jpg", heroPhoto: "/hero.jpg",
    pricing: { amount: "KES 6,000", unit: "Per Meter", note: "Final cost depends on the total drilling depth." },
    pricingIcon: "drill",
    cardSub: "Please provide the details below so we can match you with the right drilling professional.",
    sidebar: [
      { kind: "checklist", title: "What's Included", check: "green", items: [
        "Professional drilling using modern equipment", "Experienced and vetted drilling contractors",
        "Transparent pricing (KES 6,000 per meter)", "Quality workmanship and safety standards", "End-to-end project support",
      ] },
      { kind: "note", icon: "shield", iconColor: "accent", tint: true, title: "Safe. Reliable. Professional.", text: "SMART Drill connects you with trusted drilling experts to deliver quality results." },
    ],
    trust: [
      { icon: "shield", title: "Verified Professionals", text: "We work with experienced and vetted drilling experts." },
      { icon: "card", title: "Transparent Pricing", text: "Clear pricing. No hidden charges." },
      { icon: "lock", title: "Secure Payments", text: "Your payments are protected and secure." },
      { icon: "headset", title: "Dedicated Support", text: "We are here to support you at every step." },
    ],
  },

  // 3. Test Pumping — HERO-SIDEBAR (teal).
  test_pump: {
    layout: "hero-sidebar", accent: "#0f8a8a",
    headingPrefix: "Request", providerPlural: "specialists",
    intro: "Evaluate your borehole's yield, water level and performance before installing your pumping system.",
    timeline: [],
    fields: [F_NAME, F_LOC("Property Location"), F_PHONE],
    submitLabel: "Confirm & Submit Request",
    photo: "/hero.jpg", heroPhoto: "/hero-testpump.jpg",
    pricing: { amount: "KES 60,000", unit: "Flat Rate", note: "Comprehensive test pumping and report." },
    pricingIcon: "pump",
    cardSub: "Please provide the details below so we can connect you with a qualified test pumping professional.",
    sidebar: [
      { kind: "checklist", icon: "pump", check: "accent", title: "About Test Pumping",
        intro: "Test pumping determines how much water your borehole can sustainably produce.",
        items: ["Measures borehole yield and performance", "Determines drawdown and recovery rate", "Helps in selecting the right pumping system", "Detailed test pumping report provided"] },
      { kind: "help", title: "Need Help?", text: "Not sure if your borehole is ready for test pumping? Talk to our experts.", cta: "Talk to an Expert" },
    ],
    trust: [
      { icon: "shield", title: "Verified Professionals", text: "We work with experienced and vetted experts." },
      { icon: "card", title: "Clear Pricing", text: "Transparent and upfront pricing. No hidden costs." },
      { icon: "lock", title: "Secure Payments", text: "Your payments are protected and secure." },
      { icon: "headset", title: "Dedicated Support", text: "We are here to support you at every step." },
    ],
  },

  // 4. Water Quality Analysis — HERO-SIDEBAR (purple).
  surveys: {
    layout: "hero-sidebar", accent: "#7a3fb0",
    headingPrefix: "Request a", providerPlural: "technicians",
    intro: "Laboratory testing to determine if your water is safe and suitable for drinking, irrigation or industrial use.",
    timeline: [],
    fields: [
      F_NAME,
      { ...F_PHONE, help: "We will use this number to contact you about your sample." },
      { name: "sampling_date", label: "Sampling Date", type: "date", required: true, help: "The date when the water sample was collected.", icon: "calendar" },
      F_LOC("Property / Sample Location"),
      { name: "sampled_by", label: "Sampled By", type: "text", required: true, placeholder: "Enter the name of the person who collected the sample", help: "Person who collected the water sample.", icon: "user" },
    ],
    submitLabel: "Confirm & Submit Request",
    photo: "/hero.jpg", heroPhoto: "/hero-waterquality.jpg",
    pricing: { amount: "KES 6,000", unit: "Per Sample", note: "Comprehensive water quality testing and report." },
    pricingIcon: "water",
    cardSub: "Please provide the details below so we can process your water sample.",
    sidebar: [
      { kind: "checklist", icon: "water", check: "accent", title: "About Our Analysis",
        intro: "We test for physical, chemical and microbiological parameters to ensure your water is safe and meets relevant standards.",
        items: ["Drinking water safety", "Agricultural irrigation", "Industrial processes", "Comprehensive report", "Fast turnaround time"] },
      { kind: "tips", icon: "doc", title: "Sample Collection Tips",
        items: ["Use a clean, dry plastic bottle (1 litre recommended)", "Fill to the top and seal tightly", "Label the bottle with date and location", "Keep the sample in a cool place and deliver to the lab as soon as possible"] },
      { kind: "help", title: "Need Help?", text: "Talk to our experts for guidance on sampling and testing.", cta: "Talk to an Expert" },
    ],
    trust: [
      { icon: "shield", title: "Accurate Results", text: "Certified laboratory testing with reliable results." },
      { icon: "clock", title: "Quick Turnaround", text: "Receive your results within 24–48 hours." },
      { icon: "lock", title: "Secure & Confidential", text: "Your data and results are always protected." },
      { icon: "award", title: "Industry Standard", text: "Analysis in line with KEBS and WHO guidelines." },
    ],
  },

  // 5. Borehole Equipping — HERO-SIDEBAR (blue page, orange pricing).
  pump_installer: {
    layout: "hero-sidebar", accent: BLUE, pricingAccent: "#ef8a1e", pricingAccentAmount: true,
    headingPrefix: "Request", providerPlural: "specialists",
    intro: "Get your borehole fully equipped with quality pumps, pipes, tanks and accessories for reliable water access.",
    timeline: [],
    fields: [
      F_NAME, F_PHONE, F_LOC("Property / Site Location"),
      { name: "test_pump_report", label: "Upload Test Pumping Report", type: "file", required: true, accept: "application/pdf", help: "Please upload the test pumping report for your borehole.", icon: "doc" },
      { name: "power_source", label: "Preferred Power Source", type: "radio-cards", required: true, help: "Select the power option you would like to use.", icon: "bolt", cards: [
        { value: "Solar Power", icon: "sun", title: "Solar Power", desc: "Solar powered pumping system. Ideal for off-grid locations." },
        { value: "Electric Grid", icon: "plug", title: "Electric Grid", desc: "Grid powered pumping system. Requires reliable electricity supply." },
      ] },
    ],
    submitLabel: "Confirm & Submit Request",
    photo: "/hero.jpg", heroPhoto: "/hero-equip.jpg", heroFit: "contain",
    pricing: { amount: "Guided by Survey", unit: "", note: "Pricing based on survey recommendations and project requirements." },
    pricingIcon: "equip",
    cardSub: "Please provide the details below so we can recommend the right equipment for your borehole.",
    sidebar: [
      { kind: "checklist", icon: "water", check: "green", title: "What's Included",
        intro: "We supply and install all equipment needed to get water from your borehole to where you need it.",
        items: ["Submersible pumps", "Pipes and fittings", "Control panels & switchgear", "Water storage tanks", "Solar systems (optional)", "Professional installation"] },
      { kind: "note", icon: "equip", iconColor: "pricing", title: "Guided by Your Survey", text: "We use your hydrogeological survey and test pumping results to recommend the best equipment for your needs." },
      { kind: "note", icon: "shield", iconColor: "accent", title: "Quality & Reliability", text: "We work with trusted brands and experienced technicians to ensure long-lasting performance." },
      { kind: "help", title: "Need Help?", text: "Not sure what you need? Talk to our experts and we'll guide you.", cta: "Talk to an Expert" },
    ],
    trust: [
      { icon: "user", title: "Expert Recommendation", text: "Equipment recommended based on your survey and test pumping results." },
      { icon: "award", title: "Quality Equipment", text: "High-quality, durable equipment from trusted brands." },
      { icon: "wrench", title: "Professional Installation", text: "Installed by experienced professionals for optimal performance." },
      { icon: "headset", title: "After-Sales Support", text: "Ongoing support and maintenance when you need it." },
    ],
  },

  // 6. Borehole Maintenance — HERO-SIDEBAR (blue).
  tank_installation: {
    layout: "hero-sidebar", accent: BLUE,
    headingPrefix: "Request", providerPlural: "technicians",
    intro: "Reliable maintenance and repairs to keep your borehole system running efficiently all year round.",
    timeline: [],
    fields: [
      F_NAME,
      { ...F_PHONE, help: "We will use this number to contact you." },
      F_LOC("Property / Site Location"),
      { name: "issue", label: "Brief Description of Issue", type: "textarea", required: true, maxLength: 500, icon: "chat",
        placeholder: "E.g. No water coming out, low pressure, pump not working, noisy pump, leaking, electrical issues, etc.",
        help: "Please describe the problem you are experiencing in as much detail as possible." },
    ],
    submitLabel: "Submit Maintenance Request",
    photo: "/hero.jpg", heroPhoto: "/hero-maintenance.jpg",
    pricing: { amount: "Request Quote", unit: "", note: "We'll provide a tailored quote based on the issue and requirements." },
    pricingIcon: "maintenance",
    cardSub: "Please provide the details below so we can understand the issue and assist you better.",
    sidebar: [
      { kind: "checklist", icon: "maintenance", check: "accent", title: "What We Do",
        intro: "Our maintenance services include:",
        items: ["Pump repairs and servicing", "System diagnostics", "Electrical troubleshooting", "Pipe and fitting repairs", "Preventive maintenance", "And more"] },
      { kind: "steps", icon: "doc", title: "How It Works",
        items: ["Submit your request", "Our team reviews your issue", "We contact you for details", "We provide a quote", "We schedule and fix the issue"] },
      { kind: "help", icon: "headset", title: "Need Immediate Help?", text: "For urgent issues, call or WhatsApp us directly.", cta: "+254 700 123 456", note: "Available 7:00 AM – 7:00 PM" },
    ],
    trust: [
      { icon: "shield", title: "Experienced Technicians", text: "Skilled professionals with years of field experience." },
      { icon: "clock", title: "Fast Response", text: "We respond quickly and get the job done right." },
      { icon: "award", title: "Quality Service", text: "We use quality parts and follow best industry practices." },
      { icon: "handshake", title: "Reliable Support", text: "We're here to support you before and after service." },
    ],
  },

  // 7. Consultancy — HERO-SIDEBAR (blue). Placeholder pending its own design.
  other_services: {
    layout: "hero-sidebar", accent: BLUE,
    headingPrefix: "Request", providerPlural: "experts",
    intro: "Not sure what's wrong with your borehole? Get expert advice and recommendations for the right solution.",
    timeline: [],
    fields: [
      F_NAME, F_PHONE, F_LOC("Property / Site Location"),
      { name: "problem", label: "Describe the Problem", type: "textarea", required: true, icon: "chat", maxLength: 500, placeholder: "Tell us what's happening and what you'd like to achieve…" },
      { name: "attachments", label: "Photos, Videos or Reports (Optional)", type: "file", required: false, multiple: true, accept: "image/*,video/*,application/pdf", help: "Optional — anything that helps us understand the situation.", icon: "doc" },
    ],
    submitLabel: "Confirm & Submit Request",
    photo: "/hero.jpg", heroPhoto: "/hero.jpg",
    pricing: { amount: "Request Quote", unit: "", note: "Talk to us and we'll guide you to the right solution." },
    pricingIcon: "consult",
    cardSub: "Please provide the details below and we'll connect you with the right expert.",
    sidebar: [
      { kind: "checklist", icon: "consult", check: "accent", title: "How We Help",
        intro: "Get independent, expert advice for your borehole.",
        items: ["Diagnosis of borehole and pump issues", "Recommendations for the right solution", "Independent, professional advice", "Guidance on next steps and costs"] },
      { kind: "help", title: "Need Help?", text: "Talk to our experts and we'll guide you.", cta: "Talk to an Expert" },
    ],
    trust: DEFAULT_TRUST,
  },
};

/** Fallback for any key not explicitly configured. */
export const DEFAULT_FORM: ServiceForm = {
  layout: "timeline", accent: BLUE,
  headingPrefix: "Request",
  intro: "Fill in the form and our network of professionals will get notified. We'll connect you with the right expert for the job.",
  providerPlural: "professionals",
  timeline: buildTimeline({ mode: "fixed", providerPlural: "professionals", providerNoun: "professional", schedule: "to schedule the work", completedTitle: "Work Completed", completedText: "The work is completed and confirmed." }),
  fields: [...T_HEAD, T_LOC(), T_NOTES("Tell us a little about what you need…")],
  submitLabel: "Submit Request",
  photo: "/hero.jpg",
};

/**
 * Ensure every service collects an (optional) email + KRA PIN, without editing
 * each service's `fields` array. Email is inserted right after the phone field
 * (if the form doesn't already have one), and KRA PIN right after the email —
 * so the contact fields stay grouped. Uses the icon-prefixed variants for
 * hero-sidebar layouts and the half-width variants for the timeline grid.
 */
function withContactFields(form: ServiceForm): ServiceForm {
  const fields = [...form.fields];
  const timeline = form.layout === "timeline";

  let emailIdx = fields.findIndex((f) => f.name === "email");
  if (emailIdx === -1) {
    const phoneIdx = fields.findIndex((f) => f.name === "phone");
    const at = phoneIdx === -1 ? fields.length : phoneIdx + 1;
    fields.splice(at, 0, timeline ? T_EMAIL : F_EMAIL);
    emailIdx = at;
  }
  if (!fields.some((f) => f.name === "kra_pin")) {
    fields.splice(emailIdx + 1, 0, timeline ? T_KRA : F_KRA);
  }
  return { ...form, fields };
}

export const getServiceForm = (key: string): ServiceForm =>
  withContactFields(SERVICE_FORMS[key] ?? DEFAULT_FORM);
