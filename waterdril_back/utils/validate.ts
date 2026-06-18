// =============================================================================
//  Zod request validation helpers. Parse a JSON body or query against a schema
//  and throw a 422 AppError (with field details) on failure.
// =============================================================================
import { type Context, z } from "../deps.ts";
import { readJson } from "./http.ts";
import { badRequest, unprocessable } from "./errors.ts";

/** Read a router path param (e.g. :id) off the context. */
export function param(ctx: Context, name: string): string {
  const params = (ctx as unknown as { params?: Record<string, string> }).params;
  return params?.[name] ?? "";
}

/** Read + validate a positive-integer path param. */
export function numericId(ctx: Context, name = "id"): number {
  const v = Number(param(ctx, name));
  if (!Number.isInteger(v) || v <= 0) throw badRequest(`Invalid ${name}`);
  return v;
}

function format(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join(".") || "_"] = issue.message;
  }
  return out;
}

/** Validate a parsed value against a schema (throws 422 with field errors). */
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw unprocessable("Validation failed", format(result.error));
  return result.data;
}

/** Read + validate the JSON request body. */
export async function parseBody<T>(ctx: Context, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await readJson(ctx);
  } catch {
    throw unprocessable("Invalid JSON body");
  }
  return parse(schema, raw);
}

/** Validate the query string params against a schema. */
export function parseQuery<T>(ctx: Context, schema: z.ZodType<T>): T {
  const obj: Record<string, string> = {};
  for (const [k, v] of ctx.request.url.searchParams) obj[k] = v;
  return parse(schema, obj);
}
