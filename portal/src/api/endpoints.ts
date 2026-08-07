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
  Overview,
  ProviderApplication,
  ProviderApplicationRow,
  RequestRow,
  InvoiceRow,
  PayoutRow,
  SearchResults,
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
  overview: (params?: { from?: string; to?: string }) => unwrap<Overview>(http.get("/admin/overview", { params })),
  search: (q: string) => unwrap<SearchResults>(http.get("/admin/search", { params: { q } })),

  // --- provider verification (applications) ---
  providerApplications: (params: { status?: string } & Page) =>
    unwrap<Paginated<ProviderApplicationRow>>(http.get("/admin/provider-applications", { params })),
  providerApplication: (userId: number) =>
    unwrap<ProviderApplication>(http.get(`/admin/provider-applications/${userId}`)),
  verifyProvider: (userId: number, approve: boolean, note?: string) =>
    http.post(`/admin/providers/${userId}/verify`, { approve, note }),

  // --- journey ops (requests / invoices / payouts / QA) ---
  adminRequests: (params: { status?: string }) =>
    unwrap<RequestRow[]>(http.get("/admin/requests", { params })),
  adminInvoices: (params: { status?: string }) =>
    unwrap<InvoiceRow[]>(http.get("/admin/invoices", { params })),
  adminPayouts: (params: { status?: string }) =>
    unwrap<PayoutRow[]>(http.get("/admin/payouts", { params })),
  requestPayouts: (id: number) => unwrap<PayoutRow[]>(http.get(`/admin/requests/${id}/payouts`)),
  requestDocuments: (id: number) => unwrap<{ id: number; kind: string; url: string; created_at: string }[]>(http.get(`/admin/requests/${id}/documents`)),
  issueInvoice: (id: number, amount?: number) => http.post(`/admin/requests/${id}/invoice`, { amount }),
  setQuote: (id: number, amount: number) => http.post(`/admin/requests/${id}/quote`, { amount }),
  confirmRequestPayment: (id: number) => http.post(`/admin/requests/${id}/payment`, {}),
  assignProvider: (id: number, provider_id: number) => http.post(`/admin/requests/${id}/assign`, { provider_id }),
  verifyCompletion: (id: number) => http.post(`/admin/requests/${id}/verify`, {}),
  rateProvider: (id: number, body: { rating: number; feedback?: number; timeliness?: number; quality?: number; note?: string }) =>
    http.post(`/admin/requests/${id}/rating`, body),
  markPayoutPaid: (id: number, ref?: string) => http.post(`/admin/payouts/${id}/mark-paid`, { ref }),

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
