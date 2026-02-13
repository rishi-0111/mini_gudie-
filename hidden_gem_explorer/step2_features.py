"""
STEP 2 — Feature Engineering
Computes per-POI features: distance_from_user, distance_from_major_city,
hotel_count (3km), bus_stop_count (2km), metro_count (5km),
simulated_review_count, has_wikipedia, festival_multiplier.
"""

import pandas as pd
import numpy as np
from scipy.spatial import cKDTree
import os

DATA_DIR = r"d:\miniguide\hidden_gem_explorer\data"

# ── Major Indian cities ──────────────────────────────────────
MAJOR_CITIES = {
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
    "Kolkata": (22.5726, 88.3639),
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
    "Kochi": (9.9312, 76.2673),
    "Varanasi": (25.3176, 82.9739),
    "Agra": (27.1767, 78.0081),
    "Chandigarh": (30.7333, 76.7794),
    "Bhopal": (23.2599, 77.4126),
    "Goa": (15.4909, 73.8278),
}

# Festival months → multiplier for hidden spots
FESTIVAL_MONTHS = {1: 1.1, 2: 1.0, 3: 1.2, 4: 1.1, 5: 1.0, 6: 0.9,
                   7: 0.8, 8: 0.9, 9: 1.1, 10: 1.3, 11: 1.2, 12: 1.1}


def haversine_km(lat1, lon1, lat2, lon2):
    """Vectorized haversine distance in km."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return R * 2.0 * np.arcsin(np.sqrt(a))


def min_city_distance(lat, lon):
    """Distance (km) to the nearest major city."""
    city_coords = np.array(list(MAJOR_CITIES.values()))
    dists = haversine_km(lat, lon, city_coords[:, 0], city_coords[:, 1])
    return dists.min()


def count_nearby(poi_lats, poi_lons, ref_lats, ref_lons, radius_km):
    """For each POI, count reference points within radius_km using a KDTree.
    Uses a degree-approximation for speed (adequate at India's latitudes)."""
    if len(ref_lats) == 0:
        return np.zeros(len(poi_lats), dtype=int)

    # Approximate degrees → km (at ~20°N, 1°lat≈111km, 1°lon≈104km)
    deg_radius = radius_km / 111.0

    ref_coords = np.column_stack([ref_lats, ref_lons])
    poi_coords = np.column_stack([poi_lats, poi_lons])

    tree = cKDTree(ref_coords)
    counts = tree.query_ball_point(poi_coords, r=deg_radius)
    return np.array([len(c) for c in counts], dtype=int)


def simulate_review_count(has_wikipedia, city_dist_km, hotel_count):
    """Simulate review count based on fame indicators."""
    base = np.where(has_wikipedia == 1, np.random.randint(500, 5000, size=len(has_wikipedia)),
                    np.random.randint(0, 300, size=len(has_wikipedia)))
    # More hotels nearby → more popular
    base = base + hotel_count * 20
    # Closer to city → more reviews
    base = base + np.maximum(0, (50 - city_dist_km) * 10).astype(int)
    return np.clip(base, 0, 50000)


def engineer_features(user_lat=None, user_lon=None, month=10):
    """Build the full feature dataframe for hidden spots."""
    print("Loading extracted data...")
    spots = pd.read_parquet(os.path.join(DATA_DIR, "hidden_spots.parquet"))
    temples = pd.read_parquet(os.path.join(DATA_DIR, "temples.parquet"))
    hotels = pd.read_parquet(os.path.join(DATA_DIR, "hotels.parquet"))
    bus_stops = pd.read_parquet(os.path.join(DATA_DIR, "bus_stops.parquet"))
    metro = pd.read_parquet(os.path.join(DATA_DIR, "metro_stations.parquet"))

    # Merge hidden spots + temples into one candidate pool
    temples_as_spots = temples.rename(columns={"religion": "type"}).copy()
    temples_as_spots["has_wikipedia"] = temples_as_spots.get("has_wikipedia", 0)
    temples_as_spots = temples_as_spots[["name", "lat", "lon", "type", "has_wikipedia"]]

    spots_subset = spots[["name", "lat", "lon", "type", "has_wikipedia"]].copy()
    candidates = pd.concat([spots_subset, temples_as_spots], ignore_index=True)
    candidates = candidates.drop_duplicates(subset=["lat", "lon"]).reset_index(drop=True)

    print(f"Candidate POIs: {len(candidates):,}")

    # Default user location: center of India (Nagpur)
    if user_lat is None:
        user_lat, user_lon = 21.1458, 79.0882

    # ── Feature: distance from user ─────────────────────
    candidates["distance_from_user"] = haversine_km(
        candidates["lat"].values, candidates["lon"].values, user_lat, user_lon
    )

    # ── Feature: distance from nearest major city ───────
    print("Computing city distances...")
    city_dists = []
    for _, row in candidates.iterrows():
        city_dists.append(min_city_distance(row["lat"], row["lon"]))
    candidates["distance_from_major_city"] = city_dists

    # ── Feature: hotel_count within 3 km ────────────────
    print("Counting nearby hotels (3km)...")
    candidates["hotel_count"] = count_nearby(
        candidates["lat"].values, candidates["lon"].values,
        hotels["lat"].values, hotels["lon"].values, 3.0
    )

    # ── Feature: bus_stop_count within 2 km ─────────────
    print("Counting nearby bus stops (2km)...")
    candidates["bus_stop_count"] = count_nearby(
        candidates["lat"].values, candidates["lon"].values,
        bus_stops["lat"].values, bus_stops["lon"].values, 2.0
    )

    # ── Feature: metro_count within 5 km ────────────────
    print("Counting nearby metro stations (5km)...")
    candidates["metro_count"] = count_nearby(
        candidates["lat"].values, candidates["lon"].values,
        metro["lat"].values, metro["lon"].values, 5.0
    )

    # ── Feature: simulated_review_count ─────────────────
    np.random.seed(42)
    candidates["simulated_review_count"] = simulate_review_count(
        candidates["has_wikipedia"].values,
        candidates["distance_from_major_city"].values,
        candidates["hotel_count"].values,
    )

    # ── Feature: festival_multiplier ────────────────────
    candidates["festival_multiplier"] = FESTIVAL_MONTHS.get(month, 1.0)

    out = os.path.join(DATA_DIR, "features.parquet")
    candidates.to_parquet(out, index=False)
    print(f"Saved {out} ({len(candidates):,} rows, {len(candidates.columns)} columns)")
    return candidates


if __name__ == "__main__":
    df = engineer_features()
    print("\nSample:")
    print(df.head())
    print("\nStats:")
    print(df.describe())
