import {
  ArrowLeft,
  MapPin,
  Calendar,
  Wallet,
  Star,
  Utensils,
  Building,
  Sparkles,
  Clock,
  Map as MapIcon,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TripPlan {
  tripOverview: {
    from: string;
    to: string;
    days: number;
    transportMode: string;
    totalBudget: number;
  };
  dayWisePlan: Array<{
    day: number;
    morning: { place: string; description: string; time: string; cost: number };
    afternoon: { place: string; description: string; time: string; cost: number };
    evening: { place: string; description: string; time: string; cost: number };
    travelDistance: number;
    dayCost: number;
  }>;
  hiddenSpots: Array<{
    name: string;
    whySpecial: string;
    bestTime: string;
    distance: number;
  }>;
  stayRecommendations: Array<{
    name: string;
    distance: number;
    rating: number;
    pricePerNight: number;
  }>;
  foodSpots: Array<{
    name: string;
    specialty: string;
    budgetPerMeal: number;
  }>;
  budgetBreakdown: {
    stay: number;
    food: number;
    transport: number;
    activities: number;
    buffer: number;
    total: number;
  };
}

interface TripItineraryProps {
  plan: TripPlan;
  onEdit: () => void;
}

const TripItinerary = ({ plan, onEdit }: TripItineraryProps) => {
  const { t } = useLanguage();

  const getTimeColor = (time: string) => {
    if (time.includes("Morning") || parseInt(time) < 12) return "bg-amber-100 text-amber-700";
    if (time.includes("Afternoon") || parseInt(time) < 17) return "bg-blue-100 text-blue-700";
    return "bg-purple-100 text-purple-700";
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Button */}
      <button
        onClick={onEdit}
        className="flex items-center gap-2 text-primary font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.edit}
      </button>

      {/* Trip Overview Card */}
      <div className="travel-card bg-gradient-hero text-primary-foreground">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{plan.tripOverview.to}</h2>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {plan.tripOverview.from}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {plan.tripOverview.days} {t.days}
              </span>
            </div>
            <div className="text-2xl font-bold">
              ₹{plan.tripOverview.totalBudget.toLocaleString()}
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Day-wise Plan */}
      {plan.dayWisePlan.map((day) => (
        <div key={day.day} className="travel-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary">
              {t.day} {day.day}
            </h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{day.travelDistance} km</span>
              <span className="font-semibold text-primary">₹{day.dayCost}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Morning */}
            <div className="flex gap-3">
              <div className={`w-16 h-16 rounded-xl ${getTimeColor("Morning")} flex flex-col items-center justify-center`}>
                <span className="text-xs font-medium">Morning</span>
                <Clock className="w-4 h-4 mt-1" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{day.morning.place}</p>
                <p className="text-sm text-muted-foreground">{day.morning.description}</p>
                <p className="text-xs text-primary mt-1">₹{day.morning.cost}</p>
              </div>
            </div>

            {/* Afternoon */}
            <div className="flex gap-3">
              <div className={`w-16 h-16 rounded-xl ${getTimeColor("Afternoon")} flex flex-col items-center justify-center`}>
                <span className="text-xs font-medium">Afternoon</span>
                <Clock className="w-4 h-4 mt-1" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{day.afternoon.place}</p>
                <p className="text-sm text-muted-foreground">{day.afternoon.description}</p>
                <p className="text-xs text-primary mt-1">₹{day.afternoon.cost}</p>
              </div>
            </div>

            {/* Evening */}
            <div className="flex gap-3">
              <div className={`w-16 h-16 rounded-xl ${getTimeColor("Evening")} flex flex-col items-center justify-center`}>
                <span className="text-xs font-medium">Evening</span>
                <Clock className="w-4 h-4 mt-1" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{day.evening.place}</p>
                <p className="text-sm text-muted-foreground">{day.evening.description}</p>
                <p className="text-xs text-primary mt-1">₹{day.evening.cost}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Hidden Spots */}
      {plan.hiddenSpots && plan.hiddenSpots.length > 0 && (
        <div className="travel-card">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {t.hiddenSpots}
          </h3>
          <div className="space-y-3">
            {plan.hiddenSpots.map((spot, index) => (
              <div key={index} className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                <p className="font-semibold">{spot.name}</p>
                <p className="text-sm text-muted-foreground">{spot.whySpecial}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>🕐 {spot.bestTime}</span>
                  <span>📍 {spot.distance} km</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stay Recommendations */}
      {plan.stayRecommendations && plan.stayRecommendations.length > 0 && (
        <div className="travel-card">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <Building className="w-5 h-5" />
            {t.stays}
          </h3>
          <div className="space-y-3">
            {plan.stayRecommendations.map((stay, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div>
                  <p className="font-semibold">{stay.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-accent text-accent" />
                      {stay.rating}
                    </span>
                    <span>• {stay.distance} km</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{stay.pricePerNight}</p>
                  <p className="text-xs text-muted-foreground">/night</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food Spots */}
      {plan.foodSpots && plan.foodSpots.length > 0 && (
        <div className="travel-card">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            {t.food}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {plan.foodSpots.map((food, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-accent/10">
                <div>
                  <p className="font-semibold">{food.name}</p>
                  <p className="text-sm text-muted-foreground">{food.specialty}</p>
                </div>
                <span className="font-bold text-primary">₹{food.budgetPerMeal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Breakdown */}
      <div className="travel-card">
        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          {t.budgetBreakdown}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.stays}</span>
            <span className="font-medium">₹{plan.budgetBreakdown.stay.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.food}</span>
            <span className="font-medium">₹{plan.budgetBreakdown.food.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.transport}</span>
            <span className="font-medium">₹{plan.budgetBreakdown.transport.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.activities}</span>
            <span className="font-medium">₹{plan.budgetBreakdown.activities.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.buffer}</span>
            <span className="font-medium">₹{plan.budgetBreakdown.buffer.toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-bold text-primary">{t.total}</span>
            <span className="font-bold text-primary text-lg">
              ₹{plan.budgetBreakdown.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* View on Map Button */}
      <button className="btn-primary w-full flex items-center justify-center gap-2">
        <MapIcon className="w-5 h-5" />
        {t.viewOnMap}
      </button>
    </div>
  );
};

export default TripItinerary;
