# AI Systems Audit Report

**Modules Audited:**
- `app/ai/forecasting.py` — Demand Forecasting (Random Forest Regressor)
- `app/ai/cv_counting.py` — Computer Vision QR Scanner (standalone)
- `frontend/src/app/scanner/page.tsx` — Web-based QR Scanner
- `app/routes/forecast.py` — Forecast API endpoints
- `app/routes/auto_order_router.py` — Automated PO Generation

---

## 1. Demand Forecasting Module

### 1.1 Architecture

| Component | Implementation |
|---|---|
| Algorithm | `sklearn.ensemble.RandomForestRegressor` |
| Features | unit_price, discount, is_holiday_promotion, competitor_pricing, week, month, year, weather_condition (encoded), seasonality (encoded) |
| Target | `quantity_sold` (integer) |
| Training Data | `sales_history` table (seeded from walmart.csv — 64MB, ~541K rows) |
| Model Storage | Pickle file (`rf_model.pkl`, ~2.7GB) |
| Encoding | `LabelEncoder` for weather_condition and seasonality |
| Hyperparameters | n_estimators=100, n_jobs=-1, random_state=42 |

### 1.2 Training Pipeline

**File:** `forecasting.py:52-107` (`train_model()`)

Flow:
1. Load all `SalesHistory` rows from DB
2. Build DataFrame with feature columns
3. Fit `LabelEncoder` on categorical columns
4. Train `RandomForestRegressor`
5. Save model + encoders as pickle to disk
6. Cache in-memory (`_cached_model`, `_cached_encoders`)

**Strengths:**
- ✅ Real ML model with meaningful features
- ✅ Model persistence to disk with pickle
- ✅ In-memory caching to avoid disk reads on every request
- ✅ Feature engineering (week, month, year from date)
- ✅ Handles missing product data gracefully (returns 0 demand)

**Issues:**
- 🔴 **No train/test split** — model trains on 100% of data, no evaluation metrics
- 🔴 **No cross-validation** — no way to know if model is actually accurate
- 🔴 **Pickle deserialization vulnerability** — `pickle.load()` on untrusted files is a security risk (arbitrary code execution)
- 🟡 **Model file is 2.7GB** — extremely large for a Random Forest with 100 trees; likely due to deep trees and large dataset
- 🟡 **No model versioning** — new training overwrites previous model with no rollback
- 🟡 **LabelEncoder will crash on unseen categories** — if a new weather_condition appears that wasn't in training data, `transform()` raises ValueError
- 🟡 **No feature importance logging** — model trains but doesn't report which features matter most
- 🟡 **Hardcoded "Confidence Interval: 94.2%"** in frontend — this is not from the model
- 🟡 **No automated retraining trigger** — monthly via APScheduler, but no data drift detection

### 1.3 Prediction Pipeline

**File:** `forecasting.py:186-281` (`forecast_product()`)

Flow:
1. Load model from cache (or disk)
2. Get latest `SalesHistory` for the product
3. Generate future dates (1-N weeks ahead)
4. Build features using same encoders
5. Call `model.predict(X_pred)`
6. Save predictions to `forecasts` table (upsert)
7. Return weekly predictions

**Strengths:**
- ✅ Upserts into forecasts table (doesn't create duplicates)
- ✅ Handles products with no sales history (returns 0)
- ✅ Batch prediction for multiple weeks at once

**Issues:**
- 🟡 Uses the **single most recent** SalesHistory row's metadata for all future predictions — assumes discount, weather, etc. remain constant
- 🟡 No confidence intervals or prediction bounds
- 🟡 Prediction horizon is limited to the granularity of training data

### 1.4 Bulk Forecast Pipeline

**File:** `forecasting.py:129-183` (`bulk_forecast_demand()`)

- Used by auto-order system
- Gets latest sales history per product
- Generates 4-week predictions for all products at once
- Returns dict of `product_id → total_predicted_demand`

**Verdict:** ✅ Efficient implementation using vectorized prediction

### 1.5 Monthly Retraining Schedule

**File:** `main.py:48-59`

```python
scheduler.add_job(
    train_model,
    trigger=CronTrigger(day=1, hour=2, minute=0),
    id="monthly_retrain",
    ...
)
```

- Runs on the 1st of every month at 2:00 AM
- Blocks the event loop during training (no async)
- Failure is logged but not alerted

---

## 2. Reorder Suggestions

**File:** `forecast.py:55-107` (`get_reorder_suggestions`)

Flow:
1. Run `bulk_forecast_demand(weeks=4)` for all products
2. For each product with predicted demand:
   - Get `current_stock` from inventory
   - Sum incoming POs (Scheduled + Pending Approval)
   - Calculate `projected_demand = predicted_demand`
   - Calculate `suggested_reorder = projected_demand - current_stock - incoming_POs`
3. Return products where `suggested_reorder > 0`

**Strengths:**
- ✅ Correctly accounts for incoming purchase orders
- ✅ Includes product details (name, SKU, current stock, incoming POs)
- ✅ Sorted by deficit severity

**Issues:**
- 🟡 Does not account for safety stock buffer
- 🟡 Does not consider lead time (how long PO takes to arrive)
- 🟡 `projected_demand` label is misleading — it's the sum of 4 weeks of predictions

---

## 3. Auto PO Generation

**File:** `auto_order_router.py:19-93` (`run_weekly_forecast`)

Flow:
1. Train model first (calls `train_model()`)
2. Get all product forecasts
3. For each product: calculate deficit after accounting for stock + incoming POs
4. If deficit > 0: create PO with `status="Scheduled"`

**Strengths:**
- ✅ End-to-end automation from forecast to PO creation
- ✅ Deduplicates against existing POs
- ✅ Returns detailed report of actions taken

**Issues:**
- 🟡 Retrains model on every run (expensive — could skip if model is recent)
- 🟡 Creates one PO per product (not grouped by supplier)
- 🟡 No approval required for auto-generated POs — they go straight to "Scheduled"
- 🟡 No maximum order limit — could create unreasonably large orders

---

## 4. Computer Vision Module

### 4.1 Backend Script (`cv_counting.py`)

**Type:** Standalone CLI tool (not a web API)

**How it works:**
1. Opens webcam via OpenCV (`cv2.VideoCapture(0)`)
2. Detects QR codes using `cv2.QRCodeDetector()`
3. Extracts SKU from QR data
4. POSTs to `/stock/scan` endpoint with 2-second cooldown per SKU
5. Displays HUD overlay with mode (IN/OUT) and count

**Strengths:**
- ✅ Real OpenCV implementation
- ✅ Per-SKU cooldown to prevent rapid duplicates
- ✅ Background thread for API calls (non-blocking)
- ✅ Visual bounding box and HUD overlay

**Issues:**
- 🔴 **Not integrated into the web app** — standalone CLI script only
- 🔴 `AUTH_TOKEN = ""` is hardcoded empty — requires manual setting
- 🟡 Uses `requests` library (not `httpx` async) — blocks thread
- 🟡 Calls `/stock/scan` which doesn't exist (frontend uses `/stock/scan/bulk`)
- 🟡 No object detection — only QR code scanning (despite "Computer Vision" naming)

### 4.2 Web Scanner (`scanner/page.tsx`)

**Type:** Browser-based QR scanner using html5-qrcode

**How it works:**
1. Uses device camera via `Html5Qrcode` library
2. Scans QR codes in real-time
3. Accumulates scanned items in local state
4. Submits all scans at once via `POST /stock/scan/bulk`
5. Scans become pending stock requests (approval workflow)

**Strengths:**
- ✅ Real QR scanning in the browser
- ✅ 3-second cooldown per SKU
- ✅ Batch submission (more efficient than one-by-one)
- ✅ Integrates with approval workflow
- ✅ IN/OUT mode toggle
- ✅ Beautiful UI with scanning crosshair animation

**Issues:**
- 🟡 "Powered by AI Vision" is misleading — it's QR detection, not AI/ML
- 🟡 "CV Recognition Engine" label is misleading
- 🟡 No barcode scanning mentioned (though html5-qrcode supports it)
- 🟡 Auto-prepends "SKU-" to decoded text — fragile assumption about QR content format

---

## 5. AI Feature Gap Analysis

### Implemented AI Features

| Feature | Status | Quality |
|---|---|---|
| Demand Forecasting (Random Forest) | ✅ Implemented | Real model, meaningful features |
| Reorder Suggestions | ✅ Implemented | AI-driven, accounts for incoming POs |
| Auto PO Generation | ✅ Implemented | End-to-end forecast → PO |
| QR Code Scanning | ✅ Implemented | Real camera-based scanning |

### Missing AI Features (Per Requirements)

| Feature | Status | Effort |
|---|---|---|
| Natural Language Inventory Query | ❌ Not started | High — needs LLM integration |
| Object Detection (Stock Counting) | ❌ Not started | Very High — needs YOLO/similar |
| Anomaly Detection | ❌ Not started | Medium — statistical methods |
| Supplier Lead Time Prediction | ❌ Not started | Medium — needs supplier data |
| ABC Classification | ❌ Not started | Low — simple categorization |
| Demand Clustering | ❌ Not started | Medium — unsupervised learning |

---

## 6. Model Quality Assessment

### Metrics (NOT available — model doesn't compute them)

The model currently provides **no evaluation metrics**. To properly assess model quality, the following should be computed:

| Metric | Purpose | Status |
|---|---|---|
| RMSE | Prediction error magnitude | ❌ Not computed |
| MAE | Average absolute error | ❌ Not computed |
| R² Score | Variance explained | ❌ Not computed |
| MAPE | Percentage error | ❌ Not computed |
| Cross-validation | Generalization ability | ❌ Not computed |

### Recommendations

1. **Add train/test split** (80/20) and compute RMSE, MAE, R² on test set
2. **Add cross-validation** (5-fold) to assess model stability
3. **Log feature importance** from the trained model
4. **Replace hardcoded confidence interval** with actual prediction intervals
5. **Add model versioning** — save models with timestamps, allow rollback
6. **Handle unseen categories** — use `handle_unknown='use_encoded_value'` in encoders or fallback to mode
7. **Consider model compression** — 2.7GB is excessive; try reducing `max_depth` or `n_estimators`
