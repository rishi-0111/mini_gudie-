"""
Parse Pan-India Bus Routes (35K routes, 1000+ cities) →
  supabase/seed_bus_routes.sql

Creates per-city bus station entries with:
- Top operators serving that city
- Popular routes (destinations) with distance, duration, bus types
- Route count, avg distance, AC/non-AC split
- Schedule info (departure windows)
"""

import pandas as pd
import json
import os
import random
import re

CSV_PATH = r"C:\Users\hp\.cache\kagglehub\datasets\rohitgds\pan-india-bus-routes-35k-schedules-1000-cities\versions\1\Pan-India_Bus_Routes.csv"
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "seed_bus_routes.sql")

# ── City geocodes for top ~50 bus hubs ────────────────────────────────────
CITY_GEO = {
    "Bangalore":    (12.9716, 77.5946, "Karnataka"),
    "Mumbai":       (19.0760, 72.8777, "Maharashtra"),
    "Ahmedabad":    (23.0225, 72.5714, "Gujarat"),
    "Pune":         (18.5204, 73.8567, "Maharashtra"),
    "Chennai":      (13.0827, 80.2707, "Tamil Nadu"),
    "Hyderabad":    (17.3850, 78.4867, "Telangana"),
    "Surat":        (21.1702, 72.8311, "Gujarat"),
    "Baroda":       (22.3072, 73.1812, "Gujarat"),
    "Hosur":        (12.7409, 77.8253, "Tamil Nadu"),
    "Nagpur":       (21.1458, 79.0882, "Maharashtra"),
    "Udaipur":      (24.5854, 73.7125, "Rajasthan"),
    "Jaipur":       (26.9124, 75.7873, "Rajasthan"),
    "Jodhpur":      (26.2389, 73.0243, "Rajasthan"),
    "Delhi":        (28.6139, 77.2090, "Delhi"),
    "Shirdi":       (19.7661, 74.4761, "Maharashtra"),
    "Indore":       (22.7196, 75.8577, "Madhya Pradesh"),
    "Coimbatore":   (11.0168, 76.9558, "Tamil Nadu"),
    "Rajkot":       (22.3039, 70.8022, "Gujarat"),
    "Salem":        (11.6643, 78.1460, "Tamil Nadu"),
    "Goa":          (15.2993, 74.1240, "Goa"),
    "Kolkata":      (22.5726, 88.3639, "West Bengal"),
    "Lucknow":      (26.8467, 80.9462, "Uttar Pradesh"),
    "Mysore":       (12.2958, 76.6394, "Karnataka"),
    "Mangalore":    (12.9141, 74.8560, "Karnataka"),
    "Madurai":      (9.9252,  78.1198, "Tamil Nadu"),
    "Trivandrum":   (8.5241,  76.9366, "Kerala"),
    "Kochi":        (9.9312,  76.2673, "Kerala"),
    "Bhopal":       (23.2599, 77.4126, "Madhya Pradesh"),
    "Visakhapatnam":(17.6868, 83.2185, "Andhra Pradesh"),
    "Varanasi":     (25.3176, 82.9739, "Uttar Pradesh"),
    "Tirupati":     (13.6288, 79.4192, "Andhra Pradesh"),
    "Chandigarh":   (30.7333, 76.7794, "Chandigarh"),
    "Amritsar":     (31.6340, 74.8723, "Punjab"),
    "Pondicherry":  (11.9416, 79.8083, "Puducherry"),
    "Vijayawada":   (16.5062, 80.6480, "Andhra Pradesh"),
    "Agra":         (27.1767, 78.0081, "Uttar Pradesh"),
    "Allahabad":    (25.4358, 81.8463, "Uttar Pradesh"),
    "Dehradun":     (30.3165, 78.0322, "Uttarakhand"),
    "Rishikesh":    (30.0869, 78.2676, "Uttarakhand"),
    "Hubli":        (15.3647, 75.1240, "Karnataka"),
    "Belgaum":      (15.8497, 74.4977, "Karnataka"),
    "Thrissur":     (10.5276, 76.2144, "Kerala"),
    "Tirunelveli":  (8.7139,  77.7567, "Tamil Nadu"),
    "Nagercoil":    (8.1833,  77.4119, "Tamil Nadu"),
    "Vapi":         (20.3893, 72.9106, "Gujarat"),
    "Anand":        (22.5645, 72.9289, "Gujarat"),
    "Aurangabad":   (19.8762, 75.3433, "Maharashtra"),
    "Nashik":       (20.0000, 73.7800, "Maharashtra"),
    "Kolhapur":     (16.7050, 74.2433, "Maharashtra"),
    "Solapur":      (17.6599, 75.9064, "Maharashtra"),
}


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def classify_ac(bus_type: str) -> str:
    bt = str(bus_type).lower()
    if "non a/c" in bt or "non-ac" in bt or "non ac" in bt:
        return "Non-AC"
    elif "a/c" in bt or "ac" in bt or "volvo" in bt or "mercedes" in bt:
        return "AC"
    elif "luxury" in bt:
        return "AC"
    else:
        return "Non-AC"


def classify_sleeper(bus_type: str) -> str:
    bt = str(bus_type).lower()
    if "sleeper" in bt and "semi" not in bt:
        return "Sleeper"
    elif "semi sleeper" in bt or "semi-sleeper" in bt:
        return "Semi-Sleeper"
    else:
        return "Seater"


def parse_departure_hour(dep: str) -> int:
    """Parse departure like '09:30:00 PM' → 21"""
    try:
        dep = str(dep).strip()
        match = re.match(r"(\d{1,2}):(\d{2}):\d{2}\s*(AM|PM)", dep, re.IGNORECASE)
        if match:
            h = int(match.group(1))
            ampm = match.group(3).upper()
            if ampm == "PM" and h != 12:
                h += 12
            elif ampm == "AM" and h == 12:
                h = 0
            return h
    except:
        pass
    return -1


def process():
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} bus routes across {df['From'].nunique()} origin cities\n")

    # Classify bus types
    df["ac_type"] = df["Bus Type"].apply(classify_ac)
    df["seat_type"] = df["Bus Type"].apply(classify_sleeper)
    df["dep_hour"] = df["Departure"].apply(parse_departure_hour)

    lines = [
        "-- ============================================================================",
        "-- SEED DATA: Pan-India Bus Stations & Route Intelligence",
        "-- Source: Kaggle Pan-India Bus Routes (35K schedules, 1000+ cities)",
        "-- ============================================================================",
        "",
    ]

    count = 0
    random.seed(42)

    # Process each city that has geocode data
    for city, (lat, lon, state) in sorted(CITY_GEO.items()):
        # Get routes FROM this city
        from_df = df[df["From"] == city]
        # Get routes TO this city
        to_df = df[df["To"] == city]

        total_routes = len(from_df) + len(to_df)
        if total_routes < 5:
            continue

        outbound = len(from_df)
        inbound = len(to_df)

        # Top operators serving this city (from + to combined)
        combined = pd.concat([from_df, to_df])
        top_operators = combined["Operator"].value_counts().head(5).index.tolist()

        # Top destinations from this city
        if len(from_df) > 0:
            top_dests = from_df["To"].value_counts().head(8)
            popular_routes = []
            for dest, route_count in top_dests.items():
                dest_routes = from_df[from_df["To"] == dest]
                avg_dist = round(dest_routes["Distance"].mean())
                ac_pct = round((dest_routes["ac_type"] == "AC").mean() * 100, 1)
                popular_routes.append({
                    "to": dest,
                    "routes": int(route_count),
                    "avg_distance_km": int(avg_dist),
                    "ac_available_pct": ac_pct,
                })
        else:
            popular_routes = []

        # AC vs Non-AC split
        ac_count = (combined["ac_type"] == "AC").sum()
        ac_pct = round(ac_count / len(combined) * 100, 1)

        # Seat type split
        seat_dist = combined["seat_type"].value_counts().to_dict()
        seat_pct = {k: round(v / len(combined) * 100, 1) for k, v in seat_dist.items()}

        # Distance stats for outbound
        avg_dist = round(from_df["Distance"].mean()) if len(from_df) > 0 else 0
        max_dist = int(from_df["Distance"].max()) if len(from_df) > 0 else 0
        min_dist = int(from_df["Distance"].min()) if len(from_df) > 0 else 0

        # Departure time analysis
        valid_hours = from_df[from_df["dep_hour"] >= 0]["dep_hour"]
        if len(valid_hours) > 0:
            peak_hours = valid_hours.value_counts().head(3).index.tolist()
            peak_hours_str = sorted([f"{h:02d}:00" for h in peak_hours])
            night_pct = round(((valid_hours >= 20) | (valid_hours <= 5)).mean() * 100, 1)
        else:
            peak_hours_str = []
            night_pct = 0

        # Rating based on route connectivity
        rating = min(4.8, round(3.5 + (outbound / 500) * 1.0, 1))

        # Small random offset for marker
        plat = round(lat + random.uniform(-0.008, 0.008), 6)
        plon = round(lon + random.uniform(-0.008, 0.008), 6)

        name = f"Bus Station – {city}"
        desc = (
            f"Major bus terminal in {city} ({state}). "
            f"{outbound} outbound + {inbound} inbound routes. "
            f"Top operators: {', '.join(top_operators[:3])}. "
            f"AC buses: {ac_pct}%. "
            f"Average route distance: {avg_dist}km."
        )

        amenities = {
            "type": "transport",
            "transport_type": "bus_station",
            "city": city,
            "state": state,
            "route_stats": {
                "outbound_routes": outbound,
                "inbound_routes": inbound,
                "total_routes": total_routes,
                "avg_distance_km": avg_dist,
                "min_distance_km": min_dist,
                "max_distance_km": max_dist,
                "ac_percentage": ac_pct,
            },
            "seat_type_split": seat_pct,
            "top_operators": top_operators,
            "popular_routes": popular_routes[:6],
            "peak_departures": peak_hours_str,
            "night_service_pct": night_pct,
            "features": ["online_booking", "multiple_operators", "ac_nonac", "sleeper_seater"],
        }

        amenities_json = json.dumps(amenities, ensure_ascii=False)

        sql = (
            f"INSERT INTO public.places (name, category, latitude, longitude, address, "
            f"description, rating, review_count, images, amenities, contact_info, opening_hours, verified) "
            f"VALUES ('{sql_escape(name)}', 'hidden_spot', {plat}, {plon}, "
            f"'{sql_escape(city)}, {sql_escape(state)}', "
            f"'{sql_escape(desc)}', {rating}, {total_routes}, "
            f"ARRAY[]::TEXT[], '{sql_escape(amenities_json)}'::jsonb, "
            f"'{{}}'::jsonb, '{{\"daily\": \"24/7\"}}'::jsonb, true);"
        )
        lines.append(sql)
        count += 1

        print(f"  {city:18s}  out={outbound:5d}  in={inbound:5d}  "
              f"operators={len(combined['Operator'].unique()):3d}  "
              f"AC={ac_pct}%  avg {avg_dist}km  "
              f"★{rating}")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n✅ Written {count} bus station inserts to: {OUT_PATH}")
    return count


if __name__ == "__main__":
    count = process()
    print(f"\n{'='*60}")
    print(f"TOTAL: {count} bus station entries with route intelligence")
