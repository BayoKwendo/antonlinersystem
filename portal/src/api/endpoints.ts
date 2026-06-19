import { http, unwrap } from "./client";
import type {
  Analytics,
  AuditEntry,
  AuthResult,
  Booking,
  BookingDetail,
  Category,
  Complaint,
  Customer,
  Paginated,
  Payment,
  Provider,
  ProviderDetail,
  ProviderLocation,
  Review,
  StaffUser,
  Stats,
  User,
} from "../lib/types";

type Page = { limit?: number; offset?: number };

export const api = {
  // --- auth ---
  login: (phone: string, password: string) =>
    unwrap<AuthResult>(http.post("/auth/login", { phone, password })),
  me: () => unwrap<User>(http.get("/auth/me")),
  logout: (refresh_token: string) => http.post("/auth/logout", { refresh_token }),
  resetPassword: (phone: string) => http.post("/auth/password/reset", { phone }),
  updateProfile: (body: { display_name?: string; email?: string }) => http.patch("/auth/me", body),
  changePassword: (current: string, next: string) => http.post("/auth/password", { current, next }),

  // --- dashboard ---
  stats: () => unwrap<Stats>(http.get("/admin/stats")),
  analytics: () => unwrap<Analytics>(http.get("/admin/analytics")),

  // --- providers ---
  providers: (params: { category?: string; q?: string } & Page) =>
    unwrap<Paginated<Provider>>(http.get("/admin/providers", { params })),
  providerDetail: (id: number) => unwrap<ProviderDetail>(http.get(`/admin/providers/${id}`)),
  onboardProvider: (body: Record<string, unknown>) =>
    unwrap<{ id: number }>(http.post("/admin/providers", body)),
  updateProvider: (id: number, body: Record<string, unknown>) =>
    http.patch(`/admin/providers/${id}`, body),
  providerLocations: () => unwrap<ProviderLocation[]>(http.get("/admin/providers/locations")),

  // --- customers ---
  customers: (params: { q?: string } & Page) =>
    unwrap<Paginated<Customer>>(http.get("/admin/customers", { params })),
  createCustomer: (body: Record<string, unknown>) => http.post("/admin/customers", body),
  updateCustomer: (id: number, body: Record<string, unknown>) => http.patch(`/admin/customers/${id}`, body),

  // --- staff / owners / agents ---
  users: (params: { role?: string; q?: string } & Page) =>
    unwrap<Paginated<StaffUser>>(http.get("/admin/users", { params })),
  createUser: (body: Record<string, unknown>) => http.post("/admin/users", body),
  updateUser: (id: number, body: Record<string, unknown>) => http.patch(`/admin/users/${id}`, body),

  // --- SMS console ---
  sendSms: (phone: string, text: string) => http.post("/admin/sms", { phone, text }),

  // --- bookings ---
  adminBookings: (params: { from?: string; to?: string; status?: string } & Page) =>
    unwrap<Paginated<Booking>>(http.get("/admin/bookings", { params })),
  booking: (id: number) => unwrap<BookingDetail>(http.get(`/bookings/${id}`)),
  cancelBooking: (id: number, reason?: string) => http.post(`/bookings/${id}/cancel`, { reason }),

  // --- payments ---
  payments: (params: { from?: string; to?: string } & Page) =>
    unwrap<Paginated<Payment>>(http.get("/admin/payments", { params })),
  reconcile: (body: Record<string, unknown>) => http.post("/payments/reconcile", body),

  // --- categories ---
  categories: (all = true) => unwrap<Category[]>(http.get("/services", { params: { all: all ? 1 : 0 } })),
  createCategory: (body: Record<string, unknown>) => http.post("/services", body),
  updateCategory: (id: number, body: Record<string, unknown>) => http.patch(`/services/${id}`, body),

  // --- complaints ---
  complaints: (params: Page) => unwrap<Paginated<Complaint>>(http.get("/admin/complaints", { params })),
  updateComplaint: (id: number, body: { status: string; note?: string }) =>
    http.patch(`/admin/complaints/${id}`, body),

  // --- reviews ---
  reviews: (params: Page) => unwrap<Paginated<Review>>(http.get("/admin/reviews", { params })),
  setReviewHidden: (id: number, hidden: boolean) => http.patch(`/admin/reviews/${id}`, { hidden }),

  // --- audit ---
  audit: (params: Page) => unwrap<Paginated<AuditEntry>>(http.get("/admin/audit", { params })),
};
