"""
STEP 4 + 5 — Scoring: Connectivity Score + Hidden Gem Score

Connectivity Score:
    connectivity = bus_stop_count * 0.4 + metro_count * 0.6

Hidden Gem Score (composite):
    hidden_gem_score = (
        w1 * distance_from_major_city_norm +
        w2 * (1 - hotel_count_norm) +
        w3 * (1 - review_count_norm) +
        w4 * (1 - connectivity_norm) +
        w5 * festival_multiplier +
        w6 * (1 - has_wikipedia)
    )
    Weights: w1=0.25, w2=0.15, w3=0.20, w4=0.15, w5=0.10, w6=0.15
"""

import pandas as pd
import numpy as np
import os

DATA_DIR = r"d:\miniguide\hidden_gem_explorer\data"

# Score weights
W = {
    "city_dist": 0.25,
    "hotel": 0.15,
    "review": 0.20,
    "connectivity": 0.15,
    "festival": 0.10,
    "wikipedia": 0.15,
}


def normalize(series):
    """Min-max normalize to [0, 1]."""
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series(np.zeros(len(series)), index=series.index)
    return (series - mn) / (mx - mn)


def compute_scores():
    df = pd.read_parquet(os.path.join(DATA_DIR, "labeled.parquet"))
    print(f"Computing scores for {len(df):,} POIs...")

    # ── Connectivity Score ──────────────────────────────
    df["connectivity_score"] = df["bus_stop_count"] * 0.4 + df["metro_count"] * 0.6

    # ── Normalized features ─────────────────────────────
    df["city_dist_norm"] = normalize(df["distance_from_major_city"])
    df["hotel_norm"] = normalize(df["hotel_count"])
    df["review_norm"] = normalize(df["simulated_review_count"])
    df["connectivity_norm"] = normalize(df["connectivity_score"])

    # ── Hidden Gem Score ────────────────────────────────
    df["hidden_gem_score"] = (
        W["city_dist"] * df["city_dist_norm"] +
        W["hotel"] * (1 - df["hotel_norm"]) +
        W["review"] * (1 - df["review_norm"]) +
        W["connectivity"] * (1 - df["connectivity_norm"]) +
        W["festival"] * df["festival_multiplier"] +
        W["wikipedia"] * (1 - df["has_wikipedia"])
    )

    # Scale to 0–100
    df["hidden_gem_score"] = normalize(df["hidden_gem_score"]) * 100

    print(f"\nHidden Gem Score distribution:")
    print(f"  Mean:   {df['hidden_gem_score'].mean():.1f}")
    print(f"  Median: {df['hidden_gem_score'].median():.1f}")
    print(f"  Min:    {df['hidden_gem_score'].min():.1f}")
    print(f"  Max:    {df['hidden_gem_score'].max():.1f}")

    # Top 20 hidden gems
    top = df.nlargest(20, "hidden_gem_score")
    print(f"\nTop 20 Hidden Gems:")
    for _, r in top.iterrows():
        print(f"  {r['hidden_gem_score']:.1f}  {r['name'][:50]:<50}  "
              f"type={r['type']:<15} city_dist={r['distance_from_major_city']:.0f}km  "
              f"hotels={r['hotel_count']}  reviews={r['simulated_review_count']}")

    out = os.path.join(DATA_DIR, "scored.parquet")
    df.to_parquet(out, index=False)
    print(f"\nSaved {out}")
    return df


if __name__ == "__main__":
    compute_scores()
