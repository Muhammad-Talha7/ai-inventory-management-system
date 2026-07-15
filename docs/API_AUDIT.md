# API Audit Report

**Backend:** FastAPI
**Base URL:** `http://localhost:8000`
**Auth:** JWT Bearer token (Authorization header)

---

## 1. Complete Endpoint Inventory

### 1.1 Auth Routes (`/auth`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| POST | `/auth/register` | ✅ Required | admin | ✅ Works | No password complexity validation |
| POST | `/auth/login` | ❌ Public | — | ✅ Works | No rate limiting; returns token + user |
| GET | `/auth/me` | ✅ Required | any | ✅ Works | Returns user profile |
| GET | `/auth/users` | ✅ Required | admin | ✅ Works | Lists all users |
| PUT | `/auth/users/{user_id}` | ✅ Required | admin | ✅ Works | Can change role, email, password |
| DELETE | `/auth/users/{user_id}` | ✅ Required | admin | ✅ Works | No token invalidation on delete |

---

### 1.2 Product Routes (`/products`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| GET | `/products/` | ✅ Required | any | ✅ Works | Supports search, category filter, sort, pagination |
| POST | `/products/` | ✅ Required | manager | ✅ Works | Creates product + inventory record (0 stock) |
| GET | `/products/{product_id}` | ✅ Required | any | ✅ Works | Includes inventory_quantity join |
| PUT | `/products/{product_id}` | ✅ Required | manager | ✅ Works | Partial update supported |
| DELETE | `/products/{product_id}` | ✅ Required | manager | ⚠️ Partial | Does not check for pending POs/transactions |

**Audit Notes:**
- Product creation assigns `product_id` from the client — server should validate uniqueness (it does via PK constraint)
- `supplier_id` is accepted but not validated against `suppliers` table at the route level
- No image upload capability

---

### 1.3 Category Routes (`/categories`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| GET | `/categories/` | ✅ Required | any | ✅ Works | Returns all categories |
| POST | `/categories/` | ✅ Required | admin/manager | ✅ Works | Duplicate name check |
| GET | `/categories/{id}` | ✅ Required | any | ✅ Works | — |
| PUT | `/categories/{id}` | ✅ Required | admin/manager | ✅ Works | Duplicate name check on update |
| DELETE | `/categories/{id}` | ✅ Required | admin/manager | ✅ Works | Checks for products using category |

---

### 1.4 Stock Routes (`/stock`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| GET | `/stock/` | ✅ Required | any | ✅ Works | Returns all inventory with product details |
| POST | `/stock/transaction` | ✅ Required | any | ✅ Works | Manager → immediate; Staff → pending approval |
| GET | `/stock/{product_id}` | ✅ Required | any | ✅ Works | Single product stock level |
| GET | `/stock/{product_id}/history` | ✅ Required | any | ✅ Works | Transaction history for product |
| POST | `/stock/requests` | ✅ Required | staff | ✅ Works | Submit stock change request |
| GET | `/stock/requests` | ✅ Required | any | ✅ Works | With status, search, pagination |
| POST | `/stock/requests/{id}/approve` | ✅ Required | manager | ✅ Works | Applies inventory change |
| POST | `/stock/requests/{id}/reject` | ✅ Required | manager | ✅ Works | Creates rejection alert |
| POST | `/stock/scan` | ✅ Required | any | ✅ Works | SKU-based single scan |
| POST | `/stock/scan/bulk` | ✅ Required | any | ✅ Works | Batch scan submissions |

**Audit Notes:**
- `POST /stock/transaction`: Manager/admin creates `approved` transactions directly; staff creates `pending` ones — this is correct
- Self-approval is blocked in frontend (`disabled={req.requested_by === user?.user_id}`) but **NOT validated in the backend** — a direct API call could self-approve
- `POST /stock/scan`: The endpoint does a SKU lookup but creates the transaction as `pending` status — correct for approval flow
- Rejection does NOT store the reason on the `stock_transactions.reason` field

---

### 1.5 Purchase Order Routes (`/purchase-orders`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| GET | `/purchase-orders` | ✅ Required | any | ✅ Works | Weekly pagination with has_more |
| POST | `/purchase-orders/manual` | ✅ Required | manager | ✅ Works | Creates "Scheduled" PO |
| PATCH | `/purchase-orders/{id}/status` | ✅ Required | manager/staff | ⚠️ Flawed | See critical findings |
| PUT | `/purchase-orders/{id}/approve` | ✅ Required | manager | ⚠️ Inconsistent | Sets status to "Approved" but does NOT update inventory |
| PUT | `/purchase-orders/{id}/reject` | ✅ Required | manager | ⚠️ Limited | Only rejects "Scheduled" orders |

**Critical Issues with `/purchase-orders/{id}/status`:**
1. Accepts `status` as a query parameter string — no validation against valid transitions
2. When `status == "Completed"`: updates inventory + creates stock-in transaction — bypasses approval step
3. When `status == "Pending Approval"`: only role check, no receiving data captured
4. When `status == "Cancelled"`: only works for "Scheduled" orders
5. No guard preventing status from going backwards (e.g., "Completed" → "Scheduled")

**Status Transition Matrix (Actual):**
```
Scheduled ──→ Pending Approval (staff)
Scheduled ──→ Cancelled (manager)
Scheduled ──→ Approved (via /approve endpoint, manager)
Pending Approval ──→ Completed (via /status?status=Completed, manager)
```

**Status Transition Matrix (Required):**
```
Draft ──→ Scheduled (manager places order)
Scheduled ──→ Received (staff confirms delivery)
Received ──→ Pending Approval (staff submits for approval)
Pending Approval ──→ Approved (manager approves → inventory updated)
Pending Approval ──→ Rejected (manager rejects → staff can resubmit)
Approved ──→ (Terminal state — inventory already updated)
```

---

### 1.6 Alert Routes (`/alerts`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| GET | `/alerts/` | ✅ Required | any | ✅ Works | Role-filtered; supports status param |
| GET | `/alerts/{id}` | ✅ Required | any | ✅ Works | — |
| PUT | `/alerts/{id}/resolve` | ✅ Required | any | ✅ Works | Records resolved_by and resolved_at |

---

### 1.7 Dashboard Routes (`/dashboard`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| GET | `/dashboard/` | ✅ Required | any | ✅ Works | All KPIs from live queries |

---

### 1.8 Forecast Routes (`/forecast`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| POST | `/forecast/train` | ✅ Required | admin/manager | ✅ Works | Trains RF model, saves to disk |
| GET | `/forecast/{product_id}` | ✅ Required | admin/manager | ✅ Works | 4-8 week prediction, saves to DB |
| GET | `/forecast/reorder-suggestions` | ✅ Required | admin/manager | ✅ Works | AI-driven reorder recs |

---

### 1.9 Auto-Order Routes (`/api/forecast`)

| Method | Endpoint | Auth | Role | Status | Issues |
|---|---|---|---|---|---|
| POST | `/api/forecast/run-weekly` | ✅ Required | admin/manager | ✅ Works | Bulk forecast + auto PO creation |

---

## 2. Response Format Consistency

All endpoints return a consistent JSON envelope:
```json
{
  "success": true/false,
  "data": {...},
  "message": "optional message"
}
```

This is good practice and is consistent across all routes.

---

## 3. Missing API Endpoints

| Endpoint | Purpose | Priority |
|---|---|---|
| `GET /suppliers/` | List all suppliers | High |
| `POST /suppliers/` | Create supplier | High |
| `PUT /suppliers/{id}` | Update supplier | High |
| `DELETE /suppliers/{id}` | Delete supplier | Medium |
| `GET /audit-logs` | View immutable audit trail | Critical |
| `GET /reports/inventory` | Inventory report generation | High |
| `GET /reports/transactions` | Transaction report | High |
| `POST /products/{id}/export` | Export product data | Medium |
| `POST /purchase-orders/{id}/receive` | Record PO receiving | Critical |
| `POST /nlp/query` | Natural language inventory query | High |

---

## 4. RBAC Matrix

| Endpoint | admin | manager | staff | auditor |
|---|---|---|---|---|
| Login/Me | ✅ | ✅ | ✅ | N/A |
| Register User | ✅ | ❌ | ❌ | N/A |
| Manage Users | ✅ | ❌ | ❌ | N/A |
| Product CRUD | Read | Full CRUD | Read | N/A |
| Category CRUD | Full | Full | Read | N/A |
| Stock Transaction | Auto-approve | Auto-approve | Pending | N/A |
| Approve Requests | ❌ | ✅ | ❌ | N/A |
| Create PO | ❌ | ✅ | ❌ | N/A |
| Receive PO | ❌ | ❌ | ✅ | N/A |
| Approve PO | ❌ | ✅ | ❌ | N/A |
| Train Model | ✅ | ✅ | ❌ | N/A |
| View Forecasts | ✅ | ✅ | ❌ | N/A |
| Manage Alerts | ✅ | ✅ | ✅ (own) | N/A |

**Note:** Admin role currently does NOT have permission for Product CRUD or PO creation — only `manager` role. This is a design inconsistency where admin is restricted despite being the highest role.
