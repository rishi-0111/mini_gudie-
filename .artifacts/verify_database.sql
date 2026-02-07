-- Quick Database Verification Test
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check all tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('users_profile', 'places', 'trips', 'bookings', 'reviews', 'sos_alerts', 'saved_places')
ORDER BY table_name;

-- Expected output: 7 rows showing all tables with their column counts

-- 2. Check enums exist
SELECT 
    t.typname as enum_name,
    COUNT(e.enumlabel) as value_count
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('place_category', 'trip_status', 'booking_type', 'booking_status', 'alert_type', 'alert_status')
GROUP BY t.typname
ORDER BY t.typname;

-- Expected output: 6 rows showing all enums

-- 3. Check RLS policies
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Expected output: 7 rows (one for each table) with policy counts

-- 4. Check triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected output: Multiple rows showing triggers

-- 5. Check sample data (if seed.sql was run)
SELECT 
    category,
    COUNT(*) as count,
    ROUND(AVG(rating)::numeric, 2) as avg_rating
FROM public.places
GROUP BY category
ORDER BY category;

-- Expected output (if seed data loaded):
-- emergency: 2 places
-- hidden_spot: 3 places
-- hospital: 3 places
-- hostel: 4 places
-- temple: 3 places

-- 6. Test a simple query
SELECT 
    name,
    category,
    rating,
    verified
FROM public.places
WHERE category = 'temple'
ORDER BY rating DESC
LIMIT 3;

-- Expected output: Top 3 temples by rating

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================
-- ✅ If all queries run successfully, your database is properly configured!
-- ✅ Tables: Should show 7 tables
-- ✅ Enums: Should show 6 enums
-- ✅ Policies: Should show RLS policies for all tables
-- ✅ Triggers: Should show multiple triggers
-- ✅ Sample Data: Should show 15 places across 5 categories (if seed.sql was run)
