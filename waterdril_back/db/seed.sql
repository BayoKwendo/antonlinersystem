-- Sample data for local development. Everything here is made up.
--
-- This fills the legacy `users` table that db/migrate_from_legacy.sql reads
-- from. Every sample user has the password  Password123!
--
--   mysql -u <USER> -p waterdril < db/seed.sql

USE `waterdril`;
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `users` (id,name,name_internal,msisdn,id_number,location,role,lat,amount,longitude,password,created_on,last_updated_on,status,url,active_status,movement_status,referred_id) VALUES
(1,'Sample Admin','Sample Admin','254700000001',10000001,'Nairobi','admin','0',100.00,'0','$2b$10$e.RMPtS6TO2EHgQ9RYuDteRB2YjHxxB1/UcCSLjRrz.hUAOtbo51e','2023-01-01 09:00:00','2024-01-01 09:00:00',1,NULL,'active','static',0),
(2,'Sample Driller','Sample Driller','254700000002',10000002,'Nairobi','drillers','-1.2921',100.00,'36.8219','$2b$10$e.RMPtS6TO2EHgQ9RYuDteRB2YjHxxB1/UcCSLjRrz.hUAOtbo51e','2023-01-02 09:00:00','2024-01-02 09:00:00',1,NULL,'active','static',0),
(3,'Sample Geologist','Sample Geologist','254700000003',10000003,'Nakuru','geologist','-0.3031',100.00,'36.0800','$2b$10$e.RMPtS6TO2EHgQ9RYuDteRB2YjHxxB1/UcCSLjRrz.hUAOtbo51e','2023-01-03 09:00:00','2024-01-03 09:00:00',1,NULL,'active','static',0),
(4,'Sample Pump Tester','Sample Pump Tester','254700000004',10000004,'Kisumu','test_pump','-0.0917',100.00,'34.7680','$2b$10$e.RMPtS6TO2EHgQ9RYuDteRB2YjHxxB1/UcCSLjRrz.hUAOtbo51e','2023-01-04 09:00:00','2024-01-04 09:00:00',1,NULL,'active','static',0);

SET FOREIGN_KEY_CHECKS = 1;
