"""
Optimized parser: trim health centres to ~400 practical entries.
1 District Hospital per district + fill gaps with Sub-District + CHCs for metros.
"""

import pandas as pd

CSV = r"C:\Users\hp\.cache\kagglehub\datasets\akshatuppal\all-india-health-centres-directory\versions\1\geocode_health_centre.csv"
OUT = r"D:\miniguide\supabase\seed_health_centres.sql"

df = pd.read_csv(CSV, low_memory=False)
df["Latitude"] = pd.to_numeric(df["Latitude"], errors="coerce")
df["Longitude"] = pd.to_numeric(df["Longitude"], errors="coerce")
df = df.dropna(subset=["Latitude", "Longitude"])
df = df[(df["Latitude"] > 6) & (df["Latitude"] < 38) &
        (df["Longitude"] > 68) & (df["Longitude"] < 98)]
df = df[df["ActiveFlag_C"] == "Y"]
print(f"Clean: {len(df)}")

# ── 1. District Hospitals: 1 per district ──────────────────
dh = df[df["Facility Type"] == "dis_h"].copy()
dh_sel = dh.groupby("District Name").first().reset_index()
covered = set(dh_sel["District Name"].unique())
print(f"District Hospitals (1/district): {len(dh_sel)}")
print(f"  States: {dh_sel['State Name'].nunique()}")

# ── 2. Sub-District: fill uncovered districts, max 1 each ─
sth = df[df["Facility Type"] == "s_t_h"].copy()
sth_sel = sth[~sth["District Name"].isin(covered)].groupby("District Name").first().reset_index()
covered.update(sth_sel["District Name"].unique())
print(f"Sub-District (new districts): {len(sth_sel)}")

# ── 3. Urban PHCs/CHCs for metro areas ────────────────────
METRO_DISTRICTS = [
    "Brihan Mumbai", "Hyderabad", "Bangalore Urban", "Chennai",
    "Pune", "Thane", "New Delhi", "Kolkata", "Ahmedabad", "Jaipur"
]
metro_phc = df[(df["Facility Type"].isin(["phc", "chc"])) &
               (df["Location Type"] == "Urban") &
               (df["District Name"].isin(METRO_DISTRICTS))].copy()
metro_phc = metro_phc.groupby("District Name").head(2)
print(f"Metro urban PHC/CHC: {len(metro_phc)}")

# ── Combine ────────────────────────────────────────────────
all_sel = pd.concat([dh_sel, sth_sel, metro_phc], ignore_index=True)
all_sel = all_sel.drop_duplicates(subset=["Facility Name", "Latitude", "Longitude"])
print(f"\nTotal: {len(all_sel)}")
print(f"States: {all_sel['State Name'].nunique()}, Districts: {all_sel['District Name'].nunique()}")
print(f"Per type:")
print(all_sel["Facility Type"].value_counts().to_string())

# ── Generate SQL ───────────────────────────────────────────
TYPE_LABELS = {
    "dis_h": "District Hospital",
    "s_t_h": "Sub-District Hospital",
    "chc": "Community Health Centre",
    "phc": "Primary Health Centre",
}
TYPE_SERVICES = {
    "dis_h": "24/7 Emergency, ICU, Surgery, Maternity, Blood Bank, Pharmacy",
    "s_t_h": "24/7 Emergency, Surgery, Maternity, Pharmacy",
    "chc": "Emergency, OPD, Maternity, Dental, Referral Services",
    "phc": "OPD, Basic Emergency, Immunization, Maternal Care",
}
TYPE_IMAGES = {
    "dis_h": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800",
    "s_t_h": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800",
    "chc": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800",
    "phc": "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800",
}
RATING_MAP = {"dis_h": 4.0, "s_t_h": 3.8, "chc": 3.5, "phc": 3.3}

def esc(s):
    if pd.isna(s):
        return ""
    return str(s).replace("'", "''").strip()

lines = []
lines.append("-- All India Health Centres Directory seed data")
lines.append(f"-- Source: Kaggle akshatuppal/all-india-health-centres-directory (200,438 raw -> {len(all_sel)} selected)")
lines.append(f"-- {all_sel['State Name'].nunique()} states/UTs, {all_sel['District Name'].nunique()} districts")
lines.append("-- Selection: 1 District Hospital per district + Sub-District fill + metro urban PHC/CHC")
lines.append("")
lines.append("INSERT INTO places (name, description, latitude, longitude, place_category, address, rating, image_url, metadata)")
lines.append("VALUES")

values = []
for _, row in all_sel.iterrows():
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

    name_lower = name.lower()
    if not any(kw in name_lower for kw in ["hospital", "chc", "phc", "centre", "center", "dispensary", "clinic"]):
        name = f"{name} ({label})"

    desc = (
        f"{label} in {subdistrict}, {district}, {state}. "
        f"Government {location_type.lower()} health facility. "
        f"Services: {services}."
    )
    address = ", ".join([p for p in [subdistrict, district, state] if p])
    img = TYPE_IMAGES.get(ftype, TYPE_IMAGES["chc"])
    category = "hospital" if ftype in ("dis_h", "s_t_h") else "emergency"
    rating = RATING_MAP.get(ftype, 3.5)

    meta = (
        f'{{"source":"kaggle-health-centres-directory",'
        f'"facility_type":"{ftype}",'
        f'"facility_label":"{label}",'
        f'"services":"{services}",'
        f'"location_type":"{location_type}",'
        f'"district":"{district}",'
        f'"subdistrict":"{subdistrict}",'
        f'"state":"{state}",'
        f'"government":true}}'
    )

    values.append(
        f"  ('{name}', '{esc(desc)}', {lat}, {lon}, "
        f"'{category}', '{esc(address)}', {rating}, '{img}', '{meta}'::jsonb)"
    )

lines.append(",\n".join(values) + ";")

sql = "\n".join(lines)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ Written {len(values)} entries to {OUT}")
print(f"   File size: {len(sql):,} bytes")

cats = all_sel["Facility Type"].map(lambda x: "hospital" if x in ("dis_h", "s_t_h") else "emergency")
print(f"\nCategory: hospital={sum(cats=='hospital')}, emergency={sum(cats=='emergency')}")
