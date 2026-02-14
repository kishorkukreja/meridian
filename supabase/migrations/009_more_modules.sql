-- Add new module types
ALTER TYPE meridian_module_type ADD VALUE IF NOT EXISTS 'supply_planning_ibp';
ALTER TYPE meridian_module_type ADD VALUE IF NOT EXISTS 'data_infrastructure';
ALTER TYPE meridian_module_type ADD VALUE IF NOT EXISTS 'program_management';
