# This module implements demand forecasting using historical sales data and scikit-learn models

import os
import pickle
import logging
from datetime import timedelta

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

from app.database import SessionLocal
from app.models import SalesHistory, Forecasts

logger = logging.getLogger(__name__)

# Path to the persisted model file
MODEL_PATH = os.path.join(os.path.dirname(__file__), "rf_model.pkl")

# In-memory cache so we don't read from disk on every request
_cached_model = None
_cached_encoders = None


def _build_features(df: pd.DataFrame, le_weather: LabelEncoder, le_season: LabelEncoder, fit: bool = False):
    """
    Build the feature matrix from a SalesHistory DataFrame.
    If fit=True, fit the label encoders; otherwise transform only.
    """
    # Date-derived features
    df["week"] = df["date"].dt.isocalendar().week.astype(int)
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year

    # Label encode categorical columns
    if fit:
        df["weather_encoded"] = le_weather.fit_transform(df["weather_condition"].astype(str))
        df["season_encoded"] = le_season.fit_transform(df["seasonality"].astype(str))
    else:
        df["weather_encoded"] = le_weather.transform(df["weather_condition"].astype(str))
        df["season_encoded"] = le_season.transform(df["seasonality"].astype(str))

    feature_cols = [
        "unit_price", "discount", "is_holiday_promotion", "competitor_pricing",
        "week", "month", "year", "weather_encoded", "season_encoded",
    ]
    return df[feature_cols]


def train_model():
    """
    Load all SalesHistory records, train a RandomForestRegressor on
    quantity_sold, and save the model + encoders to disk.
    """
    global _cached_model, _cached_encoders

    logger.info("Starting model training...")
    db = SessionLocal()
    try:
        rows = db.query(SalesHistory).all()
        if not rows:
            raise ValueError("No SalesHistory data found. Seed the database first.")

        # Build a DataFrame from ORM objects
        data = []
        for r in rows:
            data.append({
                "unit_price": float(r.unit_price),
                "discount": float(r.discount),
                "is_holiday_promotion": int(r.is_holiday_promotion),
                "competitor_pricing": float(r.competitor_pricing),
                "weather_condition": r.weather_condition,
                "seasonality": r.seasonality,
                "date": pd.Timestamp(r.date),
                "quantity_sold": int(r.quantity_sold),
            })
        df = pd.DataFrame(data)

        le_weather = LabelEncoder()
        le_season = LabelEncoder()

        X = _build_features(df, le_weather, le_season, fit=True)
        y = df["quantity_sold"]

        model = RandomForestRegressor(n_estimators=100, n_jobs=-1, random_state=42)
        model.fit(X, y)

        # Persist model + encoders
        payload = {
            "model": model,
            "le_weather": le_weather,
            "le_season": le_season,
        }
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(payload, f)

        # Update in-memory cache
        _cached_model = model
        _cached_encoders = {"le_weather": le_weather, "le_season": le_season}

        logger.info("Model trained and saved to %s", MODEL_PATH)
        return {"rows_trained": len(df), "features": list(X.columns)}

    finally:
        db.close()


def load_model():
    """Load the model from disk into memory. Returns True if successful."""
    global _cached_model, _cached_encoders

    if not os.path.exists(MODEL_PATH):
        return False

    with open(MODEL_PATH, "rb") as f:
        payload = pickle.load(f)

    _cached_model = payload["model"]
    _cached_encoders = {
        "le_weather": payload["le_weather"],
        "le_season": payload["le_season"],
    }
    logger.info("Model loaded from %s", MODEL_PATH)
    return True


def forecast_product(product_id: str, weeks: int = 4):
    """
    Predict demand for the next N weeks for a given product.
    Uses the most recent SalesHistory row as the base, then advances
    the date week by week.  Saves predictions to the Forecasts table.
    """
    global _cached_model, _cached_encoders

    if _cached_model is None or _cached_encoders is None:
        # Try loading from disk
        if not load_model():
            raise FileNotFoundError(
                "No trained model found. Hit POST /forecast/train first."
            )

    db = SessionLocal()
    try:
        # Get the most recent SalesHistory row for this product
        latest = (
            db.query(SalesHistory)
            .filter(SalesHistory.product_id == product_id)
            .order_by(SalesHistory.date.desc())
            .first()
        )
        if not latest:
            raise ValueError(f"No sales history found for product {product_id}")

        le_weather = _cached_encoders["le_weather"]
        le_season = _cached_encoders["le_season"]

        predictions = []
        base_date = pd.Timestamp(latest.date)

        for w in range(1, weeks + 1):
            future_date = base_date + timedelta(weeks=w)

            row_df = pd.DataFrame([{
                "unit_price": float(latest.unit_price),
                "discount": float(latest.discount),
                "is_holiday_promotion": int(latest.is_holiday_promotion),
                "competitor_pricing": float(latest.competitor_pricing),
                "weather_condition": latest.weather_condition,
                "seasonality": latest.seasonality,
                "date": future_date,
            }])

            X_pred = _build_features(row_df, le_weather, le_season, fit=False)
            predicted = float(_cached_model.predict(X_pred)[0])

            predictions.append({
                "week": w,
                "date": future_date.strftime("%Y-%m-%d"),
                "predicted_demand": round(predicted, 2),
            })

            # Upsert into Forecasts table
            existing = (
                db.query(Forecasts)
                .filter(
                    Forecasts.product_id == product_id,
                    Forecasts.forecast_date == future_date.date(),
                )
                .first()
            )
            if existing:
                existing.predicted_demand = round(predicted, 2)
            else:
                db.add(Forecasts(
                    product_id=product_id,
                    forecast_date=future_date.date(),
                    predicted_demand=round(predicted, 2),
                ))

        db.commit()
        return predictions

    finally:
        db.close()
