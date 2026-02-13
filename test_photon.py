import asyncio, httpx

async def test():
    bbox = "68.0,6.0,98.0,36.0"
    url = f"https://photon.komoot.io/api/?q=Kumbakonam&limit=10&lang=en&bbox={bbox}"
    print(f"URL: {url}")
    async with httpx.AsyncClient(timeout=6) as client:
        resp = await client.get(url)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        features = data.get("features", [])
        print(f"Features: {len(features)}")
        for f in features[:3]:
            p = f["properties"]
            c = f["geometry"]["coordinates"]
            print(f"  {p.get('name')}, {p.get('state')}, {p.get('country')} @ {c[1]},{c[0]}")

asyncio.run(test())
