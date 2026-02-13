import httpx
r = httpx.get("http://localhost:8001/route", params={
    "start_lat": 28.6139, "start_lng": 77.209,
    "end_lat": 28.5355, "end_lng": 77.291,
}, timeout=30)
d = r.json()
print(f"Routes: {len(d.get('routes', []))}")
r0 = d["routes"][0]
print(f"Distance: {r0['distance_m']}m")
print(f"Duration: {r0['duration_s']}s")
print(f"Traffic:  {r0['traffic']}")
print(f"Steps:    {len(r0['steps'])}")
print(f"Geometry points: {len(r0['geometry']['coordinates'])}")
