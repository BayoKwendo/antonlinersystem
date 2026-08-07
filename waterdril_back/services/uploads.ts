// =============================================================================
//  Local-disk file uploads. Files are stored under waterdril_back/upload_files/
//  and served back by the API at /api/v1/files/<name>. Filenames follow
//  <context>_<purpose>_<timestamp>_<random>.<ext>, e.g.
//    driverreg_kra_pin_20260807T142530_7f3a9c.pdf
//  The random suffix keeps sensitive documents (KRA, compliance) from being
//  guessable via the open file URL, while the context/purpose prefix keeps them
//  human-readable for admins reviewing them.
// =============================================================================
import { badRequest } from "../utils/errors.ts";

const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// Anchored to this module's location, so it resolves to waterdril_back/upload_files/
// regardless of the process cwd (dev, Docker, systemd).
const UPLOAD_DIR = new URL("../upload_files/", import.meta.url);
// Public path the served file is reachable at (v1 router is mounted at /api/v1).
const PUBLIC_PREFIX = "/api/v1/files";

/** Lower-case, collapse to [a-z0-9_], trim, cap length; fall back if empty. */
function slug(s: string | undefined, fallback: string): string {
  const t = (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return t || fallback;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

const rand = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join(""); // 6 hex chars

/** Reject anything that could escape the upload directory when served. */
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", webp: "image/webp", mp4: "video/mp4",
};

export const uploads = {
  /**
   * Persist an uploaded file to local disk and return its served URL + name.
   * `context` = where it came from (driverreg / request / job), `purpose` = the
   * document kind (kra_pin / cr12 / survey_report / report / etims_invoice …).
   */
  async save(
    { bytes, contentType, context, purpose }: {
      bytes: Uint8Array;
      contentType: string;
      context?: string;
      purpose?: string;
    },
  ): Promise<{ url: string; filename: string }> {
    const ext = EXT_BY_TYPE[(contentType || "").toLowerCase()];
    if (!ext) throw badRequest("Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, MP4.");
    if (bytes.byteLength > MAX_BYTES) throw badRequest("File is too large (max 15 MB).");
    if (bytes.byteLength === 0) throw badRequest("The file is empty.");

    await Deno.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${slug(context, "file")}_${slug(purpose, "doc")}_${stamp()}_${rand()}.${ext}`;
    await Deno.writeFile(new URL(filename, UPLOAD_DIR), bytes);
    return { filename, url: `${PUBLIC_PREFIX}/${filename}` };
  },

  /** Read a stored file for serving. Guards against path traversal. */
  async read(name: string): Promise<{ bytes: Uint8Array; contentType: string }> {
    if (!SAFE_NAME.test(name)) throw badRequest("File not found.");
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const bytes = await Deno.readFile(new URL(name, UPLOAD_DIR)); // throws if missing
    return { bytes, contentType: MIME_BY_EXT[ext] ?? "application/octet-stream" };
  },
};

export default uploads;
