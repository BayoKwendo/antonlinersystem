// =============================================================================
//  Centralised dependencies.
//  Versions are pinned in deno.json's import map (JSR + npm specifiers), so this
//  file just re-exports the bits the app uses behind stable local names.
// =============================================================================

// --- Oak web framework (JSR, latest) ----------------------------------------
export { Application, Router, isHttpError } from "@oak/oak";
export type { Context, Middleware } from "@oak/oak";

// --- Deno standard library (JSR) ---------------------------------------------
export { green, cyan, yellow, red } from "@std/fmt/colors";
export { format as formatDate } from "@std/datetime";
export { load as loadEnv } from "@std/dotenv";

// --- npm packages ------------------------------------------------------------
export { default as bcrypt } from "bcryptjs";
export { importPKCS8, SignJWT, jwtVerify } from "jose";
export { z } from "zod";
export { AwsClient } from "aws4fetch";
