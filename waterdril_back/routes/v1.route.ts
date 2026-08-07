// =============================================================================
//  v1 API router (prefix /api/v1). Public auth + catalogue + M-Pesa callbacks;
//  everything else is behind requireAuth (+ requireRole where noted).
// =============================================================================
import { Router } from "../deps.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";
import { rateLimit } from "../middlewares/rateLimit.ts";
import authController from "../controllers/v1/authController.ts";
import catalogController from "../controllers/v1/catalogController.ts";
import bookingController from "../controllers/v1/bookingController.ts";
import paymentController from "../controllers/v1/paymentController.ts";
import providerController from "../controllers/v1/providerController.ts";
import adminController from "../controllers/v1/adminController.ts";
import notificationController from "../controllers/v1/notificationController.ts";
import requestController from "../controllers/v1/requestController.ts";
import adminOpsController from "../controllers/v1/adminOpsController.ts";
import jobController from "../controllers/v1/jobController.ts";
import uploadController from "../controllers/v1/uploadController.ts";

const router = new Router({ prefix: "/api/v1" });

// Rate-limit windows for the public (unauthenticated) surface. Keyed by IP.
const MIN = 60_000;
const rlOtp = rateLimit({ name: "otp", windowMs: 10 * MIN, max: 5 });
const rlVerify = rateLimit({ name: "otpverify", windowMs: 10 * MIN, max: 12 });
const rlLogin = rateLimit({ name: "login", windowMs: 5 * MIN, max: 10 });
const rlReset = rateLimit({ name: "pwreset", windowMs: 15 * MIN, max: 5 });
const rlSignup = rateLimit({ name: "signup", windowMs: 60 * MIN, max: 5 });
const rlCreate = rateLimit({ name: "reqcreate", windowMs: 60 * MIN, max: 8 });
const rlLookup = rateLimit({ name: "lookup", windowMs: 10 * MIN, max: 10 });
const rlSign = rateLimit({ name: "uploadsign", windowMs: 10 * MIN, max: 40 });
const rlPay = rateLimit({ name: "pay", windowMs: 10 * MIN, max: 10 });
const rlComplaint = rateLimit({ name: "complaint", windowMs: 30 * MIN, max: 5 });

// --- public ------------------------------------------------------------------
router
  .post("/auth/otp/request", rlOtp, authController.requestOtp)
  .post("/auth/otp/verify", rlVerify, authController.verifyOtp)
  .post("/auth/login", rlLogin, authController.login)
  .post("/auth/refresh", authController.refresh)
  .post("/auth/logout", authController.logout)
  .post("/auth/password/reset", rlReset, authController.resetPassword)
  .get("/services", catalogController.listCategories)
  // Public provider self-signup (Android) — returns auth tokens.
  .post("/providers/signup", rlSignup, providerController.signup)
  // Public service requests (frictionless — no auth) + read-only tracking.
  .post("/uploads/sign", rlSign, uploadController.sign)
  .post("/requests", rlCreate, requestController.create)
  .post("/requests/lookup", rlLookup, requestController.lookup)
  .post("/requests/lookup/verify", rlLookup, requestController.lookupVerify)
  .get("/track/:token", requestController.track)
  // Token-authorized customer journey actions (the tracking token is the credential).
  .post("/track/:token/pay", rlPay, requestController.pay)
  .post("/track/:token/confirm-arrival", requestController.confirmArrival)
  .post("/track/:token/confirm-completion", requestController.confirmCompletion)
  .post("/track/:token/complaint", rlComplaint, requestController.complaint)
  // M-Pesa callbacks (Safaricom posts here; no user auth).
  .post("/payments/mpesa/stk-callback", paymentController.stkCallback)
  .post("/payments/mpesa/c2b", paymentController.c2bCallback);

// --- authenticated -----------------------------------------------------------
router
  .get("/auth/me", requireAuth, authController.me)
  .patch("/auth/me", requireAuth, authController.updateMe)
  .post("/auth/password", requireAuth, authController.changePassword)
  .post("/providers/nearby", requireAuth, catalogController.nearby);

// in-app notifications (any authenticated user; own inbox)
router
  .get("/notifications", requireAuth, notificationController.list)
  .post("/notifications/read-all", requireAuth, notificationController.readAll)
  .post("/notifications/:id/read", requireAuth, notificationController.read)
  // push device registration (FCM token upsert for the current user)
  .post("/devices", requireAuth, notificationController.registerDevice);

// provider self-service
router
  .get("/providers/me", requireAuth, requireRole("provider"), providerController.me)
  .get("/providers/dashboard", requireAuth, requireRole("provider"), providerController.dashboard)
  .get("/providers/earnings", requireAuth, requireRole("provider"), providerController.earnings)
  .post("/providers/me/online", requireAuth, requireRole("provider"), providerController.setOnline)
  .post("/providers/me/location", requireAuth, requireRole("provider"), providerController.updateLocation);

// provider job marketplace + delivery (driver app)
router
  .get("/jobs", requireAuth, requireRole("provider"), jobController.available)
  .get("/jobs/mine", requireAuth, requireRole("provider"), jobController.mine)
  .post("/jobs/:id/accept", requireAuth, requireRole("provider"), jobController.accept)
  .post("/jobs/:id/prompt-payment", requireAuth, requireRole("provider"), jobController.promptPayment)
  .post("/jobs/:id/status", requireAuth, requireRole("provider"), jobController.status)
  .post("/jobs/:id/documents", requireAuth, requireRole("provider"), jobController.addDocument)
  .post("/jobs/:id/decline", requireAuth, requireRole("provider"), jobController.decline);

// bookings
router
  .post("/bookings", requireAuth, requireRole("customer"), bookingController.create)
  .get("/bookings", requireAuth, bookingController.list)
  .get("/bookings/:id", requireAuth, bookingController.detail)
  .post("/bookings/:id/pay", requireAuth, requireRole("customer"), bookingController.pay)
  .patch("/bookings/:id/status", requireAuth, bookingController.transition)
  .post("/bookings/:id/cancel", requireAuth, bookingController.cancel)
  .post("/bookings/:id/review", requireAuth, requireRole("customer"), bookingController.review);

// payments — operator reconciliation
router.post(
  "/payments/reconcile",
  requireAuth,
  requireRole("admin", "finance"),
  paymentController.reconcile,
);

// --- portal / admin ----------------------------------------------------------
const STAFF = ["admin", "assistance", "finance", "owner"];
router
  .get("/admin/stats", requireAuth, requireRole(...STAFF), adminController.stats)
  .get("/admin/analytics", requireAuth, requireRole(...STAFF), adminController.analytics)
  .get("/admin/overview", requireAuth, requireRole(...STAFF), adminController.overview)
  .get("/admin/provider-applications", requireAuth, requireRole("admin", "assistance", "owner"), adminController.providerApplications)
  .get("/admin/provider-applications/:id", requireAuth, requireRole("admin", "assistance", "owner"), adminController.providerApplication)
  .get("/admin/providers", requireAuth, requireRole("admin", "assistance", "owner"), adminController.listProviders)
  .get("/admin/providers/locations", requireAuth, requireRole(...STAFF), adminController.providerLocations)
  .get("/admin/providers/:id", requireAuth, requireRole("admin", "assistance", "owner"), adminController.providerDetail)
  .post("/admin/providers", requireAuth, requireRole("admin", "owner"), adminController.onboardProvider)
  .patch("/admin/providers/:id", requireAuth, requireRole("admin", "owner"), adminController.updateProvider)
  .get("/admin/customers", requireAuth, requireRole("admin", "assistance"), adminController.listCustomers)
  .post("/admin/customers", requireAuth, requireRole("admin", "assistance"), adminController.createCustomer)
  .patch("/admin/customers/:id", requireAuth, requireRole("admin", "assistance"), adminController.updateCustomer)
  .get("/admin/users", requireAuth, requireRole("admin"), adminController.listUsers)
  .post("/admin/users", requireAuth, requireRole("admin"), adminController.createUser)
  .patch("/admin/users/:id", requireAuth, requireRole("admin"), adminController.updateUser)
  .get("/admin/bookings", requireAuth, requireRole(...STAFF), adminController.listBookings)
  .get("/admin/payments", requireAuth, requireRole("admin", "finance"), adminController.listPayments)
  .post("/admin/sms", requireAuth, requireRole("admin", "assistance"), adminController.sendSms)
  .get("/admin/complaints", requireAuth, requireRole("admin", "assistance"), adminController.listComplaints)
  .patch("/admin/complaints/:id", requireAuth, requireRole("admin", "assistance"), adminController.updateComplaint)
  .get("/admin/reviews", requireAuth, requireRole("admin", "assistance"), adminController.listReviews)
  .patch("/admin/reviews/:id", requireAuth, requireRole("admin", "assistance"), adminController.setReviewHidden)
  .get("/admin/audit", requireAuth, requireRole("admin"), adminController.listAudit);

// --- SMART Drill journey ops (staff) -----------------------------------------
router
  .get("/admin/requests", requireAuth, requireRole(...STAFF), adminOpsController.listRequests)
  .get("/admin/invoices", requireAuth, requireRole(...STAFF), adminOpsController.listInvoices)
  .get("/admin/payouts", requireAuth, requireRole(...STAFF), adminOpsController.listPayouts)
  .get("/admin/requests/:id/payouts", requireAuth, requireRole(...STAFF), adminOpsController.payouts)
  .get("/admin/requests/:id/documents", requireAuth, requireRole(...STAFF), adminOpsController.documents)
  .post("/admin/requests/:id/invoice", requireAuth, requireRole("admin", "assistance", "finance"), adminOpsController.issueInvoice)
  .post("/admin/requests/:id/quote", requireAuth, requireRole("admin", "assistance"), adminOpsController.setQuote)
  .post("/admin/requests/:id/payment", requireAuth, requireRole("admin", "finance"), adminOpsController.confirmPayment)
  .post("/admin/requests/:id/assign", requireAuth, requireRole("admin", "assistance", "owner"), adminOpsController.assign)
  .post("/admin/requests/:id/documents", requireAuth, requireRole(...STAFF), adminOpsController.addDocument)
  .post("/admin/requests/:id/verify", requireAuth, requireRole("admin", "assistance", "finance"), adminOpsController.verifyCompletion)
  .post("/admin/requests/:id/rating", requireAuth, requireRole("admin", "assistance", "owner"), adminOpsController.rateProvider)
  .post("/admin/providers/:id/verify", requireAuth, requireRole("admin", "assistance", "owner"), adminOpsController.verifyProvider)
  .post("/admin/payouts/:id/mark-paid", requireAuth, requireRole("admin", "finance"), adminOpsController.markPayoutPaid);

// service-category management (admin)
router
  .post("/services", requireAuth, requireRole("admin"), catalogController.createCategory)
  .patch("/services/:id", requireAuth, requireRole("admin"), catalogController.updateCategory);

export default router;
