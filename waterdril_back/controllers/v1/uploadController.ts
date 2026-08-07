// =============================================================================
//  v1 file uploads (local disk). POST /uploads accepts a multipart form
//  (file + context + purpose) and stores it under waterdril_back/upload_files/;
//  GET /files/:name serves a stored file back (open URL, protected by the random
//  token embedded in the filename).
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { param } from "../../utils/validate.ts";
import { badRequest, notFound } from "../../utils/errors.ts";
import { uploads } from "../../services/uploads.ts";

const uploadController = {
  /** Multipart upload → stored on local disk; returns { url, filename }. */
  upload: async (ctx: Context) => {
    let form: FormData;
    try {
      form = await ctx.request.body.formData();
    } catch {
      throw badRequest("Expected a multipart form upload.");
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw badRequest("No file provided.");
    const context = (form.get("context") as string | null) ?? undefined;
    const purpose = (form.get("purpose") as string | null) ?? undefined;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await uploads.save({ bytes, contentType: file.type, context, purpose });
    ok(ctx, saved, "Uploaded");
  },

  /** Serve a stored file inline by name. */
  serve: async (ctx: Context) => {
    const name = param(ctx, "name");
    try {
      const { bytes, contentType } = await uploads.read(name);
      ctx.response.headers.set("Content-Type", contentType);
      ctx.response.headers.set("Content-Disposition", `inline; filename="${name}"`);
      ctx.response.headers.set("Cache-Control", "private, max-age=3600");
      ctx.response.body = bytes;
    } catch {
      throw notFound("File not found.");
    }
  },
};

export default uploadController;
