/**
 * PaymentSuccess — Booking confirmation page
 * 
 * Shows success animation, booking details, and fake ticket download.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  CheckCircle2,
  Download,
  Home,
  MapPin,
  Calendar,
  Clock,
  Share2,
  Star,
  Ticket,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface SuccessState {
  place_id: string;
  name: string;
  category: string;
  price_level: number;
  photo_url: string | null;
  vicinity: string;
  rating: number;
  amount: number;
  paymentMethod: string;
  bookingId: string;
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const data = location.state as SuccessState | null;
  const [copied, setCopied] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data) {
      navigate("/booking");
      return;
    }

    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#22c55e", "#10b981"],
    });

    // GSAP animations
    const tl = gsap.timeline();
    
    tl.fromTo(checkRef.current, 
      { scale: 0, rotation: -180 }, 
      { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.7)" }
    );
    
    tl.fromTo(cardRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      "-=0.2"
    );

    return () => { tl.kill(); };
  }, [data, navigate]);

  if (!data) return null;

  const bookingDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bookingTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const copyBookingId = () => {
    navigator.clipboard.writeText(data.bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Booking ID copied to clipboard" });
  };

  const downloadTicket = () => {
    // Create fake PDF download
    const ticketContent = `
╔════════════════════════════════════════════════════════════╗
║                    MINI GUIDE - E-TICKET                   ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Booking ID: ${data.bookingId}                             
║                                                            ║
║  Destination: ${data.name}                                 
║  Location: ${data.vicinity}                                
║  Category: ${data.category.toUpperCase()}                  
║                                                            ║
║  Date: ${bookingDate}                                      
║  Time: ${bookingTime}                                      
║                                                            ║
║  Amount Paid: ₹${data.amount}                              
║  Payment Method: ${data.paymentMethod.toUpperCase()}       
║                                                            ║
║  Status: ✓ CONFIRMED                                       
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  Thank you for booking with Mini Guide!                    ║
║  Present this ticket at the venue.                         ║
╚════════════════════════════════════════════════════════════╝
    `.trim();

    const blob = new Blob([ticketContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MiniGuide_Ticket_${data.bookingId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Downloaded!", description: "Your ticket has been downloaded" });
  };

  const shareBooking = async () => {
    const shareData = {
      title: "Mini Guide Booking",
      text: `I just booked ${data.name} via Mini Guide! Booking ID: ${data.bookingId}`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareData.text);
      toast({ title: "Copied!", description: "Booking details copied to clipboard" });
    }
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 px-6 py-12">
      {/* Success Icon */}
      <div ref={checkRef} className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/30">
        <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
      </div>

      {/* Success Text */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
        <p className="text-muted-foreground">Your booking has been successfully processed.</p>
      </div>

      {/* Booking Card */}
      <div ref={cardRef} className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden mb-6">
        {/* Header with ticket pattern */}
        <div className="bg-gradient-primary p-5 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-r-full" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-l-full" />
          
          <div className="flex items-center gap-3">
            <Ticket className="w-6 h-6 text-white" />
            <span className="text-white font-semibold">E-Ticket</span>
          </div>
        </div>

        {/* Dashed border */}
        <div className="border-t-2 border-dashed border-border" />

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Booking ID */}
          <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground">Booking ID</p>
              <p className="font-bold text-primary text-lg tracking-wider">{data.bookingId}</p>
            </div>
            <button
              onClick={copyBookingId}
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-primary" />
              )}
            </button>
          </div>

          {/* Place Info */}
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
              {data.photo_url ? (
                <img src={data.photo_url} alt={data.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">🎯</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold line-clamp-1">{data.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {data.vicinity}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span className="font-medium">{data.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 p-3 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Date</span>
              </div>
              <p className="font-medium text-sm">{bookingDate}</p>
            </div>
            <div className="bg-secondary/50 p-3 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Time</span>
              </div>
              <p className="font-medium text-sm">{bookingTime}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="text-2xl font-bold text-green-600">₹{data.amount}</span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 bg-green-500/10 text-green-600 py-2 rounded-xl font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Payment Successful
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={downloadTicket}
          className="w-full btn-primary py-4 flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Ticket
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={shareBooking}
            className="py-3 rounded-xl bg-secondary text-secondary-foreground font-medium flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <Link
            to="/home"
            className="py-3 rounded-xl bg-secondary text-secondary-foreground font-medium flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        A confirmation email has been sent to your registered email address.
        <br />
        Please present this ticket at the venue.
      </p>
    </div>
  );
};

export default PaymentSuccess;
