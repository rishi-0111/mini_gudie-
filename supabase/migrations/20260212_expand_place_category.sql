-- Migration: Expand place_category enum
-- Adds 13 new category values needed for comprehensive seed data
-- Date: 2026-02-12

-- New categories for hotels, restaurants, landmarks, etc.
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

-- After this migration, place_category has 18 values:
-- Original 5:  temple, hospital, emergency, hidden_spot, hostel
-- New 13:      hotel, restaurant, landmark, destination, bus_route,
--              transport, tourist, metro, police, fire_station,
--              pharmacy, railway, health_centre
