import { BASE_URL, getJson, postJson } from "./client";

export interface RequestPayload {
  service_key: string;
  full_name: string;
  phone: string;
  otp_code: string;
  email?: string;
  location: { lat: number; lng: number } | null;
  details: Record<string, string>;
  documents: string[]; // filenames for now; presigned S3 keys once uploads land
}

/** Send an OTP to the phone (reuses the shared auth OTP endpoint). When an email
 *  is supplied it's also delivered there, so first-time customers get it both ways. */
export const requestOtp = (phone: string, email?: string) =>
  postJson<{ expires_in: number }>("/auth/otp/request", { phone, ...(email ? { email } : {}) });

export interface RequestResult {
  request_no: string;
  tracking_token: string;
  pricing_mode: "fixed" | "quote";
}

/** Frictionless public create — POST /api/v1/requests. */
export const submitRequest = (payload: RequestPayload) =>
  postJson<RequestResult>("/requests", payload);

export interface TrackResult {
  request_no: string;
  status: string;
  pricing_mode: "fixed" | "quote";
  service_name: string;
  service_key: string;
  customer_name: string;
  provider_name: string | null;
  provider_phone: string | null;
  total_amount: number;
  quoted_amount: number | null;
  amount_paid: number;
  scheduled_at: string | null;
  created_at: string;
  /** Customer's site pin (destination marker). */
  site_location: { lat: number; lng: number } | null;
  /** Provider's last-known live position (instant first paint / REST fallback). */
  provider_location: { lat: number; lng: number; at: string | null } | null;
}

/** Read-only status for the public tracking page — GET /api/v1/track/:token. */
export const fetchTrack = (token: string) => getJson<TrackResult>(`/track/${token}`);

/**
 * Order lookup step 1 — validate order number + phone and send an OTP to that
 * phone (POST /api/v1/requests/lookup).
 */
export const lookupRequest = (request_no: string, phone: string) =>
  postJson<{ otp_required: boolean; expires_in: number }>("/requests/lookup", { request_no, phone });

/**
 * Order lookup step 2 — verify the OTP and get the tracking token
 * (POST /api/v1/requests/lookup/verify).
 */
export const lookupVerify = (request_no: string, phone: string, otp_code: string) =>
  postJson<{ tracking_token: string }>("/requests/lookup/verify", { request_no, phone, otp_code });

interface UploadResult { url: string; filename: string }

/**
 * Upload a file to the backend (stored on local disk) and return its served URL.
 * `context` groups the file (e.g. "request"); `purpose` is the document kind
 * (e.g. the form field name), which shapes the stored filename.
 */
export async function uploadFile(file: File, context = "request", purpose = "doc"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("context", context);
  fd.append("purpose", purpose);
  // No Content-Type header — the browser sets the multipart boundary itself.
  const res = await fetch(`${BASE_URL}/uploads`, { method: "POST", body: fd });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.message ?? `Upload failed (${res.status})`);
  return (body.data as UploadResult).url;
}
