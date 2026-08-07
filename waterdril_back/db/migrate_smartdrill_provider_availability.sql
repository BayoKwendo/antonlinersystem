-- =============================================================================
--  Migration: richer provider availability — add manual "on_holiday" and
--  "maintenance" states (per the admin-portal spec). The live states
--  (scheduled / headed-to-site / on-site / awaiting-payment) are derived from
--  the provider's active bookings, not stored here. Idempotent (MODIFY re-runs).
-- =============================================================================
ALTER TABLE `provider_profiles`
  MODIFY COLUMN `availability`
  ENUM('available','booked','offline','on_holiday','maintenance')
  NOT NULL DEFAULT 'offline';
