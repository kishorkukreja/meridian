-- Seed Data for Development
-- Run this after migrations to populate with test data
-- Replace 'USER_ID_HERE' with the actual auth.users UUID after creating your account

-- NOTE: In production, the user_id comes from Supabase Auth.
-- For seeding, you'll need to replace the placeholder with your actual user ID.
-- Find it in Supabase Dashboard > Authentication > Users

-- ============================================
-- DEMAND PLANNING OBJECTS
-- ============================================

INSERT INTO meridian_objects (user_id, name, description, module, category, region, source_system, current_stage, status, owner_alias, team_alias, notes) VALUES
-- Master Data
('USER_ID_HERE', 'OBJ-DP-MD-001', 'Product hierarchy mapping for primary categories', 'demand_planning', 'master_data', 'region_eu', 'erp_primary', 'validation', 'on_track', 'LEAD-MDS-DP-01', 'TEAM-MDS-DP', 'Nearing completion, awaiting business validation'),
('USER_ID_HERE', 'OBJ-DP-MD-002', 'Customer hierarchy and grouping definitions', 'demand_planning', 'master_data', 'region_eu', 'erp_primary', 'mapping', 'at_risk', 'SME-BIZ-DP-01', 'TEAM-MDS-DP', 'Multiple hierarchy levels under discussion'),
('USER_ID_HERE', 'OBJ-DP-MD-003', 'Location master for distribution points', 'demand_planning', 'master_data', 'region_eu', 'data_lake', 'extraction', 'on_track', 'ENG-ENB-01', 'TEAM-ENB', NULL),
('USER_ID_HERE', 'OBJ-DP-MD-004', 'Unit of measure conversion tables', 'demand_planning', 'master_data', 'region_eu', 'manual_file', 'requirements', 'blocked', 'LEAD-DNA-01', 'TEAM-DNA', 'Blocked: no clear source identified yet'),

-- Drivers
('USER_ID_HERE', 'OBJ-DP-DR-001', 'Historical shipment volumes by SKU-location', 'demand_planning', 'drivers', 'region_eu', 'erp_primary', 'ingestion', 'on_track', 'ENG-ENB-02', 'TEAM-ENB', 'Large volume extraction, running in batches'),
('USER_ID_HERE', 'OBJ-DP-DR-002', 'External market indices and category trends', 'demand_planning', 'drivers', 'region_eu', 'external_1', 'mapping', 'at_risk', 'LEAD-DNA-01', 'TEAM-DNA', 'External provider format keeps changing'),
('USER_ID_HERE', 'OBJ-DP-DR-003', 'Promotional event calendar and uplift factors', 'demand_planning', 'drivers', 'region_eu', 'manual_file', 'requirements', 'on_track', 'SME-BIZ-DP-02', 'TEAM-BIZ-DP', 'Business still defining promotion taxonomy'),

-- ============================================
-- SUPPLY PLANNING OBJECTS
-- ============================================

-- Master Data
('USER_ID_HERE', 'OBJ-SP-MD-001', 'BOM structures and component relationships', 'supply_planning', 'master_data', 'region_eu', 'erp_primary', 'transformation', 'on_track', 'ENG-ENB-01', 'TEAM-ENB', 'Complex multi-level BOM flattening'),
('USER_ID_HERE', 'OBJ-SP-MD-002', 'Supplier master and lead time parameters', 'supply_planning', 'master_data', 'region_eu', 'erp_primary', 'mapping', 'on_track', 'SME-BIZ-SP-01', 'TEAM-MDS-SP', NULL),

-- Priority 1
('USER_ID_HERE', 'OBJ-SP-P1-001', 'Production capacity constraints by plant-line', 'supply_planning', 'priority_1', 'region_eu', 'erp_primary', 'extraction', 'on_track', 'ENG-ENB-03', 'TEAM-ENB', 'Group planning scope'),
('USER_ID_HERE', 'OBJ-SP-P1-002', 'Inventory policy parameters and safety stock', 'supply_planning', 'priority_1', 'region_eu', 'data_lake', 'requirements', 'at_risk', 'LEAD-MDS-SP-01', 'TEAM-MDS-SP', 'Business ownership unclear'),

-- Priority 2
('USER_ID_HERE', 'OBJ-SP-P2-001', 'Transportation lanes and freight cost matrix', 'supply_planning', 'priority_2', 'region_eu', 'sub_system', 'requirements', 'on_track', 'LEAD-DNA-01', 'TEAM-DNA', 'S3D scope'),
('USER_ID_HERE', 'OBJ-SP-P2-002', 'Warehouse capacity and storage constraints', 'supply_planning', 'priority_2', 'region_eu', 'manual_file', 'requirements', 'on_track', 'SME-BIZ-SP-02', 'TEAM-BIZ-SP', 'SLB scope'),

-- Priority 3
('USER_ID_HERE', 'OBJ-SP-P3-001', 'Financial planning parameters and cost rates', 'supply_planning', 'priority_3', 'region_eu', 'data_lake', 'requirements', 'on_track', 'LEAD-MDS-SP-01', 'TEAM-MDS-SP', 'IBP scope - lower priority');

-- ============================================
-- ISSUES
-- ============================================

INSERT INTO meridian_issues (user_id, object_id, title, description, issue_type, lifecycle_stage, status, owner_alias, raised_by_alias, blocked_by_note, decision) VALUES
-- Issues for OBJ-DP-MD-002 (Customer hierarchy - stuck at mapping)
('USER_ID_HERE', (SELECT id FROM meridian_objects WHERE name = 'OBJ-DP-MD-002'),
 'Multiple hierarchy levels proposed - no consensus',
 'Business has proposed 3 different hierarchy structures. No alignment on which level maps to the target granularity.',
 'signoff', 'mapping', 'open', 'SME-BIZ-DP-01', 'LEAD-DNA-01', 'Waiting for DP business lead to arbitrate', NULL),

('USER_ID_HERE', (SELECT id FROM meridian_objects WHERE name = 'OBJ-DP-MD-002'),
 'Customer grouping logic differs between source tables',
 'ERP_PRIMARY has 2 different customer grouping fields with conflicting values.',
 'data_quality', 'mapping', 'in_progress', 'ENG-ENB-01', 'LEAD-DNA-01', NULL, NULL),

-- Issues for OBJ-DP-MD-004 (UOM - blocked)
('USER_ID_HERE', (SELECT id FROM meridian_objects WHERE name = 'OBJ-DP-MD-004'),
 'No authoritative source for UOM conversions',
 'Manual file exists but is outdated. ERP has partial data. Need to determine golden source.',
 'mapping', 'requirements', 'blocked', 'LEAD-DNA-01', 'LEAD-DNA-01', 'Dependent on OBJ-DP-MD-001 product hierarchy being finalized', NULL),

-- Issues for OBJ-DP-DR-002 (External market data - format issues)
('USER_ID_HERE', (SELECT id FROM meridian_objects WHERE name = 'OBJ-DP-DR-002'),
 'External provider changed file format without notice',
 'EXTERNAL_1 delivery format changed in latest batch. Column mapping is broken.',
 'technical', 'mapping', 'open', 'ENG-ENB-02', 'ENG-ENB-02', NULL, NULL),

-- Issues for OBJ-SP-P1-002 (Inventory policy - ownership unclear)
('USER_ID_HERE', (SELECT id FROM meridian_objects WHERE name = 'OBJ-SP-P1-002'),
 'Business ownership not assigned for inventory parameters',
 'SP business team says this is a planning team responsibility. Planning team says it is business-defined.',
 'clarification', 'requirements', 'open', 'LEAD-MDS-SP-01', 'LEAD-DNA-01', NULL, NULL),

-- A resolved issue (for testing decision display)
('USER_ID_HERE', (SELECT id FROM meridian_objects WHERE name = 'OBJ-DP-MD-001'),
 'Granularity mismatch between source and target',
 'Source provides SKU-level data but target model expects SKU-location. Need transformation logic.',
 'mapping', 'mapping', 'resolved', 'ENG-ENB-01', 'LEAD-DNA-01', NULL,
 'Agreed: transformation layer will fan out SKU to SKU-location using location master. ENG-ENB-01 to implement.');
