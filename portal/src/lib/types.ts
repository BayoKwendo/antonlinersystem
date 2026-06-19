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
