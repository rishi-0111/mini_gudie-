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
import CategoryDetail from "./pages/CategoryDetail";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import { ParticleSystemBackground } from "@/components/ParticleSystemBackground";
import React from "react";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message };
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[App ErrorBoundary]", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{this.state.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, message: "" }); }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/* Animated Background */}
          <ParticleSystemBackground 
            particleCount={30} 
            particleSpeed={0.3}
            interactive={true}
          />
          <BrowserRouter>
            <ErrorBoundary>
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
              <Route path="/payment" element={<Payment />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/category/:slug" element={<CategoryDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </UserProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
