"""
Parse 'Travel details dataset.csv' → supabase/seed_destinations.sql
Normalizes messy destination names, geocodes them, aggregates trip stats
(avg cost, avg duration, popular accommodation/transport), and outputs
INSERT statements for the places table as 'hidden_spot' category with
rich travel-intelligence metadata in the amenities JSONB.
"""

import pandas as pd
import math, re, os

CSV_PATH = r"c:\Users\hp\Downloads\archive\Travel details dataset.csv"
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "supabase", "seed_destinations.sql")

# ── Destination normalisation ──────────────────────────────────────────────
# The CSV has messy names like "Tokyo", "Tokyo, Japan", "Japan" all meaning Tokyo.
DEST_NORM = {
    "london":        "London",
    "london, uk":    "London",
    "paris":         "Paris",
    "paris, france": "Paris",
    "france":        "Paris",
    "tokyo":         "Tokyo",
    "tokyo, japan":  "Tokyo",
    "japan":         "Tokyo",
    "bali":          "Bali",
    "bali, indonesia": "Bali",
    "sydney":        "Sydney",
    "sydney, australia": "Sydney",
    "sydney, aus":   "Sydney",
    "sydney, aus":   "Sydney",
    "australia":     "Sydney",
    "rome":          "Rome",
    "rome, italy":   "Rome",
    "italy":         "Rome",
    "new york":      "New York",
    "new york, usa": "New York",
    "new york city, usa": "New York",
    "bangkok":       "Bangkok",
    "bangkok, thai": "Bangkok",
    "bangkok, thailand": "Bangkok",
    "thailand":      "Bangkok",
    "barcelona":     "Barcelona",
    "barcelona, spain": "Barcelona",
    "spain":         "Barcelona",
    "rio de janeiro": "Rio de Janeiro",
    "rio de janeiro, brazil": "Rio de Janeiro",
    "brazil":        "Rio de Janeiro",
    "amsterdam":     "Amsterdam",
    "amsterdam, netherlands": "Amsterdam",
    "dubai":         "Dubai",
    "dubai, united arab emirates": "Dubai",
    "cape town":     "Cape Town",
    "cape town, sa": "Cape Town",
    "cape town, south africa": "Cape Town",
    "cancun, mexico": "Cancún",
    "mexico":        "Cancún",
    "seoul":         "Seoul",
    "seoul, south korea": "Seoul",
    "phuket":        "Phuket",
    "phuket, thai":  "Phuket",
    "phuket, thailand": "Phuket",
    "berlin, germany": "Berlin",
    "hawaii":        "Honolulu",
    "honolulu, hawaii": "Honolulu",
    "los angeles, usa": "Los Angeles",
    "marrakech, morocco": "Marrakech",
    "athens, greece":    "Athens",
    "greece":            "Athens",
    "edinburgh, scotland": "Edinburgh",
    "auckland, new zealand": "Auckland",
    "santorini":     "Santorini",
    "phnom penh":    "Phnom Penh",
    "vancouver, canada": "Vancouver",
    "canada":        "Vancouver",
    "egypt":         "Cairo",
}

# ── Geocoding lookup (lat, lon, country, description) ─────────────────────
GEO = {
    "London":        (51.5074, -0.1278, "United Kingdom",  "Historic capital blending royal palaces, world-class museums, and vibrant multicultural neighbourhoods along the Thames."),
    "Paris":         (48.8566,  2.3522, "France",          "The City of Light — iconic for the Eiffel Tower, Louvre, café culture, and timeless romance."),
    "Tokyo":         (35.6762,139.6503, "Japan",           "Ultra-modern metropolis fusing neon-lit Shibuya, ancient Senso-ji temple, cherry blossoms, and Michelin-starred ramen."),
    "Bali":          (-8.3405,115.0920, "Indonesia",       "Island of the Gods — emerald rice terraces, surf beaches, Hindu temples, and wellness retreats."),
    "Sydney":        (-33.8688,151.2093, "Australia",      "Harbour city defined by the Opera House, Bondi Beach, and a laid-back outdoor lifestyle."),
    "Rome":          (41.9028, 12.4964, "Italy",           "Eternal City of the Colosseum, Vatican, Trevi Fountain, and la dolce vita pizza culture."),
    "New York":      (40.7128,-74.0060, "USA",             "The city that never sleeps — Times Square, Central Park, Statue of Liberty, and Broadway."),
    "Bangkok":       (13.7563,100.5018, "Thailand",        "Southeast Asian hub of ornate temples, floating markets, legendary street food, and vibrant nightlife."),
    "Barcelona":     (41.3874,  2.1686, "Spain",           "Mediterranean gem of Gaudí masterpieces, tapas bars, sandy beaches, and electric nightlife."),
    "Rio de Janeiro":(-22.9068,-43.1729,"Brazil",          "Carnival city framed by Sugarloaf, Christ the Redeemer, Copacabana Beach, and samba rhythms."),
    "Amsterdam":     (52.3676,  4.9041, "Netherlands",     "Canal-laced city of Van Gogh, Anne Frank House, cycling culture, and tulip markets."),
    "Dubai":         (25.2048, 55.2708, "UAE",             "Futuristic desert oasis — Burj Khalifa, luxury malls, gold souks, and desert safari adventures."),
    "Cape Town":     (-33.9249, 18.4241,"South Africa",    "Where Table Mountain meets two oceans — wine regions, penguin colonies, and Robben Island."),
    "Cancún":        (21.1619,-86.8515, "Mexico",          "Caribbean beach paradise with turquoise cenotes, Mayan ruins, and world-class resorts."),
    "Seoul":         (37.5665,126.9780, "South Korea",     "K-culture capital of Gyeongbokgung Palace, street food alleys, K-pop, and neon-lit Gangnam."),
    "Phuket":        ( 7.8804, 98.3923, "Thailand",        "Thailand's largest island — crystal beaches, Phi Phi day-trips, Big Buddha, and seafood feasts."),
    "Berlin":        (52.5200, 13.4050, "Germany",         "History-rich capital of the Brandenburg Gate, Berlin Wall remnants, techno clubs, and street art."),
    "Honolulu":      (21.3069,-157.8583,"USA",             "Aloha spirit — Waikiki Beach, Diamond Head hike, Pearl Harbor, and year-round tropical warmth."),
    "Los Angeles":   (34.0522,-118.2437,"USA",             "City of Angels — Hollywood, Santa Monica Pier, Getty Museum, and golden sunsets."),
    "Marrakech":     (31.6295, -7.9811, "Morocco",         "Sensory overload of souks, Jemaa el-Fnaa square, riads, and Atlas Mountain excursions."),
    "Athens":        (37.9838, 23.7275, "Greece",          "Cradle of democracy — the Acropolis, Parthenon, Plaka, and Mediterranean cuisine."),
    "Edinburgh":     (55.9533, -3.1883, "United Kingdom",  "Festival city of Edinburgh Castle, Arthur's Seat, whisky distilleries, and cobbled Royal Mile."),
    "Auckland":      (-36.8485,174.7633,"New Zealand",     "City of Sails — harbour views, volcanic cones, Māori culture, and gateway to Middle-earth landscapes."),
    "Santorini":     (36.3932, 25.4615, "Greece",          "Postcard-perfect caldera views, blue-domed churches, dramatic sunsets, and volcanic beaches."),
    "Phnom Penh":    (11.5564,104.9282, "Cambodia",        "Cambodia's capital of the Royal Palace, Silver Pagoda, riverside promenades, and Khmer cuisine."),
    "Vancouver":     (49.2827,-123.1207,"Canada",          "Pacific coast gem — Stanley Park, mountain skiing, craft breweries, and multicultural food scene."),
    "Cairo":         (30.0444, 31.2357, "Egypt",           "Gateway to the Pyramids of Giza, the Sphinx, Egyptian Museum, and Nile felucca cruises."),
}


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def process():
    df = pd.read_csv(CSV_PATH)
    df = df.dropna(subset=["Destination"])
    print(f"Loaded {len(df)} trips, {df['Destination'].nunique()} raw destinations\n")

    # Normalize destination names
    df["dest_norm"] = df["Destination"].str.strip().str.lower().map(DEST_NORM)
    mapped = df.dropna(subset=["dest_norm"]).copy()
    unmapped = df[df["dest_norm"].isna()]["Destination"].unique()
    if len(unmapped):
        print(f"⚠ Unmapped destinations ({len(unmapped)}): {list(unmapped)}")
    print(f"Mapped: {len(mapped)} trips → {mapped['dest_norm'].nunique()} destinations\n")

    # Coerce cost columns to numeric
    mapped["Accommodation cost"] = pd.to_numeric(mapped["Accommodation cost"], errors="coerce")
    mapped["Transportation cost"] = pd.to_numeric(mapped["Transportation cost"], errors="coerce")
    mapped["Duration (days)"] = pd.to_numeric(mapped["Duration (days)"], errors="coerce")

    # Normalize transport types
    transport_map = {
        "Plane": "Flight", "Airplane": "Flight", "Flight": "Flight",
        "Train": "Train",
        "Bus": "Bus",
        "Car rental": "Car", "Car": "Car",
        "Subway": "Train",
        "Ferry": "Ferry",
    }
    mapped["transport_norm"] = mapped["Transportation type"].map(transport_map).fillna("Other")

    # Aggregate per destination
    agg = mapped.groupby("dest_norm").agg(
        trip_count=("dest_norm", "size"),
        avg_accommodation=("Accommodation cost", "mean"),
        avg_transport=("Transportation cost", "mean"),
        avg_duration=("Duration (days)", "mean"),
        top_accommodation=("Accommodation type", lambda x: x.mode().iloc[0] if len(x.mode()) else "Hotel"),
        top_transport=("transport_norm", lambda x: x.mode().iloc[0] if len(x.mode()) else "Flight"),
        nationalities=("Traveler nationality", lambda x: list(x.dropna().unique())[:5]),
    ).reset_index()

    print(f"Aggregated {len(agg)} destinations:\n")
    for _, row in agg.iterrows():
        print(f"  {row['dest_norm']:20s}  trips={row['trip_count']:2d}  "
              f"accom=${row['avg_accommodation']:,.0f}  transport=${row['avg_transport']:,.0f}  "
              f"avg {row['avg_duration']:.1f}d  stay={row['top_accommodation']}  mode={row['top_transport']}")

    # Generate SQL
    lines = [
        "-- ============================================================================",
        "-- SEED DATA: Popular World Destinations (from Kaggle Travel Details dataset)",
        "-- Aggregated travel intelligence: avg costs, typical duration, popular transport",
        "-- ============================================================================",
        "",
    ]

    count = 0
    for _, row in agg.iterrows():
        dest = row["dest_norm"]
        geo = GEO.get(dest)
        if not geo:
            print(f"  ⚠ No geocode for {dest}, skipping")
            continue

        lat, lon, country, desc = geo
        avg_acc = row["avg_accommodation"]
        avg_trans = row["avg_transport"]
        avg_dur = row["avg_duration"]
        total_est = avg_acc + avg_trans if not (math.isnan(avg_acc) or math.isnan(avg_trans)) else 0

        # Build amenities JSONB with travel intelligence
        amenities = {
            "type": "destination",
            "country": country,
            "trip_count": int(row["trip_count"]),
            "avg_accommodation_usd": round(avg_acc) if not math.isnan(avg_acc) else None,
            "avg_transport_usd": round(avg_trans) if not math.isnan(avg_trans) else None,
            "avg_total_cost_usd": round(total_est) if total_est else None,
            "avg_duration_days": round(avg_dur, 1) if not math.isnan(avg_dur) else None,
            "popular_stay": row["top_accommodation"],
            "popular_transport": row["top_transport"],
        }
        # Remove None values
        amenities = {k: v for k, v in amenities.items() if v is not None}

        # Rating: scale trip_count into a 4.0-4.8 range
        rating = min(4.8, 4.0 + (row["trip_count"] / 15.0) * 0.8)
        rating = round(rating, 1)

        # Build description
        cost_note = ""
        if total_est > 0:
            cost_note = f" Average trip cost ~${round(total_est)} ({round(avg_dur, 0):.0f} days)."

        full_desc = f"{desc}{cost_note}"

        amenities_json = str(amenities).replace("'", '"').replace("True", "true").replace("False", "false")

        sql = (
            f"INSERT INTO public.places (name, category, latitude, longitude, address, "
            f"description, rating, review_count, images, amenities, contact_info, opening_hours, verified) "
            f"VALUES ('{sql_escape(dest)}', 'hidden_spot', {lat:.6f}, {lon:.6f}, "
            f"'{sql_escape(dest)}, {sql_escape(country)}', "
            f"'{sql_escape(full_desc)}', {rating}, {int(row['trip_count'])}, "
            f"ARRAY[]::TEXT[], '{amenities_json}'::jsonb, "
            f"'{{}}'::jsonb, '{{\"daily\": \"open\"}}'::jsonb, true);"
        )
        lines.append(sql)
        count += 1

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n✅ Written {count} destination inserts to: {OUT_PATH}")
    return count


if __name__ == "__main__":
    count = process()
    print(f"\n{'='*60}")
    print(f"TOTAL: {count} world destinations with travel intelligence")
