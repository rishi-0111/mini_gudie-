# Mini Gudie Backend Implementation Plan

## 📋 Overview
This plan outlines the complete backend setup for the Mini Gudie travel and safety application using Supabase as the Backend-as-a-Service (BaaS) platform.

**Current Status:** ✅ Supabase client initialized, basic configuration exists  
**Goal:** Complete backend infrastructure with authentication, database, storage, and edge functions

---

## 🎯 Phase 1: Database Schema Design & Setup

### 1.1 Core Tables

#### **users_profile** (extends Supabase auth.users)
```sql
- id (uuid, FK to auth.users)
- full_name (text)
- phone_number (text)
- profile_picture_url (text)
- preferred_language (text, default: 'en')
- emergency_contacts (jsonb) -- Array of {name, phone, relation}
- created_at (timestamp)
- updated_at (timestamp)
```

#### **places**
```sql
- id (uuid, PK)
- name (text)
- category (enum: 'temple', 'hospital', 'emergency', 'hidden_spot', 'hostel')
- latitude (decimal)
- longitude (decimal)
- address (text)
- description (text)
- rating (decimal, 0-5)
- review_count (integer)
- images (text[])
- amenities (jsonb)
- contact_info (jsonb)
- opening_hours (jsonb)
- verified (boolean, default: false)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **trips**
```sql
- id (uuid, PK)
- user_id (uuid, FK to users_profile)
- title (text)
- from_location (text)
- destination (text)
- start_date (date)
- end_date (date)
- days (integer)
- budget (decimal)
- preferences (jsonb) -- {rating_min, distance_max, categories}
- status (enum: 'planning', 'confirmed', 'ongoing', 'completed', 'cancelled')
- itinerary (jsonb) -- AI-generated itinerary
- created_at (timestamp)
- updated_at (timestamp)
```

#### **bookings**
```sql
- id (uuid, PK)
- trip_id (uuid, FK to trips)
- user_id (uuid, FK to users_profile)
- booking_type (enum: 'transport', 'accommodation', 'activity')
- provider_name (text)
- booking_reference (text)
- booking_date (date)
- amount (decimal)
- status (enum: 'pending', 'confirmed', 'cancelled')
- details (jsonb)
- created_at (timestamp)
```

#### **reviews**
```sql
- id (uuid, PK)
- place_id (uuid, FK to places)
- user_id (uuid, FK to users_profile)
- rating (integer, 1-5)
- comment (text)
- images (text[])
- helpful_count (integer, default: 0)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **sos_alerts**
```sql
- id (uuid, PK)
- user_id (uuid, FK to users_profile)
- latitude (decimal)
- longitude (decimal)
- alert_type (enum: 'medical', 'security', 'accident', 'other')
- status (enum: 'active', 'resolved', 'cancelled')
- description (text)
- emergency_contacts_notified (boolean)
- created_at (timestamp)
- resolved_at (timestamp)
```

#### **saved_places**
```sql
- id (uuid, PK)
- user_id (uuid, FK to users_profile)
- place_id (uuid, FK to places)
- notes (text)
- created_at (timestamp)
```

### 1.2 Database Indexes
```sql
-- Performance optimization indexes
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_location ON places USING GIST (point(longitude, latitude));
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_reviews_place_id ON reviews(place_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
```

### 1.3 Row Level Security (RLS) Policies
```sql
-- Enable RLS on all tables
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

-- Example policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON users_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users_profile
  FOR UPDATE USING (auth.uid() = id);
```

---

## 🔐 Phase 2: Authentication Setup

### 2.1 Authentication Methods
- ✅ Email/Password (already configured)
- 📧 Email OTP (passwordless)
- 🔑 Google OAuth
- 📱 Phone OTP (SMS)

### 2.2 Implementation Steps

#### Enable Email OTP
```typescript
// In Supabase Dashboard: Authentication > Providers > Email
// Enable "Confirm email" and "Enable email OTP"

// Frontend implementation
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'http://localhost:8080/auth/callback'
  }
})
```

#### Enable Google OAuth
```typescript
// In Supabase Dashboard: Authentication > Providers > Google
// Add OAuth credentials from Google Cloud Console

// Frontend implementation
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'http://localhost:8080/auth/callback'
  }
})
```

#### Enable Phone OTP
```typescript
// In Supabase Dashboard: Authentication > Providers > Phone
// Configure Twilio or other SMS provider

// Frontend implementation
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+919876543210',
  options: {
    channel: 'sms'
  }
})
```

### 2.3 Auth Hooks & Triggers
```sql
-- Create user profile automatically on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, full_name, created_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📦 Phase 3: Storage Setup

### 3.1 Storage Buckets
```javascript
// Create buckets in Supabase Dashboard: Storage

1. **profile-pictures** (Public)
   - Max file size: 5MB
   - Allowed types: image/jpeg, image/png, image/webp

2. **place-images** (Public)
   - Max file size: 10MB
   - Allowed types: image/jpeg, image/png, image/webp

3. **review-images** (Public)
   - Max file size: 5MB
   - Allowed types: image/jpeg, image/png, image/webp

4. **trip-documents** (Private)
   - Max file size: 10MB
   - Allowed types: application/pdf, image/*
```

### 3.2 Storage Policies
```sql
-- Profile pictures: users can upload their own
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Place images: authenticated users can upload
CREATE POLICY "Authenticated users can upload place images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'place-images');
```

---

## ⚡ Phase 4: Edge Functions (Serverless)

### 4.1 Function: generate-trip (AI Trip Planning)
**Location:** `supabase/functions/generate-trip/index.ts`

```typescript
// Integrates with OpenAI/Gemini API to generate personalized itineraries
// Input: from, destination, days, budget, preferences
// Output: Detailed day-by-day itinerary with places, routes, costs
```

### 4.2 Function: send-sos-alert
**Location:** `supabase/functions/send-sos-alert/index.ts`

```typescript
// Sends SMS/Email to emergency contacts when SOS is triggered
// Integrates with Twilio for SMS
// Input: user_id, location, alert_type
// Output: Notification sent status
```

### 4.3 Function: calculate-route
**Location:** `supabase/functions/calculate-route/index.ts`

```typescript
// Uses OpenRouteService or Google Maps API for route calculation
// Input: origin, destination, waypoints
// Output: Route geometry, distance, duration, elevation
```

### 4.4 Function: recommend-places
**Location:** `supabase/functions/recommend-places/index.ts`

```typescript
// AI-powered place recommendations based on user preferences
// Input: user_id, location, preferences
// Output: Ranked list of recommended places
```

### 4.5 Function: process-payment
**Location:** `supabase/functions/process-payment/index.ts`

```typescript
// Integrates with Razorpay/Stripe for booking payments
// Input: booking_id, amount, payment_method
// Output: Payment confirmation
```

---

## 🔌 Phase 5: External API Integrations

### 5.1 Map & Location Services
- **OpenStreetMap** (already integrated via Leaflet)
- **OpenRouteService API** - Route calculation, geocoding
  - API Key required: https://openrouteservice.org/
  
### 5.2 AI Services
- **Google Gemini API** - Trip planning, recommendations
  - API Key: Get from Google AI Studio
  
### 5.3 Communication Services
- **Twilio** - SMS for OTP and SOS alerts
  - Account SID & Auth Token required
  
### 5.4 Payment Gateway
- **Razorpay** (India) or **Stripe** (International)
  - API keys required

### 5.5 Weather API
- **OpenWeatherMap** - Weather forecasts for trip planning
  - Free tier available

---

## 🛠️ Phase 6: Backend Utilities & Helpers

### 6.1 Create Database Migration Files
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase locally
supabase init

# Create migration for schema
supabase migration new initial_schema

# Apply migrations
supabase db push
```

### 6.2 Seed Data Script
Create `supabase/seed.sql` with sample data for:
- Popular temples, hospitals, emergency services
- Sample hidden spots and hostels
- Test user profiles

### 6.3 TypeScript Types Generation
```bash
# Generate TypeScript types from database schema
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## 📊 Phase 7: Real-time Features

### 7.1 Real-time Subscriptions
```typescript
// Live location tracking during trips
const subscription = supabase
  .channel('trip-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'trips',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('Trip updated:', payload)
  })
  .subscribe()

// SOS alert monitoring
const sosSubscription = supabase
  .channel('sos-alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sos_alerts'
  }, (payload) => {
    // Notify emergency contacts
  })
  .subscribe()
```

---

## 🧪 Phase 8: Testing & Validation

### 8.1 Database Testing
- Test all CRUD operations
- Validate RLS policies
- Test foreign key constraints
- Performance testing with sample data

### 8.2 API Testing
- Test all edge functions locally
- Validate authentication flows
- Test file uploads to storage
- Load testing for concurrent users

### 8.3 Security Audit
- Review RLS policies
- Check API key exposure
- Validate input sanitization
- Test rate limiting

---

## 📈 Phase 9: Monitoring & Analytics

### 9.1 Supabase Dashboard Monitoring
- Database performance metrics
- API usage statistics
- Storage usage
- Authentication logs

### 9.2 Error Tracking
- Integrate Sentry for error monitoring
- Set up alerts for critical failures

### 9.3 Analytics
- Track user engagement
- Monitor trip creation rates
- SOS alert frequency
- Popular places/categories

---

## 🚀 Phase 10: Deployment Checklist

### 10.1 Environment Variables
```bash
# Production .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-api-key
VITE_OPENROUTE_API_KEY=your-openroute-key
VITE_GEMINI_API_KEY=your-gemini-key
```

### 10.2 Pre-deployment Steps
- [ ] Run all database migrations
- [ ] Seed production database with initial data
- [ ] Deploy edge functions to Supabase
- [ ] Configure custom domain (if needed)
- [ ] Set up SSL certificates
- [ ] Configure CORS policies
- [ ] Set up backup schedules
- [ ] Enable database point-in-time recovery

### 10.3 Post-deployment
- [ ] Verify all API endpoints
- [ ] Test authentication flows
- [ ] Validate real-time subscriptions
- [ ] Monitor error logs
- [ ] Set up uptime monitoring

---

## 📝 Implementation Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Database Schema | 2-3 days | 🔴 Critical |
| Phase 2: Authentication | 1-2 days | 🔴 Critical |
| Phase 3: Storage Setup | 1 day | 🟡 High |
| Phase 4: Edge Functions | 3-4 days | 🟡 High |
| Phase 5: API Integrations | 2-3 days | 🟡 High |
| Phase 6: Utilities | 1-2 days | 🟢 Medium |
| Phase 7: Real-time Features | 2 days | 🟢 Medium |
| Phase 8: Testing | 2-3 days | 🔴 Critical |
| Phase 9: Monitoring | 1 day | 🟢 Medium |
| Phase 10: Deployment | 1 day | 🔴 Critical |

**Total Estimated Time:** 16-23 days

---

## 🎯 Quick Start Guide

### Step 1: Set up Supabase Project
1. Go to https://supabase.com/dashboard
2. Your project is already created: `ffqfsjpgsnymebmrsniu`
3. Navigate to SQL Editor

### Step 2: Create Database Schema
1. Copy the SQL from Phase 1.1
2. Run in Supabase SQL Editor
3. Verify tables are created

### Step 3: Configure Authentication
1. Go to Authentication > Providers
2. Enable Email, Google, Phone
3. Add OAuth credentials

### Step 4: Create Storage Buckets
1. Go to Storage
2. Create buckets as per Phase 3.1
3. Set up policies

### Step 5: Deploy Edge Functions
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ffqfsjpgsnymebmrsniu

# Deploy functions
supabase functions deploy generate-trip
supabase functions deploy send-sos-alert
```

### Step 6: Test Everything
1. Test authentication in your app
2. Create a test trip
3. Upload a profile picture
4. Trigger an SOS alert (test mode)

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OpenRouteService API Docs](https://openrouteservice.org/dev/#/api-docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue:** RLS policies blocking queries  
**Solution:** Check policies with `SELECT * FROM pg_policies;`

**Issue:** Edge function timeout  
**Solution:** Optimize queries, add indexes, use connection pooling

**Issue:** Storage upload fails  
**Solution:** Check bucket policies and file size limits

**Issue:** Real-time not working  
**Solution:** Verify RLS policies allow SELECT on subscribed tables

---

**Last Updated:** 2026-02-07  
**Version:** 1.0  
**Status:** Ready for Implementation ✅
