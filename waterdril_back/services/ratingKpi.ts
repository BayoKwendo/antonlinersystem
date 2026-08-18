// =============================================================================
//  Automatic Service Provider KPI rating (SMART Drill Rating Matrix & TAT).
//
//  Overall score /100 = weighted sum of five KPIs, each scored 0–100% then
//  weighted. Every KPI is floored at 0 (no negatives). Computed per completed +
//  rated job; raw timestamps + each KPI % are stored in provider_kpi_scores so
//  the score is transparent and auditable.
//
//    Job Acceptance Speed  10%  ≤3 min = 100, else 0            (request → accept)
//    Customer Contact Speed 20% ≤10 min = 100; −5pp / min over  (accept → contacted)
//    Arrival at Site       40%  on-time = 100; −40pp / day late (scheduled vs arrived)
//    Job Completion Time   10%  ≤TAT = 100; −5pp / hour late    (arrival+TAT vs completed)
//    Customer Feedback     20%  rating/5 × 100                  (Ops phone-call rating)
//
//  TAT clock starts at ARRIVAL on site (configured decision); TAT hours are
//  per-service and configurable (service_categories.tat_hours).
// =============================================================================
import client from "../db/client.ts";

const WEIGHTS = { acceptance: 10, contact: 20, arrival: 40, completion: 10, feedback: 20 };
const MS_MIN = 60_000, MS_HOUR = 3_600_000, MS_DAY = 86_400_000;

const toMs = (v: unknown): number | null => {
  if (!v) return null;
  const t = new Date(v as string).getTime();
  return Number.isFinite(t) ? t : null;
};
const clampPct = (n: number) => Math.max(0, Math.min(100, n));
/** Calendar-day index (local date, tz-safe) so arriving the agreed day = on time. */
const dayIndex = (ms: number) => {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_DAY);
};

/** First timestamp a booking reached `status` (append-only events), optionally by actor. */
async function eventAt(bookingId: number, status: string, actorId?: number): Promise<string | null> {
  const clause = actorId != null ? "AND actor_id = ?" : "";
  const params = actorId != null ? [bookingId, status, actorId] : [bookingId, status];
  const rows = await client.query(
    `SELECT MIN(created_at) AS at FROM booking_events WHERE booking_id = ? AND status = ? ${clause}`,
    params,
  );
  return rows[0]?.at ?? null;
}

export const ratingKpi = {
  /**
   * Compute + persist the KPI score for one booking, then recompute the
   * provider's aggregate (provider_profiles.kpi_avg/kpi_jobs). Idempotent upsert
   * — safe to call whenever inputs change (e.g. after the Ops feedback rating).
   */
  async computeForBooking(bookingId: number) {
    const b = (await client.query(
      `SELECT b.id, b.provider_id, b.category_id, b.created_at, b.scheduled_at, b.contacted_at, sc.tat_hours
         FROM bookings b JOIN service_categories sc ON sc.id = b.category_id
        WHERE b.id = ? LIMIT 1`,
      [bookingId],
    ))[0];
    if (!b || b.provider_id == null) return null;

    const providerId = Number(b.provider_id);
    const categoryId = b.category_id != null ? Number(b.category_id) : null;

    // --- raw inputs ---
    const requestAt = b.created_at;
    // Marketplace accept = the provider's own 'pending_payment' event.
    const acceptAt = (await eventAt(bookingId, "pending_payment", providerId)) ?? (await eventAt(bookingId, "pending_payment"));
    const scheduledAt = b.scheduled_at;
    const contactedAt = b.contacted_at;
    const arrivedAt = await eventAt(bookingId, "arrived");
    const completedAt = await eventAt(bookingId, "completed");
    const tatHours = b.tat_hours != null ? Number(b.tat_hours) : null;
    const arrMs = toMs(arrivedAt);
    const deadlineAt = arrMs != null && tatHours != null ? new Date(arrMs + tatHours * MS_HOUR) : null;
    const fbRow = (await client.query(`SELECT rating FROM provider_ratings WHERE booking_id = ? LIMIT 1`, [bookingId]))[0];
    const feedbackRating = fbRow?.rating != null ? Number(fbRow.rating) : null;

    // --- KPI 1: Acceptance Speed (≤3 min = 100) ---
    const reqMs = toMs(requestAt), accMs = toMs(acceptAt);
    const acceptancePct = reqMs != null && accMs != null ? (accMs - reqMs <= 3 * MS_MIN ? 100 : 0) : 0;

    // --- KPI 2: Customer Contact Speed (≤10 min = 100; −5pp/min beyond) ---
    const conMs = toMs(contactedAt);
    let contactPct = 0;
    if (accMs != null && conMs != null) {
      const mins = Math.max(0, Math.ceil((conMs - accMs) / MS_MIN));
      contactPct = clampPct(100 - 5 * Math.max(0, mins - 10));
    }

    // --- KPI 3: Arrival (on-time = 100; −40pp per calendar day late) ---
    const schMs = toMs(scheduledAt);
    let arrivalPct = 0;
    if (arrMs != null && schMs != null) {
      const daysLate = Math.max(0, dayIndex(arrMs) - dayIndex(schMs));
      arrivalPct = clampPct(100 - 40 * daysLate);
    }

    // --- KPI 4: Completion Time (≤TAT = 100; −5pp per hour late) ---
    const compMs = toMs(completedAt), deadMs = deadlineAt ? deadlineAt.getTime() : null;
    let completionPct = 0;
    if (compMs != null && deadMs != null) {
      const hoursLate = Math.max(0, Math.ceil((compMs - deadMs) / MS_HOUR));
      completionPct = clampPct(100 - 5 * hoursLate);
    }

    // --- KPI 5: Customer Feedback (rating/5 × 100) ---
    const feedbackPct = feedbackRating != null ? clampPct((feedbackRating / 5) * 100) : 0;

    const overall = Math.round((
      acceptancePct * WEIGHTS.acceptance + contactPct * WEIGHTS.contact + arrivalPct * WEIGHTS.arrival +
      completionPct * WEIGHTS.completion + feedbackPct * WEIGHTS.feedback
    ) / 100 * 100) / 100;

    await client.query(
      `INSERT INTO provider_kpi_scores
         (booking_id, provider_id, category_id, request_at, accept_at, contacted_at, scheduled_at,
          arrived_at, completed_at, tat_hours, deadline_at, feedback_rating,
          acceptance_pct, contact_pct, arrival_pct, completion_pct, feedback_pct, overall)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         provider_id=VALUES(provider_id), category_id=VALUES(category_id),
         request_at=VALUES(request_at), accept_at=VALUES(accept_at), contacted_at=VALUES(contacted_at),
         scheduled_at=VALUES(scheduled_at), arrived_at=VALUES(arrived_at), completed_at=VALUES(completed_at),
         tat_hours=VALUES(tat_hours), deadline_at=VALUES(deadline_at), feedback_rating=VALUES(feedback_rating),
         acceptance_pct=VALUES(acceptance_pct), contact_pct=VALUES(contact_pct), arrival_pct=VALUES(arrival_pct),
         completion_pct=VALUES(completion_pct), feedback_pct=VALUES(feedback_pct), overall=VALUES(overall)`,
      [bookingId, providerId, categoryId, requestAt, acceptAt, contactedAt, scheduledAt,
       arrivedAt, completedAt, tatHours, deadlineAt, feedbackRating,
       acceptancePct, contactPct, arrivalPct, completionPct, feedbackPct, overall],
    );

    if (categoryId != null) {
      await client.query(
        `UPDATE provider_profiles pp SET
           pp.kpi_avg  = (SELECT ROUND(AVG(overall),2) FROM provider_kpi_scores WHERE provider_id=? AND category_id=?),
           pp.kpi_jobs = (SELECT COUNT(*)             FROM provider_kpi_scores WHERE provider_id=? AND category_id=?)
         WHERE pp.user_id=? AND pp.category_id=?`,
        [providerId, categoryId, providerId, categoryId, providerId, categoryId],
      );
    }

    return { bookingId, overall, acceptancePct, contactPct, arrivalPct, completionPct, feedbackPct };
  },

  /** A provider's KPI summary + recent per-job breakdowns (transparency). */
  async forProvider(providerId: number, limit = 30) {
    const summary = (await client.query(
      `SELECT ROUND(AVG(overall),1) AS kpi_avg, COUNT(*) AS jobs,
              ROUND(AVG(acceptance_pct),0) AS acceptance, ROUND(AVG(contact_pct),0) AS contact,
              ROUND(AVG(arrival_pct),0) AS arrival, ROUND(AVG(completion_pct),0) AS completion,
              ROUND(AVG(feedback_pct),0) AS feedback
         FROM provider_kpi_scores WHERE provider_id = ?`,
      [providerId],
    ))[0];
    const jobs = await client.query(
      `SELECT k.booking_id, k.overall, k.acceptance_pct, k.contact_pct, k.arrival_pct, k.completion_pct,
              k.feedback_pct, k.feedback_rating, k.tat_hours, k.request_at, k.accept_at, k.contacted_at,
              k.scheduled_at, k.arrived_at, k.completed_at, k.deadline_at, k.created_at,
              b.request_no, sc.name AS service
         FROM provider_kpi_scores k
         JOIN bookings b ON b.id = k.booking_id
         LEFT JOIN service_categories sc ON sc.id = k.category_id
        WHERE k.provider_id = ? ORDER BY k.created_at DESC LIMIT ?`,
      [providerId, limit],
    );
    return { weights: WEIGHTS, summary, jobs };
  },

  /** Admin: wipe a provider's ratings + KPI history + aggregates. */
  async reset(providerId: number) {
    await client.withTransaction(async (query) => {
      await query(`DELETE FROM provider_kpi_scores WHERE provider_id = ?`, [providerId]);
      await query(`DELETE FROM provider_ratings WHERE provider_id = ?`, [providerId]);
      await query(`UPDATE provider_profiles SET rating_avg=0, rating_count=0, kpi_avg=0, kpi_jobs=0 WHERE user_id = ?`, [providerId]);
    });
    return { reset: true };
  },
};

export default ratingKpi;
