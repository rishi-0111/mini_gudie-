/**
 * Payment — Simulated payment page
 * 
 * Receives real place data from /booking via route state.
 * Payment methods are all simulated/fake.
 */

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  ArrowLeft,
  Lock,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  QrCode,
  Star,
  MapPin,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "qr";

interface PaymentState {
  place_id: string;
  name: string;
  category: string;
  price_level: number;
  photo_url: string | null;
  vicinity: string;
  rating: number;
  estimated_price: number;
}

const BANKS = [
  { id: "sbi", name: "State Bank of India", icon: "🏦" },
  { id: "hdfc", name: "HDFC Bank", icon: "🏛️" },
  { id: "icici", name: "ICICI Bank", icon: "🏢" },
  { id: "axis", name: "Axis Bank", icon: "🏗️" },
  { id: "kotak", name: "Kotak Mahindra Bank", icon: "🏬" },
];

const WALLETS = [
  { id: "paytm", name: "Paytm", icon: "💳", color: "bg-blue-500" },
  { id: "phonepe", name: "PhonePe", icon: "📱", color: "bg-purple-600" },
  { id: "amazonpay", name: "Amazon Pay", icon: "🛒", color: "bg-yellow-500" },
  { id: "gpay", name: "Google Pay", icon: "🅿️", color: "bg-blue-600" },
];

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const placeData = location.state as PaymentState | null;
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [processing, setProcessing] = useState(false);
  
  // Form fields
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  const pageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Redirect if no place data
  useEffect(() => {
    if (!placeData) {
      toast({ title: "No booking data", description: "Please select a place to book first." });
      navigate("/booking");
    }
  }, [placeData, navigate, toast]);

  // GSAP animation
  useEffect(() => {
    gsap.fromTo(pageRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
  }, []);

  // Animate form change
  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(formRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" });
    }
  }, [selectedMethod]);

  if (!placeData) return null;

  const amount = placeData.estimated_price || 100;

  const handlePayment = async () => {
    // Validate based on method
    if (selectedMethod === "upi" && !upiId.includes("@")) {
      toast({ title: "Invalid UPI ID", description: "Please enter a valid UPI ID (e.g., name@upi)" });
      return;
    }
    if (selectedMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length !== 16) {
        toast({ title: "Invalid card number", description: "Please enter a valid 16-digit card number" });
        return;
      }
      if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
        toast({ title: "Invalid expiry", description: "Please enter expiry as MM/YY" });
        return;
      }
      if (cardCvv.length < 3) {
        toast({ title: "Invalid CVV", description: "Please enter a valid CVV" });
        return;
      }
    }
    if (selectedMethod === "netbanking" && !selectedBank) {
      toast({ title: "Select a bank", description: "Please select your bank" });
      return;
    }
    if (selectedMethod === "wallet" && !selectedWallet) {
      toast({ title: "Select a wallet", description: "Please select a wallet" });
      return;
    }

    setProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Navigate to success
    navigate("/payment-success", {
      state: {
        ...placeData,
        amount,
        paymentMethod: selectedMethod,
        bookingId: `MINI${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: typeof CreditCard; desc: string }[] = [
    { id: "upi", label: "UPI", icon: Smartphone, desc: "Pay using any UPI app" },
    { id: "qr", label: "QR Code", icon: QrCode, desc: "Scan to pay" },
    { id: "card", label: "Card", icon: CreditCard, desc: "Debit or Credit Card" },
    { id: "netbanking", label: "Net Banking", icon: Building2, desc: "All major banks" },
    { id: "wallet", label: "Wallets", icon: Wallet, desc: "Paytm, PhonePe, etc." },
  ];

  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-gradient-hero px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/booking"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">Secure Payment</h1>
          <div className="ml-auto flex items-center gap-1.5 bg-green-500/20 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-semibold text-green-400">SSL Secured</span>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-4">
        {/* Booking Summary Card */}
        <div className="travel-card mb-6">
          <div className="flex gap-4">
            {/* Photo */}
            <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
              {placeData.photo_url ? (
                <img src={placeData.photo_url} alt={placeData.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">🎯</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold line-clamp-1">{placeData.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {placeData.vicinity}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span className="font-medium">{placeData.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {placeData.category}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-primary">₹{amount}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <h2 className="font-semibold mb-3">Select Payment Method</h2>
        <div className="grid grid-cols-5 gap-2 mb-6">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                selectedMethod === method.id
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <method.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{method.label}</span>
            </button>
          ))}
        </div>

        {/* Payment Form */}
        <div ref={formRef} className="travel-card">
          {/* UPI Form */}
          {selectedMethod === "upi" && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Pay with UPI
              </h3>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your UPI ID and click pay. You'll receive a payment request on your UPI app.
              </p>
            </div>
          )}

          {/* QR Code */}
          {selectedMethod === "qr" && (
            <div className="text-center space-y-4">
              <h3 className="font-semibold flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Scan QR to Pay
              </h3>
              {/* Fake QR Code */}
              <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-2 grid grid-cols-8 gap-0.5">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-full h-full ${Math.random() > 0.5 ? "bg-white" : "bg-transparent"}`}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-xl">₹</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-primary">₹{amount}</p>
              <p className="text-xs text-muted-foreground">
                Scan with any UPI app: GPay, PhonePe, Paytm, etc.
              </p>
            </div>
          )}

          {/* Card Form */}
          {selectedMethod === "card" && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Card Details
              </h3>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                      setCardExpiry(v);
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">CVV</label>
                  <input
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Cardholder Name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NAME ON CARD"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                />
              </div>
            </div>
          )}

          {/* Net Banking */}
          {selectedMethod === "netbanking" && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Select Your Bank
              </h3>
              <div className="space-y-2">
                {BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                      selectedBank === bank.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary border-2 border-transparent"
                    }`}
                  >
                    <span className="text-2xl">{bank.icon}</span>
                    <span className="font-medium flex-1 text-left">{bank.name}</span>
                    {selectedBank === bank.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wallets */}
          {selectedMethod === "wallet" && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Select Wallet
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {WALLETS.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                      selectedWallet === wallet.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary border-2 border-transparent"
                    }`}
                  >
                    <div className={`w-10 h-10 ${wallet.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                      {wallet.icon}
                    </div>
                    <span className="font-medium text-sm">{wallet.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full mt-6 btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Pay ₹{amount}
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 mt-6 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5" />
            256-bit SSL
          </div>
          <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PCI DSS Compliant
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
