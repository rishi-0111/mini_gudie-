-- Batch 0: Expand enum (MUST run first, separately!)

-- Expand place_category enum (run this FIRST, in a SEPARATE query!)
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'hotel';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'restaurant';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'landmark';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'destination';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'bus_route';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'transport';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'tourist';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'metro';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'police';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'fire_station';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'pharmacy';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'railway';
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'health_centre';
