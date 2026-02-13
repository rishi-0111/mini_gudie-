import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserProvider } from "@/contexts/UserContext";
import SplashScreen from "./pages/SplashScreen";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import TripPlanner from "./pages/TripPlanner";
import Explore from "./pages/Explore";
import Discover from "./pages/Discover";
import Booking from "./pages/Booking";
import AuthCallback from "./pages/AuthCallback";
import TestSupabase from "./pages/TestSupabase";
import NotFound from "./pages/NotFound";
import DevotionalTripPlanner from "./pages/DevotionalTripPlanner";
import SmartTripPlanner from "./pages/SmartTripPlanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<SplashScreen />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/test-supabase" element={<TestSupabase />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/trip-planner" element={<SmartTripPlanner />} />
              <Route path="/devotional" element={<DevotionalTripPlanner />} />
              <Route path="/smart-trip" element={<SmartTripPlanner />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/booking" element={<Booking />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
