# Database Audit Report

**Table:** All tables in `warehouse` MySQL database
**Schema Source:** `app/models.py`, `app/migrate_rbac.py`

---

## 1. Schema Overview

### Entity-Relationship Summary

```
users ─────────── stock_transactions (user_id, requested_by, approved_by)
  │                        │
  ├── purchase_orders      │
  │   (approved_by,        │
  │    rejected_by)        │
  │                        │
  └── alerts               │
      (resolved_by)        │
                           │
products ──────────────────┤
  │                        │
  ├── inventory            │
  │                        │
  ├── sales_history        │
  │                        │
  └── forecasts            │
                           │
categories ── products     │
suppliers  ── products     │
```

---

## 2. Table-by-Table Analysis

### 2.1 `users`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| user_id | Integer | PK, AUTO_INCREMENT | ✅ |
| name | String(100) | NOT NULL | ✅ |
| email | String(100) | UNIQUE, NOT NULL | ✅ |
| password_hash | String(200) | NOT NULL | ✅ |
| role | Enum('admin','manager','staff') | DEFAULT 'staff' | 🟡 Missing 'auditor' role |
| created_at | DateTime | DEFAULT now() | ✅ |

**Findings:**
- 🟡 Missing `auditor` role per project requirements
- 🟡 No `is_active` or soft-delete column — cannot deactivate users without deletion
- 🟡 No `last_login` tracking
- 🟡 No `updated_at` column
- ✅ Password hashed with bcrypt via passlib

---

### 2.2 `categories`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| category_id | Integer | PK, AUTO_INCREMENT | ✅ |
| name | String(100) | UNIQUE, NOT NULL | ✅ |

**Findings:**
- 🟡 No `description` column
- 🟡 No `created_at` / `updated_at` timestamps
- 🟡 No soft-delete support
- ✅ UNIQUE on name prevents duplicates

---

### 2.3 `suppliers`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| supplier_id | String(50) | PK | ✅ |
| name | String(100) | NOT NULL | ✅ |
| contact_info | String(200) | nullable | ✅ |

**Findings:**
- 🔴 No CRUD routes — suppliers are created only during seed
- 🔴 No frontend page for supplier management
- 🟡 Missing fields: email, phone, address, payment terms, lead time
- 🟡 `supplier_id` is a string PK — not auto-generated, fragile
- 🟡 No `created_at` / `updated_at`

---

### 2.4 `products`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| product_id | String(50) | PK | ⚠️ Not auto-generated |
| product_name | String(150) | NOT NULL | ✅ |
| sku | String(50) | UNIQUE, NOT NULL | ✅ |
| category_id | Integer | FK → categories | ✅ |
| supplier_id | String(50) | FK → suppliers | ✅ |
| unit_price | Numeric(10,2) | DEFAULT 0 | ✅ |
| cost_price | Numeric(10,2) | DEFAULT 0 | ✅ |

**Findings:**
- 🟡 `product_id` is user-provided (e.g., "PROD001") — collision risk
- 🟡 No `description`, `image_url`, `weight`, `dimensions` columns
- 🟡 No `is_active` flag for discontinued products
- 🟡 No `created_at` / `updated_at`
- 🟡 Cascade-delete from supplier could be dangerous (if supplier is deleted, products remain orphaned)

---

### 2.5 `inventory`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| inventory_id | Integer | PK, AUTO_INCREMENT | ✅ |
| product_id | String(50) | FK → products, UNIQUE | ✅ |
| current_stock | Integer | DEFAULT 0 | ✅ |
| min_stock | Integer | DEFAULT 50 | ✅ |
| max_stock | Integer | DEFAULT 500 | ✅ |
| last_updated | DateTime | DEFAULT now(), onupdate=now() | ✅ |

**Findings:**
- ✅ Good separation of inventory from product catalog
- 🟡 `min_stock` and `max_stock` defaults are same for all products — should be per-product configurable
- 🟡 No `reorder_point` column separate from `min_stock`
- 🟡 No `location` / `warehouse_id` — single-warehouse design

---

### 2.6 `stock_transactions`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| transaction_id | Integer | PK, AUTO_INCREMENT | ✅ |
| product_id | String(50) | FK → products | ✅ |
| user_id | Integer | FK → users | ✅ |
| quantity | Integer | NOT NULL | ✅ |
| type | String(10) | NOT NULL ("IN"/"OUT") | ✅ |
| source | String(100) | nullable | ✅ |
| timestamp | DateTime | DEFAULT now() | ✅ |
| status | String(20) | DEFAULT 'pending' | ✅ (Added via RBAC migration) |
| requested_by | Integer | FK → users, nullable | ✅ |
| approved_by | Integer | FK → users, nullable | ✅ |
| approved_at | DateTime | nullable | ✅ |
| reason | String(500) | nullable | ✅ |

**Findings:**
- ✅ Approval workflow columns present (status, requested_by, approved_by)
- 🟡 `user_id` and `requested_by` are redundant — `user_id` is set to `current_user.user_id` and `requested_by` is also set to the same value
- 🟡 `type` is a plain string, not an Enum — allows invalid values
- 🟡 `status` is a plain string, not an Enum
- 🟡 Rejection reason goes to alert but not always to `tx.reason`

---

### 2.7 `sales_history`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| id | Integer | PK, AUTO_INCREMENT | ✅ |
| product_id | String(50) | FK → products | ✅ |
| date | Date | NOT NULL | ✅ |
| quantity_sold | Integer | NOT NULL | ✅ |
| unit_price | Numeric(10,2) | — | ✅ |
| discount | Numeric(5,2) | DEFAULT 0 | ✅ |
| weather_condition | String(30) | — | ✅ |
| is_holiday_promotion | Boolean | DEFAULT False | ✅ |
| competitor_pricing | Numeric(10,2) | DEFAULT 0 | ✅ |
| seasonality | String(20) | — | ✅ |

**Findings:**
- ✅ Rich feature set for ML model training
- 🟡 Data comes entirely from walmart.csv seed — no runtime sales recording
- 🟡 No `created_at` timestamp for when the record was added
- 🟡 `weather_condition` and `competitor_pricing` must be manually provided for real usage

---

### 2.8 `forecasts`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| id | Integer | PK, AUTO_INCREMENT | ✅ |
| product_id | String(50) | FK → products | ✅ |
| forecast_date | Date | NOT NULL | ✅ |
| predicted_demand | Numeric(10,2) | — | ✅ |

**Findings:**
- ✅ Correctly upserted by forecasting module
- 🟡 No `model_version` or `confidence_interval` columns
- 🟡 No `created_at` timestamp

---

### 2.9 `purchase_orders`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| order_id | Integer | PK, AUTO_INCREMENT | ✅ |
| product_id | String(50) | FK → products | ✅ |
| order_quantity | Integer | NOT NULL | ✅ |
| status | String(30) | NOT NULL | ✅ |
| created_at | DateTime | DEFAULT now() | ✅ |
| approved_by | Integer | FK → users, nullable | ✅ (Added via RBAC migration) |
| approved_at | DateTime | nullable | ✅ |
| rejected_by | Integer | FK → users, nullable | ✅ |

**Findings:**
- 🔴 **No `received_quantity` column** — cannot track partial receiving
- 🔴 **No `received_at` timestamp** — cannot track when goods arrived
- 🔴 **No `received_by` column** — cannot track who received the goods
- 🟡 Single product per PO — no `purchase_order_items` table
- 🟡 No `supplier_id` link — POs don't track which supplier to order from
- 🟡 No `expected_delivery_date` column
- 🟡 `status` is plain string, not Enum — potential for typos

---

### 2.10 `alerts`

| Column | Type | Constraints | Issue |
|---|---|---|---|
| id | Integer | PK, AUTO_INCREMENT | ✅ |
| product_id | String(50) | FK → products, nullable | ✅ |
| alert_type | String(50) | NOT NULL | ✅ |
| target_role | String(30) | NOT NULL | ✅ |
| message | String(500) | NOT NULL | ✅ |
| is_resolved | Boolean | DEFAULT 0 | ✅ |
| resolved_by | Integer | FK → users, nullable | ✅ |
| resolved_at | DateTime | nullable | ✅ |
| created_at | DateTime | DEFAULT now() | ✅ |

**Findings:**
- ✅ Good role-based targeting
- 🟡 Used as both notification AND pseudo-audit-log — should be separate concerns
- 🟡 Alerts can be "resolved" (hidden), which makes them poor audit records
- 🟡 Alert type mismatch: code checks for `"LOW"` but creates `"LOW_STOCK"` (duplicate alert bug)

---

## 3. Missing Tables

| Required Table | Purpose | Status |
|---|---|---|
| `audit_logs` | Immutable record of all system changes | ❌ Not implemented |
| `warehouses` | Multi-warehouse support | ❌ Not implemented |
| `storage_locations` | Bin/aisle/shelf tracking | ❌ Not implemented |
| `purchase_order_items` | Multi-product POs | ❌ Not implemented |
| `supplier_contacts` | Multiple contacts per supplier | ❌ Not implemented |
| `receiving_records` | Separate receiving from PO approval | ❌ Not implemented |

---

## 4. Referential Integrity Analysis

### Foreign Key Cascade Rules

| FK Relationship | On Delete | Issue |
|---|---|---|
| `products.category_id → categories` | No cascade defined | 🟡 Orphaned products if category deleted (backend checks but not DB-enforced) |
| `products.supplier_id → suppliers` | No cascade defined | 🟡 Same risk |
| `inventory.product_id → products` | No cascade defined | 🟡 Could leave orphaned inventory records |
| `stock_transactions.product_id → products` | No cascade defined | 🟡 Transaction history lost if product deleted |
| `purchase_orders.product_id → products` | No cascade defined | 🟡 POs orphaned if product deleted |

The backend route `DELETE /products/{id}` does NOT check for existing purchase orders or pending transactions before deletion. This could create dangling references.

---

## 5. Index Analysis

### Currently Indexed

- All primary keys (auto-indexed)
- `users.email` (UNIQUE index)
- `products.sku` (UNIQUE index)
- `inventory.product_id` (UNIQUE index)
- `categories.name` (UNIQUE index)

### Missing Recommended Indexes

| Table | Column(s) | Reason |
|---|---|---|
| `stock_transactions` | `product_id, timestamp` | Frequent history queries |
| `stock_transactions` | `status` | Approval workflow filtering |
| `purchase_orders` | `status, created_at` | Weekly pagination queries |
| `alerts` | `is_resolved, target_role` | Dashboard/notification queries |
| `sales_history` | `product_id, date` | Forecasting model queries |
| `forecasts` | `product_id, forecast_date` | Forecast lookup queries |
