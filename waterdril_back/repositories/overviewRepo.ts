// =============================================================================
//  Admin dashboard overview aggregation (GET /admin/overview). One call returns
//  every tile/list on the SMART Drill portal Overview: request/payment/job
//  counters, jobs-by-status, provider status, top services, provider
//  performance, recent requests/activity, the QA queue, and alerts.
// =============================================================================
import client from "../db/client.ts";

const n = (v: unknown) => Number(v ?? 0);
const one = async (sql: string, p: unknown[] = []) => (await client.query(sql, p))[0] ?? {};
const many = (sql: string, p: unknown[] = []) => client.query(sql, p);

const ACTIVE = "('booked','en_route','arrived','in_progress')";

export const overviewRepo = {
  async overview() {
    // --- headline counters ---------------------------------------------------
    const counters = await one(
      `SELECT
         (SELECT COUNT(*) FROM bookings WHERE status='submitted') AS new_requests,
         (SELECT COUNT(*) FROM bookings WHERE status='submitted' AND DATE(created_at)=CURDATE()) AS new_requests_today,
         (SELECT COUNT(*) FROM bookings WHERE status='pending_payment') AS awaiting_payment,
         (SELECT COALESCE(SUM(COALESCE(quoted_amount,total_amount)),0) FROM bookings WHERE status='pending_payment') AS awaiting_payment_amount,
         (SELECT COUNT(*) FROM bookings WHERE status IN ${ACTIVE}) AS active_jobs,
         (SELECT COUNT(*) FROM bookings WHERE status IN ${ACTIVE} AND DATE(created_at)=CURDATE()) AS active_jobs_today,
         (SELECT COUNT(*) FROM bookings WHERE status='completed') AS awaiting_qa,
         (SELECT COUNT(*) FROM bookings WHERE status='completed' AND DATE(updated_at)=CURDATE()) AS awaiting_qa_today,
         (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success' AND DATE(created_at)=CURDATE()) AS received_today,
         (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success' AND DATE(created_at)=CURDATE()-INTERVAL 1 DAY) AS received_yesterday,
         (SELECT COALESCE(SUM(amount),0) FROM provider_payouts WHERE status='released') AS payouts_due,
         (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success') AS received_total`,
    );

    // --- jobs by status (donut) ---------------------------------------------
    const jobsByStatusRows = await many(
      `SELECT status, COUNT(*) AS n FROM bookings
        WHERE status IN ('en_route','arrived','in_progress','completed','confirmed','booked')
        GROUP BY status`,
    );
    const jobsByStatus = Object.fromEntries(jobsByStatusRows.map((r: { status: string; n: number }) => [r.status, n(r.n)]));

    // --- provider status breakdown (derived: manual availability + live job) -
    const psRows = await many(
      `SELECT derived, COUNT(*) AS n FROM (
         SELECT pa.user_id,
           CASE
             WHEN u.status='suspended' THEN 'suspended'
             WHEN pa.verification_status='pending'  THEN 'pending'
             WHEN pa.verification_status='rejected' THEN 'rejected'
             WHEN act.st='en_route' THEN 'headed'
             WHEN act.st IN ('arrived','in_progress') THEN 'on_site'
             WHEN act.st='booked' THEN 'scheduled'
             WHEN act.st='pending_payment' THEN 'awaiting_payment'
             WHEN (SELECT availability FROM provider_profiles WHERE user_id=pa.user_id LIMIT 1)='on_holiday' THEN 'on_holiday'
             WHEN (SELECT availability FROM provider_profiles WHERE user_id=pa.user_id LIMIT 1)='maintenance' THEN 'maintenance'
             WHEN (SELECT availability FROM provider_profiles WHERE user_id=pa.user_id LIMIT 1)='offline' THEN 'offline'
             ELSE 'available'
           END AS derived
         FROM provider_accounts pa
         JOIN users u ON u.id = pa.user_id
         LEFT JOIN (
           SELECT provider_id,
             SUBSTRING_INDEX(GROUP_CONCAT(status ORDER BY FIELD(status,'en_route','arrived','in_progress','booked','pending_payment')), ',', 1) AS st
           FROM bookings
           WHERE provider_id IS NOT NULL AND status IN ('en_route','arrived','in_progress','booked','pending_payment')
           GROUP BY provider_id
         ) act ON act.provider_id = pa.user_id
       ) x GROUP BY derived`,
    );
    const provStatus = Object.fromEntries(psRows.map((r: { derived: string; n: number }) => [r.derived, n(r.n)]));

    // --- top services this month --------------------------------------------
    const topServices = await many(
      `SELECT sc.\`key\`, sc.name, COUNT(*) AS jobs,
              COALESCE(SUM(b.amount_paid),0) AS revenue
         FROM bookings b JOIN service_categories sc ON sc.id=b.category_id
        WHERE b.created_at >= DATE_FORMAT(NOW(),'%Y-%m-01')
        GROUP BY sc.id ORDER BY jobs DESC, revenue DESC LIMIT 6`,
    );

    // --- provider performance (top 5 by completed jobs) ---------------------
    const performance = await many(
      `SELECT COALESCE(pa.business_name, u.display_name) AS provider,
              COUNT(DISTINCT b.id) AS jobs,
              ROUND(AVG(pp.rating_avg),1) AS rating
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id
         LEFT JOIN provider_accounts pa ON pa.user_id = pp.user_id
         LEFT JOIN bookings b ON b.provider_id = pp.user_id AND b.status IN ('completed','confirmed')
        WHERE pp.verified_at IS NOT NULL
        GROUP BY pp.user_id ORDER BY jobs DESC, rating DESC LIMIT 5`,
    );

    // --- recent requests -----------------------------------------------------
    const recentRequests = await many(
      `SELECT b.id, b.request_no, b.status, b.address AS location, b.created_at,
              sc.name AS service, c.display_name AS customer
         FROM bookings b
         JOIN service_categories sc ON sc.id=b.category_id
         JOIN users c ON c.id=b.customer_id
        ORDER BY b.created_at DESC LIMIT 6`,
    );

    // --- recent activity (booking events) -----------------------------------
    const recentActivity = await many(
      `SELECT be.status, be.note, be.created_at, b.request_no, sc.name AS service
         FROM booking_events be
         JOIN bookings b ON b.id = be.booking_id
         JOIN service_categories sc ON sc.id = b.category_id
        ORDER BY be.id DESC LIMIT 8`,
    );

    // --- QA queue (completed, awaiting verification) ------------------------
    const qaQueue = await many(
      `SELECT b.id, b.request_no, b.status, sc.name AS service,
              c.display_name AS customer, pa.business_name AS provider
         FROM bookings b
         JOIN service_categories sc ON sc.id=b.category_id
         JOIN users c ON c.id=b.customer_id
         LEFT JOIN provider_accounts pa ON pa.user_id=b.provider_id
        WHERE b.status='completed' ORDER BY b.updated_at ASC LIMIT 10`,
    );

    // --- alerts --------------------------------------------------------------
    const alerts = await one(
      `SELECT
         (SELECT COUNT(*) FROM bookings WHERE status IN ${ACTIVE} AND scheduled_at IS NOT NULL AND scheduled_at < NOW()) AS delayed_jobs,
         (SELECT COUNT(*) FROM bookings WHERE status='submitted') AS unmatched_requests,
         (SELECT COUNT(*) FROM provider_accounts WHERE verification_status='pending') AS pending_providers`,
    );

    return {
      counters: {
        new_requests: n(counters.new_requests),
        new_requests_today: n(counters.new_requests_today),
        awaiting_payment: n(counters.awaiting_payment),
        awaiting_payment_amount: n(counters.awaiting_payment_amount),
        active_jobs: n(counters.active_jobs),
        active_jobs_today: n(counters.active_jobs_today),
        awaiting_qa: n(counters.awaiting_qa),
        awaiting_qa_today: n(counters.awaiting_qa_today),
        received_today: n(counters.received_today),
        received_yesterday: n(counters.received_yesterday),
        payouts_due: n(counters.payouts_due),
        received_total: n(counters.received_total),
      },
      jobs_by_status: {
        booked: jobsByStatus.booked ?? 0,
        en_route: jobsByStatus.en_route ?? 0,
        arrived: jobsByStatus.arrived ?? 0,
        in_progress: jobsByStatus.in_progress ?? 0,
        completed: jobsByStatus.completed ?? 0,
        confirmed: jobsByStatus.confirmed ?? 0,
        total: Object.values(jobsByStatus).reduce((a: number, b) => a + n(b), 0),
      },
      provider_status: {
        available: provStatus.available ?? 0,
        scheduled: provStatus.scheduled ?? 0,
        headed: provStatus.headed ?? 0,
        on_site: provStatus.on_site ?? 0,
        awaiting_payment: provStatus.awaiting_payment ?? 0,
        on_holiday: provStatus.on_holiday ?? 0,
        maintenance: provStatus.maintenance ?? 0,
        offline: provStatus.offline ?? 0,
        suspended: provStatus.suspended ?? 0,
        pending: provStatus.pending ?? 0,
        rejected: provStatus.rejected ?? 0,
      },
      top_services: topServices.map((r: { key: string; name: string; jobs: number; revenue: string }) => ({
        key: r.key, name: r.name, jobs: n(r.jobs), revenue: n(r.revenue),
      })),
      provider_performance: performance.map((r: { provider: string; jobs: number; rating: string }) => ({
        provider: r.provider, jobs: n(r.jobs), rating: r.rating != null ? Number(r.rating) : null,
      })),
      recent_requests: recentRequests,
      recent_activity: recentActivity,
      qa_queue: qaQueue,
      alerts: {
        delayed_jobs: n(alerts.delayed_jobs),
        unmatched_requests: n(alerts.unmatched_requests),
        pending_providers: n(alerts.pending_providers),
      },
    };
  },
};

export default overviewRepo;
