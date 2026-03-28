#!/usr/bin/env python3
"""
Railway/Production entrypoint for the FastAPI backend.
Runs from the repo root and correctly sets up the Python path.
"""
import sys
import os

# Add hidden_gem_explorer to path so relative imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "hidden_gem_explorer"))

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "step8_api:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )
