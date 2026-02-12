import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  Car,
  Hotel,
  Landmark,
  List,
  Map as MapIcon,
  ChevronDown,
  Sparkles,
  Wifi,
  Coffee,
  Shield,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import InteractiveMap from "@/components/InteractiveMap";
import { useLanguage } from "@/contexts/LanguageContext";

gsap.registerPlugin(ScrollTrigger);

type Category = "all" | "transport" | "hostel" | "attraction";
type SortOption = "bestMatch" | "cheapest" | "safest" | "nearest";

interface BookingItem {
  id: string;
  name: string;
  category: Category;
  type: string;
  price: string;
  priceValue: number;
  rating: number;
  distance: string;
  distanceValue: number;
  safetyScore: number;
  image: string;
  lat: number;
  lng: number;
  amenities?: string[];
  available: boolean;
  isHiddenGem?: boolean;
}

const Booking = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [sortBy, setSortBy] = useState<SortOption>("bestMatch");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minRating, setMinRating] = useState(0);

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const itemsListRef = useRef<HTMLDivElement>(null);

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // Animate items on filter change with scrub scroll timeline
  useEffect(() => {
    if (viewMode === "list" && itemsListRef.current) {
      const itemsTl = gsap.timeline({
        scrollTrigger: {
          scrub: 1,
          trigger: itemsListRef.current,
          start: "top 90%",
          end: "bottom 30%",
        },
      });
      itemsTl.fromTo(
        itemsListRef.current.children,
        { y: 25, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.07, ease: "power2.out" }
      );

      return () => {
        itemsTl.scrollTrigger?.kill();
        itemsTl.kill();
      };
    }
  }, [viewMode, selectedCategory, sortBy]);

  const categories: { id: Category; label: string; icon: typeof Car }[] = [
    { id: "all", label: t.viewAll, icon: Filter },
    { id: "transport", label: t.transport, icon: Car },
    { id: "hostel", label: t.hostels, icon: Hotel },
    { id: "attraction", label: t.attractions, icon: Landmark },
  ];

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: "bestMatch", label: t.bestMatch },
    { id: "cheapest", label: t.cheapest },
    { id: "safest", label: t.safest },
    { id: "nearest", label: t.nearestFirst },
  ];

  const bookingItems: BookingItem[] = [
    {
      id: "1",
      name: "Express Bus to Jaipur",
      category: "transport",
      type: "Bus",
      price: "₹450",
      priceValue: 450,
      rating: 4.5,
      distance: "280 km",
      distanceValue: 280,
      safetyScore: 92,
      image: "🚌",
      lat: 26.9124,
      lng: 75.7873,
      amenities: ["AC", "WiFi", "Reclining Seats"],
      available: true,
    },
    {
      id: "2",
      name: "Rajdhani Express",
      category: "transport",
      type: "Train",
      price: "₹1,200",
      priceValue: 1200,
      rating: 4.8,
      distance: "312 km",
      distanceValue: 312,
      safetyScore: 98,
      image: "🚂",
      lat: 28.6139,
      lng: 77.209,
      amenities: ["AC", "Meals", "Berth"],
      available: true,
    },
    {
      id: "3",
      name: "Zostel Delhi",
      category: "hostel",
      type: "Backpacker Hostel",
      price: "₹599/night",
      priceValue: 599,
      rating: 4.6,
      distance: "2.5 km",
      distanceValue: 2.5,
      safetyScore: 95,
      image: "🏨",
      lat: 28.6328,
      lng: 77.2197,
      amenities: ["WiFi", "Breakfast", "Locker"],
      available: true,
    },
    {
      id: "4",
      name: "Moustache Hostel Agra",
      category: "hostel",
      type: "Heritage Hostel",
      price: "₹750/night",
      priceValue: 750,
      rating: 4.7,
      distance: "185 km",
      distanceValue: 185,
      safetyScore: 94,
      image: "🛏️",
      lat: 27.1767,
      lng: 78.0081,
      amenities: ["WiFi", "Rooftop", "Tours"],
      available: true,
      isHiddenGem: true,
    },
    {
      id: "5",
      name: "Taj Mahal Visit",
      category: "attraction",
      type: "Monument",
      price: "₹50",
      priceValue: 50,
      rating: 4.9,
      distance: "185 km",
      distanceValue: 185,
      safetyScore: 97,
      image: "🕌",
      lat: 27.1751,
      lng: 78.0421,
      available: true,
    },
    {
      id: "6",
      name: "Hidden Fort Trek",
      category: "attraction",
      type: "Adventure",
      price: "₹1,500",
      priceValue: 1500,
      rating: 4.4,
      distance: "45 km",
      distanceValue: 45,
      safetyScore: 85,
      image: "🏰",
      lat: 28.4817,
      lng: 77.1896,
      available: true,
      isHiddenGem: true,
    },
    {
      id: "7",
      name: "Ola Outstation",
      category: "transport",
      type: "Cab",
      price: "₹2,500",
      priceValue: 2500,
      rating: 4.3,
      distance: "On Demand",
      distanceValue: 0,
      safetyScore: 90,
      image: "🚕",
      lat: 28.5355,
      lng: 77.391,
      amenities: ["AC", "GPS Tracked", "24/7"],
      available: true,
    },
    {
      id: "8",
      name: "Local Food Walking Tour",
      category: "attraction",
      type: "Food Tour",
      price: "₹800",
      priceValue: 800,
      rating: 4.8,
      distance: "3.2 km",
      distanceValue: 3.2,
      safetyScore: 96,
      image: "🍜",
      lat: 28.6562,
      lng: 77.2341,
      available: true,
      isHiddenGem: true,
    },
  ];

  const filteredAndSortedItems = useMemo(() => {
    let items = bookingItems.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Price filter
      if (item.priceValue < priceRange[0] || item.priceValue > priceRange[1]) return false;
      
      // Rating filter
      if (item.rating < minRating) return false;
      
      return true;
    });

    // Sort
    switch (sortBy) {
      case "cheapest":
        items.sort((a, b) => a.priceValue - b.priceValue);
        break;
      case "safest":
        items.sort((a, b) => b.safetyScore - a.safetyScore);
        break;
      case "nearest":
        items.sort((a, b) => a.distanceValue - b.distanceValue);
        break;
      default:
        // Best match - combination of rating and safety
        items.sort((a, b) => (b.rating * b.safetyScore) - (a.rating * a.safetyScore));
    }

    return items;
  }, [bookingItems, selectedCategory, searchQuery, sortBy, priceRange, minRating]);

  const mapMarkers = filteredAndSortedItems.map((item) => ({
    id: item.id,
    lat: item.lat,
    lng: item.lng,
    title: item.name,
    type: item.category,
    price: item.price,
    rating: item.rating,
  }));

  const getAmenityIcon = (amenity: string) => {
    if (amenity.toLowerCase().includes("wifi")) return <Wifi className="w-3 h-3" />;
    if (amenity.toLowerCase().includes("breakfast") || amenity.toLowerCase().includes("meals")) return <Coffee className="w-3 h-3" />;
    return null;
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div ref={heroRef} className="bg-gradient-hero px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">{t.booking}</h1>
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
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.label}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground"
          >
            <Filter className="w-4 h-4" />
            {t.filter}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "map" ? "bg-primary text-primary-foreground" : ""}`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="travel-card mb-4 animate-fade-in">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t.priceRange}: ₹{priceRange[0]} - ₹{priceRange[1]}</label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t.rating}: {minRating}+ ⭐</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {viewMode === "list" ? (
          <div ref={itemsListRef} className="space-y-4">
            {filteredAndSortedItems.map((item) => (
              <div
                key={item.id}
                className="travel-card flex gap-4"
              >
                {/* Item Image/Emoji */}
                <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-4xl shrink-0">
                  {item.image}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{item.name}</h3>
                        {item.isHiddenGem && (
                          <span className="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full shrink-0">
                            <Sparkles className="w-3 h-3" />
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-medium">{item.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-success">
                        <Shield className="w-3 h-3" />
                        {item.safetyScore}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {item.distance}
                    </span>
                    {item.available && (
                      <span className="flex items-center gap-1 text-success">
                        <Clock className="w-4 h-4" />
                        {t.available}
                      </span>
                    )}
                  </div>

                  {/* Amenities */}
                  {item.amenities && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {item.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded-full">
                          {getAmenityIcon(amenity)}
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-primary">{item.price}</span>
                    <button className="btn-primary py-2 px-4 text-sm">
                      {t.bookNow}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredAndSortedItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found</p>
              </div>
            )}
          </div>
        ) : (
          <div className="travel-card h-[500px] overflow-hidden">
            <InteractiveMap
              markers={mapMarkers}
              center={[28.6139, 77.209]}
              zoom={10}
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

export default Booking;
