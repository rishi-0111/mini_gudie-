"""
ai_chat.py — Context-Aware AI Chat for Devotional Trip
======================================================
Provides intelligent responses about the user's trip context:
temple info, budget recalculation, timings, festival info, etc.
Uses rule-based logic with rich devotional knowledge base.
"""

import os
import re
import sys
import math
import random
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from devotional import FESTIVALS, TEMPLE_TIMINGS, haversine, _safe_float
from step7_recommendations import predict_crowd_level


# ── Knowledge base ──────────────────────────────────────────────────────────

DARSHAN_INFO = {
    "early_morning": "🛕 Yes, most temples open for early morning darshan at 4:30 AM. Best time to avoid crowd is before 6 AM.",
    "morning": "🛕 Morning darshan is typically from 6:00 AM to 12:00 PM. Arrive early for shorter queues.",
    "evening": "🛕 Evening darshan and aarti usually starts at 5:00 PM. The aarti ceremony is a must-see experience.",
    "night": "🛕 Most temples close by 8:00-9:30 PM. Some major temples have special night aarti.",
}

DRESS_CODE = "👗 Modest clothing is recommended. Cover shoulders and knees. Remove footwear before entering. Some temples require you to remove leather items."

OFFERINGS = "🙏 Common offerings: flowers (especially marigold), coconut, banana, incense, camphor. Some temples sell pre-made pooja thalis outside."

POOJA_INFO = "🕉 Special poojas can be booked at the temple office. Abhishekam, Archana, and Homam are popular. Advance booking recommended during festivals."

PHOTO_RULES = "📸 Photography rules vary. Most temples allow photos in the outer courtyard but not in the sanctum. Video is usually prohibited. Ask at the entrance."


def _process_budget_query(message: str, context: dict) -> str | None:
    """Handle budget-related queries."""
    budget_match = re.search(r'₹?\s*(\d[\d,]*)', message)
    if not budget_match:
        return None

    new_budget = int(budget_match.group(1).replace(",", ""))
    days = context.get("days", 1)
    persons = context.get("persons", 1)

    per_day = new_budget // days
    per_person_per_day = per_day // persons

    stay_budget = int(new_budget * 0.35)
    food_budget = int(new_budget * 0.30)
    transport_budget = int(new_budget * 0.15)
    activities_budget = int(new_budget * 0.10)
    buffer = int(new_budget * 0.10)

    stay_type = "🛕 Dharamshala/Ashram" if per_person_per_day < 500 else "🛏 Budget hostel" if per_person_per_day < 1000 else "🏨 Budget hotel"
    food_type = "🍽 Simple thali meals" if per_person_per_day < 500 else "🍽 Standard veg meals" if per_person_per_day < 1000 else "🍽 Good restaurants"

    return (
        f"💰 Recalculated for ₹{new_budget:,}:\n\n"
        f"📊 Per person/day: ₹{per_person_per_day:,}\n\n"
        f"• Stay: ₹{stay_budget:,} → {stay_type}\n"
        f"• Food: ₹{food_budget:,} → {food_type}\n"
        f"• Transport: ₹{transport_budget:,}\n"
        f"• Activities: ₹{activities_budget:,}\n"
        f"• Buffer: ₹{buffer:,}\n\n"
        f"{'✅ This budget is feasible!' if per_person_per_day >= 300 else '⚠️ Very tight budget. Consider dharamshala stays and simple meals.'}"
    )


def _get_crowd_tip(context: dict) -> str:
    """Generate crowd-related advice."""
    crowd = context.get("crowdPrediction", {})
    level = crowd.get("crowd_level", "medium") if crowd else "medium"
    month = datetime.now().month
    festivals = FESTIVALS.get(month, [])

    emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(level, "🟡")

    tip = f"{emoji} Current crowd level: {level.upper()}\n\n"
    if festivals:
        tip += f"🔥 Active festivals: {', '.join(festivals)}\n"
        tip += "Expect higher crowds during festival hours.\n\n"

    if level == "high":
        tip += "💡 Tips:\n• Visit early morning (before 6 AM)\n• Weekdays are less crowded\n• Book VIP/special darshan if available\n• Carry water and snacks for long queues"
    elif level == "medium":
        tip += "💡 Tips:\n• Morning visits (6-9 AM) have shorter queues\n• Avoid weekends if possible\n• Plan 2-3 hours for darshan"
    else:
        tip += "💡 Great time to visit! Expect peaceful darshan with minimal wait."

    return tip


INTENT_PATTERNS = [
    (r"early\s*morning|dawn|early\s*darshan|4|5\s*am", lambda _c: DARSHAN_INFO["early_morning"]),
    (r"morning\s*darshan|morning\s*time|morning\s*visit", lambda _c: DARSHAN_INFO["morning"]),
    (r"evening\s*darshan|evening\s*aarti|evening\s*time", lambda _c: DARSHAN_INFO["evening"]),
    (r"night|late\s*night|closing", lambda _c: DARSHAN_INFO["night"]),
    (r"dress\s*code|what\s*to\s*wear|clothing", lambda _c: DRESS_CODE),
    (r"offering|prasad|flowers|coconut", lambda _c: OFFERINGS),
    (r"pooja|puja|abhishekam|archana|homam", lambda _c: POOJA_INFO),
    (r"photo|camera|video|selfie", lambda _c: PHOTO_RULES),
    (r"crowd|busy|queue|wait|rush", _get_crowd_tip),
    (r"festival|celebration|event|special\s*day", lambda c: (
        f"🔥 Festivals this month: {', '.join(FESTIVALS.get(datetime.now().month, ['None scheduled']))}\n\n"
        f"During festivals, expect:\n• Extended temple hours\n• Special poojas and aartis\n• Higher crowd levels\n• Special prasadam distribution\n• Decorations and cultural programs"
    )),
    (r"timing|open|close|hour|schedule|when", lambda c: (
        f"🛕 Typical temple timings:\n\n"
        f"🌅 Morning: 4:30/6:00 AM - 12:00 PM\n"
        f"🌙 Evening: 4:00 PM - 8:00/9:30 PM\n\n"
        f"⏰ Best darshan times:\n"
        f"• Least crowded: 4:30-6:00 AM\n"
        f"• Good: 9:00-11:00 AM\n"
        f"• Evening aarti: 6:00-7:00 PM"
    )),
    (r"food|eat|restaurant|meal|lunch|dinner|breakfast|hungry", lambda c: (
        f"🍽 Food options near the temple:\n\n"
        f"• Most temple areas have pure veg restaurants\n"
        f"• Budget: ₹50-150 per meal at local eateries\n"
        f"• Temple prasad is often available free/donation\n"
        f"• Carry water bottle (refill at temple)\n\n"
        f"💡 Tip: Try the local specialties near the temple entrance"
    )),
    (r"stay|hotel|hostel|room|accommodation|sleep|dharamshala", lambda c: (
        f"🏨 Stay options:\n\n"
        f"• 🛕 Dharamshala: ₹100-500/night (basic, near temple)\n"
        f"• 🛏 Budget hostel: ₹300-800/night\n"
        f"• 🏨 Hotel: ₹800-3000/night\n\n"
        f"💡 Book dharamshala early during festivals!\n"
        f"Most have basic amenities and some offer free meals."
    )),
    (r"transport|bus|train|taxi|auto|how\s*to\s*reach|travel", lambda c: (
        f"🚗 Transport options:\n\n"
        f"• 🚌 Local bus: ₹20-50\n"
        f"• 🛺 Auto-rickshaw: ₹50-200\n"
        f"• 🚕 Taxi/Cab: ₹200-500\n"
        f"• 🚂 Train: Check IRCTC for routes\n\n"
        f"💡 Pre-book return transport during festivals"
    )),
    (r"safe|safety|security|women|solo|night\s*travel", lambda c: (
        f"🛡 Safety tips:\n\n"
        f"• Temple areas are generally safe\n"
        f"• Keep valuables secure in crowds\n"
        f"• Use temple lockers for shoes/bags\n"
        f"• Women: comfortable in groups, avoid isolated areas at night\n"
        f"• Emergency: Dial 112 for police\n"
        f"• Temple security available 24/7 at major temples"
    )),
    (r"hidden|secret|offbeat|unknown|less\s*known", lambda c: (
        f"✨ Hidden gems nearby:\n\n"
        f"Our ML model has found several hidden devotional spots!\n"
        f"• Less crowded alternative temples\n"
        f"• Secret viewpoints\n"
        f"• Ancient shrines off the tourist trail\n\n"
        f"💡 Enable 'Hidden Spots' in your trip settings to see ML-discovered places"
    )),
]


def chat_response(message: str, context: dict) -> str:
    """
    Generate a context-aware response to the user's message.
    Context includes: temple name, budget, days, persons, crowd prediction, etc.
    """
    msg_lower = message.strip().lower()

    # Check for budget recalculation
    if any(kw in msg_lower for kw in ["budget", "reduce", "increase", "cost", "₹", "rupee", "afford"]):
        budget_resp = _process_budget_query(msg_lower, context)
        if budget_resp:
            return budget_resp

    # Match against intent patterns
    for pattern, handler in INTENT_PATTERNS:
        if re.search(pattern, msg_lower):
            return handler(context)

    # Default contextual response
    temple = context.get("temple", "the temple")
    return (
        f"🛕 About {temple}:\n\n"
        f"I can help you with:\n"
        f"• ⏰ Darshan timings & best visit hours\n"
        f"• 🔥 Festival information\n"
        f"• 👥 Crowd predictions & tips\n"
        f"• 💰 Budget recalculation\n"
        f"• 🍽 Food recommendations\n"
        f"• 🏨 Stay options\n"
        f"• 🚗 Transport advice\n"
        f"• 📸 Photography rules\n"
        f"• 🙏 Offerings & pooja booking\n\n"
        f"Just ask! For example:\n"
        f'_"Is there early morning darshan?"_\n'
        f'_"Can we reduce budget to ₹3000?"_'
    )
