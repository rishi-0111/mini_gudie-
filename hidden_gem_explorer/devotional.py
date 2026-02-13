"""
devotional.py — Devotional Places Backend Module
=================================================
Fetches temples and devotional sites from Supabase,
enriches with crowd prediction, festival info, and timings.
"""

import os
import math
import random
import httpx
from datetime import datetime

import sys
sys.path.insert(0, os.path.dirname(__file__))
from step7_recommendations import predict_crowd_level, recommend_hidden_temples

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://bqpkltznzkwvageimfic.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcGtsdHpuemt3dmFnZWltZmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzMxMDEsImV4cCI6MjA4NjAwOTEwMX0.uvVl1Y9R-eYmagm0EDKcd70iMoeMoAg3QSPdCTbScdg")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Festival calendar for major Indian temples ─────────────────────────────
FESTIVALS = {
    1: ["Makar Sankranti", "Pongal"],
    2: ["Maha Shivaratri", "Basant Panchami"],
    3: ["Holi", "Ugadi", "Gudi Padwa"],
    4: ["Ram Navami", "Hanuman Jayanti", "Baisakhi"],
    5: ["Buddha Purnima", "Akshaya Tritiya"],
    6: ["Rath Yatra"],
    7: ["Guru Purnima"],
    8: ["Janmashtami", "Raksha Bandhan", "Onam"],
    9: ["Ganesh Chaturthi", "Navratri begins"],
    10: ["Dussehra", "Durga Puja", "Navratri"],
    11: ["Diwali", "Govardhan Puja", "Bhai Dooj", "Kartik Purnima"],
    12: ["Christmas", "Vaikuntha Ekadashi"],
}

# ── Typical temple timings ──────────────────────────────────────────────────
TEMPLE_TIMINGS = {
    "default": {"open": "6:00 AM", "close": "8:00 PM", "darshan_morning": "6:00 AM - 12:00 PM", "darshan_evening": "4:00 PM - 8:00 PM"},
    "major": {"open": "4:30 AM", "close": "9:30 PM", "darshan_morning": "4:30 AM - 12:30 PM", "darshan_evening": "4:00 PM - 9:30 PM"},
    "small": {"open": "7:00 AM", "close": "7:00 PM", "darshan_morning": "7:00 AM - 11:00 AM", "darshan_evening": "5:00 PM - 7:00 PM"},
}

ENTRY_FEES = {
    "major": {"indian": 0, "foreigner": 200, "camera": 50},
    "heritage": {"indian": 50, "foreigner": 500, "camera": 100},
    "default": {"indian": 0, "foreigner": 0, "camera": 0},
}


def _safe_float(v):
    """Convert numpy/other types to native float."""
    if hasattr(v, "item"):
        return v.item()
    return float(v) if v is not None else 0.0


def _crowd_emoji(level: str) -> str:
    return {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(level, "⚪")


def _enrich_devotional_place(p: dict, user_lat: float, user_lng: float) -> dict:
    """Enrich a raw Supabase place with devotional metadata."""
    plat = _safe_float(p.get("latitude"))
    plng = _safe_float(p.get("longitude"))
    dist = round(haversine(user_lat, user_lng, plat, plng), 1)
    rating = _safe_float(p.get("rating") or 4.0)
    month = datetime.now().month

    # Crowd prediction
    crowd_level = "medium"
    try:
        raw = predict_crowd_level(plat, plng, month)
        cl = raw.get("crowd_level", "medium")
        crowd_level = cl.item() if hasattr(cl, "item") else str(cl)
    except Exception:
        pass

    # Determine temple type for timings/fees
    name = (p.get("name") or "").lower()
    is_major = any(kw in name for kw in ["mandir", "temple", "dham", "jyotirlinga", "tirtha", "kovil", "gurudwara", "jagannath", "meenakshi", "somnath", "kashi"])
    is_heritage = any(kw in name for kw in ["heritage", "fort", "palace", "monument"])
    ttype = "major" if is_major else ("heritage" if is_heritage else "default" if rating >= 4.0 else "small")

    timings = TEMPLE_TIMINGS.get(ttype, TEMPLE_TIMINGS["default"])
    fees = ENTRY_FEES.get("heritage" if is_heritage else ("major" if is_major else "default"), ENTRY_FEES["default"])

    # Festival info
    active_festivals = FESTIVALS.get(month, [])
    has_festival = len(active_festivals) > 0

    return {
        "id": p.get("id"),
        "name": p.get("name", "Devotional Place"),
        "description": p.get("description", "") or "A sacred devotional site",
        "category": p.get("category", "temple"),
        "lat": plat,
        "lng": plng,
        "distance": dist,
        "rating": round(rating, 1),
        "crowdLevel": crowd_level,
        "crowdEmoji": _crowd_emoji(crowd_level),
        "timings": timings,
        "entryFee": fees,
        "festivals": active_festivals if has_festival else [],
        "hasFestival": has_festival,
        "festivalEmoji": "🔥" if has_festival else "",
        "templeEmoji": "🛕",
        "image_url": p.get("image_url", ""),
    }


async def get_devotional_places(
    lat: float, lng: float, radius_km: float = 100,
    min_rating: float = 0, crowd_filter: str = "all", sort_by: str = "distance"
) -> list[dict]:
    """
    Fetch devotional places from Supabase, filtered and enriched.
    """
    devotional_cats = ["temple", "landmark", "destination", "tourist"]
    url = f"{SUPABASE_URL}/rest/v1/places?select=*&limit=2000"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        all_places = resp.json()

    # Filter to devotional categories
    dev_places = [p for p in all_places if p.get("category") in devotional_cats]

    # Enrich each place
    enriched = []
    for p in dev_places:
        try:
            ep = _enrich_devotional_place(p, lat, lng)
            if ep["distance"] > radius_km:
                continue
            if ep["rating"] < min_rating:
                continue
            if crowd_filter != "all" and ep["crowdLevel"] != crowd_filter:
                continue
            enriched.append(ep)
        except Exception:
            continue

    # Sort
    if sort_by == "rating":
        enriched.sort(key=lambda x: x["rating"], reverse=True)
    elif sort_by == "crowd":
        order = {"low": 0, "medium": 1, "high": 2}
        enriched.sort(key=lambda x: order.get(x["crowdLevel"], 1))
    else:
        enriched.sort(key=lambda x: x["distance"])

    # Also include hidden temples from ML
    try:
        hidden = recommend_hidden_temples(lat, lng, radius_km, top_n=5)
        for h in hidden:
            score = h.get("hidden_gem_score", 0)
            score = score.item() if hasattr(score, "item") else score
            ud = h.get("user_dist", 0)
            ud = ud.item() if hasattr(ud, "item") else ud
            enriched.append({
                "id": f"hidden_{h.get('name', 'x')}",
                "name": h.get("name", "Hidden Temple"),
                "description": f"ML-discovered hidden temple (score: {score:.1f})",
                "category": "hidden_temple",
                "lat": _safe_float(h.get("lat")),
                "lng": _safe_float(h.get("lon")),
                "distance": round(ud, 1),
                "rating": min(5.0, 3.5 + score / 100),
                "crowdLevel": "low",
                "crowdEmoji": "🟢",
                "timings": TEMPLE_TIMINGS["small"],
                "entryFee": ENTRY_FEES["default"],
                "festivals": FESTIVALS.get(datetime.now().month, []),
                "hasFestival": len(FESTIVALS.get(datetime.now().month, [])) > 0,
                "festivalEmoji": "🔥" if FESTIVALS.get(datetime.now().month) else "",
                "templeEmoji": "🛕",
                "image_url": "",
            })
    except Exception:
        pass

    return enriched
