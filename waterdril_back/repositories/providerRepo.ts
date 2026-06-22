// =============================================================================
//  Provider self-service data access: availability, live location, ratings.
// =============================================================================
import client, { type Querier } from "../db/client.ts";

const db = (q?: Querier): Querier => q ?? client.query;

const providerRepo = {
  async profile(userId: number) {
    const rows = await client.query(
      `SELECT pp.*, sc.\`key\` AS category, u.display_name, u.phone
         FROM provider_profiles pp
         JOIN service_categories sc ON sc.id = pp.category_id
         JOIN users u ON u.id = pp.user_id
        WHERE pp.user_id = ? LIMIT 1`,
      [userId],
    );
    return rows[0];
  },

  /**
   * Toggle online/offline. Never overrides 'booked' — a booked provider stays
   * booked until the job ends.
   */
  setOnline(userId: number, online: boolean) {
    return client.query(
      `UPDATE provider_profiles
          SET availability = CASE
                WHEN availability = 'booked' THEN 'booked'
                WHEN ? = 1 THEN 'available'
                ELSE 'offline'
              END
        WHERE user_id = ?`,
      [online ? 1 : 0, userId],
    );
  },

  setAvailability(userId: number, availability: "available" | "booked" | "offline", q?: Querier) {
    return db(q)(`UPDATE provider_profiles SET availability = ? WHERE user_id = ?`, [
      availability,
      userId,
    ]);
  },

  /**
   * Availability of a single listing (one category). Booking/cancel/complete
   * affect only the booked unit, leaving the provider's other category
   * listings independently bookable.
   */
  setListingAvailability(
    userId: number,
    categoryId: number,
    availability: "available" | "booked" | "offline",
    q?: Querier,
  ) {
    return db(q)(
      `UPDATE provider_profiles SET availability = ? WHERE user_id = ? AND category_id = ?`,
      [availability, userId, categoryId],
    );
  },

  updateLocation(userId: number, lat: number, lng: number) {
    return client.query(
      `UPDATE provider_profiles
          SET lat = ?, lng = ?, movement_status = 'moving',
              location_updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
      [lat, lng, userId],
    );
  },

  /** Recompute rating_avg / rating_count from the reviews table. */
  recomputeRating(providerId: number, q?: Querier) {
    return db(q)(
      `UPDATE provider_profiles pp
          SET rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = pp.user_id),
              rating_avg   = COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.provider_id = pp.user_id), 0)
        WHERE pp.user_id = ?`,
      [providerId],
    );
  },
};

export default providerRepo;
