-- =============================================================================
--  Migration: SMART Drill customer-journey — public service requests.
--
--  Adds request-tracking columns to `bookings` (request_no, tracking_token,
--  pricing_mode, details JSON, quoted_amount, customer_confirmed_at), makes
--  `provider_id` NULLABLE (a request has no provider until it is assigned), and
--  widens the `bookings`/`booking_events` status enums with the new journey
--  states (submitted, quoted, confirmed, disputed). Mirrors schema.sql.
--
--  Idempotent — safe to run repeatedly (column/index adds guarded via
--  information_schema; enum/nullability MODIFYs are no-ops when already applied).
--
--  Apply with:
--    mysql -u <user> -p <db_name> < db/migrate_smartdrill_journey.sql
-- =============================================================================

-- 1. bookings.request_no ------------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `request_no` VARCHAR(24) DEFAULT NULL AFTER `uuid`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'request_no'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. bookings.tracking_token --------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `tracking_token` CHAR(64) DEFAULT NULL AFTER `request_no`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'tracking_token'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. bookings.pricing_mode ----------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `pricing_mode` ENUM(''fixed'',''quote'') NOT NULL DEFAULT ''fixed'' AFTER `category_id`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'pricing_mode'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. bookings.quoted_amount ---------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `quoted_amount` DECIMAL(12,2) DEFAULT NULL AFTER `total_amount`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'quoted_amount'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. bookings.customer_confirmed_at -------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `customer_confirmed_at` DATETIME DEFAULT NULL AFTER `scheduled_at`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'customer_confirmed_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. bookings.details (JSON) --------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `details` JSON DEFAULT NULL AFTER `customer_confirmed_at`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'details'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. provider_id NULLABLE (a request is unassigned until a provider is booked).
--    Idempotent: MODIFY to the same definition is a harmless no-op. The FK
--    fk_bookings_provider is unaffected (NULLs are allowed under a FK).
ALTER TABLE `bookings` MODIFY `provider_id` BIGINT UNSIGNED NULL;

-- 8. Widen the status enums with the journey states. MODIFY is idempotent.
ALTER TABLE `bookings` MODIFY `status`
  ENUM('submitted','pending_payment','quoted','booked','en_route','arrived',
       'in_progress','completed','confirmed','cancelled','disputed')
  NOT NULL DEFAULT 'pending_payment';

ALTER TABLE `booking_events` MODIFY `status`
  ENUM('submitted','pending_payment','quoted','booked','en_route','arrived',
       'in_progress','completed','confirmed','cancelled','disputed')
  NOT NULL;

-- 9. Uniqueness on request_no + tracking_token (guarded; NULLs coexist freely).
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD UNIQUE KEY `uq_bookings_request_no` (`request_no`)',
    'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'uq_bookings_request_no'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD UNIQUE KEY `uq_bookings_tracking_token` (`tracking_token`)',
    'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'uq_bookings_tracking_token'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
