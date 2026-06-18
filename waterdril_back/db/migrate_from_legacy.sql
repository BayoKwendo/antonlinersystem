-- =============================================================================
--  Legacy -> v2 data migration.
-- -----------------------------------------------------------------------------
--  Preconditions:
--    1. The CURRENT (legacy) database has been renamed/imported as
--       `waterdril_legacy` (e.g. dump it and load into that schema).
--    2. The new schema has been created:  mysql < db/schema.sql   (creates `waterdril`)
--
--  Run:  mysql -u root -p < db/migrate_from_legacy.sql
--
--  Notes / best-effort mappings (legacy data is denormalized, so some links are
--  reconstructed heuristically and should be spot-checked after migration):
--    * legacy users.id is PRESERVED so existing FKs (order_requests.user_id) map.
--    * legacy `role` splits into user_roles + the matching *_profile.
--    * payments(deposits) link to the latest booking for the same id_number.
-- =============================================================================
USE `waterdril`;
SET FOREIGN_KEY_CHECKS = 0;
SET @legacy := 'waterdril_legacy';

-- --- users -------------------------------------------------------------------
INSERT INTO `users`
  (id, uuid, phone, email, password_hash, display_name, avatar_url, status,
   phone_verified_at, created_at, updated_at)
SELECT
  u.id,
  UUID(),
  u.msisdn,
  NULLIF(u.email, ''),
  u.password,
  COALESCE(NULLIF(u.name, ''), CONCAT('user_', u.id)),
  NULLIF(u.url, ''),
  CASE WHEN u.active_status = 'active' THEN 'active' ELSE 'suspended' END,
  u.created_on,
  u.created_on,
  u.last_updated_on
FROM `waterdril_legacy`.`users` u;

-- --- user_roles --------------------------------------------------------------
-- owner (legacy typo 'onwer' tolerated), admin, customer, assistance map 1:1;
-- every service-category role maps to the generic 'provider' role.
INSERT INTO `user_roles` (user_id, role_id)
SELECT u.id, r.id
FROM `waterdril_legacy`.`users` u
JOIN `roles` r ON r.`key` = CASE
  WHEN u.role IN ('owner','onwer') THEN 'owner'
  WHEN u.role = 'admin'       THEN 'admin'
  WHEN u.role = 'customer'    THEN 'customer'
  WHEN u.role = 'assistance'  THEN 'assistance'
  ELSE 'provider'
END;

-- --- customer_profiles -------------------------------------------------------
INSERT INTO `customer_profiles`
  (user_id, id_number, default_address, default_lat, default_lng)
SELECT
  u.id,
  NULLIF(u.id_number, '0'),
  NULLIF(u.location, ''),
  CAST(NULLIF(u.lat, '') AS DECIMAL(10,7)),
  CAST(NULLIF(u.longitude, '') AS DECIMAL(10,7))
FROM `waterdril_legacy`.`users` u
WHERE u.role = 'customer';

-- --- provider_profiles -------------------------------------------------------
INSERT INTO `provider_profiles`
  (user_id, owner_id, category_id, base_price, availability, lat, lng,
   verified_at, location_updated_at)
SELECT
  u.id,
  NULLIF(u.referred_id, 0),
  sc.id,
  COALESCE(u.amount, 0),
  CASE
    WHEN u.active_status <> 'active' THEN 'offline'
    WHEN u.booking_status = 'booked' THEN 'booked'
    ELSE 'available'
  END,
  COALESCE(CAST(NULLIF(u.lat, '') AS DECIMAL(10,7)), 0),
  COALESCE(CAST(NULLIF(u.longitude, '') AS DECIMAL(10,7)), 0),
  u.created_on,
  u.last_updated_on
FROM `waterdril_legacy`.`users` u
JOIN `service_categories` sc ON sc.`key` = u.role
WHERE u.role NOT IN ('owner','onwer','admin','customer','assistance');

-- --- bookings <- order_requests ----------------------------------------------
-- Legacy semantics: amount_to_pay = full price, full_amount = deposit threshold.
INSERT INTO `bookings`
  (id, uuid, customer_id, provider_id, category_id, status,
   deposit_amount, total_amount, amount_paid, created_at, updated_at)
SELECT
  o.id,
  UUID(),
  COALESCE(
    (SELECT cu.id FROM `waterdril_legacy`.`users` cu
       WHERE cu.id_number = o.id_number AND cu.role = 'customer' LIMIT 1),
    o.user_id
  ),
  o.user_id,
  COALESCE(pp.category_id, (SELECT id FROM `service_categories` WHERE `key`='other_services')),
  CASE o.status WHEN 0 THEN 'pending_payment' WHEN 1 THEN 'booked' WHEN 2 THEN 'completed' ELSE 'pending_payment' END,
  CAST(NULLIF(o.full_amount, '')   AS DECIMAL(12,2)),
  CAST(NULLIF(o.amount_to_pay, '') AS DECIMAL(12,2)),
  CAST(NULLIF(o.amount_paid, '')   AS DECIMAL(12,2)),
  o.created_at,
  o.created_at
FROM `waterdril_legacy`.`order_requests` o
LEFT JOIN `provider_profiles` pp ON pp.user_id = o.user_id;

-- seed a booking_events row reflecting the migrated status
INSERT INTO `booking_events` (booking_id, status, note, created_at)
SELECT b.id, b.status, 'migrated from legacy', b.created_at FROM `bookings` b;

-- --- payments <- deposits ----------------------------------------------------
INSERT INTO `payments`
  (booking_id, mpesa_receipt, phone, amount, kind, source, status, created_at)
SELECT booking_id, mpesa_receipt, phone, amount, kind, source, status, created_at
FROM (
  SELECT
    (SELECT b.id FROM `bookings` b
       JOIN `customer_profiles` cp ON cp.user_id = b.customer_id
      WHERE cp.id_number = d.reference
      ORDER BY b.id DESC LIMIT 1) AS booking_id,
    d.transaction_id        AS mpesa_receipt,
    d.msisdn                AS phone,
    COALESCE(d.amount, 0)   AS amount,
    'deposit'               AS kind,
    'c2b'                   AS source,
    'success'               AS status,
    d.created_on            AS created_at
  FROM `waterdril_legacy`.`deposits` d
) t
WHERE t.booking_id IS NOT NULL;   -- skip deposits we cannot link to a booking

-- --- service_categories active flags (from legacy `service`) -----------------
UPDATE `service_categories` sc
JOIN `waterdril_legacy`.`service` s ON s.type = sc.`key`
SET sc.active = s.status;

-- --- complaints --------------------------------------------------------------
-- Legacy `complaints` may not exist in older dumps; uncomment if present.
-- INSERT INTO `complaints` (booking_id, provider_id, message, amount, created_at)
-- SELECT c.order_number, c.driver_id, c.complaint, CAST(NULLIF(c.amount,'') AS DECIMAL(12,2)), c.created_on
-- FROM `waterdril_legacy`.`complaints` c;

SET FOREIGN_KEY_CHECKS = 1;

-- --- recompute provider ratings (no legacy reviews; leaves defaults) ---------
-- (reviews table starts empty; rating_avg/count remain 0 until new reviews land)
