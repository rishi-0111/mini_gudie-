import urllib.request, json

base_url = "https://bqpkltznzkwvageimfic.supabase.co/rest/v1/places?select=category"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcGtsdHpuemt3dmFnZWltZmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQzMzEwMSwiZXhwIjoyMDg2MDA5MTAxfQ.nO00nan189XwlPtQkf8eimSwn7WJyR5aKJSuALEFvqU"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Prefer": "count=exact",
}

# Paginate through all rows
all_rows = []
offset = 0
while True:
    url = f"{base_url}&limit=1000&offset={offset}"
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req)
    content_range = resp.headers.get("content-range", "")
    batch = json.loads(resp.read().decode())
    all_rows.extend(batch)
    if len(batch) < 1000:
        break
    offset += 1000

cats = {}
for row in all_rows:
    c = row["category"]
    cats[c] = cats.get(c, 0) + 1

print(f"Content-Range: {content_range}")
print(f"Total rows: {len(all_rows)}")
print()
for cat in sorted(cats, key=cats.get, reverse=True):
    print(f"  {cat:<20} {cats[cat]:>6}")
print(f"  {'TOTAL':<20} {sum(cats.values()):>6}")
