# Database Setup Instructions

## 🎯 Quick Setup Guide

Since we're working with an existing Supabase project, here's how to apply the database schema:

### Option 1: Using Supabase Dashboard (Recommended - Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/ffqfsjpgsnymebmrsniu
   - Login with your credentials

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Apply the Schema**
   - Open the file: `d:\miniguide\supabase\migrations\20260207_initial_schema.sql`
   - Copy the entire content
   - Paste it into the SQL Editor
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion (should take 5-10 seconds)

4. **Verify Tables Created**
   - Click on "Table Editor" in the left sidebar
   - You should see all the new tables:
     - users_profile
     - places
     - trips
     - bookings
     - reviews
     - sos_alerts
     - saved_places

5. **Load Sample Data (Optional)**
   - Go back to "SQL Editor"
   - Click "New Query"
   - Open the file: `d:\miniguide\supabase\seed.sql`
   - Copy and paste the content
   - Click "Run"
   - This will add sample temples, hospitals, emergency services, hidden spots, and hostels

### Option 2: Using Supabase CLI (Alternative)

If you want to use the CLI later, here are the commands:

```bash
# Install Supabase CLI (if not already installed)
# Windows: Use Scoop or download from GitHub
scoop install supabase

# Or download directly from:
# https://github.com/supabase/cli/releases

# Link to your project
supabase link --project-ref ffqfsjpgsnymebmrsniu

# Push migrations to remote database
supabase db push

# Or apply specific migration
supabase db execute --file supabase/migrations/20260207_initial_schema.sql

# Apply seed data
supabase db execute --file supabase/seed.sql
```

### Option 3: Using psql (For Advanced Users)

```bash
# Get your database connection string from Supabase Dashboard
# Settings > Database > Connection String > URI

psql "postgresql://postgres:[YOUR-PASSWORD]@db.ffqfsjpgsnymebmrsniu.supabase.co:5432/postgres" -f supabase/migrations/20260207_initial_schema.sql
```

---

## ✅ Verification Steps

After applying the schema, verify everything is working:

### 1. Check Tables
```sql
-- Run this in SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected output should include:
- bookings
- places
- reviews
- saved_places
- sos_alerts
- trips
- users_profile

### 2. Check RLS Policies
```sql
-- Run this in SQL Editor
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see multiple policies for each table.

### 3. Check Triggers
```sql
-- Run this in SQL Editor
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

You should see triggers for:
- update_updated_at (on multiple tables)
- on_auth_user_created (on auth.users)
- update_place_rating_on_review (on reviews)

### 4. Test Sample Data
```sql
-- Run this in SQL Editor after loading seed data
SELECT category, COUNT(*) as count
FROM public.places
GROUP BY category
ORDER BY category;
```

Expected output:
- emergency: 2
- hidden_spot: 3
- hospital: 3
- hostel: 4
- temple: 3

---

## 🔧 Troubleshooting

### Issue: "relation already exists" error
**Solution:** Some tables might already exist. You can either:
1. Drop existing tables first (⚠️ WARNING: This deletes all data!)
```sql
DROP TABLE IF EXISTS public.saved_places CASCADE;
DROP TABLE IF EXISTS public.sos_alerts CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.places CASCADE;
DROP TABLE IF EXISTS public.users_profile CASCADE;
```

2. Or modify the migration to use `CREATE TABLE IF NOT EXISTS` (already done in our schema)

### Issue: "type already exists" error
**Solution:** Drop existing types first:
```sql
DROP TYPE IF EXISTS alert_status CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS booking_type CASCADE;
DROP TYPE IF EXISTS trip_status CASCADE;
DROP TYPE IF EXISTS place_category CASCADE;
```

### Issue: RLS policies block queries
**Solution:** Check if you're authenticated:
```sql
-- Check current user
SELECT auth.uid();

-- Temporarily disable RLS for testing (NOT recommended for production)
ALTER TABLE public.places DISABLE ROW LEVEL SECURITY;
```

---

## 📊 Next Steps

After successfully setting up the database:

1. ✅ **Generate TypeScript Types**
   - The types will be auto-synced with your frontend
   - Check: `src/integrations/supabase/types.ts`

2. ✅ **Test Authentication**
   - Try signing up a new user
   - Verify user_profile is auto-created

3. ✅ **Test CRUD Operations**
   - Create a trip
   - Save a place
   - Add a review

4. 🔜 **Set up Storage Buckets** (Phase 3)
   - profile-pictures
   - place-images
   - review-images
   - trip-documents

5. 🔜 **Configure Authentication Providers** (Phase 2)
   - Enable Google OAuth
   - Enable Phone OTP
   - Configure email templates

6. 🔜 **Deploy Edge Functions** (Phase 4)
   - generate-trip
   - send-sos-alert
   - calculate-route
   - recommend-places
   - process-payment

---

## 📝 Schema Summary

**Total Tables:** 7
- users_profile (extends auth.users)
- places (temples, hospitals, emergency, hidden spots, hostels)
- trips (user trip planning)
- bookings (transport, accommodation, activities)
- reviews (place ratings and comments)
- sos_alerts (emergency alerts)
- saved_places (user favorites)

**Total Enums:** 6
**Total Indexes:** 12
**Total Triggers:** 5
**Total RLS Policies:** 25+

**Database Size (estimated):** ~50KB (schema only)
**With Seed Data:** ~150KB

---

**Status:** ✅ Schema files created and ready to apply  
**Next Action:** Apply schema using Option 1 (Supabase Dashboard)  
**Estimated Time:** 5-10 minutes
