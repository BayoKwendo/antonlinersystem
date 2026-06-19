-- =============================================================================
--  AntonLiner / Smart Drilling — REDESIGNED database schema (v2)
-- -----------------------------------------------------------------------------
--  MySQL 8. Normalized identity + RBAC + provider/customer profiles, a proper
--  booking lifecycle, idempotent payments, reviews, notifications and audit.
--
--  Key improvements over the legacy single-`users`-table design:
--    * Identity (`users`) is separated from role profiles
--      (`customer_profiles`, `provider_profiles`).
--    * RBAC via `roles` + `user_roles` (enforced server-side).
--    * Money is DECIMAL; coordinates are DECIMAL + a generated SRID-4326 POINT
--      with a SPATIAL index (fast "nearby" via ST_Distance_Sphere).
--    * `bookings` replaces `order_requests` with a clear status machine and
--      unambiguous amount columns (deposit_amount / total_amount / amount_paid).
--    * `payments` replaces `deposits`, idempotent on `mpesa_receipt`.
--    * Auth support tables: refresh_tokens, otp_codes, device_tokens.
--
--  Data is migrated from the legacy schema by db/migrate_from_legacy.sql, which
--  reads from a `waterdril_legacy` database (rename the current DB first).
--
--  Apply with:  mysql -u root -p < db/schema.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `waterdril`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE `waterdril`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `device_tokens`;
DROP TABLE IF EXISTS `otp_codes`;
DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `sms_logs`;
DROP TABLE IF EXISTS `complaints`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `booking_events`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `provider_profiles`;
DROP TABLE IF EXISTS `customer_profiles`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `service_categories`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
--  roles — access roles (RBAC). Distinct from service categories.
-- -----------------------------------------------------------------------------
CREATE TABLE `roles` (
  `id`          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`         VARCHAR(40)  NOT NULL,
  `name`        VARCHAR(80)  NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `roles` (`key`, `name`, `description`) VALUES
  ('admin',      'Administrator',  'Full system access'),
  ('owner',      'Owner',          'Manages their own providers'),
  ('assistance', 'Support',        'Support / assistance staff'),
  ('finance',    'Finance',        'Payments & reconciliation'),
  ('provider',   'Service Provider','A driller / pump installer / surveyor etc.'),
  ('customer',   'Customer',       'End customer who books services'),
  ('agent',      'Agent',          'Field agent / referrer');

-- -----------------------------------------------------------------------------
--  service_categories — the catalogue of services a provider can offer.
--  (Replaces the legacy `service` table; `key` mirrors the legacy role names.)
-- -----------------------------------------------------------------------------
CREATE TABLE `service_categories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`         VARCHAR(40)  NOT NULL,
  `name`        VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_categories_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `service_categories` (`key`, `name`, `active`) VALUES
  ('drillers',          'Borehole Drilling',     1),
  ('test_pump',         'Test Pumping',          1),
  ('pump_installer',    'Pump Installation',     1),
  ('geologist',         'Hydrogeological Survey',1),
  ('tank_installation', 'Tank Installation',     1),
  ('surveys',           'Surveys',               1),
  ('other_services',    'Other Services',        1);

-- -----------------------------------------------------------------------------
--  users — identity + authentication only. Role-specific data lives in the
--  *_profiles tables. A customer may have password_hash NULL (OTP login).
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`              CHAR(36)     NOT NULL,
  `phone`             VARCHAR(20)  NOT NULL,
  `email`            VARCHAR(150) DEFAULT NULL,
  `password_hash`     VARCHAR(255) DEFAULT NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `display_name`      VARCHAR(120) NOT NULL,
  `avatar_url`        VARCHAR(512) DEFAULT NULL,
  `status`            ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
  `phone_verified_at` TIMESTAMP    NULL DEFAULT NULL,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_uuid` (`uuid`),
  UNIQUE KEY `uq_users_phone` (`phone`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `user_roles` (
  `user_id` BIGINT UNSIGNED   NOT NULL,
  `role_id` TINYINT UNSIGNED  NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
--  customer_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE `customer_profiles` (
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `id_number`       VARCHAR(20)  DEFAULT NULL,
  `default_address` VARCHAR(255) DEFAULT NULL,
  `default_lat`     DECIMAL(10,7) DEFAULT NULL,
  `default_lng`     DECIMAL(10,7) DEFAULT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_customer_id_number` (`id_number`),
  CONSTRAINT `fk_customer_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
--  provider_profiles — current location is a generated SRID-4326 POINT (from
--  lat/lng) with a SPATIAL index for fast nearby queries.
-- -----------------------------------------------------------------------------
CREATE TABLE `provider_profiles` (
  `user_id`             BIGINT UNSIGNED NOT NULL,
  `owner_id`            BIGINT UNSIGNED DEFAULT NULL,
  `category_id`         INT UNSIGNED    NOT NULL,
  `bio`                 VARCHAR(500)    DEFAULT NULL,
  `base_price`          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  `rating_avg`          DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  `rating_count`        INT UNSIGNED    NOT NULL DEFAULT 0,
  `availability`        ENUM('available','booked','offline') NOT NULL DEFAULT 'offline',
  `movement_status`     ENUM('static','moving') NOT NULL DEFAULT 'static',
  `lat`                 DECIMAL(10,7)   NOT NULL DEFAULT 0,
  `lng`                 DECIMAL(10,7)   NOT NULL DEFAULT 0,
  `location`            POINT AS (ST_SRID(POINT(`lng`, `lat`), 4326)) STORED NOT NULL SRID 4326,
  `location_updated_at` TIMESTAMP NULL DEFAULT NULL,
  `verified_at`         TIMESTAMP NULL DEFAULT NULL,
  `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  SPATIAL INDEX `spx_provider_location` (`location`),
  KEY `idx_provider_category` (`category_id`),
  KEY `idx_provider_owner` (`owner_id`),
  KEY `idx_provider_availability` (`availability`),
  CONSTRAINT `fk_provider_profiles_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_provider_profiles_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_provider_profiles_cat`   FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
--  bookings — a customer's booking of a provider, through its lifecycle.
-- -----------------------------------------------------------------------------
CREATE TABLE `bookings` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`           CHAR(36) NOT NULL,
  `customer_id`    BIGINT UNSIGNED NOT NULL,
  `provider_id`    BIGINT UNSIGNED NOT NULL,
  `category_id`    INT UNSIGNED    NOT NULL,
  `status`         ENUM('pending_payment','booked','en_route','arrived','in_progress','completed','cancelled')
                     NOT NULL DEFAULT 'pending_payment',
  `deposit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid`    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `address`        VARCHAR(255) DEFAULT NULL,
  `lat`            DECIMAL(10,7) DEFAULT NULL,
  `lng`            DECIMAL(10,7) DEFAULT NULL,
  `scheduled_at`   DATETIME DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bookings_uuid` (`uuid`),
  KEY `idx_bookings_customer` (`customer_id`),
  KEY `idx_bookings_provider` (`provider_id`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_created` (`created_at`),
  CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_bookings_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_bookings_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `booking_events` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT UNSIGNED NOT NULL,
  `status`     ENUM('pending_payment','booked','en_route','arrived','in_progress','completed','cancelled') NOT NULL,
  `actor_id`   BIGINT UNSIGNED DEFAULT NULL,
  `note`       VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_events_booking` (`booking_id`),
  CONSTRAINT `fk_booking_events_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_booking_events_actor`   FOREIGN KEY (`actor_id`)   REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
--  payments — every M-Pesa payment; idempotent on mpesa_receipt.
-- -----------------------------------------------------------------------------
CREATE TABLE `payments` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`    BIGINT UNSIGNED NOT NULL,
  `mpesa_receipt` VARCHAR(40) DEFAULT NULL,
  `checkout_id`   VARCHAR(64) DEFAULT NULL,
  `phone`         VARCHAR(20) NOT NULL,
  `amount`        DECIMAL(12,2) NOT NULL,
  `kind`          ENUM('deposit','balance') NOT NULL,
  `source`        ENUM('stk','c2b','portal') NOT NULL,
  `status`        ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
  `raw_payload`   JSON DEFAULT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_receipt` (`mpesa_receipt`),
  KEY `idx_payments_booking` (`booking_id`),
  KEY `idx_payments_checkout` (`checkout_id`),
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
--  reviews — one per completed booking; drives provider rating_avg/count.
-- -----------------------------------------------------------------------------
CREATE TABLE `reviews` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`  BIGINT UNSIGNED NOT NULL,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `provider_id` BIGINT UNSIGNED NOT NULL,
  `rating`      TINYINT UNSIGNED NOT NULL,
  `comment`     VARCHAR(500) DEFAULT NULL,
  `hidden`      TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_booking` (`booking_id`),
  KEY `idx_reviews_provider` (`provider_id`),
  CONSTRAINT `fk_reviews_booking`  FOREIGN KEY (`booking_id`)  REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_reviews_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
--  complaints / sms_logs / notifications / device_tokens / auth / audit
-- -----------------------------------------------------------------------------
CREATE TABLE `complaints` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id`  BIGINT UNSIGNED DEFAULT NULL,
  `customer_id` BIGINT UNSIGNED DEFAULT NULL,
  `provider_id` BIGINT UNSIGNED DEFAULT NULL,
  `message`     TEXT NOT NULL,
  `amount`      DECIMAL(12,2) DEFAULT NULL,
  `status`      ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  `resolution_note` VARCHAR(500) DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaints_booking` (`booking_id`),
  CONSTRAINT `fk_complaints_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sms_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `destination` VARCHAR(20) NOT NULL,
  `message`     TEXT NOT NULL,
  `status`      ENUM('sent','failed') NOT NULL DEFAULT 'sent',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sms_logs_destination` (`destination`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `notifications` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `title`      VARCHAR(120) NOT NULL,
  `body`       VARCHAR(500) NOT NULL,
  `data`       JSON DEFAULT NULL,
  `read_at`    TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `device_tokens` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `token`      VARCHAR(255) NOT NULL,
  `platform`   ENUM('android','ios','web') NOT NULL DEFAULT 'android',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_device_tokens_token` (`token`),
  KEY `idx_device_tokens_user` (`user_id`),
  CONSTRAINT `fk_device_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `refresh_tokens` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_tokens_hash` (`token_hash`),
  KEY `idx_refresh_tokens_user` (`user_id`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `otp_codes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone`       VARCHAR(20) NOT NULL,
  `code_hash`   CHAR(64) NOT NULL,
  `expires_at`  TIMESTAMP NOT NULL,
  `attempts`    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `consumed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_codes_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `audit_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_id`   BIGINT UNSIGNED DEFAULT NULL,
  `action`     VARCHAR(80) NOT NULL,
  `entity`     VARCHAR(80) DEFAULT NULL,
  `entity_id`  VARCHAR(64) DEFAULT NULL,
  `meta`       JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_actor` (`actor_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
