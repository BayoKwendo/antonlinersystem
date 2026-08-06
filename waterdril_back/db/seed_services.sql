-- =============================================================================
--  Seed the 7 SMART Drill services (idempotent upsert by `key`).
--  Safe to run against any database whose service_categories table already has
--  the card-display columns (schema.sql / migrate_service_catalog.sql).
--
--    mysql -u <user> -p <db> < db/seed_services.sql
--
--  Keys are stable (apps/bookings key on them); only display data is (re)seeded.
-- =============================================================================
INSERT INTO `service_categories`
  (`key`, `name`, `active`, `code_prefix`, `price`, `price_unit`, `price_note`,
   `pricing_mode`, `icon`, `cta_label`, `accent`, `sort_order`, `description`) VALUES
  ('geologist','Hydrogeological Survey',1,'SDGEO',55000,'Flat Rate',NULL,'fixed','survey','Get a Survey','#4e9d2d',1,
   'Assess the underground water potential of your property and identify the best drilling point and depth.'),
  ('drillers','Borehole Drilling',1,'SDBD',6000,'Per Meter',NULL,'fixed','drill','Find a Driller','#1656c7',2,
   'Professional drilling services to access reliable underground water for your home, farm or business.'),
  ('test_pump','Test Pumping',1,'SDTPU',60000,'Flat Rate',NULL,'fixed','pump','Book Test Pumping','#0f8a8a',3,
   'Evaluate your borehole''s yield, water level and performance before installing your pumping system.'),
  ('surveys','Water Quality Analysis',1,'SDWQC',6000,'Per Sample',NULL,'fixed','water','Request Testing','#7a3fb0',4,
   'Laboratory testing to determine if your water is safe and suitable for drinking, irrigation or industrial use.'),
  ('pump_installer','Borehole Equipping',1,'SDBEQ',NULL,'Guided by Survey','Pricing based on survey recommendations','quote','equip','Equip My Borehole','#ef8a1e',5,
   'Install pumps, pipes, solar systems, tanks and all equipment needed to get your borehole running.'),
  ('tank_installation','Borehole Maintenance',1,'SDBM',NULL,'Request a Quote','Tell us your needs and we''ll provide a quote','quote','maintenance','Request Maintenance','#4e9d2d',6,
   'Keep your borehole and pumping system in top condition with routine maintenance and repairs.'),
  ('other_services','Consultancy in Borehole',1,'SDBCONS',NULL,'Request a Quote','Tell us your challenge and we''ll guide you','quote','consult','Talk to an Expert','#1656c7',7,
   'Not sure what''s wrong with your borehole? Get expert advice and recommendations for the right solution.')
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `active`=VALUES(`active`), `code_prefix`=VALUES(`code_prefix`),
  `price`=VALUES(`price`), `price_unit`=VALUES(`price_unit`), `price_note`=VALUES(`price_note`),
  `pricing_mode`=VALUES(`pricing_mode`), `icon`=VALUES(`icon`), `cta_label`=VALUES(`cta_label`),
  `accent`=VALUES(`accent`), `sort_order`=VALUES(`sort_order`), `description`=VALUES(`description`);
