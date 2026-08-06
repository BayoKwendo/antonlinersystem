import type { IconName } from "../components/Icons";

export type PricingMode = "fixed" | "quote";

export interface ServiceDef {
  key: string; // backend service_categories.key — also the /request/:key route param
  categoryKey: string; // kept === key for compatibility
  title: string;
  icon: IconName;
  accent: string; // per-card icon tint
  blurb: string;
  pricing: string; // display line
  pricingNote: string;
  pricingMode: PricingMode;
  cta: string;
}

/** Single source of truth: drives the home cards AND the request pages. */
export const SERVICES: ServiceDef[] = [
  {
    key: "geologist", categoryKey: "geologist", title: "Hydrogeological Survey",
    icon: "survey", accent: "#4e9d2d",
    blurb: "Assess the underground water potential of your property and identify the best drilling point and depth.",
    pricing: "KES 55,000", pricingNote: "Flat Rate", pricingMode: "fixed", cta: "Get a Survey",
  },
  {
    key: "drillers", categoryKey: "drillers", title: "Borehole Drilling",
    icon: "drill", accent: "#1656c7",
    blurb: "Professional drilling services to access reliable underground water for your home, farm or business.",
    pricing: "KES 6,000", pricingNote: "Per Meter", pricingMode: "fixed", cta: "Find a Driller",
  },
  {
    key: "test_pump", categoryKey: "test_pump", title: "Test Pumping",
    icon: "pump", accent: "#0f8a8a",
    blurb: "Evaluate your borehole's yield, water level and performance before installing your pumping system.",
    pricing: "KES 60,000", pricingNote: "Flat Rate", pricingMode: "fixed", cta: "Book Test Pumping",
  },
  {
    key: "surveys", categoryKey: "surveys", title: "Water Quality Analysis",
    icon: "water", accent: "#7a3fb0",
    blurb: "Laboratory testing to determine if your water is safe and suitable for drinking, irrigation or industrial use.",
    pricing: "KES 6,000", pricingNote: "Per Sample", pricingMode: "fixed", cta: "Request Testing",
  },
  {
    key: "pump_installer", categoryKey: "pump_installer", title: "Borehole Equipping",
    icon: "equip", accent: "#ef8a1e",
    blurb: "Install pumps, pipes, solar systems, tanks and all equipment needed to get your borehole running.",
    pricing: "Guided by Survey", pricingNote: "Priced from your survey & test-pump report", pricingMode: "quote", cta: "Equip My Borehole",
  },
  {
    key: "tank_installation", categoryKey: "tank_installation", title: "Borehole Maintenance",
    icon: "maintenance", accent: "#4e9d2d",
    blurb: "Keep your borehole and pumping system in top condition with routine maintenance and repairs.",
    pricing: "Request a Quote", pricingNote: "Tell us the issue and we'll quote", pricingMode: "quote", cta: "Request Maintenance",
  },
  {
    key: "other_services", categoryKey: "other_services", title: "Consultancy in Borehole",
    icon: "consult", accent: "#1656c7",
    blurb: "Not sure what's wrong with your borehole? Get expert advice and recommendations for the right solution.",
    pricing: "Request a Quote", pricingNote: "Talk to an expert and we'll guide you", pricingMode: "quote", cta: "Talk to an Expert",
  },
];
