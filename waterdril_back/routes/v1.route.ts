// =============================================================================
//  v1 API router (prefix /api/v1). Public auth + catalogue + M-Pesa callbacks;
//  everything else is behind requireAuth (+ requireRole where noted).
// =============================================================================
import { Router } from "../deps.ts";
import { requireAuth, requireRole } from "../middlewares/auth.ts";
import authController from "../controllers/v1/authController.ts";
import catalogController from "../controllers/v1/catalogController.ts";
import bookingController from "../controllers/v1/bookingController.ts";
import paymentController from "../controllers/v1/paymentController.ts";
import providerController from "../controllers/v1/providerController.ts";
import adminController from "../controllers/v1/adminController.ts";

const router = new Router({ prefix: "/api/v1" });

// --- public ------------------------------------------------------------------
router
  .post("/auth/otp/request", authController.requestOtp)
  .post("/auth/otp/verify", authController.verifyOtp)
  .post("/auth/login", authController.login)
  .post("/auth/refresh", authController.refresh)
  .post("/auth/logout", authController.logout)
  .get("/services", catalogController.listCategories)
  // M-Pesa callbacks (Safaricom posts here; no user auth).
  .post("/payments/mpesa/stk-callback", paymentController.stkCallback)
  .post("/payments/mpesa/c2b", paymentController.c2bCallback);

// --- authenticated -----------------------------------------------------------
router
  .get("/auth/me", requireAuth, authController.me)
  .post("/providers/nearby", requireAuth, catalogController.nearby);

// provider self-service
router
  .get("/providers/me", requireAuth, requireRole("provider"), providerController.me)
  .post("/providers/me/online", requireAuth, requireRole("provider"), providerController.setOnline)
  .post("/providers/me/location", requireAuth, requireRole("provider"), providerController.updateLocation);

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
  .get("/admin/providers", requireAuth, requireRole("admin", "assistance", "owner"), adminController.listProviders)
  .get("/admin/providers/:id", requireAuth, requireRole("admin", "assistance", "owner"), adminController.providerDetail)
  .post("/admin/providers", requireAuth, requireRole("admin", "owner"), adminController.onboardProvider)
  .patch("/admin/providers/:id", requireAuth, requireRole("admin", "owner"), adminController.updateProvider)
  .get("/admin/customers", requireAuth, requireRole("admin", "assistance"), adminController.listCustomers)
  .get("/admin/payments", requireAuth, requireRole("admin", "finance"), adminController.listPayments)
  .get("/admin/complaints", requireAuth, requireRole("admin", "assistance"), adminController.listComplaints)
  .patch("/admin/complaints/:id", requireAuth, requireRole("admin", "assistance"), adminController.updateComplaint)
  .get("/admin/reviews", requireAuth, requireRole("admin", "assistance"), adminController.listReviews)
  .patch("/admin/reviews/:id", requireAuth, requireRole("admin", "assistance"), adminController.setReviewHidden)
  .get("/admin/audit", requireAuth, requireRole("admin"), adminController.listAudit);

// service-category management (admin)
router
  .post("/services", requireAuth, requireRole("admin"), catalogController.createCategory)
  .patch("/services/:id", requireAuth, requireRole("admin"), catalogController.updateCategory);

export default router;
