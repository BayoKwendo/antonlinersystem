-- =============================================================================
--  Service catalogue: card-display fields so the customer web/app render the 7
--  services straight from GET /api/v1/services (name, blurb, price, icon, CTA,
--  accent, ordering). Keys are kept STABLE (existing apps/bookings key on them);
--  only display data is updated. Idempotent (information_schema-guarded).
-- =============================================================================

-- 1. Columns ------------------------------------------------------------------
SET @sql := (SELECT IF(COUNT(*)=0,
  "ALTER TABLE `service_categories`
     ADD COLUMN `price` DECIMAL(12,2) NULL AFTER `description`,
     ADD COLUMN `price_unit` VARCHAR(40) NULL AFTER `price`,
     ADD COLUMN `pricing_mode` ENUM('fixed','quote') NOT NULL DEFAULT 'fixed' AFTER `price_unit`,
     ADD COLUMN `icon` VARCHAR(24) NULL AFTER `pricing_mode`,
     ADD COLUMN `cta_label` VARCHAR(60) NULL AFTER `icon`,
     ADD COLUMN `accent` VARCHAR(9) NULL AFTER `cta_label`,
     ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `accent`",
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='service_categories' AND COLUMN_NAME='price');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. The 7 services (display data; keys unchanged) ----------------------------
UPDATE `service_categories` SET
  name='Hydrogeological Survey', pricing_mode='fixed', price=55000, price_unit='Flat Rate',
  icon='survey', cta_label='Get a Survey', accent='#4e9d2d', sort_order=1,
  description='Assess the underground water potential of your property and identify the best drilling point and depth.'
  WHERE `key`='geologist';

UPDATE `service_categories` SET
  name='Borehole Drilling', pricing_mode='fixed', price=6000, price_unit='Per Meter',
  icon='drill', cta_label='Find a Driller', accent='#1656c7', sort_order=2,
  description='Professional drilling services to access reliable underground water for your home, farm or business.'
  WHERE `key`='drillers';

UPDATE `service_categories` SET
  name='Test Pumping', pricing_mode='fixed', price=60000, price_unit='Flat Rate',
  icon='pump', cta_label='Book Test Pumping', accent='#0f8a8a', sort_order=3,
  description='Evaluate your borehole''s yield, water level and performance before installing your pumping system.'
  WHERE `key`='test_pump';

UPDATE `service_categories` SET
  name='Water Quality Analysis', pricing_mode='fixed', price=6000, price_unit='Per Sample',
  icon='water', cta_label='Request Testing', accent='#7a3fb0', sort_order=4,
  description='Laboratory testing to determine if your water is safe and suitable for drinking, irrigation or industrial use.'
  WHERE `key`='surveys';

UPDATE `service_categories` SET
  name='Borehole Equipping', pricing_mode='quote', price=NULL, price_unit='Guided by Survey',
  icon='equip', cta_label='Equip My Borehole', accent='#ef8a1e', sort_order=5,
  description='Install pumps, pipes, solar systems, tanks and all equipment needed to get your borehole running.'
  WHERE `key`='pump_installer';

UPDATE `service_categories` SET
  name='Borehole Maintenance', pricing_mode='quote', price=NULL, price_unit='Request a Quote',
  icon='maintenance', cta_label='Request Maintenance', accent='#4e9d2d', sort_order=6,
  description='Keep your borehole and pumping system in top condition with routine maintenance and repairs.'
  WHERE `key`='tank_installation';

UPDATE `service_categories` SET
  name='Consultancy in Borehole', pricing_mode='quote', price=NULL, price_unit='Request a Quote',
  icon='consult', cta_label='Talk to an Expert', accent='#1656c7', sort_order=7,
  description='Not sure what''s wrong with your borehole? Get expert advice and recommendations for the right solution.'
  WHERE `key`='other_services';

-- 3. price_note (small sub-line under the price pill; mainly for quote cards) --
SET @sql := (SELECT IF(COUNT(*)=0,
  "ALTER TABLE `service_categories` ADD COLUMN `price_note` VARCHAR(120) NULL AFTER `price_unit`",
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='service_categories' AND COLUMN_NAME='price_note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE `service_categories` SET price_note='Pricing based on survey recommendations' WHERE `key`='pump_installer';
UPDATE `service_categories` SET price_note='Tell us your needs and we''ll provide a quote' WHERE `key`='tank_installation';
UPDATE `service_categories` SET price_note='Tell us your challenge and we''ll guide you' WHERE `key`='other_services';
