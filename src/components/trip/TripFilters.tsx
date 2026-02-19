import { useState, useEffect, useRef } from "react";
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
  ArrowLeftRight,
  Clock,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import CityAutocomplete from "@/components/smart-trip/CityAutocomplete";

export interface TripFilterValues {
  from: string;
  fromLat?: number;
  fromLon?: number;
  destination: string;
  destLat?: number;
  destLon?: number;
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
  const [routeInfo, setRouteInfo] = useState<{ km: number; mins: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localBudget[0] !== values.budgetMin || localBudget[1] !== values.budgetMax) {
        onChange({ ...values, budgetMin: localBudget[0], budgetMax: localBudget[1] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localBudget]);

  // OSRM distance lookup when both cities selected
  useEffect(() => {
    const { fromLat, fromLon, destLat, destLon } = values;
    if (!fromLat || !fromLon || !destLat || !destLon) {
      setRouteInfo(null);
      return;
    }

    // Cancel pending
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setRouteLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${destLon},${destLat}?overview=false`;
        const res = await fetch(url, { signal: abortRef.current!.signal });
        const data = await res.json();
        if (data.code === "Ok" && data.routes?.[0]) {
          const km = data.routes[0].distance / 1000;
          const mins = data.routes[0].duration / 60;
          setRouteInfo({ km, mins });
        }
      } catch (e: any) {
        if (e.name !== "AbortError") setRouteInfo(null);
      } finally {
        setRouteLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [values.fromLat, values.fromLon, values.destLat, values.destLon]);

  const handleChange = (key: keyof TripFilterValues, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleSwap = () => {
    onChange({
      ...values,
      from: values.destination,
      fromLat: values.destLat,
      fromLon: values.destLon,
      destination: values.from,
      destLat: values.fromLat,
      destLon: values.fromLon,
    });
  };

  const formatDuration = (mins: number) => {
    const m = Math.round(mins);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };

  return (
    <div className="travel-card animate-fade-in-up space-y-6">
      {/* Location Inputs — OSM Autocomplete */}
      <div className="space-y-3">
        {/* Current Location Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary">
          <div className="flex items-center gap-3">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{t.liveLocation}</span>
          </div>
          <Switch
            checked={values.useCurrentLocation}
            onCheckedChange={(checked) => handleChange("useCurrentLocation", checked)}
          />
        </div>

        {/* From / To with Swap */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
          {values.useCurrentLocation ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Navigation className="w-3 h-3" /> From
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground">
                <Navigation className="w-3.5 h-3.5 text-primary animate-pulse" />
                Current Location
              </div>
            </div>
          ) : (
            <CityAutocomplete
              value={values.from}
              onChange={(city) =>
                onChange({
                  ...values,
                  from: city?.name || "",
                  fromLat: city?.lat,
                  fromLon: city?.lon,
                })
              }
              placeholder="From city..."
              icon={<Navigation className="w-3 h-3" />}
              label="From"
            />
          )}

          <button
            onClick={handleSwap}
            disabled={values.useCurrentLocation}
            className="mb-0.5 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-40 shrink-0"
            title="Swap locations"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          <CityAutocomplete
            value={values.destination}
            onChange={(city) =>
              onChange({
                ...values,
                destination: city?.name || "",
                destLat: city?.lat,
                destLon: city?.lon,
              })
            }
            placeholder="To city..."
            icon={<MapPin className="w-3 h-3" />}
            label="To"
          />
        </div>

        {/* Live OSRM Distance Information */}
        {routeLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            Calculating road distance...
          </div>
        )}
        {routeInfo && !routeLoading && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-xs">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-semibold text-primary">{Math.round(routeInfo.km)} km by road</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{formatDuration(routeInfo.mins)} drive
            </span>
          </div>
        )}
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
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${values.transportMode === mode.id
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

