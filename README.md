# ✨ Mini Gudie — Futuristic Smart Travel Assistant

Mini Gudie is a high-performance, mobile-first travel and safety application designed to help users discover hidden spots, plan trips, and navigate seamlessly using real-time OpenStreetMap (OSM) data.

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

### 🛣️ Advanced Routing & Navigation
- **OSRM Integration**: High-speed routing for Driving, Walking, and Cycling modes.
- **Animated Routes**: Visual polyline overlays with dashed animation for clear navigation.
- **Cost Estimation**: Realistic fare estimates for Cabs (Ola/Uber), Auto Rickshaws, Buses, and Bike Taxis.
- **Turn-by-Turn Directions**: Detailed maneuvers with intuitive direction icons.
- **Deep Linking**: One-click "Open in Google Maps" for final-mile navigation.

### 🛡️ Safety & Reliability
- **SOS Functionality**: Quick-access emergency buttons.
- **Fallback Servers**: Automatic rotation between multiple Overpass API mirrors for maximum uptime.
- **Offline-Ready UI**: Caching mechanisms for search results and place data.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: GSAP + Framer Motion
- **Maps**: Leaflet.js
- **Routing**: OSRM (Open Source Routing Machine)
- **Gecoding**: Nominatim

### Backend & Data
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Spatial Data**: OpenStreetMap (OSM) via Overpass API

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <YOUR_GIT_URL>
   cd mini-gudie
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

- `src/pages/Explore.tsx`: The core logic for search, map interaction, and routing.
- `src/components/InteractiveMap.tsx`: Reusable Leaflet map component with imperative route handles.
- `src/hooks/useExploreSearch.ts`: Debounced search hooks and distance utility functions.
- `src/integrations/supabase/`: Database and Auth definitions.

## 📄 License
This project is licensed under the MIT License.