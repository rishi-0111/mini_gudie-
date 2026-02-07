# 🚀 Mini Gudie Backend - Quick Reference

## 📦 What's Been Created

### Database Files
- ✅ `supabase/migrations/20260207_initial_schema.sql` - Complete schema
- ✅ `supabase/seed.sql` - Sample data (15 places)

### Helper Modules
- ✅ `src/integrations/supabase/auth.ts` - Authentication (15+ functions)
- ✅ `src/integrations/supabase/database.ts` - Database ops (30+ functions)
- ✅ `src/integrations/supabase/storage.ts` - File management (20+ functions)
- ✅ `src/integrations/supabase/index.ts` - Central exports

### Documentation
- ✅ `.artifacts/backend_implementation_plan.md` - Full roadmap
- ✅ `.artifacts/database_setup_instructions.md` - Setup guide
- ✅ `.artifacts/backend_progress_report.md` - Progress tracker

---

## ⚡ Quick Start (5 Minutes)

### 1. Apply Database Schema
```
1. Open: https://supabase.com/dashboard/project/ffqfsjpgsnymebmrsniu
2. Click: SQL Editor → New Query
3. Copy: supabase/migrations/20260207_initial_schema.sql
4. Paste & Run
5. Verify: Table Editor shows 7 new tables
```

### 2. Load Sample Data (Optional)
```
1. SQL Editor → New Query
2. Copy: supabase/seed.sql
3. Paste & Run
4. Verify: 15 places loaded
```

---

## 💻 Code Examples

### Authentication
```typescript
import { signUpWithEmail, signInWithGoogle } from '@/integrations/supabase';

// Email signup
await signUpWithEmail({
  email: 'user@example.com',
  password: 'pass123',
  fullName: 'John Doe'
});

// Google login
await signInWithGoogle();
```

### Database Operations
```typescript
import { getPlaces, createTrip, savePlace } from '@/integrations/supabase';

// Get temples
const { data } = await getPlaces({ category: 'temple' });

// Create trip
await createTrip({
  user_id: userId,
  title: 'Temple Tour',
  from_location: 'Chennai',
  destination: 'Madurai',
  start_date: '2026-03-01',
  end_date: '2026-03-05',
  days: 5,
  budget: 15000
});

// Save favorite
await savePlace(userId, placeId, 'Amazing!');
```

### File Upload
```typescript
import { uploadProfilePicture, uploadPlaceImage } from '@/integrations/supabase';

// Profile picture
const { url } = await uploadProfilePicture(userId, file);

// Place image
const { url } = await uploadPlaceImage(file, placeId);
```

---

## 📊 Database Schema

### Tables
1. **users_profile** - User data + emergency contacts
2. **places** - Temples, hospitals, emergency, hidden spots, hostels
3. **trips** - Trip planning with AI itineraries
4. **bookings** - Transport, accommodation, activities
5. **reviews** - Ratings & comments
6. **sos_alerts** - Emergency alerts
7. **saved_places** - User favorites

### Categories
- `temple` - Religious sites
- `hospital` - Medical facilities
- `emergency` - Police, fire, rescue
- `hidden_spot` - Secret locations
- `hostel` - Budget accommodation

---

## 🔐 Authentication Methods

- ✅ Email/Password
- ✅ Email OTP (passwordless)
- ✅ Phone OTP
- ✅ Google OAuth

---

## 📁 Storage Buckets (To Create)

1. **profile-pictures** (Public, 5MB)
2. **place-images** (Public, 10MB)
3. **review-images** (Public, 5MB)
4. **trip-documents** (Private, 10MB)

---

## 🎯 Next Actions

### Critical (Do Now)
1. ⚠️ Apply database schema
2. ⚠️ Create storage buckets
3. ⚠️ Enable Google OAuth

### High Priority (This Week)
4. Update components to use helpers
5. Test authentication flow
6. Test CRUD operations

### Medium Priority (Next Week)
7. Deploy edge functions
8. Set up external APIs
9. Add real-time features

---

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ffqfsjpgsnymebmrsniu
- **Local App:** http://localhost:8080
- **Implementation Plan:** `.artifacts/backend_implementation_plan.md`
- **Setup Guide:** `.artifacts/database_setup_instructions.md`
- **Progress Report:** `.artifacts/backend_progress_report.md`

---

## 📞 Helper Functions Cheat Sheet

### Auth
- `signUpWithEmail()` - Register user
- `signInWithEmail()` - Login
- `signInWithGoogle()` - OAuth
- `signOut()` - Logout
- `getCurrentUser()` - Get user
- `updateUserProfile()` - Update profile

### Database
- `getPlaces()` - Fetch places
- `searchPlaces()` - Search
- `getNearbyPlaces()` - Location-based
- `createTrip()` - New trip
- `getUserTrips()` - User's trips
- `createReview()` - Add review
- `savePlace()` - Favorite place
- `createSOSAlert()` - Emergency

### Storage
- `uploadProfilePicture()` - Avatar
- `uploadPlaceImage()` - Place photo
- `uploadReviewImage()` - Review photo
- `validateFile()` - Check file
- `compressImage()` - Optimize

---

**Status:** ✅ Phase 1 Complete  
**Progress:** 35% Overall  
**Time to Setup:** 5-10 minutes
