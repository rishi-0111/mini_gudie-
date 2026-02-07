import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  User,
  Bell,
  Phone,
  Building2,
  Stethoscope,
  Siren,
  Mountain,
  Car,
  Hotel,
  Mic,
  Navigation,
  Map,
  Calendar,
  Compass,
  ShoppingBag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CategoryCard from "@/components/CategoryCard";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage } from "@/contexts/LanguageContext";

const Home = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(t.goodMorning);
    } else if (hour < 17) {
      setGreeting(t.goodAfternoon);
    } else {
      setGreeting(t.goodEvening);
    }
  }, [t]);

  const handleLocationToggle = () => {
    setLocationEnabled(!locationEnabled);
    toast({
      title: locationEnabled ? t.locationOff : t.liveLocation,
      description: locationEnabled
        ? t.locationOff
        : t.sharingLocation,
    });
  };

  const handleVoiceAssistant = () => {
    setIsVoiceActive(!isVoiceActive);
    toast({
      title: isVoiceActive ? t.voiceAssistant : t.voiceAssistant,
      description: isVoiceActive
        ? t.cancel
        : t.listeningCommands,
    });
  };

  const categories = [
    { icon: Building2, label: t.temples, color: "bg-orange-100 text-orange-600" },
    { icon: Stethoscope, label: t.hospitals, color: "bg-red-100 text-red-600" },
    { icon: Siren, label: t.emergency, color: "bg-rose-100 text-rose-600" },
    { icon: Mountain, label: t.hiddenSpots, color: "bg-emerald-100 text-emerald-600" },
    { icon: Car, label: t.transport, color: "bg-blue-100 text-blue-600" },
    { icon: Hotel, label: t.hostels, color: "bg-purple-100 text-purple-600" },
  ];

  const quickActions = [
    { icon: Map, label: t.exploreMap, href: "/explore" },
    { icon: Calendar, label: t.planTrip, href: "/trip-planner" },
    { icon: ShoppingBag, label: t.booking, href: "/booking" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero px-6 pt-8 pb-20 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-6">
          <Link to="/profile" className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary-foreground" />
          </Link>
          <button className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center relative">
            <Bell className="w-6 h-6 text-primary-foreground" />
            <span className="absolute top-2 right-2 w-3 h-3 bg-accent rounded-full" />
          </button>
        </div>

        <div className="animate-fade-in-down">
          <h1 className="text-2xl font-bold text-primary-foreground">
            {greeting}, {t.traveler}! 🌍
          </h1>
          <p className="text-primary-foreground/80 mt-1">
            {t.whereExplore}
          </p>
        </div>

        {/* Location Toggle */}
        <div className="mt-6 flex items-center justify-between bg-primary-foreground/10 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${locationEnabled ? 'bg-success' : 'bg-primary-foreground/20'}`}>
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground font-medium">{t.liveLocation}</p>
              <p className="text-primary-foreground/70 text-sm">
                {locationEnabled ? t.sharingLocation : t.locationOff}
              </p>
            </div>
          </div>
          <button
            onClick={handleLocationToggle}
            className={`w-14 h-8 rounded-full transition-all duration-300 ${
              locationEnabled ? "bg-success" : "bg-primary-foreground/30"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-primary-foreground transition-transform duration-300 ${
                locationEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <Link
              key={action.label}
              to={action.href}
              className={`travel-card flex flex-col items-center py-4 animate-fade-in-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-2">
                <action.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t.exploreCategories}</h2>
            <button className="text-sm text-primary font-medium">{t.viewAll}</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <CategoryCard
                key={category.label}
                icon={category.icon}
                label={category.label}
                colorClass={category.color}
                delay={index * 100}
              />
            ))}
          </div>
        </div>

        {/* Voice Assistant FAB */}
        <button
          onClick={handleVoiceAssistant}
          className={`fixed left-6 bottom-28 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isVoiceActive
              ? "bg-accent scale-110 shadow-sos"
              : "bg-gradient-primary shadow-glow"
          }`}
        >
          <Mic className={`w-6 h-6 text-primary-foreground ${isVoiceActive ? "animate-pulse" : ""}`} />
        </button>
      </div>

      {/* Floating SOS Button - Bottom Right */}
      <FloatingSOS />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Home;
