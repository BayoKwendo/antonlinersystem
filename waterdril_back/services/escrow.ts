// =============================================================================
//  Escrow: split the provider's cut into an advance (released on arrival) and a
//  final (released on completion, gated on a report). SMART Drill keeps the rest.
// =============================================================================
import payoutRepo from "../repositories/payoutRepo.ts";
import documentRepo from "../repositories/documentRepo.ts";
import { badRequest } from "../utils/errors.ts";
import { type Querier } from "../db/client.ts";

const PROVIDER_RATE = 0.90; // provider keeps 90%; SMART Drill commission 10%
const ADVANCE_RATE = 0.40;  // 40% of the provider cut on arrival (down payment), 60% on completion

export const escrow = {
  /** On provider assignment: create the advance+final payout pair (held). */
  async onAssigned(bookingId: number, providerId: number, gross: number, q?: Querier): Promise<void> {
    const cut = Math.round((gross || 0) * PROVIDER_RATE);
    const advance = Math.round(cut * ADVANCE_RATE);
    const final = cut - advance;
    await payoutRepo.ensurePair({ bookingId, providerId, advance, final }, q);
  },

  /** Customer confirms arrival → release the advance. */
  async releaseAdvance(bookingId: number, q?: Querier): Promise<void> {
    await payoutRepo.release(bookingId, "advance", q);
  },

  /** Customer confirms completion → release the final. A report MUST exist first. */
  async releaseFinal(bookingId: number, q?: Querier): Promise<void> {
    if (!(await documentRepo.hasReport(bookingId, q))) {
      throw badRequest("A completion report must be uploaded before the final payout can be released.");
    }
    await payoutRepo.release(bookingId, "final", q);
  },
};

export default escrow;
