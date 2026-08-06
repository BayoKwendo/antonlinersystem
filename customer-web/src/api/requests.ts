import { getJson, postJson } from "./client";

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

/** Send a 6-digit OTP to the phone (reuses the shared auth OTP endpoint). */
export const requestOtp = (phone: string) => postJson<{ expires_in: number }>("/auth/otp/request", { phone });

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
  total_amount: number;
  quoted_amount: number | null;
  amount_paid: number;
  scheduled_at: string | null;
  created_at: string;
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

interface SignResult { url: string; key: string; bucket: string; expires_in: number; }

/**
 * Upload a file to S3 via a presigned PUT and return the object key. Uses a bare
 * fetch for the PUT (no Authorization header — it would break the signature).
 * Falls back to the filename if presigning/upload isn't available.
 */
export async function uploadFile(file: File): Promise<string> {
  const type = file.type || "application/octet-stream";
  const sign = await postJson<SignResult>("/uploads/sign", { filename: file.name, content_type: type, size: file.size });
  const put = await fetch(sign.url, { method: "PUT", body: file, headers: { "Content-Type": type } });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return sign.key;
}
