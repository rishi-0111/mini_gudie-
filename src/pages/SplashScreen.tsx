import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    // Trigger logo animation
    setTimeout(() => setIsVisible(true), 100);
    // Trigger text animation
    setTimeout(() => setShowText(true), 600);
    // Navigate to signup after splash
    const timer = setTimeout(() => {
      navigate("/signup");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary-foreground/5 animate-float" />
        <div className="absolute bottom-32 right-8 w-24 h-24 rounded-full bg-primary-foreground/5 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 right-20 w-16 h-16 rounded-full bg-primary-foreground/5 animate-float" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Logo */}
      <div 
        className={`relative z-10 transition-all duration-700 ease-out ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary-foreground/20 blur-3xl rounded-full scale-150 animate-pulse-soft" />
          
          {/* Logo image */}
          <img
            src={logo}
            alt="LocalGuide Logo"
            className="w-48 h-48 md:w-56 md:h-56 object-contain relative z-10 drop-shadow-2xl"
          />
        </div>
      </div>

      {/* App Name */}
      <div 
        className={`mt-8 text-center transition-all duration-700 ease-out delay-200 ${
          showText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight">
          Local<span className="text-accent">Guide</span>
        </h1>
        
        {/* Tagline */}
        <p 
          className={`mt-4 text-primary-foreground/80 text-lg md:text-xl max-w-xs mx-auto transition-all duration-700 delay-500 ${
            showText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Your Smart Local Travel Guide & Safety Partner
        </p>
      </div>

      {/* Loading indicator */}
      <div 
        className={`mt-12 flex gap-2 transition-all duration-700 delay-700 ${
          showText ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
};

export default SplashScreen;
