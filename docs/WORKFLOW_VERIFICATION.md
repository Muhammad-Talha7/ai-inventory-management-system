# Workflow Verification Report

**Focus:** Purchase and Receiving Workflow + Stock Request Approval Workflow

---

## 1. Purchase Order Workflow — Detailed Verification

### 1.1 Required Workflow (Per Project Specification)

| Step | Actor | Action | Expected Result |
|---|---|---|---|
| 1 | Manager | Creates purchase order | PO created with "Scheduled" status |
| 2 | System | PO exists in Scheduled state | Waiting for supplier delivery |
| 3 | Staff | Receives goods from supplier | Staff records received quantities |
| 4 | Staff | Marks order as received | Status → "Pending Approval" |
| 5 | Manager | Reviews received quantities | Manager verifies received vs ordered |
| 6 | Manager | Approves the receiving | Status → "Approved", inventory updated |
| 7 | System | Inventory updated | product_id.current_stock += received_quantity |
| 8 | System | Stock-in transaction created | New stock_transaction with type="IN" |
| 9 | System | Audit log created | Immutable record of the change |
| 10 | System | Alerts cleared/generated | Low-stock alerts updated |

### 1.2 Actual Implementation (What the Code Does)

#### Step 1: Manager Creates PO ✅

**Backend:** `purchase_orders.py:34-61` (`create_manual_purchase_order`)
- Creates PO with `status="Scheduled"`
- Records `product_id` and `order_quantity`
- Only `manager` role allowed

**Frontend:** `purchase-orders/page.tsx:109-132` (Manual Order modal)
- Manager clicks "Manual Order" → modal → submits to `/purchase-orders/manual`
- Product selector with search
- Quantity input

**Verdict:** ✅ Correct

---

#### Step 2: PO Exists as Scheduled ✅

**Backend:** `purchase_orders.py:10-32` (`get_purchase_orders`)
- Returns POs with weekly pagination
- Includes product_name and sku via join

**Frontend:** `purchase-orders/page.tsx:37-53` (order list)
- Displays orders in table with status badges

**Verdict:** ✅ Correct

---

#### Step 3: Staff Receives Goods ❌ NOT IMPLEMENTED

**Required:** Staff should record actual received quantities (which may differ from ordered).

**Actual:** There is NO receiving step. Staff can only click "Mark Received" which directly sends a PATCH request to change status to "Pending Approval".

**Evidence:**
```typescript
// purchase-orders/page.tsx:84-93
const handleMarkReceived = async (orderId: number) => {
    await apiFetch(`/purchase-orders/${orderId}/status?status=Pending Approval`, {
        method: 'PATCH',
    });
};
```

**Missing:**
- No `received_quantity` input field
- No `receiving_notes` field
- No partial receiving support
- No damage/shortage reporting
- No GRN (Goods Received Note) generation

---

#### Step 4: Staff Marks as Received → Pending Approval ⚠️ PARTIAL

**Backend:** `purchase_orders.py:64-120` (`update_order_status`)
- Accepts any status string via query parameter
- Staff can set "Pending Approval" (but only checks `require_role("staff")` for this transition)
- No validation of state transitions — any status can be set

**Evidence:**
```python
# purchase_orders.py:97-100
if new_status == "Pending Approval":
    require_role("staff")  # But doesn't verify current status
```

Wait — actually looking more carefully, the `update_order_status` function has different role checks per status but doesn't enforce valid transitions:

```python
# purchase_orders.py:64-120
@router.patch("/{order_id}/status")
async def update_order_status(order_id: int, status: str, ...):
```

The status transitions are not validated — a staff member could theoretically set an order from "Completed" back to "Scheduled".

**Verdict:** ⚠️ Status change works but lacks transition validation and receiving data capture

---

#### Step 5: Manager Reviews Received Quantities ❌ NOT POSSIBLE

**Required:** Manager should see received_quantity vs order_quantity and verify.

**Actual:** There is no `received_quantity` field. Manager only sees the original `order_quantity`. There is nothing to review — they can only blindly approve.

---

#### Step 6: Manager Approves → Inventory Updated ⚠️ INCONSISTENT

There are TWO different approval paths, and they do different things:

**Path A — via `/status?status=Completed` (Used by frontend):**
```python
# purchase_orders.py:122-139
if new_status == "Completed" and order.status == "Pending Approval":
    inv = db.query(Inventory).filter(Inventory.product_id == order.product_id).first()
    if inv:
        inv.current_stock += order.order_quantity  # ← Updates inventory
        inv.last_updated = datetime.utcnow()
    # Creates stock-in transaction
    db.add(StockTransactions(
        product_id=order.product_id,
        user_id=current_user.user_id,
        quantity=order.order_quantity,
        type="IN",
        source=f"Purchase Order #{order.order_id}",
        status="approved"
    ))
```

**Path B — via `/approve` endpoint (NOT used by frontend):**
```python
# purchase_orders.py:142-163
@router.put("/{order_id}/approve")
async def approve_purchase_order(...):
    order.status = "Approved"  # ← Does NOT update inventory
    order.approved_by = current_user.user_id
    order.approved_at = datetime.utcnow()
```

**Finding:** The frontend uses Path A (which updates inventory), but there's also Path B which only changes the status without updating inventory. This is confusing and could lead to inventory inconsistencies if Path B is accidentally used.

---

#### Step 7: Inventory Updated ⚠️ WORKS BUT WITH ISSUES

- Uses `order_quantity` instead of `received_quantity` (which doesn't exist)
- No database transaction wrapping — if crash occurs between inventory update and stock transaction creation, data becomes inconsistent
- No check for maximum stock levels

---

#### Step 8: Stock-In Transaction Created ✅ WORKS

A `StockTransactions` record is created with:
- `type="IN"`
- `source="Purchase Order #{order_id}"`
- `status="approved"`
- Correct quantity from the PO

---

#### Step 9: Audit Log Created ❌ NOT IMPLEMENTED

No `audit_logs` table exists. No audit log record is created for PO approval.

---

#### Step 10: Alerts Updated ❌ NOT IMPLEMENTED

When a PO is completed, no alert is generated. The low-stock alert check only runs during stock transactions via `_check_low_stock_alert()`, but this function is NOT called during PO completion.

---

### 1.3 PO Workflow Gap Summary

| Step | Required | Actual | Gap |
|---|---|---|---|
| Create PO | ✅ | ✅ | None |
| Receive Goods | Record received qty | No receiving step | 🔴 Critical |
| Mark Received | Capture receiving data | Status change only | 🔴 Critical |
| Manager Review | Compare received vs ordered | Nothing to review | 🔴 Critical |
| Manager Approve | Approve based on review | Blind approval | 🟡 High |
| Inventory Update | By received qty | By order qty | 🟡 High |
| Stock Transaction | ✅ | ✅ | None |
| Audit Log | Immutable record | ❌ Missing | 🔴 Critical |
| Alert Update | Update low-stock alerts | ❌ Missing | 🟡 Medium |

---

## 2. Stock Request Approval Workflow — Detailed Verification

### 2.1 Expected Flow

1. Staff creates stock change request (IN or OUT)
2. Request enters "pending" status
3. Manager reviews and approves or rejects
4. If approved → inventory updated, stock transaction finalized
5. If rejected → staff notified, can resubmit

### 2.2 Actual Implementation

#### Step 1: Staff Creates Request ✅

**Backend:** `stock.py:140-183` (`create_stock_request`)
- Creates `StockTransactions` with `status="pending"`, `requested_by=user_id`
- Creates alert for manager: `alert_type="STOCK_REQ_SUBMITTED"`
- Validates product exists, quantity > 0
- For OUT requests: validates sufficient stock

**Frontend:** `stock/page.tsx:64-86` (transaction modal)
- Product selection, type (IN/OUT), quantity, source

---

#### Step 2: Pending Status ✅

- Transaction stored with `status="pending"`
- Inventory NOT modified yet
- Appears in `/stock/requests` endpoint

---

#### Step 3: Manager Approves ✅ (with issues)

**Backend:** `stock.py:192-257` (`approve_stock_request`)
- Validates `tx.status == "pending"`
- Calls `_apply_inventory_change()` to update stock
- Sets `tx.status = "approved"`, `tx.approved_by`, `tx.approved_at`
- Creates approval alert

**Issues:**
- No self-approval validation on backend — frontend blocks it but API doesn't
- No database-level locking — race condition possible
- No explicit transaction wrapping

---

#### Step 4: Manager Rejects ✅ (with issues)

**Backend:** `stock.py:260-312` (`reject_stock_request`)
- Sets `tx.status = "rejected"`
- Creates rejection alert with reason
- Does NOT store reason on `tx.reason` field

**Frontend:** Uses `window.prompt()` for rejection reason — poor UX

---

#### Step 5: Staff Resubmits ✅

**Frontend:** `stock-requests/page.tsx:96-119` (`handleResubmit`)
- Creates a NEW stock request (copy of rejected one with new reason)
- The original rejected request remains in history

---

### 2.3 Stock Request Workflow Verdict

| Step | Status | Issues |
|---|---|---|
| Create Request | ✅ | None |
| Pending State | ✅ | None |
| Manager Approve | ✅ | No backend self-approval check, no DB locking |
| Manager Reject | ⚠️ | Reason not stored on transaction record |
| Staff Resubmit | ✅ | Creates new request (not update of old one) |
| Inventory Update | ✅ | Correct direction (IN adds, OUT subtracts) |
| Alert Generation | ✅ | Alerts created for submit, approve, reject |
| Audit Log | ❌ | No audit_logs table |

**Overall:** The stock request workflow is **substantially correct** and functional, with minor issues. It is significantly more complete than the purchase order workflow.

---

## 3. Auto-Order Workflow Verification

### 3.1 Flow

1. Manager/Admin clicks "Run Weekly AI Forecast" button
2. Backend calls `bulk_forecast_demand(weeks=4)`
3. For each product: `deficit = projected_demand - (current_stock + incoming_PO_quantities)`
4. If deficit > 0: create PO with `status="Scheduled"`, `order_quantity=deficit`
5. Returns count of orders created

### 3.2 Verification

**Backend:** `auto_order_router.py:19-93`
- Uses cached model for bulk prediction
- Correctly subtracts existing incoming POs (Scheduled + Pending Approval)
- Creates POs with "Scheduled" status
- Returns `{ orders_created, details[] }`

**Verdict:** ✅ Works correctly. The auto-generated POs then follow the same (flawed) receiving/approval workflow.

---

## 4. Overdue PO Check (Scheduler)

**Backend:** `main.py:27-46` (`check_overdue_orders`)
- Runs daily via APScheduler
- Finds POs with `status="Scheduled"` older than 7 days
- Changes their status to `"Overdue"` (but this status isn't handled anywhere in UI)
- Creates alert for manager

**Issue:** "Overdue" status is not displayed in the frontend's status badge styling — it would render with the default gray style.
