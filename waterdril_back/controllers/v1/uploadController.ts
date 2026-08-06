// =============================================================================
//  v1 public upload pre-signing — returns a signed S3 PUT URL + object key.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { parseBody } from "../../utils/validate.ts";
import { uploadSignSchema } from "../../validators/schemas.ts";
import { uploads } from "../../services/uploads.ts";

const uploadController = {
  sign: async (ctx: Context) => {
    ok(ctx, await uploads.sign(await parseBody(ctx, uploadSignSchema)), "Signed");
  },
};

export default uploadController;
