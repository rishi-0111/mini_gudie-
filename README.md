# ✨ Mini Gudie — Futuristic Smart Travel Assistant

Mini Gudie is a high-performance, mobile-first travel and safety application designed to help users discover hidden spots, plan trips, and navigate seamlessly using real-time OpenStreetMap (OSM) data, AI-powered trip planning, and live weather tracking.

## 🚀 Key Features

### 🗺️ Intelligent Explore Page
- **Live GPS Tracking**: Automatically discovers points of interest (POIs) around your current location as you move.
- **Nominatim Search**: Powerful autocomplete for cities, landmarks, and specific addresses.
- **Overpass API Integration**: Fetches real-time data for 9 categories (Food, Temples, Hotels, Landmarks, Nature, etc.) directly from OSM.
- **Smart Filters**: Dynamic filtering on top of both live location and searched results.

### 📍 Google Maps-Style Place Details
- **Rich Place Sheets**: Detailed information including opening hours, contact info, and website links.
- **Smart Rating System**: Deterministic quality scoring based on OSM data and Wikipedia presence.
- **Photo Gallery**: Fetches real imagery from Wikimedia Commons and Wikipedia.
- **Community Reviews**: Realistic, deterministic reviews and ratings for every location.

### 🤖 AI-Powered Smart Trip Planner
- **FastAPI Backend**: Python-based trip generation engine with machine learning recommendations.
- **Intelligent Itineraries**: Multi-day trip planning with devotional places, hidden gems, food, and stays.
- **Budget Optimization**: Automatic cost estimation with detailed breakdown (transport, accommodation, food).
- **Transport Integration**: Real-time bus routes, ride costs (Ola/Uber/Rapido), and travel distances.
- **Crowd Intelligence**: Smart crowd level predictions for better planning.
- **Export & Share**: Download trip plans as PDF or share via social media.

### 🛣️ Advanced Routing & Navigation
- **OSRM Integration**: High-speed routing for Driving, Walking, and Cycling modes.
- **Animated Routes**: Visual polyline overlays with dashed animation for clear navigation.
- **Cost Estimation**: Realistic fare estimates for Cabs (Ola/Uber), Auto Rickshaws, Buses, and Bike Taxis.
- **Turn-by-Turn Directions**: Detailed maneuvers with intuitive direction icons.
- **Deep Linking**: One-click "Open in Google Maps" for final-mile navigation.

### 🌦️ Live Weather Reports
- **Visual Crossing API**: Real-time weather data with hourly forecasts.
- **Dual Location Support**: GPS-based and custom city search.
- **Animated Graphs**: GSAP-powered temperature and humidity charts (12-hour forecast).
- **Complete Metrics**: Temperature, feels-like, humidity, wind speed, visibility, pressure, sunrise/sunset.
- **Beautiful UI**: Color-coded cards with gradient graphs and smooth animations.

### 📱 Enhanced Booking System
- **From/To Inputs**: Always-visible origin and destination fields for precise search.
- **Live POI Search**: Real-time transport, hotels, and attractions via Overpass API.
- **Smart Filtering**: Category, rating, open-now, and distance-based filters.
- **Map + List Views**: Toggle between interactive map and detailed list.
- **Payment Integration**: Direct booking flow with place details.

### 👤 Advanced Profile Management
- **Expandable Settings**: Profile, Location, Preferences, Privacy, Notifications with toggle controls.
- **Help & Support**: FAQs, Contact Us, Report Issue, Emergency Help, Feedback sections.
- **Emergency Contacts**: CRUD operations with Supabase persistence and primary contact designation.
- **GSAP Animations**: Bubble-in icon animations with elastic bounce effects.
- **Multi-language Support**: Full i18n with dynamic language switching.
- **Dark Mode**: System-aware theme toggle.

### 🛡️ Safety & Reliability
- **SOS Functionality**: Quick-access emergency buttons with contact alerts.
- **Emergency Help**: Direct links to police/fire/ambulance services.
- **Fallback Servers**: Automatic rotation between multiple Overpass API mirrors for maximum uptime.
- **Offline-Ready UI**: Caching mechanisms for search results and place data.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3.1 + Vite 5.4.21
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS 3.4.17 + shadcn/ui
- **Animations**: GSAP 3.14.2 (with ScrollTrigger) + Framer Motion
- **Maps**: Leaflet.js with custom tile layers
- **Routing**: OSRM (Open Source Routing Machine)
- **Geocoding**: Nominatim (OSM)
- **Weather**: Visual Crossing Weather API
- **UI Components**: Lucide React icons, Radix UI primitives

### Backend & Data
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with email/password
- **Trip Planning API**: FastAPI (Python) with ML-powered recommendations
- **Spatial Data**: OpenStreetMap (OSM) via Overpass API
- **POI Search**: Overpass API with fallback servers
- **Real-time Data**: Live bus routes, ride prices, weather updates

### APIs & Services
- **Visual Crossing Weather**: Live weather data and forecasts
- **Nominatim**: Geocoding and reverse geocoding
- **Overpass API**: OSM POI data extraction
- **OSRM**: Fast routing and directions
- **Wikimedia Commons**: Place photos and imagery

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Python 3.9+ (for backend)
- npm or bun
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rishi-0111/mini_gudie-.git
   cd miniguide
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Python backend (optional, for trip planning):**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
   pip install fastapi uvicorn pandas scikit-learn
   ```

5. **Run the development servers:**
   
   **Frontend (Vite):**
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:8083`
   
   **Backend (FastAPI - optional):**
   ```bash
   python -m uvicorn hidden_gem_explorer.step8_api:app --host 0.0.0.0 --port 8000 --reload
   ```
   Runs on `http://localhost:8000`

### Configuration

#### Weather API
- Get a free API key from [Visual Crossing Weather](https://www.visualcrossing.com/)
- Already configured in `src/components/WeatherReport.tsx`

#### Supabase Setup
1. Create a new project at [Supabase](https://supabase.com/)
2. Run migrations from `supabase/migrations/`
3. Seed initial data using SQL files in `supabase/`
4. Copy your project URL and anon key to `.env`

## 🏗️ Project Structure

### Frontend (`src/`)
- **pages/**
  - `Home.tsx`: Main dashboard with live location, quick actions, and weather access
  - `Explore.tsx`: Core search, map interaction, and routing logic
  - `SmartTripPlanner.tsx`: AI-powered trip generation with budget breakdown
  - `Booking.tsx`: Real-time POI booking with from/to location filtering
  - `Profile.tsx`: User profile with settings, emergency contacts, and help sections
  - `Payment.tsx`: Payment processing and booking confirmation

- **components/**
  - `InteractiveMap.tsx`: Reusable Leaflet map with imperative route handles
  - `WeatherReport.tsx`: Animated weather modal with graphs and metrics
  - `CategoryCard.tsx`: Feature cards for navigation
  - `FloatingSOS.tsx`: Emergency SOS button
  - `BottomNav.tsx`: Mobile navigation bar
  - `smart-trip/`: Trip planner components (CityAutocomplete, PlanPreview, etc.)

- **hooks/**
  - `useExploreSearch.ts`: Debounced search and distance utilities
  - `useGooglePlaces.ts`: Overpass API integration (replaces Google Places)
  - `useGeolocation.ts`: GPS location tracking

- **contexts/**
  - `LanguageContext.tsx`: Multi-language support
  - `UserContext.tsx`: User state management

### Backend (`hidden_gem_explorer/`)
- `step8_api.py`: FastAPI server for trip planning
- `step10_trip_planner.py`: ML-based itinerary generation
- `step7_recommendations.py`: Hidden gem scoring and recommendations
- `ai_chat.py`: AI assistant integration (Gemini)
- `devotional.py`, `food.py`, `stays.py`: Category-specific data handlers
- `data/`: Training data and model outputs
- `models/`: ML models for place recommendations

### Database (`supabase/`)
- `migrations/`: Database schema definitions
- `seed_*.sql`: Initial data for destinations, transport, places, etc.
- `functions/`: Edge functions for serverless operations

## 🎨 Key Features Showcase

### GSAP Animations
- **Profile Page**: Icon bubble animations with elastic bounce
- **Weather Graphs**: Temperature and humidity bars with sequential stagger
- **Home Page**: Smooth scroll-triggered category cards
- **Smart Trip Planner**: Smooth transitions and plan preview animations

### Real-time Features
- **Live Location Tracking**: GPS-based POI discovery with auto-refresh
- **Weather Updates**: Hourly forecasts with animated graphs
- **Route Calculation**: Instant OSRM routing with distance/time estimates
- **Search Autocomplete**: Debounced Nominatim suggestions

### Mobile-First Design
- **Responsive Layout**: Optimized for all screen sizes
- **Bottom Navigation**: Easy thumb-zone access
- **Swipe Gestures**: Natural mobile interactions
- **Touch-Optimized**: Large tap targets and smooth scrolling

## 🚢 Deployment

### Frontend (Vite Build)
```bash
npm run build
npm run preview  # Test production build locally
```

Deploy the `dist/` folder to:
- Vercel (recommended)
- Netlify
- GitHub Pages
- Any static hosting service

### Backend (FastAPI)
Deploy to:
- Railway
- Render
- AWS Lambda (with Mangum adapter)
- DigitalOcean App Platform

## 📝 Available Scripts

- `npm run dev` - Start Vite dev server (port 8083)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npx tsc --noEmit` - TypeScript type checking

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues & Roadmap

- [x] Live weather integration with animated graphs
- [x] Profile settings expansion with GSAP animations
- [x] Booking from/to location filtering
- [ ] Offline map caching
- [ ] Progressive Web App (PWA) support
- [ ] Push notifications for trip reminders
- [ ] Social authentication (Google, Facebook)
- [ ] Multi-currency support for international travel

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Email: support@miniguide.app
- Emergency Help: Built-in SOS feature in the app

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ by the Mini Gudie Team**

*Making travel smarter, safer, and more accessible for everyone.*