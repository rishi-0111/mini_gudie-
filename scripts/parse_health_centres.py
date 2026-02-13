"""
Parse All India Health Centres Directory → seed_health_centres.sql
Source: kaggle.com/akshatuppal/all-india-health-centres-directory
200,438 health facilities across 37 states/UTs with lat/lon.

Facility hierarchy:
  dis_h   → District Hospital (933) — largest, most important
  s_t_h   → Sub-District / Taluk Hospital (1,251)
  chc     → Community Health Centre (5,389)
  phc     → Primary Health Centre (29,733)
  sub_cen → Sub Centre (163,131) — too small/numerous

Strategy:
  - ALL District Hospitals (dis_h)   → category 'hospital'
  - ALL Sub-District Hospitals (s_t_h) → category 'hospital'
  - Top 2 CHCs per district (geographic spread) → category 'hospital'
  - Urban PHCs in top 15 metro districts → category 'emergency' (primary care / emergency access)
  - Cap total to ~500 for practical seed size
"""

import pandas as pd
import numpy as np

CSV = r"C:\Users\hp\.cache\kagglehub\datasets\akshatuppal\all-india-health-centres-directory\versions\1\geocode_health_centre.csv"
OUT = r"D:\miniguide\supabase\seed_health_centres.sql"

df = pd.read_csv(CSV, low_memory=False)
print(f"Raw: {len(df)} facilities")

# ── Clean coordinates ───────────────────────────────────────
df["Latitude"] = pd.to_numeric(df["Latitude"], errors="coerce")
df["Longitude"] = pd.to_numeric(df["Longitude"], errors="coerce")
df = df.dropna(subset=["Latitude", "Longitude"])
df = df[(df["Latitude"] > 6) & (df["Latitude"] < 38) &
        (df["Longitude"] > 68) & (df["Longitude"] < 98)]
df = df[df["ActiveFlag_C"] == "Y"]
df = df[df["NOTIONAL_PHYSICAL"] == "Physical"]
print(f"After geocode+active filter: {len(df)}")

# ── Facility type labels ───────────────────────────────────
TYPE_LABELS = {
    "dis_h": "District Hospital",
    "s_t_h": "Sub-District Hospital",
    "chc": "Community Health Centre",
    "phc": "Primary Health Centre",
    "sub_cen": "Sub Centre",
}

TYPE_SERVICES = {
    "dis_h": "24/7 Emergency, ICU, Surgery, Maternity, Blood Bank, Pharmacy",
    "s_t_h": "24/7 Emergency, Surgery, Maternity, Pharmacy",
    "chc": "Emergency, OPD, Maternity, Dental, Referral Services",
    "phc": "OPD, Basic Emergency, Immunization, Maternal Care",
}

# ── 1. All District Hospitals ──────────────────────────────
dh = df[df["Facility Type"] == "dis_h"].copy()
print(f"\nDistrict Hospitals: {len(dh)}")

# ── 2. All Sub-District Hospitals ──────────────────────────
sth = df[df["Facility Type"] == "s_t_h"].copy()
print(f"Sub-District Hospitals: {len(sth)}")

# ── 3. Top CHCs per state — 1 per district, max 3 per state ─
chc = df[df["Facility Type"] == "chc"].copy()
# Pick first per district (already geocoded, alphabetical gives spread)
chc_selected = chc.groupby(["State Name", "District Name"]).first().reset_index()
# Cap 3 per state
chc_selected = chc_selected.groupby("State Name").head(3)
print(f"CHCs selected (1/district, max 3/state): {len(chc_selected)}")

# ── 4. Urban PHCs in top 15 metro districts ────────────────
METRO_DISTRICTS = [
    "Brihan Mumbai", "Hyderabad", "Bangalore Urban", "Chennai",
    "Pune", "Thane", "New Delhi", "Central", "West", "North",
    "South", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow"
]
urban_phc = df[(df["Facility Type"] == "phc") &
               (df["Location Type"] == "Urban") &
               (df["District Name"].isin(METRO_DISTRICTS))].copy()
# Top 3 per district
urban_phc = urban_phc.groupby("District Name").head(3)
print(f"Urban PHCs (metros, max 3/district): {len(urban_phc)}")

# ── Combine all ────────────────────────────────────────────
all_selected = pd.concat([dh, sth, chc_selected, urban_phc], ignore_index=True)
all_selected = all_selected.drop_duplicates(subset=["Facility Name", "Latitude", "Longitude"])
print(f"\nTotal combined (deduped): {len(all_selected)}")
print(f"States: {all_selected['State Name'].nunique()}")
print(f"Districts: {all_selected['District Name'].nunique()}")
print(f"\nPer facility type:")
print(all_selected["Facility Type"].value_counts().to_string())

# ── Image URLs by type ─────────────────────────────────────
TYPE_IMAGES = {
    "dis_h": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800",
    "s_t_h": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800",
    "chc": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800",
    "phc": "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800",
}

# ── Generate SQL ───────────────────────────────────────────
def esc(s):
    if pd.isna(s):
        return ""
    return str(s).replace("'", "''").strip()

lines = []
lines.append("-- All India Health Centres Directory seed data")
lines.append(f"-- Source: Kaggle akshatuppal/all-india-health-centres-directory (200,438 raw → {len(all_selected)} selected)")
lines.append(f"-- {all_selected['State Name'].nunique()} states/UTs, {all_selected['District Name'].nunique()} districts")
lines.append("-- Selection: All District Hospitals + Sub-District Hospitals + top CHCs + urban PHCs in metros")
lines.append("")
lines.append("INSERT INTO places (name, description, latitude, longitude, place_category, address, rating, image_url, metadata)")
lines.append("VALUES")

values = []
for _, row in all_selected.iterrows():
    ftype = row["Facility Type"]
    label = TYPE_LABELS.get(ftype, "Health Centre")
    services = TYPE_SERVICES.get(ftype, "OPD Services")

    name = esc(row["Facility Name"])
    state = esc(row["State Name"])
    district = esc(row["District Name"])
    subdistrict = esc(row["Subdistrict Name"])
    location_type = esc(row["Location Type"])
    lat = round(row["Latitude"], 6)
    lon = round(row["Longitude"], 6)

    # Clean up name — add type if not already present
    name_lower = name.lower()
    if not any(kw in name_lower for kw in ["hospital", "chc", "phc", "centre", "center", "dispensary", "clinic"]):
        name = f"{name} ({label})"

    desc = (
        f"{label} in {subdistrict}, {district}, {state}. "
        f"Government {location_type.lower()} health facility. "
        f"Services: {services}."
    )

    address_parts = [p for p in [subdistrict, district, state] if p]
    address = ", ".join(address_parts)

    img = TYPE_IMAGES.get(ftype, TYPE_IMAGES["chc"])

    # Category: district & sub-district hospitals → hospital, CHC/PHC → emergency
    category = "hospital" if ftype in ("dis_h", "s_t_h") else "emergency"

    # Rating: assign based on facility tier (no rating data in dataset)
    rating_map = {"dis_h": 4.0, "s_t_h": 3.8, "chc": 3.5, "phc": 3.3}
    rating = rating_map.get(ftype, 3.5)

    meta = (
        f'{{"source":"kaggle-health-centres-directory",'
        f'"facility_type":"{ftype}",'
        f'"facility_label":"{label}",'
        f'"services":"{services}",'
        f'"location_type":"{location_type}",'
        f'"district":"{esc(row["District Name"])}",'
        f'"subdistrict":"{subdistrict}",'
        f'"state":"{state}",'
        f'"government":true}}'
    )

    values.append(
        f"  ('{esc(name)}', '{esc(desc)}', {lat}, {lon}, "
        f"'{category}', '{esc(address)}', {rating}, '{img}', '{meta}'::jsonb)"
    )

lines.append(",\n".join(values) + ";")

sql = "\n".join(lines)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ Written {len(values)} health centre entries to {OUT}")
print(f"   File size: {len(sql):,} bytes")

# Breakdown by category
cats = all_selected["Facility Type"].map(lambda x: "hospital" if x in ("dis_h", "s_t_h") else "emergency")
print(f"\nCategory breakdown:")
print(cats.value_counts().to_string())

print(f"\nTop 15 states:")
print(all_selected["State Name"].value_counts().head(15).to_string())
