import { useState, useEffect } from "react";
import {
  Wallet,
  Calendar,
  Star,
  MapPin,
  Car,
  Train,
  Bus,
  Bike,
  Footprints,
  Sparkles,
  Navigation,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";

export interface TripFilterValues {
  from: string;
  destination: string;
  budgetMin: number;
  budgetMax: number;
  days: number;
  transportMode: string;
  rating: number;
  hiddenSpots: boolean;
  distance: number;
  useCurrentLocation: boolean;
}

interface TripFiltersProps {
  values: TripFilterValues;
  onChange: (values: TripFilterValues) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const transportModes = [
  { id: "walk", icon: Footprints, label: "Walk" },
  { id: "bike", icon: Bike, label: "Bike" },
  { id: "car", icon: Car, label: "Car" },
  { id: "bus", icon: Bus, label: "Bus" },
  { id: "train", icon: Train, label: "Train" },
  { id: "mixed", icon: Navigation, label: "Mixed" },
];

const TripFilters = ({ values, onChange, onGenerate, isGenerating }: TripFiltersProps) => {
  const { t } = useLanguage();
  const [localBudget, setLocalBudget] = useState([values.budgetMin, values.budgetMax]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localBudget[0] !== values.budgetMin || localBudget[1] !== values.budgetMax) {
        onChange({ ...values, budgetMin: localBudget[0], budgetMax: localBudget[1] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localBudget]);

  const handleChange = (key: keyof TripFilterValues, value: any) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="travel-card animate-fade-in-up space-y-6">
      {/* Location Inputs */}
      <div className="space-y-4">
        {/* Current Location Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
          <div className="flex items-center gap-3">
            <Navigation className="w-5 h-5 text-primary" />
            <span className="font-medium">{t.liveLocation}</span>
          </div>
          <Switch
            checked={values.useCurrentLocation}
            onCheckedChange={(checked) => handleChange("useCurrentLocation", checked)}
          />
        </div>

        {/* From Location */}
        {!values.useCurrentLocation && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">{t.fromLocation}</label>
            <div className="relative">
              <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={values.from}
                onChange={(e) => handleChange("from", e.target.value)}
                placeholder={t.fromLocation}
                className="input-travel pl-12"
              />
            </div>
          </div>
        )}

        {/* Destination */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">{t.destination}</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={values.destination}
              onChange={(e) => handleChange("destination", e.target.value)}
              placeholder={t.destination}
              className="input-travel pl-12"
            />
          </div>
        </div>
      </div>

      {/* Budget Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" /> {t.budget}
          </label>
          <span className="text-sm font-semibold text-primary">
            ₹{localBudget[0].toLocaleString()} - ₹{localBudget[1].toLocaleString()}
          </span>
        </div>
        <Slider
          value={localBudget}
          onValueChange={setLocalBudget}
          min={1000}
          max={100000}
          step={500}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₹1,000</span>
          <span>₹1,00,000</span>
        </div>
      </div>

      {/* Number of Days */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> {t.days}
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleChange("days", Math.max(1, values.days - 1))}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            -
          </button>
          <span className="text-2xl font-bold text-primary w-16 text-center">{values.days}</span>
          <button
            onClick={() => handleChange("days", Math.min(15, values.days + 1))}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            +
          </button>
          <span className="text-muted-foreground">{t.days}</span>
        </div>
      </div>

      {/* Transport Mode */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground/80">{t.transportMode}</label>
        <div className="grid grid-cols-3 gap-2">
          {transportModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleChange("transportMode", mode.id)}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                values.transportMode === mode.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-primary/10"
              }`}
            >
              <mode.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> {t.rating}
          </label>
          <span className="text-sm font-semibold text-primary">{values.rating}+ ⭐</span>
        </div>
        <Slider
          value={[values.rating]}
          onValueChange={([val]) => handleChange("rating", val)}
          min={3}
          max={5}
          step={0.5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>3.0 ⭐</span>
          <span>5.0 ⭐</span>
        </div>
      </div>

      {/* Distance Preference */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> {t.distance}
          </label>
          <span className="text-sm font-semibold text-primary">{values.distance} km</span>
        </div>
        <Slider
          value={[values.distance]}
          onValueChange={([val]) => handleChange("distance", val)}
          min={2}
          max={500}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>2 km</span>
          <span>500 km</span>
        </div>
      </div>

      {/* Hidden Spots Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-accent" />
          <div>
            <span className="font-medium">{t.hiddenSpots}</span>
            <p className="text-xs text-muted-foreground">{t.hiddenSpotsDesc}</p>
          </div>
        </div>
        <Switch
          checked={values.hiddenSpots}
          onCheckedChange={(checked) => handleChange("hiddenSpots", checked)}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || !values.destination}
        className="btn-accent w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
            {t.loading}
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            {t.generateItinerary}
          </>
        )}
      </button>
    </div>
  );
};

export default TripFilters;
