-- ============================================================================
-- MASTER SEED LOADER for Mini Gudie
-- Run this AFTER applying the migration: 20260212_expand_place_category.sql
-- Total: ~15,572 places across 18 categories
-- ============================================================================

-- Order matters: migration first, then seeds from smallest to largest

-- ── Step 1: Expand the enum (idempotent) ───────────────────────────────────
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

-- ── Step 2: Clear existing places to avoid duplicates ──────────────────────
-- WARNING: This deletes all existing places! Remove this line if you want to append.
TRUNCATE TABLE places RESTART IDENTITY CASCADE;

-- NOTE: The individual seed files below must be executed separately via \i
-- or concatenated into this file. Each seed file contains its own INSERT statement.
-- 
-- Execution order (run each file):
--   1.  seed.sql                 (15 curated places)
--   2.  seed_places.sql          (30 curated places)
--   3.  seed_temples.sql         (10 temples)
--   4.  seed_hotels.sql          (85 hotels)
--   5.  seed_restaurants.sql     (175 restaurants)
--   6.  seed_landmarks.sql       (30 landmarks)
--   7.  seed_destinations.sql    (27 destinations)
--   8.  seed_transport.sql       (72 transport services)
--   9.  seed_rapido.sql          (10 ride services)
--   10. seed_bus_routes.sql      (47 bus routes)
--   11. seed_bus_prices.sql      (58 bus price routes)
--   12. seed_hospitals_india.sql (204 hospitals)
--   13. seed_health_centres.sql  (655 health centres)
--   14. seed_ride_intelligence.sql (50 ride intelligence)
--   15. seed_osm_metro.sql       (775 metro stations)
--   16. seed_osm_police.sql      (2,767 police stations)
--   17. seed_osm_fire.sql        (308 fire stations)
--   18. seed_osm_pharmacy.sql    (193 pharmacies)
--   19. seed_osm_tourist.sql     (5,682 tourist attractions)
--   20. seed_osm_railway.sql     (108 railway stations)
--   21. seed_worship.sql         (3,771 worship places)
--   22. seed_hidden_gems.sql     (500 AI-detected hidden gems)
--
-- Total: ~15,572 places

SELECT 'Master seed loader ready. Execute each seed file in order.' AS status;
