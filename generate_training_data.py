import kagglehub
import pandas as pd
import json
import os

# ─────────────────────────────────────────
# STEP 1: DOWNLOAD DATASETS
# ─────────────────────────────────────────
print("Downloading datasets...")

datasets = {
    "airbnb":       "airbnb/seattle",
    "tripadvisor":  "andrewmvd/trip-advisor-hotel-reviews",
    "gmaps":        "denizbilginn/google-maps-restaurant-reviews",
    "yelp":         "yelp-dataset/yelp-dataset",
    "world_cities": "max-mind/world-cities-database",
}

paths = {}
for name, dataset_id in datasets.items():
    try:
        paths[name] = kagglehub.dataset_download(dataset_id)
        print(f"✅ {name}: {paths[name]}")
    except Exception as e:
        print(f"❌ {name} failed: {e}")


# ─────────────────────────────────────────
# STEP 2: LOAD & PREPROCESS DATA
# ─────────────────────────────────────────

def load_hotels(airbnb_path, tripadvisor_path):
    """Load and merge hotel/accommodation data"""
    hotels = []

    # Airbnb listings
    try:
        df = pd.read_csv(f"{airbnb_path}/listings.csv")
        df = df[['name', 'neighbourhood', 'latitude', 'longitude',
                 'price', 'review_scores_rating', 'room_type']].dropna()
        df['source'] = 'airbnb'
        df['rating'] = df['review_scores_rating'] / 20  # Convert to 5-star
        hotels.append(df)
        print(f"✅ Airbnb: {len(df)} listings loaded")
    except Exception as e:
        print(f"⚠️ Airbnb load error: {e}")

    # TripAdvisor reviews
    try:
        df2 = pd.read_csv(f"{tripadvisor_path}/tripadvisor_hotel_reviews.csv")
        df2['source'] = 'tripadvisor'
        hotels.append(df2)
        print(f"✅ TripAdvisor: {len(df2)} reviews loaded")
    except Exception as e:
        print(f"⚠️ TripAdvisor load error: {e}")

    return hotels


def load_restaurants(yelp_path, gmaps_path):
    """Load restaurant data"""
    restaurants = []

    try:
        df = pd.read_json(f"{yelp_path}/yelp_academic_dataset_business.json", lines=True)
        df = df[df['categories'].str.contains('Restaurant', na=False)]
        df = df[['name', 'city', 'state', 'stars', 'review_count',
                 'categories', 'latitude', 'longitude']].dropna()
        restaurants.append(df)
        print(f"✅ Yelp Restaurants: {len(df)} loaded")
    except Exception as e:
        print(f"⚠️ Yelp load error: {e}")

    return restaurants


# ─────────────────────────────────────────
# STEP 3: FILTER FUNCTION (matches your UI)
# ─────────────────────────────────────────

def filter_hotels(hotels_df, min_rating=3, max_price_per_night=1500):
    """
    Filter hotels based on user UI settings
    - min_rating: from star slider in UI
    - max_price_per_night: calculated from budget/days/persons
    """
    filtered = hotels_df[
        (hotels_df['rating'] >= min_rating) &
        (hotels_df['price_numeric'] <= max_price_per_night)
    ].sort_values('rating', ascending=False)
    return filtered.head(5)


def filter_restaurants(rest_df, min_rating=3, city=None):
    """Filter restaurants based on rating and city"""
    filtered = rest_df[rest_df['stars'] >= min_rating]
    if city:
        filtered = filtered[filtered['city'].str.contains(city, case=False, na=False)]
    return filtered.sort_values('stars', ascending=False).head(10)


# ─────────────────────────────────────────
# STEP 4: TRAINING DATA GENERATOR
# ─────────────────────────────────────────

def generate_training_samples(user_filters: dict, hotels, restaurants):
    """
    Convert real dataset rows into training prompt-completion pairs
    matching your UI filters
    """
    samples = []

    budget = user_filters['budget']
    persons = user_filters['persons']
    days = user_filters['days']
    min_rating = user_filters['min_rating']
    transport = user_filters['transport_mode']
    from_loc = user_filters['from']
    to_loc = user_filters['to']
    date = user_filters['date']

    budget_per_person = budget / persons
    budget_per_day = budget / days
    hotel_budget = budget_per_day * 0.4  # 40% of daily budget for hotel

    prompt = f"""Plan a {days}-day trip from {from_loc} to {to_loc} for {persons} persons.
Budget: ₹{budget} total (₹{budget_per_person}/person)
Transport: {transport}
Hotel Rating: {min_rating}+ stars
Date: {date}
Generate complete itinerary, hotel suggestions, food recommendations, and budget breakdown."""

    # Build completion from dataset
    hotel_suggestions = []
    for h in hotels[:3]:
        hotel_suggestions.append({
            "name": h.get('name', 'Hotel'),
            "rating": h.get('rating', min_rating),
            "price_per_night": round(hotel_budget / days, 0),
            "location": to_loc
        })

    restaurant_suggestions = []
    for r in restaurants[:3]:
        restaurant_suggestions.append({
            "name": r.get('name', 'Restaurant'),
            "rating": r.get('stars', min_rating),
            "cuisine": r.get('categories', 'Local'),
            "avg_cost": round(budget_per_day * 0.2, 0)
        })

    completion = {
        "trip_summary": {
            "from": from_loc,
            "to": to_loc,
            "days": days,
            "persons": persons,
            "total_budget": budget
        },
        "hotels": hotel_suggestions,
        "restaurants": restaurant_suggestions,
        "budget_breakdown": {
            "transport": round(budget * 0.2),
            "hotel": round(budget * 0.4),
            "food": round(budget * 0.25),
            "sightseeing": round(budget * 0.1),
            "misc": round(budget * 0.05)
        },
        "transport": {
            "mode": transport,
            "from": from_loc,
            "to": to_loc
        }
    }

    samples.append({
        "prompt": prompt,
        "completion": json.dumps(completion, indent=2)
    })

    return samples


# ─────────────────────────────────────────
# STEP 5: GENERATE PROMPT FROM UI FILTERS
# ─────────────────────────────────────────

def build_prompt_from_ui(filters: dict) -> str:
    """
    Takes UI filter values and builds the AI prompt
    Use this in your frontend to call your AI model
    """
    weekend_note = ""
    if filters.get('is_weekend'):
        weekend_note = "Note: Travel date falls on a weekend. Expect 15-20% higher pricing."

    prompt = f"""
You are a smart Indian trip planner. Generate a complete trip plan based on these filters:

FROM: {filters['from']}
TO: {filters['to']}
DISTANCE: {filters['distance']} km
BUDGET: ₹{filters['budget']} total for {filters['persons']} persons
DAYS: {filters['days']} days (₹{round(filters['budget']/filters['days'])}/day)
DATE: {filters['date']}
TRANSPORT: {filters['transport_mode']} (~{filters['travel_time']})
MIN HOTEL RATING: {filters['min_rating']}+ stars
TRAVEL TYPE: {filters.get('travel_type', 'Smart Traveler')}
{weekend_note}

Generate:
1. Day-wise itinerary
2. Hotel suggestions ({filters['min_rating']}+ stars only, within budget)
3. Restaurant recommendations
4. Complete budget breakdown (must not exceed ₹{filters['budget']})
5. Top 5 attractions in {filters['to']}
6. Local tips and travel advice
"""
    return prompt.strip()


# ─────────────────────────────────────────
# STEP 6: EXAMPLE USAGE (Your UI Values)
# ─────────────────────────────────────────

if __name__ == "__main__":

    # These values come directly from your UI
    user_filters = {
        "from": "Kumbakonam",
        "to": "Chennai",
        "distance": 305,
        "budget": 5000,
        "days": 2,
        "date": "21-02-2026",
        "persons": 2,
        "transport_mode": "Bus",
        "travel_time": "4h 6m",
        "min_rating": 3,
        "travel_type": "Smart Traveler",
        "is_weekend": True  # triggers 15-20% warning
    }

    # Generate prompt
    final_prompt = build_prompt_from_ui(user_filters)
    print("\n" + "="*50)
    print("GENERATED PROMPT FOR AI MODEL:")
    print("="*50)
    print(final_prompt)

    # Save training sample
    sample = {
        "prompt": final_prompt,
        "filters": user_filters
    }

    with open("training_sample.json", "w") as f:
        json.dump(sample, f, indent=2)

    print("\n✅ Training sample saved to training_sample.json")
