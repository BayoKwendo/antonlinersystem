-- =============================================================================
--  Migration: SMART Drill journey — invoicing, deliverable documents, and
--  provider escrow payouts.
--
--    invoices          — one issued invoice per booking (number UNIQUE).
--    documents         — per-booking deliverables (report, quote, attachments).
--    provider_payouts  — advance/final escrow split per booking (held→released→paid).
--
--  Idempotent — CREATE TABLE IF NOT EXISTS. Mirrors schema.sql.
--
--  Apply with:
--    mysql -u <user> -p <db_name> < db/migrate_smartdrill_escrow.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `invoices` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT UNSIGNED NOT NULL,
  `number`     VARCHAR(24) NOT NULL,
  `amount`     DECIMAL(12,2) NOT NULL,
  `status`     ENUM('issued','paid','void') NOT NULL DEFAULT 'issued',
  `paid_at`    DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_number` (`number`),
  KEY `idx_invoices_booking` (`booking_id`),
  KEY `idx_invoices_status` (`status`),
  CONSTRAINT `fk_invoices_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `documents` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`  BIGINT UNSIGNED NOT NULL,
  `kind`        VARCHAR(40) NOT NULL,          -- report | quote | attachment | survey | test_pump_report …
  `url`         VARCHAR(500) NOT NULL,
  `uploaded_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_documents_booking_kind` (`booking_id`, `kind`),
  CONSTRAINT `fk_documents_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_documents_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `provider_payouts` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`  BIGINT UNSIGNED NOT NULL,
  `provider_id` BIGINT UNSIGNED DEFAULT NULL,
  `kind`        ENUM('advance','final') NOT NULL,
  `amount`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status`      ENUM('held','released','paid') NOT NULL DEFAULT 'held',
  `paid_ref`    VARCHAR(64) DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payout_booking_kind` (`booking_id`, `kind`),
  KEY `idx_payouts_status` (`status`),
  KEY `idx_payouts_provider` (`provider_id`),
  CONSTRAINT `fk_payouts_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payouts_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
