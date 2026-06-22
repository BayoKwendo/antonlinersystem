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
