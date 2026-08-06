-- =============================================================================
--  Migration: Ops-assigned provider ratings + provider job declines.
--    provider_ratings — Smart Drill (Ops) assigns a rating per completed job
--      (customer feedback / timeliness / long-term quality). Aggregated into
--      provider_profiles.rating_avg per provider + service.
--    job_declines — a provider dismisses a broadcast request; it then drops off
--      that provider's available list but stays visible to others.
--  Idempotent (CREATE TABLE IF NOT EXISTS).
-- =============================================================================
CREATE TABLE IF NOT EXISTS `provider_ratings` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`       BIGINT UNSIGNED NOT NULL,
  `provider_id`      BIGINT UNSIGNED NOT NULL,
  `category_id`      BIGINT UNSIGNED DEFAULT NULL,
  `rating`           DECIMAL(2,1)    NOT NULL,          -- overall 1.0–5.0
  `score_feedback`   TINYINT UNSIGNED DEFAULT NULL,     -- customer feedback
  `score_timeliness` TINYINT UNSIGNED DEFAULT NULL,     -- arrived/finished on time
  `score_quality`    TINYINT UNSIGNED DEFAULT NULL,     -- long-term service quality
  `note`             TEXT            DEFAULT NULL,
  `rated_by`         BIGINT UNSIGNED DEFAULT NULL,
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rating_booking` (`booking_id`),
  KEY `idx_rating_provider` (`provider_id`, `category_id`),
  CONSTRAINT `fk_rating_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `job_declines` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`  BIGINT UNSIGNED NOT NULL,
  `provider_id` BIGINT UNSIGNED NOT NULL,
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_decline` (`booking_id`, `provider_id`),
  CONSTRAINT `fk_decline_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
