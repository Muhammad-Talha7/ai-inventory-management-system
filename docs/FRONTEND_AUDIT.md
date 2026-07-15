# Frontend Audit Report

**Framework:** Next.js 16.2.4 (App Router)
**Styling:** Tailwind CSS v4
**Charts:** Recharts 3.8.1
**QR Scanning:** html5-qrcode 2.3.8

---

## 1. Page Inventory

| Route | File | Auth | Role Access | Status |
|---|---|---|---|---|
| `/login` | `app/login/page.tsx` | Public | all | ✅ Works |
| `/` | `app/page.tsx` | Protected | admin, manager, staff | ✅ Works |
| `/inventory` | `app/inventory/page.tsx` | Protected | admin, manager, staff | ✅ Works |
| `/stock` | `app/stock/page.tsx` | Protected | admin, manager, staff | ✅ Works |
| `/stock-requests` | `app/stock-requests/page.tsx` | Protected | admin, manager, staff | ✅ Works |
| `/categories` | `app/categories/page.tsx` | Protected | admin, manager | ✅ Works |
| `/users` | `app/users/page.tsx` | Protected | admin | ✅ Works |
| `/forecasts` | `app/forecasts/page.tsx` | Protected | admin, manager | ✅ Works |
| `/reorder` | `app/reorder/page.tsx` | Protected | admin, manager | ✅ Works |
| `/purchase-orders` | `app/purchase-orders/page.tsx` | Protected | admin, manager, staff | ✅ Works |
| `/scanner` | `app/scanner/page.tsx` | Protected | staff | ✅ Works |
| `/alerts` | `app/alerts/page.tsx` | Protected | admin, manager, staff | ✅ Works |
| `/settings` | `app/settings/page.tsx` | Protected | all | ⚠️ Not verified |

---

## 2. Component Architecture

### Shared Components (3)

| Component | File | Used By |
|---|---|---|
| `Sidebar` | `components/Sidebar.tsx` | Root layout |
| `Header` | `components/Header.tsx` | Root layout |
| `AutoOrderButton` | `components/AutoOrderButton.tsx` | Dashboard |

### Architecture Assessment

- **No component library** — all UI is inline Tailwind
- **No reusable form components** — each page has its own modal/form implementation
- **No reusable table component** — tables are duplicated across pages
- **No toast/notification component** — uses `alert()` and inline messages
- **No loading skeleton component** — each page has custom loading states
- **No error boundary** — errors crash the entire page

---

## 3. Page-by-Page Analysis

### 3.1 Login Page (`/login`)

**Quality:** ✅ Good

- Clean design with gradient background, eye-catching branding
- Email + password with show/hide toggle
- Error state displays correctly
- "Forgot password" link is dead (`href="#"`)
- "Remember me" checkbox does nothing (no implementation)
- No password strength indicator
- No loading skeleton for initial auth check

---

### 3.2 Dashboard (`/`)

**Quality:** ✅ Very Good

- Role-split: Staff gets simplified view, Manager/Admin gets full analytics
- **AI Forecast Chart:** Real Recharts AreaChart with gradient fill, live data
- **Reorder Suggestions Panel:** Shows urgency levels with progress bars
- **AutoOrderButton:** Triggers weekly AI forecast run
- **KPI Cards:** Total products, inventory value, out-of-stock, categories
- **Low Stock Items:** Visual progress bars
- **Operations Summary:** Pending requests, active alerts, out-of-stock count

Issues:
- `fetchForecastPreview` silently fails without any user feedback if model isn't trained
- Hard-coded `?limit=1` to get first product for forecast preview — arbitrary choice
- No date range filtering on recent transactions

---

### 3.3 Inventory Management (`/inventory`)

**Quality:** ✅ Good

- Full CRUD with modals (Add, Edit, Delete, View Details)
- Search with debounce (500ms delay)
- Category filter dropdown
- Sort by name, price, SKU
- Pagination with page numbers
- Stock level progress bars
- Manager-only edit/delete permissions

Issues:
- Hard-coded stock threshold: `product.inventory_quantity < 50` for orange color
- Stock bar: `(product.inventory_quantity / 500) * 100` uses hardcoded max
- "Export" button renders but has no onClick handler
- Product ID entered manually by user — should be auto-generated

---

### 3.4 Stock Management (`/stock`)

**Quality:** ✅ Good

- Stock level cards for each product
- Color-coded status (Healthy, Low, Critical, Overstocked)
- Transaction modal (IN/OUT with quantity and source)
- Transaction history modal per product
- Role-based behavior: Manager auto-approves, Staff submits for approval

Issues:
- Uses `alert()` for error feedback — should use proper toast
- No confirmation dialog before transaction submission
- History modal shows all transactions without pagination

---

### 3.5 Stock Requests (`/stock-requests`)

**Quality:** ✅ Good

- Manager approval/rejection interface
- Self-approval prevention (disabled button with tooltip)
- Rejection reason prompt (window.prompt)
- Staff resubmission for rejected requests
- Search and status filter
- Pagination (Load More)

Issues:
- Uses `window.prompt()` for rejection reason — poor UX
- Self-approval is only blocked in frontend, not backend
- `pendingCount` is calculated from current page data, not server total

---

### 3.6 Purchase Orders (`/purchase-orders`)

**Quality:** ⚠️ Partially Correct

- Weekly pagination (Newer/Older Week)
- Status badges with color coding
- Manual order creation modal (manager only)
- Product search in modal

Issues:
- 🔴 Staff "Mark Received" button directly sets status to "Pending Approval" — skips receiving step
- 🔴 Manager "Approve & Complete" button sets status to "Completed" — bypasses proper approval flow
- Manager "Cancel" button only visible for "Scheduled" status
- No rejection flow visible for "Pending Approval" orders
- No received quantity input — assumes full order was received
- No partial receiving support

---

### 3.7 AI Forecasts (`/forecasts`)

**Quality:** ✅ Very Good

- Product selector with search dropdown
- Recharts AreaChart with gradient fill
- Weekly breakdown sidebar with hover effects
- Model information panel
- Product overview with current stock
- Reorder suggestions banner link
- Train model button with loading state
- "Confidence Interval: 94.2%" is hardcoded, not real

Issues:
- Confidence interval is hardcoded (not from model)
- "Last Trained: Today" is hardcoded
- No comparison between forecast and actual demand

---

### 3.8 Reorder Suggestions (`/reorder`)

**Quality:** ✅ Good (reviewed from router reference, page exists)

- AI-driven suggestions from `/forecast/reorder-suggestions`
- Shows shortfall quantities and urgency

---

### 3.9 CV Scanner (`/scanner`)

**Quality:** ✅ Impressive

- Real QR code scanning via webcam (html5-qrcode)
- IN/OUT mode toggle
- Live session counter
- Scanned items list with SKU and quantity
- Bulk submission to backend
- 3-second cooldown per SKU to prevent duplicates
- Scanning crosshair overlay with animation
- Camera control (start/stop)

Issues:
- "Powered by AI Vision" label is misleading — it's QR code detection, not AI vision
- No barcode support mention (html5-qrcode supports it but UI only says QR)
- Submitted scans go to approval queue — good

---

### 3.10 Alerts (`/alerts`)

**Quality:** ✅ Good (reviewed from Header notification panel)

- In-header notification dropdown
- Role-filtered alerts from backend
- Resolve button with immediate feedback
- Color-coded by alert type
- Link to full alerts page

---

## 4. Frontend-Backend Contract Issues

| Issue | Frontend | Backend | Result |
|---|---|---|---|
| PO receiving flow | Sends `status=Pending Approval` directly | Accepts any string status | Skips receiving step |
| PO approval flow | Sends `status=Completed` | Updates inventory on Completed | Bypasses approval |
| Self-approval block | Button disabled on frontend | Not validated on backend | Bypassable via API |
| Export button | Renders in inventory page | No export endpoint exists | Button does nothing |
| Search bar in header | Renders but never submits | No search endpoint | Non-functional |
| Forgot password link | Renders as `href="#"` | No reset endpoint | Dead link |
| Remember me checkbox | Renders with no handler | No server-side session | Does nothing |

---

## 5. Accessibility Issues

| Issue | Severity |
|---|---|
| No `aria-label` on icon-only buttons | Medium |
| No keyboard navigation support for custom dropdowns | Medium |
| No focus management in modals | Medium |
| No skip-to-content link | Low |
| Color-only status indicators (no text alternative in some places) | Medium |
| Root layout disables server-side rendering — no SEO | Low |

---

## 6. Performance Considerations

| Issue | Impact |
|---|---|
| `'use client'` on root layout | Entire app is client-rendered; no SSR benefits |
| No React.memo() or useMemo() on expensive components | Minor re-renders |
| Dashboard makes 3 API calls on mount | Visible loading states |
| Inventory page fetches categories on every data fetch | Redundant API calls |
| No image optimization | N/A (no product images) |
| 2.7GB model file in project directory | Not a frontend issue but affects build |
