// =============================================================================
//  Zod request schemas for the v1 API.
// =============================================================================
import { z } from "../deps.ts";

const phone = z.string().min(7).max(20);

// --- auth --------------------------------------------------------------------
export const requestOtpSchema = z.object({
  phone,
});

export const verifyOtpSchema = z.object({
  phone,
  code: z.string().regex(/^\d{4,8}$/),
  name: z.string().min(2).max(120).optional(),
});

export const passwordLoginSchema = z.object({
  phone,
  password: z.string().min(4).max(200),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(10),
});

// --- providers / nearby ------------------------------------------------------
export const nearbySchema = z.object({
  category: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().positive().max(500).optional(),
});

// --- public service requests -------------------------------------------------
export const createRequestSchema = z.object({
  service_key: z.string().min(1).max(40),
  full_name: z.string().min(1).max(120),
  phone,
  otp_code: z.string().regex(/^\d{4,8}$/), // 6-digit phone verification code

  email: z.string().email().max(160).optional(),
  location: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }).nullable().optional(),
  // Per-service form fields (arbitrary string values); server strips `__mode`.
  details: z.record(z.string(), z.string()).optional().default({}),
  documents: z.array(z.string().max(255)).max(20).optional().default([]),
});

export const complaintSchema = z.object({ message: z.string().min(3).max(1000) });

// Ops-assigned provider rating for a completed job.
export const providerRatingSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  feedback: z.coerce.number().int().min(1).max(5).optional(),
  timeliness: z.coerce.number().int().min(1).max(5).optional(),
  quality: z.coerce.number().int().min(1).max(5).optional(),
  note: z.string().max(1000).optional(),
});

// Look up a request by its order number + the phone it was placed with (the
// phone is the second factor, since request numbers are guessable).
export const lookupRequestSchema = z.object({
  request_no: z.string().min(3).max(40),
  phone,
});

// Step 2 of the lookup — verify the OTP sent to the phone.
export const lookupVerifyRequestSchema = z.object({
  request_no: z.string().min(3).max(40),
  phone,
  otp_code: z.string().regex(/^\d{4,8}$/),
});

// --- provider signup / verification / jobs -----------------------------------
export const providerSignupSchema = z.object({
  full_name: z.string().min(1).max(120),
  business_name: z.string().min(1).max(160),
  phone,
  email: z.string().email().max(150),
  kra_pin: z.string().min(4).max(20),
  password: z.string().min(6).max(200),
  bank_details: z.string().max(255).optional(),
  services: z.array(z.string().min(1).max(40)).min(1).max(10),
  documents: z.array(z.object({ kind: z.string().min(1).max(40), url: z.string().min(1).max(500) })).max(12).optional().default([]),
});
export const providerVerifySchema = z.object({ approve: z.boolean(), note: z.string().max(500).optional() });
export const jobAcceptSchema = z.object({ scheduled_at: z.string().min(4).max(40), note: z.string().max(500).optional() });
export const jobStatusSchema = z.object({ to: z.enum(["en_route", "arrived", "in_progress", "completed"]), note: z.string().max(500).optional() });

// --- journey admin ops -------------------------------------------------------
export const assignSchema = z.object({ provider_id: z.coerce.number().int().positive() });
export const invoiceSchema = z.object({ amount: z.coerce.number().positive().optional() });
export const quoteSchema = z.object({ amount: z.coerce.number().positive() });
export const documentSchema = z.object({ kind: z.string().min(1).max(40), url: z.string().min(1).max(500) });
export const markPaidSchema = z.object({ ref: z.string().max(64).optional() });

// --- bookings ----------------------------------------------------------------
export const createBookingSchema = z.object({
  provider_id: z.coerce.number().int().positive(),
  category: z.string().min(1),
  address: z.string().max(255).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const transitionSchema = z.object({
  status: z.enum(["en_route", "arrived", "in_progress", "completed"]),
  note: z.string().max(255).optional(),
});

export const cancelSchema = z.object({ reason: z.string().max(255).optional() });

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// --- payments ----------------------------------------------------------------
export const payInitiateSchema = z.object({ phone: z.string().min(7).max(20) });

export const reconcileSchema = z.object({
  booking_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  receipt: z.string().min(3).max(40),
  phone: z.string().min(7).max(20).optional(),
});

// --- provider self-service ---------------------------------------------------
export const providerOnlineSchema = z.object({ online: z.boolean() });
export const providerLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

// --- push device registration ------------------------------------------------
export const deviceTokenSchema = z.object({
  token: z.string().min(10).max(255),
  platform: z.enum(["android", "ios", "web"]).optional(),
});

// --- admin / portal ----------------------------------------------------------
export const onboardProviderSchema = z.object({
  phone: z.string().min(7).max(20),
  display_name: z.string().min(2).max(120),
  password: z.string().min(6).max(200),
  category: z.string().min(1),
  base_price: z.coerce.number().min(0),
  owner_id: z.coerce.number().int().positive().optional(),
  bio: z.string().max(500).optional(),
});

export const updateProviderSchema = z.object({
  base_price: z.coerce.number().min(0).optional(),
  verified: z.boolean().optional(),
  suspended: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
  key: z.string().min(2).max(40).regex(/^[a-z_]+$/),
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  active: z.boolean().optional(),
});

export const complaintUpdateSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed"]),
  note: z.string().max(500).optional(),
});

export const reviewHiddenSchema = z.object({ hidden: z.boolean() });

// --- auth: reset / profile / change-password ---------------------------------
export const resetPasswordSchema = z.object({ phone: z.string().min(7).max(20) });
export const changePasswordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(6).max(200),
});
export const updateProfileSchema = z.object({
  display_name: z.string().min(2).max(120).optional(),
  email: z.string().email().max(150).optional().or(z.literal("")),
});

// --- staff/owner/agent users -------------------------------------------------
const staffRole = z.enum(["admin", "assistance", "finance", "owner", "agent"]);
export const createUserSchema = z.object({
  phone: z.string().min(7).max(20),
  display_name: z.string().min(2).max(120),
  password: z.string().min(6).max(200),
  role: staffRole,
  email: z.string().email().max(150).optional(),
});
export const updateUserSchema = z.object({
  display_name: z.string().min(2).max(120).optional(),
  email: z.string().email().max(150).optional().or(z.literal("")),
  role: staffRole.optional(),
  suspended: z.boolean().optional(),
  password: z.string().min(6).max(200).optional(),
});

// --- customers (portal-managed) ----------------------------------------------
export const createCustomerSchema = z.object({
  phone: z.string().min(7).max(20),
  display_name: z.string().min(2).max(120),
  id_number: z.string().max(20).optional(),
});
export const updateCustomerSchema = z.object({
  display_name: z.string().min(2).max(120).optional(),
  id_number: z.string().max(20).optional(),
  suspended: z.boolean().optional(),
});

// --- provider detail edit (extends the price/verify/suspend update) ----------
export const editProviderSchema = z.object({
  base_price: z.coerce.number().min(0).optional(),
  verified: z.boolean().optional(),
  suspended: z.boolean().optional(),
  display_name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  bio: z.string().max(500).optional(),
  owner_id: z.coerce.number().int().positive().optional(),
  availability: z.enum(["available", "offline", "on_holiday", "maintenance"]).optional(),
});

// --- SMS console -------------------------------------------------------------
export const sendSmsSchema = z.object({
  phone: z.string().min(7).max(20),
  text: z.string().min(1).max(400),
});

export type RequestOtp = z.infer<typeof requestOtpSchema>;
export type VerifyOtp = z.infer<typeof verifyOtpSchema>;
export type PasswordLogin = z.infer<typeof passwordLoginSchema>;
export type Refresh = z.infer<typeof refreshSchema>;
export type Nearby = z.infer<typeof nearbySchema>;
