# 🔧 Google Sign-In Setup Guide

## ✅ What's Been Fixed

I've added the **OAuth callback handler** to properly handle Google Sign-In redirects!

### Changes Made:
1. ✅ Created `AuthCallback.tsx` page
2. ✅ Added `/auth/callback` route to App.tsx
3. ✅ Automatic user profile creation for Google users
4. ✅ Proper session handling and redirects

---

## 🚀 How to Enable Google Sign-In

### Step 1: Configure Google OAuth in Supabase

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/ffqfsjpgsnymebmrsniu

2. **Navigate to Authentication → Providers**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers" tab

3. **Enable Google Provider**
   - Find "Google" in the list
   - Toggle it to **ON**

4. **Get Google OAuth Credentials**
   
   **Option A: Use Supabase's Google Credentials (Quick Setup)**
   - Supabase provides default credentials for testing
   - Just enable Google and it should work for development
   
   **Option B: Use Your Own Google Credentials (Production)**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Add authorized redirect URIs:
     ```
     https://ffqfsjpgsnymebmrsniu.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**
   - Paste them in Supabase Google provider settings

5. **Save Configuration**

---

## 🔄 How the Flow Works Now

### User Journey:
```
1. User clicks "Sign up with Google" button
         ↓
2. Redirected to Google login page
         ↓
3. User logs in with Google account
         ↓
4. Google redirects to: /auth/callback
         ↓
5. AuthCallback page processes the session
         ↓
6. Creates user profile if doesn't exist
         ↓
7. Redirects to /home
         ✅ User is logged in!
```

### Technical Flow:
```typescript
// 1. SignUp.tsx - User clicks Google button
handleGoogleSignIn() → signInWithGoogle()
  ↓
// 2. Supabase redirects to Google
Google OAuth consent screen
  ↓
// 3. Google redirects back with auth code
http://localhost:8080/auth/callback#access_token=...
  ↓
// 4. AuthCallback.tsx processes the callback
- Gets session from Supabase
- Checks if user profile exists
- Creates profile if needed
- Redirects to /home
```

---

## 📝 Redirect URLs Configuration

### For Local Development:
```
http://localhost:8080/auth/callback
```

### For Production:
```
https://your-domain.com/auth/callback
```

**Important:** Add these URLs to:
1. **Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs
2. **Google Cloud Console** → OAuth 2.0 Client → Authorized redirect URIs

---

## 🧪 Testing Google Sign-In

### Before Testing:
1. ✅ Enable Google provider in Supabase
2. ✅ Add redirect URL to Supabase
3. ✅ (Optional) Configure your own Google OAuth credentials

### Test Steps:
1. Go to: http://localhost:8080/signup
2. Click "Sign up with Google" button
3. You should be redirected to Google login
4. Log in with your Google account
5. You'll be redirected back to your app
6. Should see "Completing sign in..." loading screen
7. Then redirected to /home

### If It Doesn't Work:
- Check browser console for errors
- Check Supabase Dashboard → Authentication → Logs
- Verify redirect URL is correct
- Make sure Google provider is enabled

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem:** Google redirect URI doesn't match configured URIs

**Solution:**
1. Go to Google Cloud Console
2. Add exact redirect URI:
   ```
   https://ffqfsjpgsnymebmrsniu.supabase.co/auth/v1/callback
   ```

### Error: "Invalid login credentials"
**Problem:** Google OAuth not configured in Supabase

**Solution:**
1. Go to Supabase Dashboard
2. Enable Google provider
3. Save configuration

### Stuck on "Completing sign in..."
**Problem:** Callback not processing correctly

**Solution:**
1. Check browser console for errors
2. Verify `/auth/callback` route exists
3. Check Supabase session is being created

### User redirected to login instead of home
**Problem:** Session not being created

**Solution:**
1. Check Supabase logs
2. Verify Google OAuth credentials
3. Check if email is verified in Google account

---

## 📋 Supabase Configuration Checklist

In Supabase Dashboard:

### Authentication → Providers
- [x] Google provider enabled
- [x] Client ID configured (if using custom)
- [x] Client Secret configured (if using custom)

### Authentication → URL Configuration
- [x] Site URL: `http://localhost:8080` (development)
- [x] Redirect URLs:
  - `http://localhost:8080/auth/callback`
  - `https://your-domain.com/auth/callback` (production)

### Authentication → Email Templates
- [x] Confirm signup template (optional customization)

---

## 🎯 What Happens After Google Sign-In

1. **User Profile Created**
   - Full name from Google account
   - Profile picture from Google
   - Email from Google

2. **Session Established**
   - User is authenticated
   - Access token stored
   - Refresh token stored

3. **Redirected to Home**
   - User can access protected routes
   - Profile data available

---

## 🔐 Security Notes

- OAuth tokens are handled by Supabase
- No passwords stored for Google users
- Session expires after configured time
- Refresh tokens automatically renew sessions

---

## 📱 User Experience

### What Users See:

**Step 1: Click Google Button**
```
┌─────────────────────────────────┐
│ [G Sign up with Google]         │
└─────────────────────────────────┘
```

**Step 2: Google Login Page**
```
Google Account Selection
- Choose account
- Grant permissions
```

**Step 3: Processing**
```
┌─────────────────────────────────┐
│          ⏳                     │
│   Completing sign in...         │
│   Please wait while we          │
│   redirect you                  │
└─────────────────────────────────┘
```

**Step 4: Home Page**
```
✅ Logged in successfully!
```

---

## ✅ Quick Setup (TL;DR)

1. Go to Supabase Dashboard
2. Authentication → Providers → Enable Google
3. Save
4. Test: http://localhost:8080/signup
5. Click "Sign up with Google"
6. Done! 🎉

---

**Need Help?** Check the browser console and Supabase logs for detailed error messages.
