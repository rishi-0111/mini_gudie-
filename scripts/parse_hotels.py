"""
Parse hotel_details.csv and generate SQL seed data for the Supabase `places` table.
- Geocodes cities using a lookup of major Indian tourist cities
- Converts booking.com 1-10 rating to 1-5 scale
- Picks top-rated hotels per city (up to 5 each)
- Outputs: supabase/seed_hotels.sql
"""

import pandas as pd
import re, json, os

# ── City → (lat, lng) lookup for major Indian tourist destinations ──

CITY_COORDS = {
    "agra": (27.1767, 78.0081),
    "jaipur": (26.9124, 75.7873),
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "goa": (15.2993, 74.1240),
    "north goa": (15.5479, 73.7549),
    "south goa": (15.1819, 73.9425),
    "panaji": (15.4909, 73.8278),
    "calangute": (15.5438, 73.7553),
    "baga": (15.5551, 73.7515),
    "varanasi": (25.3176, 83.0064),
    "udaipur": (24.5854, 73.7125),
    "jodhpur": (26.2389, 73.0243),
    "kochi": (9.9312, 76.2673),
    "munnar": (10.0889, 77.0595),
    "alleppey": (9.4981, 76.3388),
    "alappuzha": (9.4981, 76.3388),
    "thiruvananthapuram": (8.5241, 76.9366),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "hyderabad": (17.3850, 78.4867),
    "kolkata": (22.5726, 88.3639),
    "shimla": (31.1048, 77.1734),
    "manali": (32.2396, 77.1887),
    "darjeeling": (27.0360, 88.2627),
    "rishikesh": (30.0869, 78.2676),
    "haridwar": (29.9457, 78.1642),
    "amritsar": (31.6340, 74.8723),
    "pushkar": (26.4897, 74.5511),
    "mysore": (12.2958, 76.6394),
    "mysuru": (12.2958, 76.6394),
    "ooty": (11.4102, 76.6950),
    "pondicherry": (11.9416, 79.8083),
    "puducherry": (11.9416, 79.8083),
    "jaisalmer": (26.9157, 70.9083),
    "leh": (34.1526, 77.5771),
    "ladakh": (34.1526, 77.5771),
    "srinagar": (34.0837, 74.7973),
    "gangtok": (27.3389, 88.6065),
    "shillong": (25.5788, 91.8933),
    "guwahati": (26.1445, 91.7362),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "lucknow": (26.8467, 80.9462),
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "chandigarh": (30.7333, 76.7794),
    "dehradun": (30.3165, 78.0322),
    "mussoorie": (30.4598, 78.0644),
    "coorg": (12.3375, 75.8069),
    "hampi": (15.3350, 76.4600),
    "kodaikanal": (10.2381, 77.4892),
    "mount abu": (24.5926, 72.7156),
    "mcleodganj": (32.2426, 76.3213),
    "dharamshala": (32.2190, 76.3234),
    "varkala": (8.7379, 76.7163),
    "kovalam": (8.3988, 76.9820),
    "thekkady": (9.6020, 77.1663),
    "kumarakom": (9.6179, 76.4304),
    "havelock": (11.9667, 92.9833),
    "andaman": (11.7401, 92.6586),
    "port blair": (11.6234, 92.7265),
    "nainital": (29.3803, 79.4636),
    "ranthambore": (26.0173, 76.5026),
    "khajuraho": (24.8318, 79.9199),
    "aurangabad": (19.8762, 75.3433),
    "ajanta": (20.5519, 75.7033),
    "ellora": (20.0258, 75.1780),
    "madurai": (9.9252, 78.1198),
    "tirupati": (13.6288, 79.4192),
    "coimbatore": (11.0168, 76.9558),
    "vizag": (17.6868, 83.2185),
    "visakhapatnam": (17.6868, 83.2185),
    "bikaner": (28.0229, 73.3119),
    "bodh gaya": (24.6961, 84.9869),
    "bodhgaya": (24.6961, 84.9869),
    "orchha": (25.3520, 78.6408),
    "kasol": (32.0100, 77.3147),
    "spiti": (32.2459, 78.0189),
    "tawang": (27.5860, 91.8596),
    "kohima": (25.6751, 94.1086),
    "aizawl": (23.7271, 92.7176),
    "imphal": (24.8170, 93.9368),
    "ranchi": (23.3441, 85.3096),
    "patna": (25.6093, 85.1376),
    "bhubaneswar": (20.2961, 85.8245),
    "puri": (19.8135, 85.8312),
    "konark": (19.8876, 86.0945),
}

def normalize_city(place_str):
    """Extract the main city name from the Place column."""
    if pd.isna(place_str):
        return None
    # Take the last part after comma (usually the city)
    parts = [p.strip() for p in str(place_str).split(",")]
    city = parts[-1].lower().strip()
    if city in CITY_COORDS:
        return city
    # Try first part
    city = parts[0].lower().strip()
    if city in CITY_COORDS:
        return city
    # Try all parts
    for p in parts:
        if p.lower().strip() in CITY_COORDS:
            return p.lower().strip()
    return None

def parse_rating(val):
    """Convert booking.com 1-10 rating to 1-5 scale."""
    try:
        r = float(val)
        return round(r / 2, 2)  # 8.4 → 4.20
    except (ValueError, TypeError):
        return None

def parse_reviews(val):
    """Extract review count number."""
    if pd.isna(val):
        return 0
    match = re.search(r'([\d,]+)', str(val))
    if match:
        return int(match.group(1).replace(',', ''))
    return 0

def escape_sql(s):
    """Escape single quotes for SQL strings."""
    if pd.isna(s) or s is None:
        return ''
    return str(s).replace("'", "''").strip()

def determine_category(name, description, condition):
    """Guess category from name/description."""
    name_lower = str(name).lower() if not pd.isna(name) else ''
    desc_lower = str(description).lower() if not pd.isna(description) else ''
    combined = name_lower + ' ' + desc_lower
    
    if any(w in combined for w in ['hostel', 'backpack', 'dorm']):
        return 'hostel'
    if any(w in combined for w in ['hospital', 'clinic', 'medical']):
        return 'hospital'
    # Everything else is a hostel (accommodation) in our schema
    return 'hostel'

def main():
    csv_path = r"c:\Users\hp\Downloads\hotel_details.csv\hotel_details.csv"
    df = pd.read_csv(csv_path, encoding='unicode_escape')
    
    print(f"Total rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nSample:\n{df.head()}\n")
    
    # Normalize city and filter to ones we can geocode
    df['city'] = df['Place'].apply(normalize_city)
    df['rating_5'] = df['Rating'].apply(parse_rating)
    df['review_count'] = df['Total Reviews'].apply(parse_reviews)
    
    # Drop rows without a mappable city or rating
    geocoded = df.dropna(subset=['city', 'rating_5']).copy()
    print(f"Geocodable rows: {len(geocoded)} / {len(df)}")
    print(f"Unique cities: {geocoded['city'].nunique()}")
    print(f"Cities: {sorted(geocoded['city'].unique())}\n")
    
    # Pick top 5 hotels per city by weighted score (rating * log(reviews+1))
    import math
    geocoded = geocoded[geocoded['review_count'] >= 10]
    # Deduplicate by hotel name (keep highest-rated entry)
    geocoded = geocoded.sort_values('rating_5', ascending=False).drop_duplicates(subset=['Hotel Name'], keep='first')
    geocoded['score'] = geocoded['rating_5'] * geocoded['review_count'].apply(lambda x: math.log(x + 1))
    geocoded = geocoded.sort_values('score', ascending=False)
    top = geocoded.groupby('city').head(5).reset_index(drop=True)
    
    print(f"Selected {len(top)} hotels from {top['city'].nunique()} cities\n")
    
    # Generate SQL
    sql_lines = [
        "-- ============================================================================",
        "-- SEED DATA: Hotels from Kaggle 'Hotels in India' dataset",
        "-- Auto-generated from hotel_details.csv",
        "-- ============================================================================",
        "",
    ]
    
    for _, row in top.iterrows():
        city = row['city']
        lat, lng = CITY_COORDS[city]
        
        # Add small random offset so hotels don't stack on same point
        import random
        lat_offset = random.uniform(-0.015, 0.015)
        lng_offset = random.uniform(-0.015, 0.015)
        
        name = escape_sql(row['Hotel Name'])
        category = determine_category(row['Hotel Name'], row['description'], row['Condition'])
        address = escape_sql(row['Place'])
        description = escape_sql(row['description']) if not pd.isna(row['description']) else ''
        rating = row['rating_5']
        reviews = row['review_count']
        condition = escape_sql(row['Condition']) if not pd.isna(row['Condition']) else ''
        
        # Build amenities JSON
        amenities = {"wifi": True}
        if 'pool' in description.lower():
            amenities["pool"] = True
        if 'restaurant' in description.lower() or 'food' in name.lower():
            amenities["food"] = True
        if 'parking' in description.lower():
            amenities["parking"] = True
        if 'spa' in description.lower() or 'spa' in name.lower():
            amenities["spa"] = True
        if 'gym' in description.lower() or 'fitness' in description.lower():
            amenities["gym"] = True
        if 'air' in description.lower() or 'ac' in description.lower():
            amenities["ac"] = True
        
        amenities_json = json.dumps(amenities).replace("'", "''")
        
        # Shorten description if too long
        if len(description) > 300:
            description = description[:297] + '...'
        
        sql_lines.append(
            f"INSERT INTO public.places (name, category, latitude, longitude, address, description, rating, review_count, images, amenities, contact_info, opening_hours, verified) VALUES "
            f"('{name}', '{category}', {lat + lat_offset:.6f}, {lng + lng_offset:.6f}, '{address}', "
            f"'{description}', {rating}, {reviews}, "
            f"ARRAY[]::TEXT[], '{amenities_json}'::jsonb, '{{}}'::jsonb, "
            f"'{{\"daily\": \"24 hours\"}}'::jsonb, true);"
        )
    
    sql_lines.append("")
    
    # Write output
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'supabase', 'seed_hotels.sql')
    out_path = os.path.normpath(out_path)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
    
    print(f"✅ Written {len(top)} hotel inserts to: {out_path}")

if __name__ == '__main__':
    main()
