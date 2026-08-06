-- =============================================================================
--  SMART Drill — reset the database to a clean, pre-launch state.
--
--  KEEPS   : `roles`, `service_categories` (the seeded catalogue),
--            and exactly ONE admin user (set by @keep_admin_id below).
--  PURGES  : all bookings + everything hanging off them (invoices, payouts,
--            documents, ratings, declines, complaints, reviews, payments,
--            events), all provider & customer accounts/profiles, all other
--            users, OTPs, notifications, device/refresh tokens, and logs.
--
--  ⚠️  DESTRUCTIVE AND IRREVERSIBLE. Back up first:
--        mysqldump -u <USER> -p <DB> > backup_before_purge.sql
--  Then run:
--        mysql -u <USER> -p <DB> < db/reset_to_seed.sql
-- =============================================================================

-- The single admin to keep (id 1 = Brian Kwendo). Change if you want a different one.
SET @keep_admin_id = 1;

SET FOREIGN_KEY_CHECKS = 0;

-- Bookings + all records that reference a booking
TRUNCATE TABLE booking_events;
TRUNCATE TABLE invoices;
TRUNCATE TABLE provider_payouts;
TRUNCATE TABLE provider_ratings;
TRUNCATE TABLE job_declines;
TRUNCATE TABLE documents;
TRUNCATE TABLE complaints;
TRUNCATE TABLE reviews;
TRUNCATE TABLE payments;
TRUNCATE TABLE bookings;

-- Provider & customer accounts / profiles
TRUNCATE TABLE provider_documents;
TRUNCATE TABLE provider_accounts;
TRUNCATE TABLE provider_profiles;
TRUNCATE TABLE customer_profiles;

-- Auth, messaging, and logs
TRUNCATE TABLE otp_codes;
TRUNCATE TABLE notifications;
TRUNCATE TABLE device_tokens;
TRUNCATE TABLE refresh_tokens;
TRUNCATE TABLE sms_logs;
TRUNCATE TABLE audit_logs;

-- Keep only the one admin's account + role assignments
DELETE FROM user_roles WHERE user_id <> @keep_admin_id;
DELETE FROM users      WHERE id      <> @keep_admin_id;

SET FOREIGN_KEY_CHECKS = 1;

-- Sanity check (should be: 1 user, its role(s), and the 7 services)
SELECT 'users' AS tbl, COUNT(*) AS rows_left FROM users
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'service_categories', COUNT(*) FROM service_categories
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'provider_profiles', COUNT(*) FROM provider_profiles;
