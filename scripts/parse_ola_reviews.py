"""
Parse Ola ride reviews dataset (10K reviews) →
  1. supabase/seed_transport.sql  – transport service places for major Indian cities
  2. Sentiment analysis baked into amenities JSONB (sample reviews, rating distribution)

Since the `reviews` table requires FK to user_id (auth.users), we can't seed
it directly. Instead we embed review intelligence into the places amenities.
"""

import pandas as pd
import random
import os
import re

CSV_PATH = r"C:\Users\hp\.cache\kagglehub\datasets\sonalshinde123\ola-ride-reviews-dataset-sentiments-and-ratings\versions\2\ola_reviews.csv"
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "seed_transport.sql")

# ── Indian cities with transport hubs ──────────────────────────────────────
# (city, lat, lon, state)
CITIES = [
    ("Delhi",       28.6139, 77.2090, "Delhi"),
    ("Mumbai",      19.0760, 72.8777, "Maharashtra"),
    ("Bangalore",   12.9716, 77.5946, "Karnataka"),
    ("Hyderabad",   17.3850, 78.4867, "Telangana"),
    ("Chennai",     13.0827, 80.2707, "Tamil Nadu"),
    ("Kolkata",     22.5726, 88.3639, "West Bengal"),
    ("Pune",        18.5204, 73.8567, "Maharashtra"),
    ("Ahmedabad",   23.0225, 72.5714, "Gujarat"),
    ("Jaipur",      26.9124, 75.7873, "Rajasthan"),
    ("Lucknow",     26.8467, 80.9462, "Uttar Pradesh"),
    ("Chandigarh",  30.7333, 76.7794, "Chandigarh"),
    ("Kochi",        9.9312, 76.2673, "Kerala"),
    ("Goa",         15.2993, 74.1240, "Goa"),
    ("Varanasi",    25.3176, 82.9739, "Uttar Pradesh"),
    ("Indore",      22.7196, 75.8577, "Madhya Pradesh"),
]

# ── Transport service templates ───────────────────────────────────────────
TRANSPORT_SERVICES = [
    {
        "name_tpl": "Ola Cabs – {city}",
        "desc": "Ola ride-hailing service in {city}. Book auto-rickshaws, mini, sedans, and SUVs. Cashless payment with safety features like SOS button and ride tracking.",
        "type": "ride_hailing",
        "provider": "Ola",
        "modes": ["Auto", "Mini", "Sedan", "SUV", "Bike"],
    },
    {
        "name_tpl": "Uber – {city}",
        "desc": "Uber ride-hailing in {city}. Options include UberGo, Premier, XL, and Auto. Real-time tracking and upfront pricing.",
        "type": "ride_hailing",
        "provider": "Uber",
        "modes": ["UberGo", "Premier", "UberXL", "Auto"],
    },
    {
        "name_tpl": "{city} Metro Rail",
        "desc": "Urban metro rail system in {city}. Fast, air-conditioned transit connecting major areas. Smart card and QR ticketing.",
        "type": "metro",
        "provider": "Metro",
        "modes": ["Metro"],
    },
    {
        "name_tpl": "{city} City Bus (BMTC/DTC/BEST)",
        "desc": "Public city bus service in {city}. Affordable local transit with regular routes covering the city. AC and non-AC options.",
        "type": "bus",
        "provider": "Public Bus",
        "modes": ["AC Bus", "Non-AC Bus"],
    },
    {
        "name_tpl": "Auto-Rickshaw Stand – {city}",
        "desc": "Local auto-rickshaw services in {city}. Metered or negotiated fares for short to medium-distance city travel.",
        "type": "auto",
        "provider": "Auto-Rickshaw",
        "modes": ["Auto-Rickshaw"],
    },
]

# Cities with metro systems
METRO_CITIES = {"Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Kochi", "Lucknow", "Jaipur", "Ahmedabad", "Chandigarh"}

# City bus brand names
BUS_NAMES = {
    "Delhi": "DTC",
    "Mumbai": "BEST",
    "Bangalore": "BMTC",
    "Hyderabad": "TSRTC",
    "Chennai": "MTC",
    "Kolkata": "WBSTC",
    "Pune": "PMPML",
    "Ahmedabad": "AMTS",
    "Jaipur": "JCTSL",
    "Lucknow": "UPSRTC",
    "Chandigarh": "CTU",
    "Kochi": "KSRTC",
    "Goa": "KTC",
    "Varanasi": "UPSRTC",
    "Indore": "AICTSL",
}


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def extract_review_insights(df: pd.DataFrame):
    """Extract review insights from the Ola dataset to embed in amenities."""
    dist = df["rating"].value_counts().sort_index().to_dict()
    total = len(df)

    # Sentiment buckets
    positive = df[df["rating"] >= 4]
    negative = df[df["rating"] <= 2]
    neutral = df[df["rating"] == 3]

    # Sample good reviews (20-120 chars, no special chars)
    good_reviews = []
    for _, r in positive.iterrows():
        text = str(r["review_text"]).strip()
        if 20 <= len(text) <= 120 and not any(c in text for c in ['"', "'", "\\", "\n"]):
            good_reviews.append(text)
        if len(good_reviews) >= 50:
            break

    # Sample complaint themes
    bad_reviews = []
    for _, r in negative.iterrows():
        text = str(r["review_text"]).strip()
        if 20 <= len(text) <= 120 and not any(c in text for c in ['"', "'", "\\", "\n"]):
            bad_reviews.append(text)
        if len(bad_reviews) >= 50:
            break

    return {
        "total_reviews": total,
        "rating_distribution": dist,
        "avg_rating": round(df["rating"].mean(), 2),
        "positive_pct": round(len(positive) / total * 100, 1),
        "negative_pct": round(len(negative) / total * 100, 1),
        "good_samples": good_reviews[:10],
        "bad_samples": bad_reviews[:10],
    }


def process():
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} Ola reviews")
    print(f"Rating distribution:\n{df['rating'].value_counts().sort_index()}\n")

    insights = extract_review_insights(df)
    print(f"Avg rating: {insights['avg_rating']}")
    print(f"Positive: {insights['positive_pct']}%, Negative: {insights['negative_pct']}%")
    print(f"Good sample reviews: {len(insights['good_samples'])}")
    print(f"Bad sample reviews: {len(insights['bad_samples'])}\n")

    lines = [
        "-- ============================================================================",
        "-- SEED DATA: Transport Services for Major Indian Cities",
        "-- Review intelligence from Kaggle Ola Ride Reviews (10K reviews)",
        "-- ============================================================================",
        "",
    ]

    count = 0
    random.seed(42)

    for city, lat, lon, state in CITIES:
        for svc in TRANSPORT_SERVICES:
            svc_type = svc["type"]

            # Skip metro for non-metro cities
            if svc_type == "metro" and city not in METRO_CITIES:
                continue

            name = svc["name_tpl"].format(city=city)
            # Customize bus name
            if svc_type == "bus":
                bus_brand = BUS_NAMES.get(city, "City Bus")
                name = f"{bus_brand} City Bus – {city}"

            desc = svc["desc"].format(city=city)

            # Small random offset so markers don't stack
            offset_lat = random.uniform(-0.02, 0.02)
            offset_lon = random.uniform(-0.02, 0.02)
            plat = round(lat + offset_lat, 6)
            plon = round(lon + offset_lon, 6)

            # Rating: Ola-based for ride_hailing, synthetic for others
            if svc_type == "ride_hailing" and svc["provider"] == "Ola":
                rating = insights["avg_rating"]
                review_count = insights["total_reviews"]
            elif svc_type == "ride_hailing":
                rating = round(random.uniform(3.5, 4.2), 1)
                review_count = random.randint(500, 5000)
            elif svc_type == "metro":
                rating = round(random.uniform(4.0, 4.6), 1)
                review_count = random.randint(1000, 8000)
            elif svc_type == "bus":
                rating = round(random.uniform(3.0, 3.8), 1)
                review_count = random.randint(200, 2000)
            else:  # auto
                rating = round(random.uniform(3.2, 4.0), 1)
                review_count = random.randint(100, 1000)

            # Build amenities
            amenities = {
                "type": "transport",
                "transport_type": svc_type,
                "provider": svc["provider"],
                "modes": svc["modes"],
                "city": city,
                "state": state,
            }

            # Add Ola review insights for Ola entries
            if svc["provider"] == "Ola":
                amenities["review_insights"] = {
                    "positive_pct": insights["positive_pct"],
                    "negative_pct": insights["negative_pct"],
                    "sample_positive": random.sample(insights["good_samples"], min(3, len(insights["good_samples"]))),
                    "sample_negative": random.sample(insights["bad_samples"], min(2, len(insights["bad_samples"]))),
                    "common_issues": ["cancellation charges", "driver availability", "surge pricing", "app issues"],
                    "strengths": ["wide availability", "multiple vehicle options", "cashless payment", "SOS safety"],
                }
            elif svc_type == "metro":
                amenities["features"] = ["air_conditioned", "smart_card", "qr_ticket", "wheelchair_accessible"]
                amenities["avg_frequency_min"] = random.choice([3, 5, 7, 10])
            elif svc_type == "bus":
                amenities["features"] = ["regular_routes", "bus_pass", "ac_nonac_options"]
                amenities["avg_frequency_min"] = random.choice([10, 15, 20, 30])
            elif svc_type == "auto":
                amenities["features"] = ["metered", "short_distance", "negotiable_fare"]

            # Contact info
            contact = {}
            if svc["provider"] == "Ola":
                contact = {"app": "Ola App", "helpline": "080-33553355", "website": "https://www.olacabs.com"}
            elif svc["provider"] == "Uber":
                contact = {"app": "Uber App", "website": "https://www.uber.com/in"}

            amenities_json = str(amenities).replace("'", '"').replace("True", "true").replace("False", "false")
            contact_json = str(contact).replace("'", '"') if contact else "{}"

            # Use 'hidden_spot' category since 'transport' doesn't exist in enum yet
            # NOTE: When place_category enum is expanded, change to 'transport'
            sql = (
                f"INSERT INTO public.places (name, category, latitude, longitude, address, "
                f"description, rating, review_count, images, amenities, contact_info, opening_hours, verified) "
                f"VALUES ('{sql_escape(name)}', 'hidden_spot', {plat}, {plon}, "
                f"'{sql_escape(city)}, {sql_escape(state)}', "
                f"'{sql_escape(desc)}', {rating}, {review_count}, "
                f"ARRAY[]::TEXT[], '{sql_escape(amenities_json)}'::jsonb, "
                f"'{sql_escape(contact_json)}'::jsonb, "
                f"'{{\"daily\": \"24/7\"}}'::jsonb, true);"
            )
            lines.append(sql)
            count += 1

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"✅ Written {count} transport service inserts to: {OUT_PATH}")
    return count


if __name__ == "__main__":
    count = process()
    print(f"\n{'='*60}")
    print(f"TOTAL: {count} transport services across {len(CITIES)} cities")
    print("  (Ola, Uber, Metro, City Bus, Auto-Rickshaw per city)")
