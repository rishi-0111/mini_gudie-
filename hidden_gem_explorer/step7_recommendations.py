"""
STEP 7 — Recommendation Functions
5 recommendation engines:
1. recommend_hidden_places(lat, lon, radius_km, top_n)
2. recommend_hidden_temples(lat, lon, radius_km, top_n)
3. weekend_quiet_spots(lat, lon, max_km, top_n)
4. budget_friendly_spots(lat, lon, radius_km, top_n)
5. predict_crowd_level(lat, lon, month) → "low" | "medium" | "high"
"""

import pandas as pd
import numpy as np
import os
import pickle
from step2_features import haversine_km, count_nearby, MAJOR_CITIES

DATA_DIR = r"d:\miniguide\hidden_gem_explorer\data"
MODEL_DIR = r"d:\miniguide\hidden_gem_explorer\models"


def _load_data():
    """Load the scored dataset with all features."""
    return pd.read_parquet(os.path.join(DATA_DIR, "final.parquet"))


def _load_model():
    """Load trained model + scaler."""
    with open(os.path.join(MODEL_DIR, "rf_hidden.pkl"), "rb") as f:
        rf = pickle.load(f)
    with open(os.path.join(MODEL_DIR, "scaler.pkl"), "rb") as f:
        scaler = pickle.load(f)
    return rf, scaler


# ── 1. Recommend Hidden Places ──────────────────────────────
def recommend_hidden_places(lat: float, lon: float, radius_km: float = 50.0, top_n: int = 10):
    """
    Find top hidden gems near user location.
    Ranked by final_score, filtered to hidden_label=1 within radius.
    """
    df = _load_data()
    df["user_dist"] = haversine_km(df["lat"].values, df["lon"].values, lat, lon)
    nearby = df[(df["user_dist"] <= radius_km) & (df["hidden_label"] == 1)]
    result = nearby.nlargest(top_n, "final_score")

    return result[["name", "lat", "lon", "type", "user_dist",
                    "hidden_gem_score", "ml_hidden_score", "final_score",
                    "hotel_count", "bus_stop_count", "metro_count",
                    "connectivity_score"]].to_dict(orient="records")


# ── 2. Recommend Hidden Temples ─────────────────────────────
def recommend_hidden_temples(lat: float, lon: float, radius_km: float = 100.0, top_n: int = 10):
    """
    Find hidden temples/worship places near user.
    Types: hindu, buddhist, jain, sikh, christian, muslim + place_of_worship.
    """
    df = _load_data()
    df["user_dist"] = haversine_km(df["lat"].values, df["lon"].values, lat, lon)

    worship_types = {"hindu", "buddhist", "jain", "sikh", "christian", "muslim",
                     "place_of_worship", "temple"}
    mask = (
        df["type"].str.lower().isin(worship_types) &
        (df["user_dist"] <= radius_km) &
        (df["hidden_label"] == 1)
    )
    result = df[mask].nlargest(top_n, "final_score")

    return result[["name", "lat", "lon", "type", "user_dist",
                    "hidden_gem_score", "final_score",
                    "distance_from_major_city"]].to_dict(orient="records")


# ── 3. Weekend Quiet Spots ──────────────────────────────────
def weekend_quiet_spots(lat: float, lon: float, max_km: float = 150.0, top_n: int = 10):
    """
    Find quiet weekend getaways:
    - Far from major city (>10 km)
    - Low hotel density (<5 within 3km)
    - Low review count (<500)
    - Reachable within max_km from user
    Sorted by hidden_gem_score DESC.
    """
    df = _load_data()
    df["user_dist"] = haversine_km(df["lat"].values, df["lon"].values, lat, lon)

    quiet = df[
        (df["user_dist"] <= max_km) &
        (df["distance_from_major_city"] > 10) &
        (df["hotel_count"] < 5) &
        (df["simulated_review_count"] < 500)
    ]
    result = quiet.nlargest(top_n, "hidden_gem_score")

    return result[["name", "lat", "lon", "type", "user_dist",
                    "hidden_gem_score", "distance_from_major_city",
                    "hotel_count", "simulated_review_count",
                    "bus_stop_count"]].to_dict(orient="records")


# ── 4. Budget-Friendly Spots ────────────────────────────────
def budget_friendly_spots(lat: float, lon: float, radius_km: float = 100.0, top_n: int = 10):
    """
    Budget-friendly hidden gems:
    - Good connectivity (bus_stop_count > 0)
    - Low hotel density (cheaper accommodation likely)
    - Not too remote (within radius)
    - Prioritize by: connectivity_score * hidden_gem_score
    """
    df = _load_data()
    df["user_dist"] = haversine_km(df["lat"].values, df["lon"].values, lat, lon)

    budget = df[
        (df["user_dist"] <= radius_km) &
        (df["bus_stop_count"] > 0) &
        (df["hotel_count"] < 10) &
        (df["hidden_label"] == 1)
    ].copy()

    # Budget score: accessible + hidden
    budget["budget_score"] = (
        budget["connectivity_score"] * 0.3 +
        budget["hidden_gem_score"] * 0.7
    )

    result = budget.nlargest(top_n, "budget_score")

    return result[["name", "lat", "lon", "type", "user_dist",
                    "hidden_gem_score", "budget_score",
                    "bus_stop_count", "metro_count",
                    "hotel_count"]].to_dict(orient="records")


# ── 5. Predict Crowd Level ──────────────────────────────────
def predict_crowd_level(lat: float, lon: float, month: int = 10):
    """
    Predict crowd level at a location:
    - 'low':    hidden_gem_score > 70, review_count < 200, no metro
    - 'high':   hidden_gem_score < 30, review_count > 3000, metro > 0
    - 'medium': everything else

    Also factors in festival seasonal multiplier.
    """
    df = _load_data()

    # Find nearest POI to the given coordinates
    df["user_dist"] = haversine_km(df["lat"].values, df["lon"].values, lat, lon)
    nearest = df.nsmallest(1, "user_dist").iloc[0]

    # Seasonal adjustment
    festival_months = {1: 1.1, 2: 1.0, 3: 1.2, 4: 1.1, 5: 1.0, 6: 0.9,
                       7: 0.8, 8: 0.9, 9: 1.1, 10: 1.3, 11: 1.2, 12: 1.1}
    season_mult = festival_months.get(month, 1.0)

    # Effective review count with seasonal adjustment
    effective_reviews = nearest["simulated_review_count"] * season_mult

    gem_score = nearest["hidden_gem_score"]

    if gem_score > 70 and effective_reviews < 200 and nearest["metro_count"] == 0:
        level = "low"
    elif gem_score < 30 and effective_reviews > 3000 and nearest["metro_count"] > 0:
        level = "high"
    else:
        level = "medium"

    return {
        "crowd_level": level,
        "nearest_poi": nearest["name"],
        "distance_km": round(nearest["user_dist"], 2),
        "hidden_gem_score": round(nearest["hidden_gem_score"], 1),
        "ml_hidden_score": round(nearest["ml_hidden_score"], 3),
        "review_count": int(nearest["simulated_review_count"]),
        "effective_reviews": int(effective_reviews),
        "month": month,
        "festival_multiplier": season_mult,
        "metro_nearby": int(nearest["metro_count"]),
        "hotels_nearby": int(nearest["hotel_count"]),
        "bus_stops_nearby": int(nearest["bus_stop_count"]),
    }


# ── Demo ────────────────────────────────────────────────────
if __name__ == "__main__":
    # Test with Rishikesh coordinates
    lat, lon = 30.0869, 78.2676
    print(f"Testing recommendations near Rishikesh ({lat}, {lon}):\n")

    print("=" * 70)
    print("1. HIDDEN PLACES (50km radius)")
    print("=" * 70)
    for r in recommend_hidden_places(lat, lon, 50):
        print(f"  {r['final_score']:.1f}  {r['name'][:40]:<40}  {r['user_dist']:.1f}km")

    print(f"\n{'=' * 70}")
    print("2. HIDDEN TEMPLES (100km radius)")
    print("=" * 70)
    for r in recommend_hidden_temples(lat, lon, 100):
        print(f"  {r['final_score']:.1f}  {r['name'][:40]:<40}  {r['user_dist']:.1f}km")

    print(f"\n{'=' * 70}")
    print("3. WEEKEND QUIET SPOTS (150km)")
    print("=" * 70)
    for r in weekend_quiet_spots(lat, lon, 150):
        print(f"  {r['hidden_gem_score']:.1f}  {r['name'][:40]:<40}  {r['user_dist']:.1f}km")

    print(f"\n{'=' * 70}")
    print("4. BUDGET-FRIENDLY SPOTS (100km)")
    print("=" * 70)
    for r in budget_friendly_spots(lat, lon, 100):
        print(f"  {r['budget_score']:.1f}  {r['name'][:40]:<40}  bus={r['bus_stop_count']}")

    print(f"\n{'=' * 70}")
    print("5. CROWD PREDICTION")
    print("=" * 70)
    for m in [1, 5, 10, 12]:
        pred = predict_crowd_level(lat, lon, month=m)
        print(f"  Month {m:2d}: {pred['crowd_level']:<6}  "
              f"(reviews={pred['review_count']}, festival={pred['festival_multiplier']})")
