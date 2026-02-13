"""
Parse Rapido ride dataset (30K rides, July 2025) → append to seed_transport.sql
Aggregates per-city ride intelligence: avg fare, avg distance, ratings,
vehicle split, payment methods, cancellation rate, common issues.
"""

import pandas as pd
import random
import os
import json

CSV_PATH = r"C:\Users\hp\.cache\kagglehub\datasets\vengateshvengat\rapido-all-data\versions\1\rapido_july2025_data.csv"
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "seed_rapido.sql")

# ── City geocodes ──────────────────────────────────────────────────────────
CITY_GEO = {
    "Delhi":     (28.6139, 77.2090, "Delhi"),
    "Hyderabad": (17.3850, 78.4867, "Telangana"),
    "Bengaluru": (12.9716, 77.5946, "Karnataka"),
    "Chennai":   (13.0827, 80.2707, "Tamil Nadu"),
    "Pune":      (18.5204, 73.8567, "Maharashtra"),
}


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def to_json_str(obj) -> str:
    """Convert Python dict to a JSON string safe for SQL embedding."""
    return json.dumps(obj, ensure_ascii=False)


def process():
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} Rapido rides")
    print(f"Cities: {sorted(df['Pickup_Location'].unique())}")
    print(f"Status: {df['Booking_Status'].value_counts().to_dict()}")
    print(f"Vehicle types: {df['Vehicle_Type'].value_counts().to_dict()}")
    print()

    lines = [
        "-- ============================================================================",
        "-- SEED DATA: Rapido Bike & Auto Taxi – per-city aggregated ride intelligence",
        "-- Source: Kaggle Rapido All Data (30K rides, July 2025)",
        "-- ============================================================================",
        "",
    ]

    count = 0
    random.seed(99)

    for city in sorted(df["Pickup_Location"].unique()):
        geo = CITY_GEO.get(city)
        if not geo:
            print(f"  ⚠ No geocode for {city}, skipping")
            continue

        lat, lon, state = geo
        city_df = df[df["Pickup_Location"] == city].copy()
        completed = city_df[city_df["Booking_Status"] == "Completed"]
        cancelled = city_df[city_df["Booking_Status"] == "Cancelled"]
        incomplete = city_df[city_df["Booking_Status"] == "Incomplete"]

        total = len(city_df)
        completion_rate = round(len(completed) / total * 100, 1)
        cancel_rate = round(len(cancelled) / total * 100, 1)

        # Ratings
        avg_customer_rating = round(completed["Customer_Rating"].mean(), 2)
        avg_driver_rating = round(completed["Driver_Rating"].mean(), 2)

        # Fare & distance
        avg_fare = round(completed["Booking_Value"].mean(), 0)
        avg_distance = round(completed["Ride_Distance(km)"].mean(), 1)
        avg_time = round(completed["Ride_Time(min)"].mean(), 0)
        min_fare = round(completed["Booking_Value"].min(), 0)
        max_fare = round(completed["Booking_Value"].max(), 0)

        # Vehicle split
        veh_counts = city_df["Vehicle_Type"].value_counts().to_dict()
        bike_pct = round(veh_counts.get("Bike", 0) / total * 100, 1)
        auto_pct = round(veh_counts.get("Auto", 0) / total * 100, 1)

        # Payment methods
        pay_counts = city_df["Payment_Method"].value_counts()
        top_payment = pay_counts.index[0]
        payment_split = {k: round(v / total * 100, 1) for k, v in pay_counts.items()}

        # Incomplete reasons
        reasons = incomplete["Incomplete_Rides_Reason"].value_counts().head(3).to_dict()

        # Peak hours (from Time column)
        city_df["hour"] = pd.to_datetime(city_df["Time"], format="%H:%M").dt.hour
        peak_hours = city_df["hour"].value_counts().head(3).index.tolist()
        peak_hours_str = [f"{h}:00" for h in sorted(peak_hours)]

        print(f"  {city:12s}  rides={total:5d}  completed={completion_rate}%  "
              f"avg ₹{avg_fare:.0f}  {avg_distance}km  "
              f"cust★{avg_customer_rating}  driver★{avg_driver_rating}  "
              f"bike={bike_pct}%  auto={auto_pct}%")

        # Small random offset so Rapido marker doesn't overlap Ola/Uber
        offset_lat = random.uniform(-0.015, 0.015)
        offset_lon = random.uniform(-0.015, 0.015)
        plat = round(lat + offset_lat, 6)
        plon = round(lon + offset_lon, 6)

        # Build amenities with ride intelligence
        amenities = {
            "type": "transport",
            "transport_type": "ride_hailing",
            "provider": "Rapido",
            "modes": ["Bike", "Auto"],
            "city": city,
            "state": state,
            "ride_stats": {
                "total_rides_sampled": total,
                "completion_rate_pct": completion_rate,
                "cancellation_rate_pct": cancel_rate,
                "avg_fare_inr": int(avg_fare),
                "min_fare_inr": int(min_fare),
                "max_fare_inr": int(max_fare),
                "avg_distance_km": avg_distance,
                "avg_ride_time_min": int(avg_time),
                "avg_customer_rating": avg_customer_rating,
                "avg_driver_rating": avg_driver_rating,
            },
            "vehicle_split": {
                "bike_pct": bike_pct,
                "auto_pct": auto_pct,
            },
            "payment_split": payment_split,
            "top_payment": top_payment,
            "peak_hours": peak_hours_str,
            "common_issues": list(reasons.keys()),
            "features": ["bike_taxi", "auto_booking", "real_time_tracking", "cashless_payment", "sos_button"],
        }

        # Overall rating for the place entry (use customer rating)
        rating = min(5.0, round(avg_customer_rating, 1))

        name = f"Rapido Bike & Auto – {city}"
        desc = (
            f"Rapido ride-hailing in {city}. India's largest bike-taxi platform "
            f"with auto bookings. Average fare ₹{int(avg_fare)} for {avg_distance}km rides. "
            f"{completion_rate}% ride completion rate. "
            f"Bike rides: {bike_pct}%, Auto: {auto_pct}%."
        )

        amenities_json = to_json_str(amenities)
        contact_json = to_json_str({
            "app": "Rapido App",
            "website": "https://www.rapido.bike",
            "helpline": "support@rapido.bike"
        })

        sql = (
            f"INSERT INTO public.places (name, category, latitude, longitude, address, "
            f"description, rating, review_count, images, amenities, contact_info, opening_hours, verified) "
            f"VALUES ('{sql_escape(name)}', 'hidden_spot', {plat}, {plon}, "
            f"'{sql_escape(city)}, {sql_escape(state)}', "
            f"'{sql_escape(desc)}', {rating}, {total}, "
            f"ARRAY[]::TEXT[], '{sql_escape(amenities_json)}'::jsonb, "
            f"'{sql_escape(contact_json)}'::jsonb, "
            f"'{{\"daily\": \"24/7\"}}'::jsonb, true);"
        )
        lines.append(sql)
        count += 1

    # ── Also generate a city-level route popularity summary ───────────────
    lines.append("")
    lines.append("-- Popular routes (top 5 per city)")

    for city in sorted(df["Pickup_Location"].unique()):
        geo = CITY_GEO.get(city)
        if not geo:
            continue

        lat, lon, state = geo
        city_df = df[df["Pickup_Location"] == city]
        routes = city_df.groupby(["Pickup_Location", "Drop_Location"]).agg(
            ride_count=("Booking_ID", "size"),
            avg_fare=("Booking_Value", "mean"),
            avg_dist=("Ride_Distance(km)", "mean"),
        ).reset_index()
        routes = routes.sort_values("ride_count", ascending=False).head(5)

        route_data = []
        for _, r in routes.iterrows():
            route_data.append({
                "from": r["Pickup_Location"],
                "to": r["Drop_Location"],
                "rides": int(r["ride_count"]),
                "avg_fare_inr": round(r["avg_fare"]),
                "avg_distance_km": round(r["avg_dist"], 1),
            })

        # Create a "popular routes" entry per city
        offset_lat = random.uniform(-0.01, 0.01)
        offset_lon = random.uniform(-0.01, 0.01)
        plat = round(lat + offset_lat, 6)
        plon = round(lon + offset_lon, 6)

        route_amenities = {
            "type": "transport",
            "transport_type": "route_info",
            "provider": "Rapido",
            "city": city,
            "state": state,
            "popular_routes": route_data,
        }

        route_desc = f"Popular Rapido routes from {city}. Top destinations: {', '.join([r['to'] for r in route_data])}."
        name = f"Rapido Popular Routes – {city}"

        amenities_json = to_json_str(route_amenities)

        sql = (
            f"INSERT INTO public.places (name, category, latitude, longitude, address, "
            f"description, rating, review_count, images, amenities, contact_info, opening_hours, verified) "
            f"VALUES ('{sql_escape(name)}', 'hidden_spot', {plat}, {plon}, "
            f"'{sql_escape(city)}, {sql_escape(state)}', "
            f"'{sql_escape(route_desc)}', 4.0, 0, "
            f"ARRAY[]::TEXT[], '{sql_escape(amenities_json)}'::jsonb, "
            f"'{{}}'::jsonb, '{{\"daily\": \"24/7\"}}'::jsonb, true);"
        )
        lines.append(sql)
        count += 1

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n✅ Written {count} Rapido inserts to: {OUT_PATH}")
    return count


if __name__ == "__main__":
    count = process()
    print(f"\n{'='*60}")
    print(f"TOTAL: {count} Rapido entries (5 city services + 5 route summaries)")
