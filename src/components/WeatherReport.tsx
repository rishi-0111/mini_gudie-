import { useEffect, useRef, useState } from "react";
import { X, MapPin, Droplets, Wind, Eye, Gauge, Sunrise, Sunset, Thermometer, Cloud, Loader2, Navigation } from "lucide-react";
import gsap from "gsap";
import { useToast } from "@/hooks/use-toast";

interface WeatherData {
  location: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  description: string;
  icon: string;
  sunrise: string;
  sunset: string;
  hourly: { time: string; temp: number; humidity: number }[];
}

interface WeatherReportProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

const WEATHER_API_KEY = "7CHFVXU4854MDT8TLSY66YCJY";

const WeatherReport = ({ isOpen, onClose, userLocation }: WeatherReportProps) => {
  const { toast } = useToast();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tempGraphRef = useRef<HTMLDivElement>(null);
  const humidityGraphRef = useRef<HTMLDivElement>(null);

  // Fetch weather data
  const fetchWeather = async (lat: number, lng: number, locationName?: string) => {
    setLoading(true);
    try {
      // Visual Crossing Weather API
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lng}?unitGroup=metric&key=${WEATHER_API_KEY}&contentType=json&include=hours,current`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch weather");
      
      const data = await response.json();
      const current = data.currentConditions;
      const today = data.days[0];

      // Extract hourly data for next 12 hours
      const hourlyData = today.hours.slice(new Date().getHours(), new Date().getHours() + 12).map((hour: any) => ({
        time: hour.datetime.slice(0, 5),
        temp: Math.round(hour.temp),
        humidity: hour.humidity,
      }));

      setWeatherData({
        location: locationName || data.resolvedAddress.split(",")[0],
        temp: Math.round(current.temp),
        feelsLike: Math.round(current.feelslike),
        humidity: current.humidity,
        windSpeed: Math.round(current.windspeed),
        visibility: Math.round(current.visibility),
        pressure: Math.round(current.pressure),
        description: current.conditions,
        icon: current.icon,
        sunrise: today.sunrise,
        sunset: today.sunset,
        hourly: hourlyData,
      });
    } catch (error: any) {
      toast({
        title: "Weather Fetch Failed",
        description: error.message || "Could not retrieve weather data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load weather when modal opens
  useEffect(() => {
    if (isOpen && !useCustomLocation && userLocation) {
      fetchWeather(userLocation.lat, userLocation.lng);
    }
  }, [isOpen, userLocation, useCustomLocation]);

  // Search location using Nominatim
  const handleLocationSearch = async () => {
    if (!locationInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setUseCustomLocation(true);
        await fetchWeather(parseFloat(lat), parseFloat(lon), display_name.split(",")[0]);
      } else {
        toast({ title: "Location not found", description: "Try a different search term." });
      }
    } catch {
      toast({ title: "Search failed", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // GSAP Animations
  useEffect(() => {
    if (isOpen && modalRef.current && contentRef.current) {
      // Modal entrance
      gsap.fromTo(
        modalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      gsap.fromTo(
        contentRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" }
      );
    }
  }, [isOpen]);

  // Animate graphs when data loads
  useEffect(() => {
    if (weatherData && tempGraphRef.current && humidityGraphRef.current) {
      const tempBars = tempGraphRef.current.querySelectorAll(".temp-bar");
      const humidityBars = humidityGraphRef.current.querySelectorAll(".humidity-bar");

      gsap.fromTo(
        tempBars,
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.5)", stagger: 0.05 }
      );

      gsap.fromTo(
        humidityBars,
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.5)", stagger: 0.05, delay: 0.2 }
      );

      // Pulse weather cards
      const cards = contentRef.current?.querySelectorAll(".weather-card");
      gsap.fromTo(
        cards,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out", stagger: 0.08 }
      );
    }
  }, [weatherData]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-hero text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Cloud className="w-6 h-6" />
              Weather Report
            </h2>
            <p className="text-sm text-primary-foreground/80 mt-1">
              {weatherData?.location || "Loading..."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Location Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
              placeholder="Search location (city, country)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleLocationSearch}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              Search
            </button>
          </div>

          {loading && !weatherData && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {weatherData && (
            <>
              {/* Current Weather */}
              <div className="weather-card travel-card text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Thermometer className="w-8 h-8 text-primary" />
                  <div className="text-6xl font-bold">{weatherData.temp}°</div>
                </div>
                <p className="text-xl font-medium text-muted-foreground">{weatherData.description}</p>
                <p className="text-sm text-muted-foreground mt-1">Feels like {weatherData.feelsLike}°</p>
              </div>

              {/* Weather Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="weather-card travel-card flex items-center gap-3">
                  <Droplets className="w-6 h-6 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{weatherData.humidity}%</p>
                    <p className="text-xs text-muted-foreground">Humidity</p>
                  </div>
                </div>

                <div className="weather-card travel-card flex items-center gap-3">
                  <Wind className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{weatherData.windSpeed} km/h</p>
                    <p className="text-xs text-muted-foreground">Wind Speed</p>
                  </div>
                </div>

                <div className="weather-card travel-card flex items-center gap-3">
                  <Eye className="w-6 h-6 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{weatherData.visibility} km</p>
                    <p className="text-xs text-muted-foreground">Visibility</p>
                  </div>
                </div>

                <div className="weather-card travel-card flex items-center gap-3">
                  <Gauge className="w-6 h-6 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{weatherData.pressure} mb</p>
                    <p className="text-xs text-muted-foreground">Pressure</p>
                  </div>
                </div>
              </div>

              {/* Sun Times */}
              <div className="weather-card travel-card flex items-center justify-around">
                <div className="flex items-center gap-2">
                  <Sunrise className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sunrise</p>
                    <p className="font-semibold">{weatherData.sunrise}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sunset</p>
                    <p className="font-semibold">{weatherData.sunset}</p>
                  </div>
                </div>
              </div>

              {/* Temperature Graph */}
              <div className="weather-card travel-card">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-primary" />
                  Temperature (Next 12 Hours)
                </h3>
                <div ref={tempGraphRef} className="flex items-end justify-between gap-1 h-32">
                  {weatherData.hourly.map((hour, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-primary">{hour.temp}°</span>
                      <div
                        className="temp-bar w-full bg-gradient-to-t from-orange-500 to-yellow-500 rounded-t"
                        style={{ height: `${(hour.temp / Math.max(...weatherData.hourly.map((h) => h.temp))) * 100}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{hour.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Humidity Graph */}
              <div className="weather-card travel-card">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  Humidity (Next 12 Hours)
                </h3>
                <div ref={humidityGraphRef} className="flex items-end justify-between gap-1 h-32">
                  {weatherData.hourly.map((hour, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-blue-600">{hour.humidity}%</span>
                      <div
                        className="humidity-bar w-full bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t"
                        style={{ height: `${hour.humidity}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{hour.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherReport;
