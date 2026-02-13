import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TripRequest {
  from: string;
  destination: string;
  budget: { min: number; max: number };
  days: number;
  transportMode: string;
  rating: number;
  hiddenSpots: boolean;
  distance: number;
  language: string;
  persons?: number;
}

/**
 * This Edge Function proxies trip generation to the FastAPI backend.
 * The FastAPI /plan-trip endpoint handles:
 *  - Geocoding, distance calc, transport options (bus/train/flight)
 *  - ML-powered hidden gems, crowd prediction
 *  - Budget breakdown, AI suggestion text
 *  - Devotional places, stays, food options
 *
 * Falls back to local AI generation via Lovable gateway if FastAPI is unavailable.
 */

const FASTAPI_URL = Deno.env.get("FASTAPI_URL") || "http://localhost:8000";

const languageInstructions: Record<string, string> = {
  en: "Respond entirely in English.",
  hi: "पूरी प्रतिक्रिया हिंदी में दें। Respond entirely in Hindi.",
  ta: "முழு பதிலையும் தமிழில் கொடுங்கள். Respond entirely in Tamil.",
  te: "మొత్తం ప్రతిస్పందన తెలుగులో ఇవ్వండి. Respond entirely in Telugu.",
  kn: "ಸಂಪೂರ್ಣ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಕನ್ನಡದಲ್ಲಿ ನೀಡಿ. Respond entirely in Kannada.",
  ml: "മുഴുവൻ പ്രതികരണവും മലയാളത്തിൽ നൽകുക. Respond entirely in Malayalam.",
  bn: "সম্পূর্ণ প্রতিক্রিয়া বাংলায় দিন। Respond entirely in Bengali.",
  mr: "संपूर्ण प्रतिसाद मराठीत द्या. Respond entirely in Marathi.",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const tripData: TripRequest = await req.json();
    console.log("Generate trip request:", tripData.destination, "language:", tripData.language);

    // ── Strategy 1: Proxy to FastAPI backend ────────────────────────────
    try {
      const fastapiBody = {
        from_city: tripData.from || "Current Location",
        to_city: tripData.destination,
        budget: tripData.budget.max || 5000,
        days: tripData.days || 2,
        persons: tripData.persons || 1,
        rating: tripData.rating || 3,
        distance_km: tripData.distance || 500,
        transport_mode: tripData.transportMode || "auto",
        hidden_gems: tripData.hiddenSpots || false,
      };

      const fastapiResp = await fetch(`${FASTAPI_URL}/plan-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fastapiBody),
        signal: AbortSignal.timeout(15000),
      });

      if (fastapiResp.ok) {
        const data = await fastapiResp.json();
        if (!data.error) {
          console.log("Trip generated via FastAPI successfully");
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.warn("FastAPI returned error:", data.error);
      }
    } catch (proxyErr) {
      console.warn("FastAPI proxy failed, falling back to AI gateway:", proxyErr);
    }

    // ── Strategy 2: Fallback to Lovable AI gateway ──────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("FastAPI backend is unavailable and LOVABLE_API_KEY is not configured. Please start the FastAPI server on port 8000.");
    }

    const langInstruction = languageInstructions[tripData.language] || languageInstructions.en;

    const systemPrompt = `You are an expert travel planner AI for India. ${langInstruction}

STRICT RULES:
1. NEVER exceed budget ₹${tripData.budget.min} - ₹${tripData.budget.max}
2. ONLY recommend places within ${tripData.distance}km radius
3. ONLY include places with rating >= ${tripData.rating} stars
4. Plan for exactly ${tripData.days} day(s)
5. Optimize routes for ${tripData.transportMode} transport
6. ${tripData.hiddenSpots ? "PRIORITIZE hidden gems, local-only spots." : "Include popular tourist attractions."}

OUTPUT FORMAT (JSON only):
{
  "tripOverview": { "from": "string", "to": "string", "days": number, "transportMode": "string", "totalBudget": number },
  "dayWisePlan": [{ "day": number, "morning": { "place": "string", "description": "string", "time": "string", "cost": number }, "afternoon": { "place": "string", "description": "string", "time": "string", "cost": number }, "evening": { "place": "string", "description": "string", "time": "string", "cost": number }, "travelDistance": number, "dayCost": number }],
  "hiddenSpots": [{ "name": "string", "whySpecial": "string", "bestTime": "string", "distance": number }],
  "budgetBreakdown": { "stay": number, "food": number, "transport": number, "activities": number, "buffer": number, "total": number }
}`;

    const userPrompt = `Plan a trip: From ${tripData.from || "Current Location"} to ${tripData.destination}, Budget ₹${tripData.budget.min}-₹${tripData.budget.max}, ${tripData.days} days, ${tripData.transportMode} transport, ${tripData.rating}★+ rating, Hidden spots: ${tripData.hiddenSpots ? "Yes" : "No"}, Max ${tripData.distance}km`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    let tripPlan;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      tripPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    console.log("Trip plan generated via AI gateway");
    return new Response(JSON.stringify(tripPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-trip error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
