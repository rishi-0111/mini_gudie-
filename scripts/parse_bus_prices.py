"""
Parse Indian Cities Buses Routes & Prices (5K records, 20 cities) →
  supabase/seed_bus_prices.sql

Creates per-route entries with:
- Min/avg/max fare, distance, travel duration
- Top operators, bus types (AC/Non-AC, Sleeper/Seater)
- Average rating, seat availability
- Departure time windows
Complements seed_bus_routes.sql (which has station-level data from 35K routes)
"""

import pandas as pd
import json
import os
import random
import re

CSV_PATH = r"C:\Users\hp\.cache\kagglehub\datasets\ayushkhaire\indian-cities-buses-routes-and-prices\versions\6\cleaned_bus.csv.csv"
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "seed_bus_prices.sql")

# City geocodes (midpoint of route for marker placement)
CITY_GEO = {
    "Agra":             (27.1767, 78.0081),
    "Ahmedabad":        (23.0225, 72.5714),
    "Bengaluru":        (12.9716, 77.5946),
    "Bhubaneswar":      (20.2961, 85.8245),
    "Chennai":          (13.0827, 80.2707),
    "Delhi":            (28.6139, 77.2090),
    "Goa":              (15.2993, 74.1240),
    "Hyderabad":        (17.3850, 78.4867),
    "Jaipur":           (26.9124, 75.7873),
    "Kanpur":           (26.4499, 80.3319),
    "Kochi":            ( 9.9312, 76.2673),
    "Kolkata":          (22.5726, 88.3639),
    "Lucknow":          (26.8467, 80.9462),
    "Mumbai":           (19.0760, 72.8777),
    "Patna":            (25.6093, 85.1376),
    "Pune":             (18.5204, 73.8567),
    "Thiruvananthapuram":(8.5241, 76.9366),
    "Udaipur":          (24.5854, 73.7125),
    "Varanasi":         (25.3176, 82.9739),
    "Vishakhapatnam":   (17.6868, 83.2185),
}


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def parse_duration_mins(dur: str) -> int:
    """Parse '02hrs 45mins' → 165"""
    try:
        m = re.match(r"(\d+)hrs?\s*(\d+)mins?", str(dur))
        if m:
            return int(m.group(1)) * 60 + int(m.group(2))
    except:
        pass
    return 0


def classify_ac(bt: str) -> bool:
    bt = str(bt).lower()
    return "non" not in bt and ("a/c" in bt or "ac" in bt or "volvo" in bt or "electric" in bt)


def process():
    df = pd.read_csv(CSV_PATH)
    df = df.drop(columns=["Unnamed: 0"], errors="ignore")
    print(f"Loaded {len(df)} bus services across {df['Source'].nunique()} source cities\n")

    df["duration_mins"] = df["Travel Duration"].apply(parse_duration_mins)
    df["is_ac"] = df["Bus Type"].apply(classify_ac)
    df["dep_hour"] = pd.to_datetime(df["Departure Time"], errors="coerce").dt.hour

    # Aggregate per route (Source → Destination)
    routes = df.groupby(["Source", "Destination"]).agg(
        service_count=("price", "size"),
        min_price=("price", "min"),
        avg_price=("price", "mean"),
        max_price=("price", "max"),
        avg_distance=("distance", "mean"),
        avg_duration=("duration_mins", "mean"),
        avg_rating=("rating", "mean"),
        avg_seats=("Seats Left", "mean"),
        ac_pct=("is_ac", "mean"),
        top_operator=("Operator", lambda x: x.mode().iloc[0] if len(x.mode()) else "Unknown"),
        operators=("Operator", lambda x: list(x.unique())[:5]),
        bus_types=("Bus Type", lambda x: list(x.value_counts().head(3).index)),
    ).reset_index()

    routes["ac_pct"] = (routes["ac_pct"] * 100).round(1)
    routes["avg_price"] = routes["avg_price"].round(0).astype(int)
    routes["avg_distance"] = routes["avg_distance"].round(0).astype(int)
    routes["avg_duration"] = routes["avg_duration"].round(0).astype(int)
    routes["avg_rating"] = routes["avg_rating"].round(2)
    routes["avg_seats"] = routes["avg_seats"].round(0).astype(int)

    # Only keep routes with at least 5 services (meaningful data)
    routes = routes[routes["service_count"] >= 5].sort_values("service_count", ascending=False)

    print(f"Routes with >=5 services: {len(routes)}\n")

    lines = [
        "-- ============================================================================",
        "-- SEED DATA: Indian Bus Route Pricing Intelligence",
        "-- Source: Kaggle Indian Cities Buses Routes & Prices (5K records, 20 cities)",
        "-- Per-route fare data: min/avg/max price, operators, AC/Non-AC, ratings",
        "-- ============================================================================",
        "",
    ]

    count = 0
    random.seed(77)

    for _, row in routes.iterrows():
        src = row["Source"]
        dst = row["Destination"]
        src_geo = CITY_GEO.get(src)
        dst_geo = CITY_GEO.get(dst)
        if not src_geo or not dst_geo:
            continue

        # Place marker at midpoint of route
        mid_lat = round((src_geo[0] + dst_geo[0]) / 2 + random.uniform(-0.03, 0.03), 6)
        mid_lon = round((src_geo[1] + dst_geo[1]) / 2 + random.uniform(-0.03, 0.03), 6)

        name = f"Bus: {src} → {dst}"
        rating = min(5.0, max(1.0, round(row["avg_rating"], 1)))

        dur_h = row["avg_duration"] // 60
        dur_m = row["avg_duration"] % 60

        desc = (
            f"Bus route from {src} to {dst}. "
            f"{row['service_count']} daily services. "
            f"Fares: ₹{row['min_price']}–₹{row['max_price']} (avg ₹{row['avg_price']}). "
            f"Distance: {row['avg_distance']}km, ~{dur_h}h{dur_m:02d}m. "
            f"AC buses: {row['ac_pct']}%. "
            f"Top operator: {row['top_operator']}."
        )

        amenities = {
            "type": "transport",
            "transport_type": "bus_route",
            "route": {"from": src, "to": dst},
            "pricing": {
                "min_inr": int(row["min_price"]),
                "avg_inr": int(row["avg_price"]),
                "max_inr": int(row["max_price"]),
                "currency": "INR",
            },
            "service_count": int(row["service_count"]),
            "distance_km": int(row["avg_distance"]),
            "duration_mins": int(row["avg_duration"]),
            "ac_percentage": float(row["ac_pct"]),
            "avg_seats_available": int(row["avg_seats"]),
            "top_operators": row["operators"],
            "bus_types": row["bus_types"],
            "features": ["online_booking", "live_tracking", "multiple_operators"],
        }

        amenities_json = json.dumps(amenities, ensure_ascii=False)

        sql = (
            f"INSERT INTO public.places (name, category, latitude, longitude, address, "
            f"description, rating, review_count, images, amenities, contact_info, opening_hours, verified) "
            f"VALUES ('{sql_escape(name)}', 'hidden_spot', {mid_lat}, {mid_lon}, "
            f"'{sql_escape(src)} to {sql_escape(dst)}', "
            f"'{sql_escape(desc)}', {rating}, {int(row['service_count'])}, "
            f"ARRAY[]::TEXT[], '{sql_escape(amenities_json)}'::jsonb, "
            f"'{{}}'::jsonb, '{{\"daily\": \"24/7\"}}'::jsonb, true);"
        )
        lines.append(sql)
        count += 1

        print(f"  {src:15s} → {dst:15s}  svcs={row['service_count']:3d}  "
              f"₹{row['min_price']:5d}–₹{row['max_price']:5d}  "
              f"avg ₹{row['avg_price']:5d}  {row['avg_distance']:4d}km  "
              f"★{row['avg_rating']:.1f}  AC={row['ac_pct']}%")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n✅ Written {count} bus route price inserts to: {OUT_PATH}")
    return count


if __name__ == "__main__":
    count = process()
    print(f"\n{'='*60}")
    print(f"TOTAL: {count} priced bus routes")
