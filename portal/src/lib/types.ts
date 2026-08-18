export type Role = "admin" | "owner" | "assistance" | "finance" | "provider" | "customer";

export interface Paginated<T> {
  items: T[];
  total: number;
  sum?: string;
}

export interface Analytics {
  revenue_by_day: { day: string; total: string }[];
  funnel: { status: string; n: number }[];
  outstanding: string;
  top_providers: { id: number; display_name: string; rating_avg: string; revenue: string }[];
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  hidden: number;
  created_at: string;
  customer_name: string;
  provider_name?: string;
}

export interface ProviderDetail {
  profile: Provider & {
    email: string | null;
    bio: string | null;
    lat: string;
    lng: string;
    location_updated_at: string | null;
    created_at: string;
  };
  reviews: Review[];
  recent_bookings: { id: number; status: string; total_amount: string; amount_paid: string; created_at: string; customer_name: string }[];
  earnings: string;
  jobs: number;
}

export interface BookingEvent {
  status: string;
  actor_id: number | null;
  note: string | null;
  created_at: string;
}

export interface BookingDetail extends Booking {
  events: BookingEvent[];
  payments: Payment[];
  provider_lat: string | null;
  provider_lng: string | null;
  provider_availability: string | null;
}

export interface StaffUser {
  id: number;
  display_name: string;
  phone: string;
  email: string | null;
  status: string;
  roles: string | null;
  created_at: string;
}

export interface ProviderLocation {
  id: number;
  display_name: string;
  phone: string;
  category: string;
  availability: string;
  lat: string;
  lng: string;
  location_updated_at: string | null;
}

export interface AuditEntry {
  id: number;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: unknown;
  created_at: string;
  actor_name: string | null;
}

export interface User {
  id: number;
  uuid: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  roles: Role[];
  must_change_password?: boolean;
}

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Stats {
  providers: number;
  customers: number;
  bookings_total: number;
  active_bookings: number;
  revenue: number;
  by_status: { status: string; n: number }[];
}

export interface Provider {
  id: number;
  code: string | null;
  display_name: string;
  phone: string;
  status: string;
  avatar_url: string | null;
  category: string;
  base_price: string;
  rating_avg: string;
  rating_count: number;
  availability: "available" | "booked" | "offline";
  verified_at: string | null;
  owner_id: number | null;
  owner_name: string | null;
}

export interface Customer {
  id: number;
  display_name: string;
  phone: string;
  email: string | null;
  status: string;
  id_number: string | null;
  default_address: string | null;
  bookings: number;
  created_at: string;
}

export interface Booking {
  id: number;
  uuid: string;
  status: string;
  deposit_amount: string;
  total_amount: string;
  amount_paid: string;
  address: string | null;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  provider_name: string;
  provider_phone: string;
  category: string;
}

export interface Payment {
  id: number;
  mpesa_receipt: string;
  amount: string;
  kind: string;
  source: string;
  created_at: string;
  booking_id: number;
  customer_name: string;
  provider_name: string;
}

export interface Category {
  id: number;
  key: string;
  name: string;
  description: string | null;
  active: number;
}

export interface Complaint {
  id: number;
  message: string;
  amount: string | null;
  status: string;
  resolution_note: string | null;
  created_at: string;
  booking_id: number | null;
  customer_name: string | null;
  provider_name: string | null;
}

// --- SMART Drill admin overview (GET /admin/overview) -----------------------
export interface Overview {
  counters: {
    new_requests: number; new_requests_today: number;
    awaiting_payment: number; awaiting_payment_amount: number;
    active_jobs: number; active_jobs_today: number;
    awaiting_qa: number; awaiting_qa_today: number;
    received_today: number; received_yesterday: number;
    payouts_due: number; received_total: number;
  };
  jobs_by_status: { booked: number; en_route: number; arrived: number; in_progress: number; completed: number; confirmed: number; total: number };
  provider_status: {
    available: number; scheduled: number; headed: number; on_site: number; awaiting_payment: number;
    on_holiday: number; maintenance: number; offline: number; suspended: number; pending: number; rejected: number;
  };
  top_services: { key: string; name: string; jobs: number; revenue: number }[];
  provider_performance: { provider: string; jobs: number; rating: number | null }[];
  recent_requests: { id: number; request_no: string | null; status: string; location: string | null; created_at: string; service: string; customer: string }[];
  recent_activity: { status: string; note: string | null; created_at: string; request_no: string | null; service: string }[];
  qa_queue: { id: number; request_no: string | null; status: string; completed_at: string; service: string; customer: string; provider: string | null }[];
  alerts: { delayed_jobs: number; unmatched_requests: number; pending_providers: number };
}

export interface SmsLog {
  id: number;
  destination: string;
  message: string;
  status: string;
  created_at: string;
}

// --- global top-bar search --------------------------------------------------
export interface SearchResults {
  requests: { id: number; request_no: string | null; status: string; service: string; customer: string; phone: string | null }[];
  providers: { id: number; name: string; person: string; phone: string | null; status: string | null }[];
  customers: { id: number; name: string; phone: string | null }[];
}

// --- provider verification (applications) -----------------------------------
export interface ProviderApplicationRow {
  user_id: number; business_name: string | null; kra_pin: string | null;
  display_name: string; phone: string; email: string | null;
  verification_status: "pending" | "verified" | "rejected"; verification_note: string | null;
  documents: number; services: number; service_names: string | null; created_at: string;
}
export interface ProviderApplication {
  account: {
    user_id: number; business_name: string | null; kra_pin: string | null; bank_details: string | null;
    verification_status: "pending" | "verified" | "rejected"; verification_note: string | null;
    display_name: string; phone: string; email: string | null; created_at: string;
  };
  documents: { id: number; kind: string; url: string; created_at: string }[];
  services: { key: string; name: string; code: string | null; verified_at: string | null }[];
}

// --- journey ops rows (admin) -----------------------------------------------
export interface RequestRow {
  id: number; request_no: string | null; status: string; pricing_mode: "fixed" | "quote";
  total_amount: string | null; quoted_amount: string | null; amount_paid: string | null;
  created_at: string; scheduled_at: string | null;
  customer_name: string; customer_phone: string | null; provider_name: string | null;
  category: string; service_name: string;
}
export interface InvoiceRow {
  id: number; party: "customer" | "provider"; number: string; amount: string; status: string;
  paid_at: string | null; created_at: string; request_no: string | null;
  service_name: string; customer_name: string; customer_phone: string | null;
}
export interface PayoutRow {
  id: number; kind: "advance" | "final"; amount: string; status: "held" | "released" | "paid";
  paid_ref: string | null; created_at: string; request_no: string | null;
  provider_name: string | null; provider_phone: string | null;
}
