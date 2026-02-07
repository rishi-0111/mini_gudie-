import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  Filter,
  Map as MapIcon,
  List,
  Navigation,
  Clock,
  Sparkles,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import InteractiveMap from "@/components/InteractiveMap";
import { useLanguage } from "@/contexts/LanguageContext";

interface Place {
  id: string;
  name: string;
  type: string;
  rating: number;
  distance: string;
  image: string;
  isHiddenGem: boolean;
  lat: number;
  lng: number;
}

const Explore = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filters = [
    { id: "all", label: t.viewAll },
    { id: "hidden", label: t.hiddenSpots },
    { id: "temples", label: t.temples },
    { id: "food", label: "Food" },
    { id: "nature", label: "Nature" },
  ];

  const places: Place[] = [
    {
      id: "1",
      name: "Secret Garden Cafe",
      type: "Cafe",
      rating: 4.8,
      distance: "2.5 km",
      image: "🌿",
      isHiddenGem: true,
      lat: 28.6139,
      lng: 77.2090,
    },
    {
      id: "2",
      name: "Ancient Sun Temple",
      type: "Temple",
      rating: 4.9,
      distance: "5.2 km",
      image: "🛕",
      isHiddenGem: false,
      lat: 28.6280,
      lng: 77.2197,
    },
    {
      id: "3",
      name: "Hidden Valley Viewpoint",
      type: "Nature",
      rating: 4.7,
      distance: "8.1 km",
      image: "🏔️",
      isHiddenGem: true,
      lat: 28.6500,
      lng: 77.2300,
    },
    {
      id: "4",
      name: "Local Street Food Market",
      type: "Food",
      rating: 4.6,
      distance: "1.2 km",
      image: "🍜",
      isHiddenGem: true,
      lat: 28.6350,
      lng: 77.2150,
    },
    {
      id: "5",
      name: "Riverside Meditation Center",
      type: "Wellness",
      rating: 4.9,
      distance: "6.8 km",
      image: "🧘",
      isHiddenGem: false,
      lat: 28.6400,
      lng: 77.2400,
    },
    {
      id: "6",
      name: "Underground Art Gallery",
      type: "Culture",
      rating: 4.5,
      distance: "3.4 km",
      image: "🎨",
      isHiddenGem: true,
      lat: 28.6200,
      lng: 77.2250,
    },
  ];

  const filteredPlaces = places.filter((place) => {
    if (selectedFilter === "hidden") return place.isHiddenGem;
    if (selectedFilter === "all") return true;
    return place.type.toLowerCase().includes(selectedFilter);
  });

  const mapMarkers = filteredPlaces.map((place) => ({
    id: place.id,
    lat: place.lat,
    lng: place.lng,
    title: place.name,
    type: place.type.toLowerCase(),
    rating: place.rating,
  }));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">{t.explore}</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaces}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
          />
        </div>
      </div>

      <div className="px-6 pt-4">
        {/* Filter Pills & View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-lg ${viewMode === "map" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              <MapIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="space-y-4">
            {filteredPlaces.map((place, index) => (
              <div
                key={place.id}
                className="travel-card flex gap-4 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms`, opacity: 0, animationFillMode: "forwards" }}
              >
                {/* Place Image/Emoji */}
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-4xl">
                  {place.image}
                </div>

                {/* Place Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{place.name}</h3>
                        {place.isHiddenGem && (
                          <span className="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{place.type}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="font-medium">{place.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-4 h-4" />
                      {place.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Open now
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="travel-card h-[500px] overflow-hidden">
            <InteractiveMap
              markers={mapMarkers}
              center={[28.6139, 77.2090]}
              zoom={13}
            />
          </div>
        )}
      </div>

      {/* Floating SOS Button */}
      <FloatingSOS />

      <BottomNav />
    </div>
  );
};

export default Explore;
