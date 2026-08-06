// =============================================================================
//  Payments — M-Pesa STK initiation + idempotent application.
//
//  A payment is applied to its booking inside a transaction. Idempotency is
//  guaranteed two ways: a UNIQUE(mpesa_receipt) column and an explicit
//  "already-success" check, so duplicate callbacks are safe no-ops.
//
//  Deposit payment confirms the booking (pending_payment -> booked) and marks
//  the provider booked; balance payments just accrue against the total.
// =============================================================================
import client, { type Querier } from "../db/client.ts";
import bookingRepo from "../repositories/bookingRepo.ts";
import providerRepo from "../repositories/providerRepo.ts";
import invoiceRepo from "../repositories/invoiceRepo.ts";
import escrow from "./escrow.ts";
import { initiateStkPush } from "./mpesaService.ts";
import { notifyUser } from "./notify.ts";
import { notifyQualifiedProviders } from "./jobs.ts";
import { normalizePhone } from "../utils/phone.ts";
import { AppError, badRequest, forbidden, notFound } from "../utils/errors.ts";

interface Actor {
  userId: number;
  roles: string[];
}

function isStaff(a: Actor) {
  return a.roles.some((r) => ["admin", "assistance", "finance"].includes(r));
}

/** Apply a confirmed amount to a booking inside an open transaction. */
async function applyToBooking(query: Querier, bookingId: number, amount: number) {
  const rows = await query(`SELECT * FROM bookings WHERE id = ? FOR UPDATE`, [bookingId]);
  const booking = rows[0];
  if (!booking) return null;

  const paidAfter = Number(booking.amount_paid) + amount;
  await bookingRepo.addPaid(bookingId, amount, query);

  let becameBooked = false;
  if (booking.request_no != null) {
    // Public SMART Drill request: full payment of the invoiced amount confirms it
    // and opens escrow (the provider accepted before payment).
    const target = Number(booking.quoted_amount ?? booking.total_amount);
    if (booking.status === "pending_payment" && target > 0 && paidAfter >= target) {
      await bookingRepo.setStatus(bookingId, "booked", query);
      await bookingRepo.addEvent(bookingId, "booked", null, "payment received", query);
      await query(`UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE booking_id = ? AND party = 'customer' AND status = 'issued'`, [bookingId]);
      if (booking.provider_id) await escrow.onAssigned(bookingId, booking.provider_id as number, target, query);
      becameBooked = true;
    }
  } else if (
    booking.status === "pending_payment" &&
    Number(booking.deposit_amount) > 0 &&
    paidAfter >= Number(booking.deposit_amount)
  ) {
    await bookingRepo.setStatus(bookingId, "booked", query);
    await bookingRepo.addEvent(bookingId, "booked", null, "deposit paid", query);
    await providerRepo.setListingAvailability(booking.provider_id, booking.category_id, "booked", query);
    becameBooked = true;
  }
  return { booking, becameBooked };
}

export const payments = {
  /** Customer initiates an STK push for the deposit (or remaining balance). */
  async initiate(actor: Actor, bookingId: number, rawPhone: string) {
    const rows = await bookingRepo.byId(bookingId);
    const booking = rows[0];
    if (!booking) throw notFound("Booking not found");
    if (booking.customer_id !== actor.userId) throw forbidden();

    const paid = Number(booking.amount_paid);
    const deposit = Number(booking.deposit_amount);
    const total = Number(booking.total_amount);
    const kind: "deposit" | "balance" = paid < deposit ? "deposit" : "balance";
    const target = kind === "deposit" ? deposit : total;
    const due = Math.max(0, target - paid);
    if (due <= 0) throw badRequest("Nothing left to pay for this booking");

    const phone = normalizePhone(rawPhone);
    const res = await initiateStkPush({ amount: due, msisdn: phone, accountReference: `BK${bookingId}` });
    if (!res) throw new AppError(502, "Payment provider unavailable");

    await bookingRepo.insertPendingPayment({
      bookingId,
      phone,
      amount: due,
      kind,
      checkoutId: res.checkoutId,
    });
    return { checkout_id: res.checkoutId, amount: due, kind };
  },

  /** Public: customer pays a request's invoice via STK (token-authorized). */
  async initiateRequestPayment(token: string, rawPhone: string) {
    const b = await bookingRepo.rawByTrackingToken(token);
    if (!b) throw notFound("Request not found");
    if (b.status !== "pending_payment") throw badRequest("This request isn't awaiting payment yet.");
    const inv = await invoiceRepo.byBooking(b.id);
    const target = inv ? Number(inv.amount) : Number(b.quoted_amount ?? b.total_amount);
    if (!target || target <= 0) throw badRequest("No invoice has been issued for this request yet.");
    const full = (await bookingRepo.byId(b.id))[0];
    const due = Math.max(0, target - Number(full.amount_paid));
    if (due <= 0) throw badRequest("This request is already paid.");

    const phone = normalizePhone(rawPhone);
    const res = await initiateStkPush({ amount: due, msisdn: phone, accountReference: `SR${b.id}` });
    if (!res) throw new AppError(502, "Payment provider unavailable");
    await bookingRepo.insertPendingPayment({ bookingId: b.id, phone, amount: due, kind: "deposit", checkoutId: res.checkoutId });
    return { checkout_id: res.checkoutId, amount: due };
  },

  /** Safaricom STK result callback (CallBackURL). Idempotent. */
  async handleStkCallback(payload: Record<string, unknown>) {
    // deno-lint-ignore no-explicit-any
    const cb = (payload as any)?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) return { applied: false };
    const checkoutId: string = cb.CheckoutRequestID;

    if (cb.ResultCode !== 0) {
      await client.query(
        `UPDATE payments SET status = 'failed', raw_payload = ? WHERE checkout_id = ? AND status = 'pending'`,
        [JSON.stringify(cb), checkoutId],
      );
      return { applied: false };
    }

    // deno-lint-ignore no-explicit-any
    const items: any[] = cb.CallbackMetadata?.Item ?? [];
    const get = (n: string) => items.find((i) => i.Name === n)?.Value;
    const receipt = String(get("MpesaReceiptNumber") ?? "");
    const amount = Number(get("Amount") ?? 0);
    if (!receipt || amount <= 0) return { applied: false };

    const result = await client.withTransaction(async (query) => {
      if (await bookingRepo.paymentByReceipt(receipt, query)) return null; // already applied
      const pending = await bookingRepo.paymentByCheckout(checkoutId, query);
      if (!pending || pending.status === "success") return null;
      await query(
        `UPDATE payments SET status='success', mpesa_receipt=?, amount=?, raw_payload=? WHERE id=?`,
        [receipt, amount, JSON.stringify(cb), pending.id],
      );
      const applied = await applyToBooking(query, pending.booking_id, amount);
      return applied ? { bookingId: pending.booking_id, ...applied } : null;
    });

    if (result) await this.afterApplied(result.bookingId, result.becameBooked, amount);
    return { applied: Boolean(result) };
  },

  /** Safaricom C2B/paybill confirmation. BillRefNumber must be `BK<bookingId>`. */
  async handleC2b(payload: Record<string, string>) {
    const ref = String(payload.BillRefNumber ?? "");
    const bookingId = Number(ref.replace(/\D/g, ""));
    const receipt = String(payload.TransID ?? "");
    const amount = Number(payload.TransAmount ?? 0);
    const phone = normalizePhone(String(payload.MSISDN ?? ""));
    if (!bookingId || !receipt || amount <= 0) return { applied: false };
    return this.applyExternal({ bookingId, receipt, amount, phone, source: "c2b", payload });
  },

  /** Manual reconciliation from the portal (finance/admin). */
  async reconcile(
    actor: Actor,
    input: { booking_id: number; amount: number; receipt: string; phone?: string },
  ) {
    if (!isStaff(actor)) throw forbidden();
    return this.applyExternal({
      bookingId: input.booking_id,
      receipt: input.receipt,
      amount: input.amount,
      phone: normalizePhone(input.phone ?? ""),
      source: "portal",
      payload: { reconciled_by: actor.userId },
    });
  },

  /** Shared path for externally-confirmed payments (c2b / portal). Idempotent. */
  async applyExternal(
    { bookingId, receipt, amount, phone, source, payload }: {
      bookingId: number;
      receipt: string;
      amount: number;
      phone: string;
      source: "c2b" | "portal";
      payload: unknown;
    },
  ) {
    const result = await client.withTransaction(async (query) => {
      if (await bookingRepo.paymentByReceipt(receipt, query)) return null; // idempotent
      const rows = await bookingRepo.byId(bookingId, query);
      const booking = rows[0];
      if (!booking) return null;
      const kind = booking.status === "pending_payment" ? "deposit" : "balance";
      await query(
        `INSERT INTO payments (booking_id, mpesa_receipt, phone, amount, kind, source, status, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, 'success', ?)`,
        [bookingId, receipt, phone, amount, kind, source, JSON.stringify(payload)],
      );
      const applied = await applyToBooking(query, bookingId, amount);
      return applied ? { bookingId, ...applied } : null;
    });
    if (result) await this.afterApplied(result.bookingId, result.becameBooked, amount);
    return { applied: Boolean(result) };
  },

  /** Post-commit notifications. */
  async afterApplied(bookingId: number, becameBooked: boolean, amount: number) {
    // Public request that just got paid → confirm to customer + open the job to providers.
    const b = (await bookingRepo.byId(bookingId))[0];
    if (b?.request_no != null) {
      if (becameBooked) {
        await notifyUser(b.customer_id, "Payment confirmed", "Your payment is confirmed and held securely. We're notifying providers now.", { push: false });
        await notifyQualifiedProviders(b.category_id);
      } else {
        await notifyUser(b.customer_id, "Payment received", `We received KES ${amount} for your request.`, { push: false });
      }
      return;
    }
    const parties = await bookingRepo.parties(bookingId);
    if (!parties) return;
    if (becameBooked) {
      await notifyUser(parties.provider_id, "New booking", `You have been booked (#${bookingId}).`, {
        sms: true,
        data: { booking_id: bookingId },
      });
      await notifyUser(parties.customer_id, "Booking confirmed", `Your booking #${bookingId} is confirmed. Track your provider in the app.`, {
        sms: true,
        data: { booking_id: bookingId },
      });
    } else {
      await notifyUser(parties.customer_id, "Payment received", `We received KES ${amount} for booking #${bookingId}.`, {
        data: { booking_id: bookingId },
      });
    }
  },
};

export default payments;
