"""Quick test for the /generate-trip endpoint."""
import httpx, json, time

start = time.time()
try:
    resp = httpx.post(
        "http://localhost:8000/generate-trip",
        json={
            "from_location": "New Delhi",
            "destination": "Jaipur",
            "budget_min": 5000,
            "budget_max": 20000,
            "days": 3,
            "transport_mode": "mixed",
            "rating": 3.5,
            "hidden_spots": True,
            "distance": 100,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
except Exception as e:
    print(f"FAILED to call API: {e}")
    if 'resp' in locals() and hasattr(resp, 'text'):
        print(f"Response text: {resp.text}")
    exit(1)

elapsed = time.time() - start

if "error" in data:
    print(f"ERROR: {data['error']}")
else:
    ov = data.get("tripOverview")
    if not ov:
        print("ERROR: Response missing 'tripOverview'")
        print(json.dumps(data, indent=2))
        exit(1)
        
    print(f"=== Trip: {ov['from']} → {ov['to']} | {ov['days']} days ===")
    print(f"Budget: ₹{ov['totalBudget']:,}")
    print(f"Dest coords: ({ov.get('destLat')}, {ov.get('destLng')})")
    print()
    for d in data["dayWisePlan"]:
        print(f"Day {d['day']} ({d['travelDistance']} km, ₹{d['dayCost']})")
        print(f"  AM: {d['morning']['place']}")
        print(f"  PM: {d['afternoon']['place']}")
        print(f"  Eve: {d['evening']['place']}")
    print()
    print(f"Hidden spots: {len(data.get('hiddenSpots', []))}")
    for h in data.get("hiddenSpots", [])[:3]:
        print(f"  ✦ {h['name']} ({h['distance']} km)")
    print(f"Stays: {len(data.get('stayRecommendations', []))}")
    print(f"Food: {len(data.get('foodSpots', []))}")
    print(f"Budget breakdown: {json.dumps(data.get('budgetBreakdown', {}))}")
    if data.get("crowdPrediction"):
        print(f"Crowd: {data['crowdPrediction']}")
    if data.get("stats"):
        print(f"Stats: {data['stats']}")
    print(f"\n⏱ {elapsed:.1f}s")

