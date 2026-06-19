// =============================================================================
//  Application configuration.
//  All values come from the environment (.env in dev, real env vars in prod).
//  No secrets are hard-coded here — see .env.example for the full list.
// =============================================================================
import { loadEnv } from "../deps.ts";

// Populate Deno.env from a local .env file when present (no-op in prod if the
// file is absent and the vars are already set in the environment).
await loadEnv({ export: true });

/** Read a required env var, throwing early if it is missing. */
function required(key: string): string {
  const value = Deno.env.get(key);
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Read an optional env var with a fallback default. */
function optional(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? fallback;
}

function number(key: string, fallback: number): number {
  const raw = Deno.env.get(key);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(key: string, fallback: string[] = []): string[] {
  const raw = Deno.env.get(key);
  if (!raw) return fallback;
  return raw.split(",").map((s: string) => s.trim()).filter(Boolean);
}

export const SERVER = {
  PORT: number("PORT", 5002),
};


export const SECURITY = {
  /**
   * Browser origins allowed to call the API (the Vite portal). Native apps
   * don't enforce CORS. Comma-separated `CORS_ORIGINS`; defaults to local dev.
   */
  CORS_ORIGINS: list("CORS_ORIGINS", [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
};

export const DATABASE = {
  HOST: optional("DB_HOST", "127.0.0.1"),
  PORT: number("DB_PORT", 3306),
  USER: optional("DB_USER", "root"),
  PASSWORD: optional("DB_PASSWORD"),
  NAME: required("DB_NAME"),
  POOL_SIZE: number("DB_POOL_SIZE", 10),
};

export const AUTH = {
  JWT_SECRET: required("JWT_SECRET"),
  /** Short-lived access token. */
  JWT_TTL_SECONDS: number("JWT_TTL_SECONDS", 900),
  /** Long-lived opaque refresh token (stored hashed in refresh_tokens). */
  REFRESH_TTL_SECONDS: number("REFRESH_TTL_SECONDS", 60 * 60 * 24 * 30),
  /** Customer SMS OTP. */
  OTP_TTL_SECONDS: number("OTP_TTL_SECONDS", 300),
  OTP_LENGTH: number("OTP_LENGTH", 6),
};

export const SMS = {
  URL: optional("SMS_URL"),
  API_KEY: optional("SMS_API_KEY"),
  SENDER_ID: optional("SMS_SENDER_ID"),
  CLIENT_ID: optional("SMS_CLIENT_ID"),
  ACCESS_KEY: optional("SMS_ACCESS_KEY"),
};

export const MPESA = {
  SHORTCODE: optional("MPESA_SHORTCODE"),
  PASSKEY: optional("MPESA_PASSKEY"),
  CONSUMER_KEY: optional("MPESA_CONSUMER_KEY"),
  CONSUMER_SECRET: optional("MPESA_CONSUMER_SECRET"),
  STK_URL: optional("MPESA_STK_URL"),
  TOKEN_URL: optional("MPESA_TOKEN_URL"),
  CALLBACK_URL: optional("MPESA_CALLBACK_URL"),
};

export const AWS = {
  ACCESS_KEY_ID: optional("AWS_ACCESS_KEY_ID"),
  SECRET_ACCESS_KEY: optional("AWS_SECRET_ACCESS_KEY"),
  S3_BUCKET: optional("AWS_S3_BUCKET", "pantheon2"),
  S3_REGION: optional("AWS_S3_REGION", "us-east-1"),
};

export const APP = {
  HOTLINE: optional("HOTLINE", "0111051030"),
  DEFAULT_AVATAR_URL: optional("DEFAULT_AVATAR_URL"),
};

/** Currency formatter shared across the app. */
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
});
