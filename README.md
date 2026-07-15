# NexStock — AI-Based Warehouse & Inventory Management System

An intelligent warehouse and inventory management platform powered by AI demand forecasting, automated purchase order generation, and computer-vision-based QR scanning.

---

## Features

### Core Inventory Management
- **Product Management** — Full CRUD with SKU tracking, pricing, and category assignment
- **Category Management** — Organize products by categories with referential integrity
- **Stock Tracking** — Real-time stock levels with min/max thresholds and visual indicators
- **Stock-In / Stock-Out** — Record inventory movements with approval workflow
- **Low-Stock Alerts** — Automated alerts when stock falls below minimum threshold

### Purchase & Procurement
- **Purchase Order Management** — Create, track, and manage purchase orders
- **Auto PO Generation** — AI-driven automatic purchase order creation based on demand forecasts
- **Receiving Workflow** — Staff marks goods as received, manager approves
- **Overdue PO Detection** — Scheduled daily check for overdue orders

### Approval Workflows
- **Stock Request Approval** — Staff submits stock change requests; managers approve/reject
- **Self-Approval Prevention** — Users cannot approve their own requests
- **Rejection with Reason** — Managers provide reasons for rejections
- **Staff Resubmission** — Rejected requests can be resubmitted

### AI & Machine Learning
- **Demand Forecasting** — Random Forest Regressor trained on historical sales data
- **Reorder Suggestions** — AI-driven recommendations for products that need restocking
- **Weekly Auto-Forecast** — Automated forecast runs with deficit-based PO generation
- **Monthly Model Retraining** — Scheduled retraining to capture new trends

### Computer Vision
- **QR Code Scanner** — Browser-based camera scanning for stock movements
- **Batch Scanning** — Accumulate scans and submit in bulk
- **IN/OUT Mode** — Toggle between stock-in and stock-out scanning
- **Smart Cooldown** — 3-second per-SKU cooldown prevents duplicates

### Role-Based Access Control
- **Admin** — Full system access, user management
- **Manager** — Product CRUD, PO creation, request approvals, AI forecasts
- **Staff** — Stock transactions, PO receiving, QR scanning

### Dashboard & Analytics
- **Operations Dashboard** — KPIs for products, inventory value, out-of-stock, categories
- **Forecast Charts** — Visual demand prediction with Recharts
- **Reorder Panel** — Urgency-rated reorder suggestions
- **Notification Center** — In-app alert management

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts |
| **Backend** | FastAPI, Python 3.x, SQLAlchemy |
| **Database** | MySQL |
| **AI/ML** | scikit-learn (RandomForestRegressor), pandas, numpy |
| **CV** | html5-qrcode (web), OpenCV (standalone) |
| **Auth** | JWT (python-jose), bcrypt (passlib) |
| **Scheduling** | APScheduler |

---

## Project Structure

```
├── app/                        # FastAPI Backend
│   ├── ai/                     # AI modules
│   │   ├── forecasting.py      # Demand forecasting (Random Forest)
│   │   └── cv_counting.py      # Standalone QR scanner (CLI)
│   ├── core/                   # Security & middleware
│   │   ├── security.py         # JWT, password hashing
│   │   └── dependencies.py     # Auth guards, DB sessions
│   ├── routes/                 # API endpoints
│   │   ├── auth.py             # Authentication & user CRUD
│   │   ├── products.py         # Product management
│   │   ├── stock.py            # Stock transactions & approvals
│   │   ├── purchase_orders.py  # Purchase order management
│   │   ├── categories.py       # Category CRUD
│   │   ├── alerts.py           # Notification system
│   │   ├── dashboard.py        # Dashboard aggregations
│   │   ├── forecast.py         # Forecast endpoints
│   │   └── auto_order_router.py # Auto PO generation
│   ├── schemas/                # Pydantic models
│   ├── models.py               # SQLAlchemy ORM models
│   ├── database.py             # Database connection
│   ├── main.py                 # App entry point
│   └── init_db.py              # Database seeding
├── frontend/                   # Next.js Frontend
│   └── src/
│       ├── app/                # Pages (App Router)
│       │   ├── page.tsx        # Dashboard
│       │   ├── login/          # Authentication
│       │   ├── inventory/      # Product management
│       │   ├── stock/          # Stock management
│       │   ├── stock-requests/ # Approval workflow
│       │   ├── purchase-orders/# PO management
│       │   ├── categories/     # Category management
│       │   ├── users/          # User management (admin)
│       │   ├── forecasts/      # AI forecasting
│       │   ├── reorder/        # Reorder suggestions
│       │   ├── scanner/        # QR scanner
│       │   └── alerts/         # Alert management
│       ├── components/         # Shared components
│       ├── context/            # Auth context
│       └── lib/                # API client
├── docs/                       # Project documentation
├── requirements.txt            # Python dependencies
└── walmart.csv                 # ML training data
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- MySQL 8.0+

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure database (update app/database.py with your credentials)
# Create MySQL database: warehouse

# Seed database
python app/init_db.py

# Run RBAC migrations
python app/migrate_rbac.py

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@warehouse.com | admin123 |
| Manager | manager@warehouse.com | manager123 |
| Staff | staff@warehouse.com | staff123 |

---

## API Documentation

FastAPI provides automatic interactive documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Authenticate and receive JWT token |
| `/auth/me` | GET | Get current user profile |
| `/products/` | GET/POST | List/Create products |
| `/stock/` | GET | Get inventory levels |
| `/stock/transaction` | POST | Create stock movement |
| `/stock/requests` | GET/POST | Stock approval workflow |
| `/purchase-orders` | GET | List purchase orders |
| `/purchase-orders/manual` | POST | Create manual PO |
| `/forecast/{product_id}` | GET | Get demand forecast |
| `/forecast/train` | POST | Train AI model |
| `/forecast/reorder-suggestions` | GET | AI reorder recommendations |
| `/dashboard/` | GET | Dashboard KPIs |
| `/alerts/` | GET | List alerts |
| `/categories/` | GET/POST | Category management |

---

## AI Model Details

### Demand Forecasting

- **Algorithm:** Random Forest Regressor (scikit-learn)
- **Training Data:** Historical sales records (walmart.csv, ~541K rows)
- **Features:** Unit price, discount, holiday promotion, competitor pricing, week, month, year, weather condition, seasonality
- **Target:** Quantity sold
- **Prediction Horizon:** 4-8 weeks
- **Retraining:** Monthly (1st of each month at 2 AM via APScheduler)

### Reorder Suggestions

The system calculates reorder suggestions as:
```
deficit = projected_demand - current_stock - incoming_PO_quantities
if deficit > 0: suggest_reorder(deficit)
```

---

## Documentation

Detailed audit and analysis documents are available in the `/docs` directory:

| Document | Description |
|---|---|
| [PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md) | Comprehensive technical audit |
| [DATABASE_AUDIT.md](docs/DATABASE_AUDIT.md) | Database schema analysis |
| [API_AUDIT.md](docs/API_AUDIT.md) | API endpoint audit |
| [FRONTEND_AUDIT.md](docs/FRONTEND_AUDIT.md) | Frontend code review |
| [WORKFLOW_VERIFICATION.md](docs/WORKFLOW_VERIFICATION.md) | Workflow correctness analysis |
| [AI_AUDIT.md](docs/AI_AUDIT.md) | AI/ML systems review |
| [FEATURE_GAP_ANALYSIS.md](docs/FEATURE_GAP_ANALYSIS.md) | Competitor comparison |
| [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Prioritized roadmap |

---

## License

This project is developed for academic purposes.
