-- =============================================================================
--  Migration: provider codes (SD<PREFIX><NNNN>, e.g. SDBDS0001) per category.
--
--  Adds `service_categories.code_prefix` and `provider_profiles.code`, seeds the
--  per-category prefixes, backfills codes for existing listings, and enforces
--  uniqueness. Mirrors the definitions in schema.sql.
--
--  Idempotent — safe to run repeatedly against a live database (column/index
--  adds are guarded via information_schema; back-fills only touch NULL rows).
--
--  Apply with:
--    mysql -u <user> -p <db_name> < db/migrate_provider_codes.sql
-- =============================================================================

-- 1. service_categories.code_prefix -------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `service_categories` ADD COLUMN `code_prefix` VARCHAR(8) DEFAULT NULL AFTER `active`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_categories' AND COLUMN_NAME = 'code_prefix'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Seed the prefixes (safe to re-run; only sets the known categories).
UPDATE `service_categories` SET `code_prefix` = CASE `key`
  WHEN 'drillers'          THEN 'SDBDS'
  WHEN 'test_pump'         THEN 'SDTPU'
  WHEN 'pump_installer'    THEN 'SDPLOW'
  WHEN 'geologist'         THEN 'SDGE'
  WHEN 'tank_installation' THEN 'SDBCAM'
  WHEN 'surveys'           THEN 'SDSV'
  WHEN 'other_services'    THEN 'SDOS'
  ELSE `code_prefix` END
WHERE `key` IN ('drillers','test_pump','pump_installer','geologist','tank_installation','surveys','other_services');

-- 2. provider_profiles.code ---------------------------------------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `provider_profiles` ADD COLUMN `code` VARCHAR(16) DEFAULT NULL AFTER `category_id`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_profiles' AND COLUMN_NAME = 'code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Backfill existing listings: number per prefix, oldest first. Only NULLs.
UPDATE `provider_profiles` pp
JOIN (
  SELECT pp2.id,
         CONCAT(sc.code_prefix,
                LPAD(ROW_NUMBER() OVER (PARTITION BY sc.code_prefix ORDER BY pp2.id), 4, '0')) AS newcode
    FROM `provider_profiles` pp2
    JOIN `service_categories` sc ON sc.id = pp2.category_id
   WHERE sc.code_prefix IS NOT NULL
) x ON x.id = pp.id
SET pp.code = x.newcode
WHERE pp.code IS NULL;

-- 4. Enforce uniqueness on the code (guarded; NULLs are allowed to coexist).
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `provider_profiles` ADD UNIQUE KEY `uq_provider_code` (`code`)',
    'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_profiles' AND INDEX_NAME = 'uq_provider_code'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
