-- =============================================================================
--  Migration: device_tokens (FCM push registration).
--
--  Idempotent — safe to run against an existing live database that predates the
--  push feature. Mirrors the definition in schema.sql.
--
--  Apply with:
--    mysql -u <user> -p <db_name> < db/migrate_device_tokens.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `device_tokens` (
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
