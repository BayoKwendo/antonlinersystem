-- =============================================================================
--  Migration: align service_categories.code_prefix with the SMART Drill Service
--  Provider journey spec so per-service Provider IDs read SDGEO00001, SDBD00001,
--  SDTPU00001, SDWQC00001, SDBEQ00001, SDBM00001, SDBCONS00001.
--  Idempotent: safe to re-run (plain UPDATE by key).
-- =============================================================================
UPDATE `service_categories` SET `code_prefix` = CASE `key`
  WHEN 'geologist'         THEN 'SDGEO'    -- Hydrogeological Survey (GEO)
  WHEN 'drillers'          THEN 'SDBD'     -- Borehole Drilling (BD)
  WHEN 'test_pump'         THEN 'SDTPU'    -- Test Pumping (TPU)
  WHEN 'surveys'           THEN 'SDWQC'    -- Water Quality Analysis (WQC)
  WHEN 'pump_installer'    THEN 'SDBEQ'    -- Borehole Equipping (BEQ)
  WHEN 'tank_installation' THEN 'SDBM'     -- Borehole Maintenance (BM)
  WHEN 'other_services'    THEN 'SDBCONS'  -- Borehole Consultancy (BCONS)
  ELSE `code_prefix` END
WHERE `key` IN ('geologist','drillers','test_pump','surveys','pump_installer','tank_installation','other_services');
