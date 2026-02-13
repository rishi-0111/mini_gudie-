"""
Hidden Gem Explorer India — Master Pipeline Runner
Runs all steps sequentially: Extract → Features → Label → Score → Train → Seed SQL.
"""

import time
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))


def run_pipeline():
    t0 = time.time()

    # ── Step 1: Extract POIs ────────────────────────────
    print("=" * 70)
    print("STEP 1: Extracting POIs from India OSM PBF")
    print("=" * 70)
    from step1_extract import extract_all
    extract_all()

    # ── Step 2: Feature Engineering ─────────────────────
    print(f"\n{'=' * 70}")
    print("STEP 2: Feature Engineering")
    print("=" * 70)
    from step2_features import engineer_features
    engineer_features()

    # ── Step 3: Hidden Spot Labeling ────────────────────
    print(f"\n{'=' * 70}")
    print("STEP 3: Hidden Spot Labeling")
    print("=" * 70)
    from step3_labeling import label_hidden_spots
    label_hidden_spots()

    # ── Step 4+5: Scoring ───────────────────────────────
    print(f"\n{'=' * 70}")
    print("STEP 4+5: Computing Scores")
    print("=" * 70)
    from step4_scoring import compute_scores
    compute_scores()

    # ── Step 6: ML Model Training ───────────────────────
    print(f"\n{'=' * 70}")
    print("STEP 6: Training RandomForest Model")
    print("=" * 70)
    from step6_model import train_model
    train_model()

    # ── Step 9: Generate Seed SQL ───────────────────────
    print(f"\n{'=' * 70}")
    print("STEP 9: Generating Supabase Seed SQL")
    print("=" * 70)
    from step9_seed import generate_seed_sql
    generate_seed_sql()

    elapsed = time.time() - t0
    print(f"\n{'=' * 70}")
    print(f"PIPELINE COMPLETE in {elapsed:.0f}s ({elapsed / 60:.1f} min)")
    print(f"{'=' * 70}")
    print(f"\nTo start the API:")
    print(f"  cd d:\\miniguide\\hidden_gem_explorer")
    print(f"  D:/miniguide/.venv/Scripts/python.exe step8_api.py")
    print(f"\nAPI endpoints:")
    print(f"  http://localhost:8000/hidden-nearby?lat=30.08&lon=78.27")
    print(f"  http://localhost:8000/hidden-temples?lat=25.31&lon=82.97")
    print(f"  http://localhost:8000/crowd-predict?lat=28.61&lon=77.20&month=10")


if __name__ == "__main__":
    run_pipeline()
