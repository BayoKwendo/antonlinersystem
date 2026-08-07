-- =============================================================================
--  Migration: SMART Drill live tracking — persist the provider's last-known
--  position per booking so the customer tracking page has an instant initial
--  marker (REST fallback) and the position survives a provider WS disconnect or
--  a server restart. The realtime stream itself stays in-memory in the WS hub;
--  these columns are the durable snapshot written on each published fix.
--
--  Idempotent — safe to run repeatedly (column adds guarded via
--  information_schema). Mirrors schema.sql.
--
--  Apply with:
--    mysql -u <user> -p <db_name> < db/migrate_smartdrill_live_tracking.sql
-- =============================================================================

-- 1. bookings.provider_lat ----------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `provider_lat` DECIMAL(10,7) DEFAULT NULL AFTER `lng`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'provider_lat'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. bookings.provider_lng ----------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `provider_lng` DECIMAL(10,7) DEFAULT NULL AFTER `provider_lat`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'provider_lng'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. bookings.provider_loc_at -------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `bookings` ADD COLUMN `provider_loc_at` DATETIME DEFAULT NULL AFTER `provider_lng`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'provider_loc_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
