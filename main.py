#!/usr/bin/env python3
"""
Railway/Production entrypoint for the FastAPI backend.
Runs from the repo root and correctly sets up the Python path.
"""
import sys
import os

# ── Path fix: ensure hidden_gem_explorer is the working directory ────────────
# This makes os.path.dirname(__file__) resolve correctly inside step7_recommendations.py
# and all other modules, so DATA_DIR and MODEL_DIR point to the right folders.
_BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hidden_gem_explorer")

# Change CWD so relative paths inside hidden_gem_explorer work on Railway (Linux)
os.chdir(_BASE)

# Insert at front so imports resolve from hidden_gem_explorer/
sys.path.insert(0, _BASE)

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "step8_api:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        app_dir=_BASE,
    )
