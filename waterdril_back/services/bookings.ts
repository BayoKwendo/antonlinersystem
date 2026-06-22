// =============================================================================
//  Booking lifecycle.
//  Status flow:  pending_payment -> booked -> en_route -> arrived
//                -> in_progress -> completed   (cancelled from pre-job states)
//    * deposit payment confirms a booking (pending_payment -> booked);
//    * the provider drives en_route, in_progress, completed;
//    * the customer confirms "arrived" (en_route -> arrived);
//    * completion frees the provider.
// =============================================================================
import client from "../db/client.ts";
import bookingRepo from "../repositories/bookingRepo.ts";
import providerRepo from "../repositories/providerRepo.ts";
import { notifyUser } from "./notify.ts";
import { audit } from "./audit.ts";
import { badRequest, forbidden, notFound } from "../utils/errors.ts";

const FLOW = ["pending_payment", "booked", "en_route", "arrived", "in_progress", "completed"];
// Who may drive each transition: the customer confirms arrival; the provider
// drives the rest of the job.
const CUSTOMER_TARGETS = ["arrived"];
const PROVIDER_TARGETS = ["en_route", "in_progress", "completed"];
const DEPOSIT_RATE = 0.4;

interface Actor {
  userId: number;
  roles: string[];
}

function isAdmin(a: Actor) {
  return a.roles.some((r) => ["admin", "assistance", "finance"].includes(r));
}

export const bookings = {
  async create(
    customerId: number,
    input: { provider_id: number; category: string; address?: string; lat?: number; lng?: number },
  ) {
    const provider = await bookingRepo.providerSnapshot(input.provider_id, input.category);
    if (!provider || provider.user_status !== "active") throw notFound("Provider not found");
    if (provider.availability === "booked") throw badRequest("Provider is currently booked");

    const total = Number(provider.base_price) || 0;
    const deposit = Math.round(total * DEPOSIT_RATE);
    const created = await bookingRepo.create({
      customerId,
      providerId: input.provider_id,
      categoryId: provider.category_id,
      depositAmount: deposit,
      totalAmount: total,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    });
    return this.detail(created.id, { userId: customerId, roles: ["customer"] });
  },

  async detail(id: number, actor: Actor) {
    const rows = await bookingRepo.byId(id);
    const booking = rows[0];
    if (!booking) throw notFound("Booking not found");
    if (
      !isAdmin(actor) && booking.customer_id !== actor.userId &&
      booking.provider_id !== actor.userId
    ) throw forbidden();
    const [events, payments, provider] = await Promise.all([
      bookingRepo.events(id),
      bookingRepo.paymentsOf(id),
      providerRepo.profile(booking.provider_id),
    ]);
    return {
      ...booking,
      events,
      payments,
      provider_name: provider?.display_name ?? null,
      provider_phone: provider?.phone ?? null,
      provider_lat: provider?.lat ?? null,
      provider_lng: provider?.lng ?? null,
      provider_availability: provider?.availability ?? null,
    };
  },

  list(actor: Actor, status?: string, scope?: string) {
    // An explicit scope lets multi-role accounts (e.g. admin + provider) get a
    // role-specific view: the DriverApp asks for "provider", the PassengerApp
    // for "customer", so an admin sees only their own jobs in those apps.
    if (scope === "provider" && actor.roles.includes("provider")) {
      return bookingRepo.listForProvider(actor.userId);
    }
    if (scope === "customer" && actor.roles.includes("customer")) {
      return bookingRepo.listForCustomer(actor.userId);
    }
    if (isAdmin(actor)) return bookingRepo.listAll(status);
    if (actor.roles.includes("provider")) return bookingRepo.listForProvider(actor.userId);
    return bookingRepo.listForCustomer(actor.userId);
  },

  /** Provider/admin advances the job status (forward only). */
  async transition(actor: Actor, id: number, to: string, note?: string) {
    const rows = await bookingRepo.byId(id);
    const booking = rows[0];
    if (!booking) throw notFound("Booking not found");
    const isProvider = booking.provider_id === actor.userId;
    const isCustomer = booking.customer_id === actor.userId;
    const admin = isAdmin(actor);

    // Authorize by who owns the transition.
    if (CUSTOMER_TARGETS.includes(to)) {
      if (!isCustomer && !admin) throw forbidden();
    } else if (PROVIDER_TARGETS.includes(to)) {
      if (!isProvider && !admin) throw forbidden();
    } else {
      throw badRequest(`Cannot transition to ${to}`);
    }

    const fromIdx = FLOW.indexOf(booking.status);
    const toIdx = FLOW.indexOf(to);
    if (fromIdx < FLOW.indexOf("booked")) throw badRequest("Booking is not confirmed yet");
    if (toIdx !== fromIdx + 1) throw badRequest(`Cannot move from ${booking.status} to ${to}`);

    await client.withTransaction(async (query) => {
      await bookingRepo.setStatus(id, to, query);
      await bookingRepo.addEvent(id, to, actor.userId, note ?? "", query);
      if (to === "completed") {
        await providerRepo.setListingAvailability(booking.provider_id, booking.category_id, "available", query);
      }
    });
    await audit(actor.userId, "booking.transition", "booking", id, { to });
    // Notify the counterparty: the provider when the customer confirms arrival,
    // otherwise the customer for provider-driven status changes.
    if (to === "arrived") {
      await notifyUser(
        booking.provider_id,
        "Customer confirmed arrival",
        "The customer confirmed you've arrived — you can start the job.",
        { data: { booking_id: id, status: to } },
      );
    } else {
      await notifyUser(booking.customer_id, "Booking update", `Your provider is now: ${to.replace("_", " ")}.`, {
        sms: to === "completed",
        data: { booking_id: id, status: to },
      });
    }
    return this.detail(id, actor);
  },

  /** Customer or admin cancels a pre-job booking. */
  async cancel(actor: Actor, id: number, reason?: string) {
    const rows = await bookingRepo.byId(id);
    const booking = rows[0];
    if (!booking) throw notFound("Booking not found");
    if (booking.customer_id !== actor.userId && !isAdmin(actor)) throw forbidden();
    if (!["pending_payment", "booked"].includes(booking.status)) {
      throw badRequest("Booking can no longer be cancelled");
    }
    await client.withTransaction(async (query) => {
      await bookingRepo.setStatus(id, "cancelled", query);
      await bookingRepo.addEvent(id, "cancelled", actor.userId, reason ?? "", query);
      await providerRepo.setListingAvailability(booking.provider_id, booking.category_id, "available", query);
    });
    await audit(actor.userId, "booking.cancel", "booking", id, { reason });
    await notifyUser(booking.provider_id, "Booking cancelled", `Booking #${id} was cancelled.`, {
      sms: true,
      data: { booking_id: id },
    });
    return this.detail(id, actor);
  },

  /** Customer rates a completed booking; recomputes the provider's rating. */
  async review(customerId: number, id: number, rating: number, comment?: string) {
    const rows = await bookingRepo.byId(id);
    const booking = rows[0];
    if (!booking) throw notFound("Booking not found");
    if (booking.customer_id !== customerId) throw forbidden();
    if (booking.status !== "completed") throw badRequest("You can only review a completed booking");

    await client.withTransaction(async (query) => {
      await query(
        `INSERT INTO reviews (booking_id, customer_id, provider_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
        [id, customerId, booking.provider_id, rating, comment ?? null],
      );
      await providerRepo.recomputeRating(booking.provider_id, query);
    });
    return { ok: true };
  },
};

export default bookings;
