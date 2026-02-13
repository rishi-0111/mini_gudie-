"""
Parse Ola/Uber Ride Booking & Cancellation Data → seed_ride_intelligence.sql
Source: kaggle.com/hetmengar/ola-and-uber-ride-booking-and-cancellation-data
103,024 rides across 50 Bangalore neighborhoods.

Strategy: Create transport entries for each neighborhood with real ride intelligence:
- Avg fare, avg distance, success rate, cancellation rate
- Popular routes, peak hours, payment preferences
- Vehicle type breakdown and driver ratings
"""

import pandas as pd
import numpy as np

CSV = r"C:\Users\hp\.cache\kagglehub\datasets\hetmengar\ola-and-uber-ride-booking-and-cancellation-data\versions\1\Bookings.csv"
OUT = r"D:\miniguide\supabase\seed_ride_intelligence.sql"

df = pd.read_csv(CSV)
print(f"Raw: {len(df)} rides, {df['Pickup_Location'].nunique()} locations")

# ── Bangalore area coordinates (approximate centers) ───────
COORDS = {
    "BTM Layout": (12.9166, 77.6101),
    "Banashankari": (12.9255, 77.5468),
    "Bannerghatta Road": (12.8876, 77.5974),
    "Basavanagudi": (12.9430, 77.5732),
    "Bellandur": (12.9293, 77.6768),
    "Chamarajpet": (12.9619, 77.5634),
    "Chickpet": (12.9721, 77.5790),
    "Cox Town": (12.9891, 77.6200),
    "Devanahalli": (13.2473, 77.7127),
    "Electronic City": (12.8450, 77.6602),
    "Frazer Town": (12.9963, 77.6126),
    "HSR Layout": (12.9116, 77.6389),
    "Hebbal": (13.0358, 77.5970),
    "Hennur": (13.0310, 77.6369),
    "Hosur Road": (12.8971, 77.6200),
    "Hulimavu": (12.8822, 77.5972),
    "Indiranagar": (12.9784, 77.6408),
    "JP Nagar": (12.9063, 77.5857),
    "Jayanagar": (12.9308, 77.5838),
    "KR Puram": (13.0098, 77.7009),
    "Kadugodi": (12.9967, 77.7570),
    "Kammanahalli": (13.0103, 77.6396),
    "Kengeri": (12.9135, 77.4828),
    "Koramangala": (12.9352, 77.6245),
    "Langford Town": (12.9513, 77.5985),
    "MG Road": (12.9756, 77.6066),
    "Magadi Road": (12.9600, 77.5200),
    "Majestic": (12.9767, 77.5713),
    "Malleshwaram": (12.9966, 77.5641),
    "Marathahalli": (12.9591, 77.7019),
    "Mysore Road": (12.9415, 77.5200),
    "Nagarbhavi": (12.9604, 77.5089),
    "Padmanabhanagar": (12.9140, 77.5559),
    "Peenya": (13.0296, 77.5221),
    "RT Nagar": (13.0207, 77.5944),
    "Rajajinagar": (12.9872, 77.5519),
    "Rajarajeshwari Nagar": (12.9200, 77.5100),
    "Ramamurthy Nagar": (13.0105, 77.6690),
    "Richmond Town": (12.9640, 77.6021),
    "Sahakar Nagar": (13.0576, 77.5818),
    "Sarjapur Road": (12.9107, 77.6720),
    "Shantinagar": (12.9566, 77.5995),
    "Shivajinagar": (12.9857, 77.6044),
    "Tumkur Road": (13.0400, 77.5400),
    "Ulsoor": (12.9821, 77.6213),
    "Varthur": (12.9390, 77.7400),
    "Vijayanagar": (12.9703, 77.5341),
    "Whitefield": (12.9698, 77.7500),
    "Yelahanka": (13.1007, 77.5963),
    "Yeshwanthpur": (13.0227, 77.5500),
}

# ── Compute per-location stats ─────────────────────────────
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
df["hour"] = df["Date"].dt.hour

completed = df[df["Booking_Status"] == "Success"]

stats = []
for loc in sorted(df["Pickup_Location"].unique()):
    if loc not in COORDS:
        print(f"  SKIP (no coords): {loc}")
        continue
    
    loc_all = df[df["Pickup_Location"] == loc]
    loc_ok = completed[completed["Pickup_Location"] == loc]
    
    total_rides = len(loc_all)
    success_rides = len(loc_ok)
    success_rate = round(success_rides / total_rides * 100, 1) if total_rides > 0 else 0
    
    cancel_by_driver = len(loc_all[loc_all["Booking_Status"] == "Canceled by Driver"])
    cancel_by_customer = len(loc_all[loc_all["Booking_Status"] == "Canceled by Customer"])
    not_found = len(loc_all[loc_all["Booking_Status"] == "Driver Not Found"])
    
    avg_fare = round(loc_ok["Booking_Value"].mean(), 0) if len(loc_ok) > 0 else 0
    avg_dist = round(loc_ok["Ride_Distance"].mean(), 1) if len(loc_ok) > 0 else 0
    avg_rating = round(loc_ok["Driver_Ratings"].mean(), 2) if len(loc_ok) > 0 else 0
    
    # Top vehicle type
    vtype_counts = loc_ok["Vehicle_Type"].value_counts()
    top_vehicle = vtype_counts.index[0] if len(vtype_counts) > 0 else "Unknown"
    
    # Top payment method
    pay_counts = loc_ok["Payment_Method"].value_counts()
    top_payment = pay_counts.index[0] if len(pay_counts) > 0 else "Unknown"
    
    # Top 3 drop locations
    top_drops = loc_ok["Drop_Location"].value_counts().head(3)
    top_routes = ", ".join([f"{d} ({c})" for d, c in top_drops.items()])
    
    # Peak hour
    if len(loc_ok) > 0:
        hour_counts = loc_ok["hour"].value_counts()
        peak_hour = int(hour_counts.index[0])
    else:
        peak_hour = 9
    
    lat, lon = COORDS[loc]
    
    stats.append({
        "name": loc,
        "lat": lat,
        "lon": lon,
        "total_rides": total_rides,
        "success_rate": success_rate,
        "cancel_driver_pct": round(cancel_by_driver / total_rides * 100, 1),
        "cancel_customer_pct": round(cancel_by_customer / total_rides * 100, 1),
        "not_found_pct": round(not_found / total_rides * 100, 1),
        "avg_fare": int(avg_fare),
        "avg_dist": avg_dist,
        "avg_rating": avg_rating,
        "top_vehicle": top_vehicle,
        "top_payment": top_payment,
        "top_routes": top_routes,
        "peak_hour": peak_hour,
    })

print(f"\nGenerated stats for {len(stats)} locations")

# ── Generate SQL ───────────────────────────────────────────
def esc(s):
    return str(s).replace("'", "''").strip()

lines = []
lines.append("-- Ola/Uber Ride Intelligence for Bangalore neighborhoods")
lines.append(f"-- Source: Kaggle hetmengar/ola-and-uber-ride-booking-and-cancellation-data (103,024 rides)")
lines.append(f"-- {len(stats)} neighborhoods with real ride analytics")
lines.append("")
lines.append("INSERT INTO places (name, description, latitude, longitude, place_category, address, rating, image_url, metadata)")
lines.append("VALUES")

values = []
for s in stats:
    name = f"Ola/Uber Rides – {s['name']}"
    desc = (
        f"Ride-hailing hub in {s['name']}, Bangalore. "
        f"Based on {s['total_rides']:,} rides: {s['success_rate']}% success rate, "
        f"avg fare ₹{s['avg_fare']}, avg distance {s['avg_dist']} km. "
        f"Driver cancellation: {s['cancel_driver_pct']}%. "
        f"Most popular vehicle: {s['top_vehicle']}. "
        f"Top routes: {s['top_routes']}."
    )
    addr = f"{s['name']}, Bangalore, Karnataka"
    rating = min(5.0, round(s["avg_rating"], 1))
    img = "https://images.unsplash.com/photo-1449965408869-ebd3fee31a89?w=800"
    
    meta = (
        f'{{"source":"kaggle-ola-uber-bookings",'
        f'"city":"Bangalore",'
        f'"total_rides":{s["total_rides"]},'
        f'"success_rate":{s["success_rate"]},'
        f'"cancel_driver_pct":{s["cancel_driver_pct"]},'
        f'"cancel_customer_pct":{s["cancel_customer_pct"]},'
        f'"driver_not_found_pct":{s["not_found_pct"]},'
        f'"avg_fare_inr":{s["avg_fare"]},'
        f'"avg_distance_km":{s["avg_dist"]},'
        f'"avg_driver_rating":{s["avg_rating"]},'
        f'"top_vehicle":"{s["top_vehicle"]}",'
        f'"top_payment":"{s["top_payment"]}",'
        f'"peak_hour":{s["peak_hour"]},'
        f'"top_routes":"{esc(s["top_routes"])}"}}'
    )
    
    values.append(
        f"  ('{esc(name)}', '{esc(desc)}', {s['lat']:.6f}, {s['lon']:.6f}, "
        f"'hidden_spot', '{esc(addr)}', {rating}, '{img}', '{meta}'::jsonb)"
    )

lines.append(",\n".join(values) + ";")

sql = "\n".join(lines)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ Written {len(values)} ride intelligence entries to {OUT}")
print(f"   File size: {len(sql):,} bytes")

# Summary
print(f"\nSample stats:")
for s in stats[:5]:
    print(f"  {s['name']:25s} ₹{s['avg_fare']:>4} avg | {s['avg_dist']:>5.1f}km | {s['success_rate']}% OK | ★{s['avg_rating']}")
