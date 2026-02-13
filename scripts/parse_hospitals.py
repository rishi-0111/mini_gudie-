"""
Parse Hospitals In India dataset → seed_hospitals_india.sql
Source: kaggle.com/fringewidth/hospitals-in-india
2,566 hospitals across 25 states with lat/lon, ratings, reviews.

Strategy:
- Filter: rating >= 3.5 AND reviews >= 30
- Per city: take top N by weighted_score = rating * log(reviews+1)
- Cap: max 8 per city, ~200 total for geographic diversity
- Generate INSERT into places table with category = 'hospital'
"""

import pandas as pd
import numpy as np
import math

CSV = r"C:\Users\hp\.cache\kagglehub\datasets\fringewidth\hospitals-in-india\versions\3\Hospitals In India (Anonymized).csv"
OUT = r"D:\miniguide\supabase\seed_hospitals_india.sql"

df = pd.read_csv(CSV)
print(f"Raw: {len(df)} hospitals")

# ── Filter quality ──────────────────────────────────────────
df = df[(df["Rating"] >= 3.5) & (df["Number of Reviews"] >= 30)].copy()
print(f"After quality filter (rating>=3.5, reviews>=30): {len(df)}")

# ── Weighted score ──────────────────────────────────────────
df["score"] = df["Rating"] * np.log1p(df["Number of Reviews"])
df = df.sort_values("score", ascending=False)

# ── Per-city cap: top 8 ────────────────────────────────────
MAX_PER_CITY = 8
selected = df.groupby("City").head(MAX_PER_CITY).copy()
print(f"After per-city cap ({MAX_PER_CITY}): {len(selected)}")

# ── If still too many, take top 200 overall ────────────────
TARGET = 200
if len(selected) > TARGET:
    selected = selected.nlargest(TARGET, "score")
    print(f"Trimmed to top {TARGET}")

# Ensure geographic diversity - at least 1 from each state if possible
states_in_selected = set(selected["State"].unique())
all_states = set(df["State"].unique())
missing_states = all_states - states_in_selected

for state in missing_states:
    state_df = df[df["State"] == state].nlargest(1, "score")
    if len(state_df) > 0:
        selected = pd.concat([selected, state_df])

selected = selected.drop_duplicates(subset=["id"])
print(f"After state diversity fill: {len(selected)}")

# ── Stats ──────────────────────────────────────────────────
print(f"\nFinal: {len(selected)} hospitals across {selected['State'].nunique()} states, {selected['City'].nunique()} cities")
print(f"Rating range: {selected['Rating'].min()} – {selected['Rating'].max()}")
print(f"Reviews range: {selected['Number of Reviews'].min()} – {selected['Number of Reviews'].max()}")
print(f"\nTop 15 cities:")
print(selected["City"].value_counts().head(15).to_string())

# ── Hospital type hints based on review volume ─────────────
def classify_hospital(row):
    reviews = row["Number of Reviews"]
    rating = row["Rating"]
    if reviews > 5000:
        return "Major Multi-Specialty"
    elif reviews > 2000:
        return "Multi-Specialty"
    elif reviews > 500:
        return "General"
    elif rating >= 4.5:
        return "Specialty Clinic"
    else:
        return "Hospital"

selected["hospital_type"] = selected.apply(classify_hospital, axis=1)

# ── Emergency tier based on size ───────────────────────────
def emergency_tier(reviews):
    if reviews > 3000:
        return "24/7 Emergency, ICU, Trauma Center"
    elif reviews > 1000:
        return "24/7 Emergency, ICU"
    elif reviews > 300:
        return "Emergency Services"
    else:
        return "OPD Services"

selected["services"] = selected["Number of Reviews"].apply(emergency_tier)

# ── Generate SQL ───────────────────────────────────────────
def esc(s):
    return str(s).replace("'", "''").strip()

lines = []
lines.append("-- Hospitals in India seed data")
lines.append(f"-- Source: Kaggle fringewidth/hospitals-in-india (2,566 raw → {len(selected)} selected)")
lines.append(f"-- {selected['State'].nunique()} states, {selected['City'].nunique()} cities")
lines.append("-- Selection: rating >= 3.5, reviews >= 30, top 8 per city, weighted by rating * log(reviews)")
lines.append("")
lines.append("INSERT INTO places (name, description, latitude, longitude, place_category, address, rating, image_url, metadata)")
lines.append("VALUES")

values = []
for _, row in selected.iterrows():
    hospital_id = esc(row["id"])
    city = esc(row["City"])
    state = esc(row["State"])
    district = esc(row["District"])
    lat = round(row["Latitude"], 6)
    lon = round(row["Longitude"], 6)
    rating = round(row["Rating"], 1)
    reviews = int(row["Number of Reviews"])
    density = round(row["Density"], 1)
    h_type = row["hospital_type"]
    services = row["services"]

    name = f"{hospital_id} – {h_type}"
    desc = (
        f"{h_type} hospital in {city}, {state}. "
        f"Rated {rating}/5 based on {reviews:,} reviews. "
        f"Services: {services}. "
        f"District: {district}."
    )
    address = f"{city}, {district}, {state}"

    # Pick an image based on hospital type
    if "Multi-Specialty" in h_type:
        img = "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800"
    elif "Specialty Clinic" in h_type:
        img = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800"
    else:
        img = "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800"

    meta = (
        f'{{"source":"kaggle-hospitals-india",'
        f'"hospital_type":"{h_type}",'
        f'"reviews":{reviews},'
        f'"services":"{services}",'
        f'"district":"{district}",'
        f'"population_density":{density},'
        f'"state":"{esc(row["State"])}",'
        f'"city":"{city}"}}'
    )

    values.append(
        f"  ('{esc(name)}', '{esc(desc)}', {lat}, {lon}, "
        f"'hospital', '{esc(address)}', {rating}, '{img}', '{meta}'::jsonb)"
    )

lines.append(",\n".join(values) + ";")

sql = "\n".join(lines)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ Written {len(values)} hospital entries to {OUT}")
print(f"   File size: {len(sql):,} bytes")

# ── Hospital type breakdown ────────────────────────────────
print(f"\nHospital type breakdown:")
print(selected["hospital_type"].value_counts().to_string())
print(f"\nServices breakdown:")
print(selected["services"].value_counts().to_string())
