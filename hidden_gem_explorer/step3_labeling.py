"""
STEP 3 — Hidden Spot Labeling
Labels each POI as hidden (1) or not (0) based on rules:
  - simulated_review_count < 1000
  - distance_from_major_city > 20 km
  - metro_count == 0
  - hotel_count < 10
  - has_wikipedia == 0
All 5 conditions must be met → hidden_label = 1.
"""

import pandas as pd
import os

DATA_DIR = r"d:\miniguide\hidden_gem_explorer\data"


def label_hidden_spots():
    df = pd.read_parquet(os.path.join(DATA_DIR, "features.parquet"))
    print(f"Labeling {len(df):,} POIs...")

    df["hidden_label"] = (
        (df["simulated_review_count"] < 1000) &
        (df["distance_from_major_city"] > 20) &
        (df["metro_count"] == 0) &
        (df["hotel_count"] < 10) &
        (df["has_wikipedia"] == 0)
    ).astype(int)

    hidden_count = df["hidden_label"].sum()
    print(f"  Hidden: {hidden_count:,} ({100 * hidden_count / len(df):.1f}%)")
    print(f"  Known:  {len(df) - hidden_count:,} ({100 * (len(df) - hidden_count) / len(df):.1f}%)")

    out = os.path.join(DATA_DIR, "labeled.parquet")
    df.to_parquet(out, index=False)
    print(f"Saved {out}")
    return df


if __name__ == "__main__":
    df = label_hidden_spots()
    # Show distribution by type
    print("\nHidden distribution by type:")
    print(df.groupby("type")["hidden_label"].value_counts().sort_index())
