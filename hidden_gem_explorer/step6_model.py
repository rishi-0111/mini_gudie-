"""
STEP 6 — ML Model Training
RandomForestClassifier to predict hidden_label from features.
Outputs ml_hidden_score (probability of being hidden) for each POI.
"""

import pandas as pd
import numpy as np
import os
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler

DATA_DIR = r"d:\miniguide\hidden_gem_explorer\data"
MODEL_DIR = r"d:\miniguide\hidden_gem_explorer\models"
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURES = [
    "distance_from_major_city",
    "hotel_count",
    "bus_stop_count",
    "metro_count",
    "simulated_review_count",
    "has_wikipedia",
    "connectivity_score",
    "festival_multiplier",
]


def train_model():
    df = pd.read_parquet(os.path.join(DATA_DIR, "scored.parquet"))
    print(f"Training on {len(df):,} POIs...")

    X = df[FEATURES].copy()
    y = df["hidden_label"]

    print(f"Class balance: hidden={y.sum():,} ({100*y.mean():.1f}%), "
          f"known={len(y)-y.sum():,} ({100*(1-y.mean()):.1f}%)")

    # Handle class imbalance with class_weight
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train RandomForest
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train_scaled, y_train)

    # Evaluate
    y_pred = rf.predict(X_test_scaled)
    print("\n── Classification Report ──")
    print(classification_report(y_test, y_pred, target_names=["Known", "Hidden"]))

    print("── Confusion Matrix ──")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TP={cm[1,1]:,}  FP={cm[0,1]:,}")
    print(f"  FN={cm[1,0]:,}  TN={cm[0,0]:,}")

    # Cross-validation
    cv_scores = cross_val_score(rf, scaler.transform(X), y, cv=5, scoring="f1")
    print(f"\n5-fold CV F1: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # Feature importance
    print("\n── Feature Importance ──")
    for name, imp in sorted(zip(FEATURES, rf.feature_importances_), key=lambda x: -x[1]):
        print(f"  {name:<30} {imp:.4f}")

    # Save model + scaler
    with open(os.path.join(MODEL_DIR, "rf_hidden.pkl"), "wb") as f:
        pickle.dump(rf, f)
    with open(os.path.join(MODEL_DIR, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
    print(f"\nModel saved to {MODEL_DIR}/rf_hidden.pkl")

    # Generate ml_hidden_score for all POIs
    X_all_scaled = scaler.transform(X)
    df["ml_hidden_score"] = rf.predict_proba(X_all_scaled)[:, 1]

    # Final composite score: 60% rule-based hidden_gem_score + 40% ml_hidden_score
    df["final_score"] = (
        0.6 * df["hidden_gem_score"] +
        0.4 * (df["ml_hidden_score"] * 100)
    )

    out = os.path.join(DATA_DIR, "final.parquet")
    df.to_parquet(out, index=False)
    print(f"Saved {out} with final_score")

    # Show top 20 by final score
    top = df.nlargest(20, "final_score")
    print(f"\n── Top 20 by Final Score ──")
    for _, r in top.iterrows():
        print(f"  {r['final_score']:.1f}  ml={r['ml_hidden_score']:.2f}  "
              f"rule={r['hidden_gem_score']:.1f}  {r['name'][:40]:<40}  type={r['type']}")

    return rf, scaler, df


if __name__ == "__main__":
    train_model()
