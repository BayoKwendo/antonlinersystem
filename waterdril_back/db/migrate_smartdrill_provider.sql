-- =============================================================================
--  Migration: SMART Drill provider journey — self-signup + verification + the
--  two-invoice (customer 100% / provider 90%) pro-forma model.
--
--    provider_accounts   — account-level provider info + verification status.
--    provider_documents  — statutory documents uploaded for verification.
--    invoices.party      — distinguishes the customer invoice from the provider
--                          pro-forma (both reference the same booking).
--
--  Idempotent. Mirrors schema.sql.
--    mysql -u <user> -p <db> < db/migrate_smartdrill_provider.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `provider_accounts` (
  `user_id`             BIGINT UNSIGNED NOT NULL,
  `business_name`       VARCHAR(160) DEFAULT NULL,
  `kra_pin`             VARCHAR(20)  DEFAULT NULL,
  `bank_details`        VARCHAR(255) DEFAULT NULL,
  `verification_status` ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verification_note`   VARCHAR(500) DEFAULT NULL,
  `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_provider_accounts_status` (`verification_status`),
  CONSTRAINT `fk_provider_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `provider_documents` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `kind`       VARCHAR(40) NOT NULL,  -- incorporation | cr12 | kra_pin | director_id | accreditation | bank
  `url`        VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_provider_documents_user` (`user_id`, `kind`),
  CONSTRAINT `fk_provider_documents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- invoices.party (customer invoice vs provider pro-forma) -----------------------
SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `invoices` ADD COLUMN `party` ENUM(''customer'',''provider'') NOT NULL DEFAULT ''customer'' AFTER `booking_id`',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'party'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
