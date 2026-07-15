# Implementation Roadmap

**Priority:** Requirements compliance > Security > Core features > AI enhancements > Polish

---

## Phase 1: Critical Workflow Fixes (Priority: URGENT)

**Goal:** Make the purchase order and receiving workflow match the project specification.

### 1.1 Database Schema Changes

| Task | Description | Files |
|---|---|---|
| Add `received_quantity` to `purchase_orders` | Track actual received qty vs ordered | `models.py`, `migrate_rbac.py` |
| Add `received_by` to `purchase_orders` | Track who received the goods | `models.py`, `migrate_rbac.py` |
| Add `received_at` to `purchase_orders` | Track when goods were received | `models.py`, `migrate_rbac.py` |
| Add `receiving_notes` to `purchase_orders` | Allow notes during receiving | `models.py`, `migrate_rbac.py` |
| Create `audit_logs` table | Immutable change log | `models.py` |
| Add `auditor` role to Users enum | Support auditor user type | `models.py`, `schemas/user.py` |

### 1.2 Backend API Changes

| Task | Description | Files |
|---|---|---|
| Create `POST /purchase-orders/{id}/receive` | Staff records received qty | `routes/purchase_orders.py` |
| Fix `PATCH /purchase-orders/{id}/status` | Add state transition validation | `routes/purchase_orders.py` |
| Fix `/approve` endpoint | Must update inventory on approval | `routes/purchase_orders.py` |
| Remove `/status?status=Completed` path | Remove direct completion bypass | `routes/purchase_orders.py` |
| Add rejection flow for Pending Approval POs | Manager can reject with reason | `routes/purchase_orders.py` |
| Add self-approval validation on backend | Block approving own requests | `routes/stock.py` |
| Store rejection reason on transaction | Update `tx.reason` on reject | `routes/stock.py` |
| Fix low-stock alert type mismatch | Change "LOW" check to "LOW_STOCK" | `routes/stock.py` |
| Add audit log entries on all state changes | Create audit_log records | All route files |

### 1.3 Frontend Changes

| Task | Description | Files |
|---|---|---|
| Add receiving modal to PO page | Input for received_quantity, notes | `purchase-orders/page.tsx` |
| Update PO action buttons | Separate Receive and Approve flows | `purchase-orders/page.tsx` |
| Add rejection UI for Pending Approval POs | Manager rejection with reason input | `purchase-orders/page.tsx` |
| Update PO status badge for new statuses | "Received", "Rejected" badges | `purchase-orders/page.tsx` |

**Estimated Effort:** 3-5 days

---

## Phase 2: Security Hardening (Priority: HIGH)

### 2.1 Configuration

| Task | Description | Files |
|---|---|---|
| Move secrets to environment variables | JWT_SECRET, DATABASE_URL | `security.py`, `database.py` |
| Create `.env.example` file | Document required env vars | Root |
| Add python-dotenv or Pydantic Settings | Load env vars properly | `database.py`, `security.py` |
| Remove hardcoded CORS origins | Use env var for allowed origins | `main.py` |

### 2.2 Authentication

| Task | Description | Files |
|---|---|---|
| Add rate limiting on login | Prevent brute force | `routes/auth.py` |
| Add password complexity validation | Min length, special chars | `routes/auth.py` |
| Invalidate tokens on user deletion | Prevent deleted user access | `routes/auth.py` |
| Add token refresh mechanism | Short-lived access + refresh token | `core/security.py` |

### 2.3 Data Integrity

| Task | Description | Files |
|---|---|---|
| Add database transaction wrapping | Explicit begin/commit/rollback | `routes/stock.py`, `routes/purchase_orders.py` |
| Add optimistic locking on approvals | Prevent double-approval race conditions | `routes/stock.py` |
| Add cascade rules to FK relationships | Prevent orphaned records | `models.py` |
| Block product deletion with pending POs | Check before delete | `routes/products.py` |

**Estimated Effort:** 2-3 days

---

## Phase 3: Missing Core Features (Priority: HIGH)

### 3.1 Supplier Management

| Task | Description |
|---|---|
| Create supplier CRUD routes | GET, POST, PUT, DELETE |
| Create supplier Pydantic schemas | SupplierCreate, SupplierUpdate, SupplierResponse |
| Create supplier management page | List, create, edit, delete UI |
| Link POs to suppliers | Add supplier_id to purchase_orders |

### 3.2 Reports & Export

| Task | Description |
|---|---|
| Create inventory report endpoint | Stock levels, values, by category |
| Create transaction report endpoint | Filtered by date, type, product |
| Add CSV export for inventory | Download button on inventory page |
| Add CSV export for transactions | Download button on stock page |
| Add PDF report generation | Server-side PDF with reportlab |

### 3.3 Audit Logging

| Task | Description |
|---|---|
| Create audit_logs model | id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, timestamp |
| Create audit log middleware | Auto-capture on all state changes |
| Create audit log view page | Auditor-accessible, read-only |
| Add audit log API endpoint | GET with filters (user, entity, date) |

### 3.4 Multi-Product Purchase Orders

| Task | Description |
|---|---|
| Create `purchase_order_items` table | order_id, product_id, quantity, received_quantity |
| Update PO routes for multi-product | Accept array of items |
| Update PO frontend for multi-product | Multi-item form |

**Estimated Effort:** 5-8 days

---

## Phase 4: AI Enhancements (Priority: MEDIUM)

### 4.1 Model Improvements

| Task | Description |
|---|---|
| Add train/test split | 80/20 split with evaluation metrics |
| Compute and display RMSE, MAE, R² | Show actual model accuracy |
| Add model versioning | Save models with timestamps |
| Handle unseen categories | Fallback encoder for new values |
| Reduce model size | Tune max_depth, n_estimators |
| Replace hardcoded confidence | Compute real prediction intervals |

### 4.2 Natural Language Query (New Feature)

| Task | Description |
|---|---|
| Add NLP query endpoint | POST /nlp/query with text input |
| Integrate LLM (OpenAI or local) | Parse user queries to SQL/actions |
| Create NLP chat interface | Chat-style UI component |
| Add query history | Store and display past queries |

### 4.3 Enhanced CV Features

| Task | Description |
|---|---|
| Add barcode support to web scanner | Configure html5-qrcode for barcodes |
| Add scan history page | View all scanned items over time |
| Add scan analytics | Dashboard of scan volumes |

**Estimated Effort:** 5-10 days

---

## Phase 5: Polish & Production Readiness (Priority: LOW)

### 5.1 Code Quality

| Task | Description |
|---|---|
| Add TypeScript interfaces for all API responses | Replace `any` types |
| Create reusable UI components | Table, Modal, Toast, Form components |
| Add error boundaries | Graceful error handling |
| Add loading skeletons | Consistent loading states |
| Remove dead code | Export button, forgot password, remember me |

### 5.2 Testing

| Task | Description |
|---|---|
| Add pytest unit tests for routes | Test each endpoint |
| Add pytest integration tests | Test workflow sequences |
| Add Playwright/Cypress E2E tests | Test frontend flows |
| Add model evaluation tests | Test prediction quality |

### 5.3 DevOps

| Task | Description |
|---|---|
| Create Dockerfile | Containerize backend |
| Create docker-compose.yml | Backend + MySQL + Frontend |
| Add CI/CD pipeline | GitHub Actions for tests |
| Add database migrations | Alembic migration framework |
| Add API documentation | FastAPI auto-docs + Swagger UI |

### 5.4 UX Improvements

| Task | Description |
|---|---|
| Replace `alert()` calls with toast notifications | Better UX |
| Replace `window.prompt()` with modal dialogs | Better UX |
| Make Export button functional | CSV download |
| Fix "Forgot Password" link | Remove or implement |
| Fix "Remember Me" checkbox | Remove or implement |
| Add keyboard shortcuts | Quick navigation |
| Improve mobile responsiveness | Test on mobile viewports |

**Estimated Effort:** 5-10 days

---

## Timeline Summary

| Phase | Priority | Effort | Deadline Suggestion |
|---|---|---|---|
| Phase 1: Workflow Fixes | 🔴 URGENT | 3-5 days | Immediate |
| Phase 2: Security | 🔴 HIGH | 2-3 days | Week 1 |
| Phase 3: Core Features | 🟡 HIGH | 5-8 days | Week 2-3 |
| Phase 4: AI Enhancements | 🟡 MEDIUM | 5-10 days | Week 3-5 |
| Phase 5: Polish | 🟢 LOW | 5-10 days | Ongoing |

**Total Estimated Effort:** 20-36 days (one developer)
