-- =============================================================================
--  Migration: automatic Service Provider KPI rating (per the Rating Matrix & TAT
--  framework). Adds:
--    * service_categories.tat_hours  — configurable turnaround per service (the
--      Job-Completion deadline = arrival + tat_hours). NOT hard-coded in code.
--    * bookings.contacted_at         — when the provider marked the customer
--      contacted (drives the Customer Contact Speed KPI).
--    * provider_profiles.kpi_avg / kpi_jobs — aggregate KPI score per listing.
--    * provider_kpi_scores           — one auditable row per completed job with
--      the raw timestamps + each KPI % + the weighted overall /100.
--
--  Idempotent (information_schema-guarded / IF NOT EXISTS). Mirrors schema.sql.
-- =============================================================================

-- 1. service_categories.tat_hours --------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `service_categories` ADD COLUMN `tat_hours` INT UNSIGNED DEFAULT NULL AFTER `price_note`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_categories' AND COLUMN_NAME = 'tat_hours'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Seed recommended TATs per service (hours). Admins can change these in the portal.
UPDATE `service_categories` SET `tat_hours` = 4  WHERE `key` = 'geologist'         AND `tat_hours` IS NULL; -- Hydrogeological Survey
UPDATE `service_categories` SET `tat_hours` = 72 WHERE `key` = 'drillers'          AND `tat_hours` IS NULL; -- Borehole Drilling
UPDATE `service_categories` SET `tat_hours` = 36 WHERE `key` = 'test_pump'         AND `tat_hours` IS NULL; -- Test Pumping (24 + 12 setup)
UPDATE `service_categories` SET `tat_hours` = 48 WHERE `key` = 'surveys'           AND `tat_hours` IS NULL; -- Water Quality Analysis
UPDATE `service_categories` SET `tat_hours` = 48 WHERE `key` = 'pump_installer'    AND `tat_hours` IS NULL; -- Borehole Equipping
UPDATE `service_categories` SET `tat_hours` = 4  WHERE `key` = 'other_services'    AND `tat_hours` IS NULL; -- Borehole Consultancy
UPDATE `service_categories` SET `tat_hours` = 48 WHERE `key` = 'tank_installation' AND `tat_hours` IS NULL; -- Borehole Maintenance (not in PDF — default)

-- 2. bookings.contacted_at ----------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `contacted_at` DATETIME DEFAULT NULL AFTER `scheduled_at`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'contacted_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. provider_profiles aggregate KPI columns ---------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `provider_profiles` ADD COLUMN `kpi_avg` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `rating_count`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_profiles' AND COLUMN_NAME = 'kpi_avg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `provider_profiles` ADD COLUMN `kpi_jobs` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `kpi_avg`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_profiles' AND COLUMN_NAME = 'kpi_jobs'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. provider_kpi_scores (one auditable row per completed + rated job) --------
CREATE TABLE IF NOT EXISTS `provider_kpi_scores` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`     BIGINT UNSIGNED NOT NULL,
  `provider_id`    BIGINT UNSIGNED NOT NULL,
  `category_id`    INT UNSIGNED DEFAULT NULL,
  -- raw inputs (auditable / transparent to the provider)
  `request_at`     DATETIME DEFAULT NULL,
  `accept_at`      DATETIME DEFAULT NULL,
  `contacted_at`   DATETIME DEFAULT NULL,
  `scheduled_at`   DATETIME DEFAULT NULL,
  `arrived_at`     DATETIME DEFAULT NULL,
  `completed_at`   DATETIME DEFAULT NULL,
  `tat_hours`      INT UNSIGNED DEFAULT NULL,
  `deadline_at`    DATETIME DEFAULT NULL,
  `feedback_rating` DECIMAL(2,1) DEFAULT NULL,
  -- per-KPI score as a percentage (0–100) of that KPI
  `acceptance_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `contact_pct`    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `arrival_pct`    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `completion_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `feedback_pct`   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  -- weighted overall score out of 100
  `overall`        DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kpi_booking` (`booking_id`),
  KEY `idx_kpi_provider` (`provider_id`, `category_id`),
  CONSTRAINT `fk_kpi_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
