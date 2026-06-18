// =============================================================================
//  v1 payments controller — M-Pesa callbacks (public) + portal reconcile.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { parseBody } from "../../utils/validate.ts";
import { readJson } from "../../utils/http.ts";
import { currentUser } from "../../middlewares/auth.ts";
import payments from "../../services/payments.ts";
import { audit } from "../../services/audit.ts";
import { reconcileSchema } from "../../validators/schemas.ts";

const paymentController = {
  /** Safaricom STK result callback. Always 200 so Daraja stops retrying. */
  stkCallback: async (ctx: Context) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = await readJson(ctx);
    } catch { /* ignore malformed */ }
    await payments.handleStkCallback(payload);
    ctx.response.status = 200;
    ctx.response.body = { ResultCode: 0, ResultDesc: "Accepted" };
  },

  /** Safaricom C2B/paybill confirmation. */
  c2bCallback: async (ctx: Context) => {
    let payload: Record<string, string> = {};
    try {
      payload = await readJson(ctx);
    } catch { /* ignore */ }
    await payments.handleC2b(payload);
    ctx.response.status = 200;
    ctx.response.body = { ResultCode: 0, ResultDesc: "Accepted" };
  },

  /** Operator-driven reconciliation (finance/admin). */
  reconcile: async (ctx: Context) => {
    const me = currentUser(ctx);
    const input = await parseBody(ctx, reconcileSchema);
    const result = await payments.reconcile(me, input);
    await audit(me.userId, "payment.reconcile", "booking", input.booking_id, {
      amount: input.amount,
      receipt: input.receipt,
    });
    ok(ctx, result, "Reconciled");
  },
};

export default paymentController;
