# Project Audit Report — AI-Based Warehouse & Inventory Management System

**Audit Date:** 2026-07-15
**Auditor:** Automated Technical Audit
**Files Inspected:** 48 source files across backend and frontend

---

## 1. Executive Summary

This project is a **functional FYP-grade inventory management system** with genuine AI capabilities (Random Forest demand forecasting, QR-code-based computer vision scanning). The system has a working approval workflow for stock requests but has **critical gaps in the purchase order receiving/approval workflow** as specified in the requirements. The codebase is well-organized but has several security, data-integrity, and workflow-correctness issues that must be addressed before production use.

### Overall Verdict

| Dimension | Score | Verdict |
|---|---|---|
| Academic Demo Readiness | **72/100** | Passable with known gaps |
| MVP Readiness | **45/100** | Significant workflow & security gaps |
| SME Product Readiness | **25/100** | Missing core commercial features |
| Enterprise Readiness | **10/100** | Not designed for enterprise scale |

---

## 2. Architecture Summary

### Technology Stack

| Component | Technology | Version |
|---|---|---|
| Frontend Framework | Next.js (App Router) | 16.2.4 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Charts | Recharts | 3.8.1 |
| QR Scanning | html5-qrcode | 2.3.8 |
| Backend Framework | FastAPI | latest |
| ORM | SQLAlchemy | latest |
| Database | MySQL (via PyMySQL) | — |
| Authentication | JWT (python-jose) | — |
| Password Hashing | bcrypt (passlib) | — |
| AI/ML | scikit-learn (RandomForestRegressor) | latest |
| Computer Vision | OpenCV (cv2) | latest |
| Task Scheduling | APScheduler | latest |
| Language | Python 3.x (backend), TypeScript (frontend) | — |

### Architecture Pattern

- **Frontend:** Next.js App Router with client-side rendering (`'use client'` on all pages)
- **Backend:** FastAPI REST API with SQLAlchemy ORM
- **Auth:** JWT Bearer tokens stored in localStorage
- **State Management:** React Context (AuthContext only) + local component state
- **API Communication:** Custom `apiFetch` wrapper with auto-token injection

### Folder Structure

```
├── app/                    # Backend (FastAPI)
│   ├── ai/                 # AI modules (forecasting, CV)
│   │   ├── forecasting.py  # Random Forest demand forecasting
│   │   ├── cv_counting.py  # QR code conveyor belt scanner
│   │   └── rf_model.pkl    # Trained model (2.7GB)
│   ├── core/               # Security & dependencies
│   │   ├── security.py     # JWT, password hashing
│   │   └── dependencies.py # Auth guards, DB sessions
│   ├── routes/             # API endpoint handlers
│   │   ├── auth.py         # Authentication & user management
│   │   ├── products.py     # Product CRUD
│   │   ├── stock.py        # Stock transactions & approval workflow
│   │   ├── purchase_orders.py  # Purchase order management
│   │   ├── categories.py   # Category CRUD
│   │   ├── alerts.py       # Alert/notification system
│   │   ├── dashboard.py    # Dashboard aggregations
│   │   ├── forecast.py     # Forecast API endpoints
│   │   └── auto_order_router.py # Auto PO generation
│   ├── schemas/            # Pydantic request/response models
│   ├── models.py           # SQLAlchemy ORM models
│   ├── database.py         # DB connection config
│   ├── main.py             # FastAPI app entry point
│   ├── init_db.py          # Database seeding script
│   └── migrate_rbac.py     # RBAC migration script
├── frontend/               # Frontend (Next.js)
│   └── src/
│       ├── app/            # Pages (App Router)
│       ├── components/     # Shared components (3 files)
│       ├── context/        # AuthContext
│       └── lib/            # API client helper
├── requirements.txt        # Python dependencies
├── walmart.csv             # Training data (64MB)
└── inventory.db            # SQLite database file (stale?)
```

---

## 3. Working Modules

### ✅ Fully Functional

| Module | Evidence |
|---|---|
| **User Authentication (Login/Logout)** | JWT flow via `/auth/login`, `/auth/me`; frontend AuthContext with protected routes |
| **User Management (CRUD)** | Admin-only register, list, update, delete users via `/auth/*` |
| **Product Management (CRUD)** | Create, read, update, delete with SKU uniqueness validation |
| **Category Management (CRUD)** | Full CRUD with referential integrity checks |
| **Dashboard (Real Data)** | All KPIs from live DB queries — not mocked |
| **Alerts/Notifications System** | Role-filtered alerts, resolve workflow, in-app notification dropdown |
| **AI Demand Forecasting** | Real RandomForest model, trained on walmart.csv sales data |
| **Reorder Suggestions** | AI-driven, considers incoming POs, identifies shortfalls |
| **Auto PO Generation** | Weekly forecast creates purchase orders for deficits |

### ⚠️ Partially Functional

| Module | Status | Issue |
|---|---|---|
| **Stock Request Approval Workflow** | Mostly works | Self-approval block exists; missing rejection reason storage on the transaction record itself |
| **Purchase Order Workflow** | Partially works | Does NOT follow required receiving/approval flow — see critical findings |
| **CV Scanner (Frontend)** | Works for QR scanning | Uses html5-qrcode, submits bulk pending requests; no object detection |
| **CV Scanner (Backend Script)** | Standalone only | `cv_counting.py` is a CLI webcam script, not integrated into the web app |
| **Role-Based Access Control** | Backend enforced | Missing "auditor" role entirely; admin can't do everything |

### ❌ Broken or Missing

| Module | Status |
|---|---|
| **Purchase Order Receiving Workflow** | BROKEN — does not match required flow |
| **Auditor Role** | MISSING — not in schema, not in code |
| **Supplier Management UI** | MISSING — model exists, no CRUD routes or pages |
| **Audit Logs** | MISSING — no dedicated audit_logs table |
| **Reports Module** | MISSING — no report generation endpoints |
| **Natural Language Query** | MISSING — not implemented at all |
| **Export (CSV/PDF/Excel)** | MISSING — Export button exists in UI but does nothing |
| **Warehouse/Location Management** | MISSING — single warehouse only |
| **Batch/Serial/Expiry Tracking** | MISSING — not in schema |
| **Sales Orders / Stock-Out Workflow** | MISSING — no sales order management |
| **Email Notifications** | MISSING — in-app only |

---

## 4. Critical Findings

### 🔴 CRITICAL: Purchase Order Receiving Workflow Does NOT Match Requirements

**Required Flow:**
1. Manager creates PO → 2. Staff receives → 3. Staff marks as received → 4. Pending approval → 5. Manager approves → 6. Inventory updates → 7. Stock-in transaction created

**Actual Implementation:**
- POs go: `Scheduled` → Staff marks `Pending Approval` → Manager sets `Completed`
- When manager sets status to `Completed`, inventory is updated **immediately in the same endpoint** via `update_order_status()` at `purchase_orders.py:122-139`
- There is **no separate receiving record** — staff cannot record received quantities (only the original order quantity is used)
- There is **no rejection flow** for POs — the `reject_purchase_order()` endpoint only works on `Scheduled` status orders, not `Pending Approval` ones
- There is **no resubmission flow** for rejected POs
- PO uses **single product per order** (not multi-product)
- **No received_quantity field** — always uses `order_quantity`
- **No partial receiving** support
- **No over-receiving prevention**
- The `approve_purchase_order()` endpoint changes status to `Approved` but does **NOT update inventory** — it's a different flow from the `Completed` status path

### 🔴 CRITICAL: Hardcoded JWT Secret Key

In `security.py:6`: `SECRET_KEY = "warehouse-secret-key"` — hardcoded, not from environment variable. Anyone who reads the source code can forge JWT tokens.

### 🔴 CRITICAL: Hardcoded Database Credentials

In `database.py:4`: `DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/warehouse"` — root credentials hardcoded.

### 🔴 CRITICAL: No Database Transactions for Approval

The approval flow in `stock.py:202-257` and `purchase_orders.py:122-163` does not use explicit database transactions. If the process crashes between updating inventory and creating the stock transaction, data can become inconsistent.

### 🔴 CRITICAL: No Idempotency Protection on Approvals

There is a check `if tx.status != "pending"` but no database-level locking. Two managers clicking approve simultaneously could theoretically create duplicate inventory updates (race condition).

### 🟡 HIGH: Missing Auditor Role

The `Users` model defines roles as `Enum("admin", "manager", "staff")`. There is no "auditor" role. The requirements specify Auditor as a main user type.

### 🟡 HIGH: No Audit Log Table

There is no `audit_logs` table. The `Alerts` table is used as a pseudo-notification system but does not capture previous values, new values, IP addresses, or serve as a true audit trail. Alerts can also be resolved (effectively hidden), which violates audit immutability.

### 🟡 HIGH: Rejection Reason Not Stored on Stock Transactions

When a stock request is rejected (`stock.py:305`), the rejection reason is sent in an alert message but is **not stored on the StockTransactions record itself** — `tx.reason` is not updated with the rejection reason.

### 🟡 HIGH: Auto-Order Router Indentation Bug

In `auto_order_router.py:76-82`, the code inside `if order_qty > 0:` has incorrect indentation — the lines creating `new_order` are double-indented inside the if block. This is valid Python (treated as an inner block), but the extra indentation is inconsistent and confusing.

### 🟡 MEDIUM: No .env File or Environment Variable Usage

No `.env` file exists. No environment variables are used for configuration. All config (DB URL, JWT secret, CORS origins) is hardcoded.

### 🟡 MEDIUM: inventory.db File at Root and in App

There's an `inventory.db` file at the project root (160KB) that appears to be a stale SQLite database, even though the app uses MySQL. This is confusing.

### 🟡 MEDIUM: Low-Stock Alert Type Mismatch

In `stock.py:61`, the code checks for existing alerts with `alert_type == "LOW"`, but creates new alerts with `alert_type == "LOW_STOCK"` at line 66. This means duplicate low-stock alerts can be created because the check never matches.

### 🟡 MEDIUM: `backend.log` and `init_db_error.log` Committed

Log files are present in the repository root. These should be in `.gitignore`.

### 🟡 MEDIUM: 2.7GB Model File in Repository

`rf_model.pkl` is 2.7GB and appears to be tracked (though listed in `.gitignore`). This would cause major issues if pushed to git.

---

## 5. Security Findings

| # | Severity | Finding |
|---|---|---|
| S1 | 🔴 Critical | JWT secret key hardcoded in source |
| S2 | 🔴 Critical | MySQL root credentials hardcoded |
| S3 | 🟡 High | No rate limiting on login endpoint |
| S4 | 🟡 High | No token expiry refresh mechanism |
| S5 | 🟡 High | Token stored in localStorage (XSS vulnerable) |
| S6 | 🟡 High | No CSRF protection |
| S7 | 🟡 Medium | No password complexity requirements |
| S8 | 🟡 Medium | User deletion doesn't invalidate tokens |
| S9 | 🟡 Medium | No input sanitization beyond Pydantic |
| S10 | 🟢 Low | CORS allows regex matching — could be too permissive |

---

## 6. Code Quality Findings

| # | Issue | Location |
|---|---|---|
| Q1 | `'use client'` on root layout prevents SSR/SEO | `layout.tsx:1` |
| Q2 | No TypeScript interfaces for API responses | All frontend pages use `any` types |
| Q3 | `api_checklist.md` is outdated — missing many newer endpoints | Root |
| Q4 | `scratch/` directory exists with unknown purpose | Root |
| Q5 | Inconsistent status naming: "Completed" vs "Approved" in PO flow | `purchase_orders.py` |
| Q6 | Product deletion doesn't check for pending POs or transactions | `products.py:169` |
| Q7 | No test files exist anywhere in the project | — |
| Q8 | No error boundaries in React components | — |
| Q9 | Frontend "Forgot password" link is a dead `#` link | `login/page.tsx:94` |
| Q10 | "Remember me" checkbox does nothing | `login/page.tsx:120` |

---

## 7. Top 10 Risks

1. **Purchase Order workflow doesn't match requirements** — core project specification violation
2. **No audit logs** — required feature is completely absent
3. **Hardcoded secrets** — immediate security vulnerability
4. **No database transactions** — data integrity at risk during approvals
5. **Missing auditor role** — required user type not implemented
6. **No supplier management UI** — supplier data only from seed, not manageable
7. **No reports** — required feature is completely absent
8. **No natural language query** — stated AI feature not implemented
9. **Race conditions on concurrent approvals** — could duplicate inventory
10. **No test suite** — zero automated tests

---

## 8. Overall Readiness Assessment

### Academic Demonstration (72/100)
The system has a polished UI, real AI forecasting, working auth, and enough features to demonstrate core inventory concepts. However, the purchase order workflow — a centerpiece requirement — has significant gaps that would be noticed by an informed evaluator.

### MVP Readiness (45/100)
Critical workflow issues (PO receiving), missing audit trails, hardcoded credentials, and no reports make this unsuitable as a minimum viable product. The stock request approval workflow works, but the purchase order flow — the more important one per requirements — does not meet specifications.

### SME Product Readiness (25/100)
Missing supplier management, multi-warehouse support, proper reporting, exports, batch/serial tracking, and sales orders. No email notifications. No production-grade security configuration.

### Enterprise Readiness (10/100)
Single-warehouse design, no ERP integration, no batch/serial/expiry tracking, no physical inventory counting, no storage location management, no database migrations framework, and no horizontal scaling considerations.
