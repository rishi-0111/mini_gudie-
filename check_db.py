import urllib.request
import json

url = "https://bqpkltznzkwvageimfic.supabase.co/rest/v1/"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcGtsdHpuemt3dmFnZWltZmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQzMzEwMSwiZXhwIjoyMDg2MDA5MTAxfQ.nO00nan189XwlPtQkf8eimSwn7WJyR5aKJSuALEFvqU"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
}

def check_table(table_name):
    try:
        req = urllib.request.Request(f"{url}{table_name}?limit=1", headers=headers)
        with urllib.request.urlopen(req) as resp:
            print(f"Table '{table_name}' exists.")
            return True
    except Exception as e:
        print(f"Table '{table_name}' check failed: {e}")
        return False

tables = ["users_profile", "places", "trips", "bookings", "reviews", "sos_alerts", "saved_places"]
results = []
for t in tables:
    results.append(f"{t}: {'Exists' if check_table(t) else 'MISSING'}")

print("\n".join(results))

