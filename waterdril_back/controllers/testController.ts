// =============================================================================
//  Health-check controller.
// =============================================================================
import { type Context } from "../deps.ts";
import client from "../db/client.ts";

export default {
  /** Verify the DB connection is alive. */
  health: async (ctx: Context) => {
    await client.query("SELECT 1");
    ctx.response.status = 200;
    ctx.response.body = { status: true, status_code: 200, message: "OK" };
  },
};
