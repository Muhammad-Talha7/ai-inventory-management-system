"""
init_db.py -- Create all tables and seed data from walmart.csv.

Run directly:  python app/init_db.py
"""

import sys
import os
import time

import pandas as pd
from sqlalchemy import inspect

# ---------------------------------------------------------------------------
# Ensure the project root is on sys.path so `from app...` imports work
# regardless of where the script is invoked from.
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import engine, SessionLocal, Base
from app.models import (
    Users, Categories, Suppliers, Products,
    Inventory, SalesHistory, StockTransactions, Forecasts, Alerts,
)

CSV_PATH = os.path.join(PROJECT_ROOT, "walmart.csv")


# ------------------------------------------------------------------------------
# Helper -- "INSERT IGNORE" style: skip rows whose key already exists
# ------------------------------------------------------------------------------

def _existing_values(session, model, column):
    """Return a set of existing values for *column* in *model*."""
    return {v for (v,) in session.query(column).all()}


# ------------------------------------------------------------------------------
# Main seeding logic
# ------------------------------------------------------------------------------

def seed():
    start = time.time()

    # -- Step 1: Create tables ----------------------------------------
    print("=" * 60)
    print("Step 1 -- Creating tables (checkfirst=True) ...")
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print("  [OK] Tables created / verified.\n")

    # -- Step 2: Load CSV ----------------------------------------------
    print("Loading CSV ...")
    df = pd.read_csv(CSV_PATH)
    print(f"  [OK] Loaded {len(df):,} rows from {CSV_PATH}\n")

    session = SessionLocal()

    try:
        # -- 2-a  Users -----------------------------------------------
        print("Inserting Users ...")
        existing_emails = _existing_values(session, Users, Users.email)
        hardcoded_users = [
            {"name": "Admin",   "email": "admin@warehouse.com",   "role": "admin",   "password_hash": "hashed_password"},
            {"name": "Manager", "email": "manager@warehouse.com", "role": "manager", "password_hash": "hashed_password"},
            {"name": "Staff",   "email": "staff@warehouse.com",   "role": "staff",   "password_hash": "hashed_password"},
        ]
        for u in hardcoded_users:
            if u["email"] not in existing_emails:
                session.add(Users(**u))
        session.commit()
        print("  [OK] Users done.\n")

        # -- 2-b  Categories ------------------------------------------
        print("Inserting Categories ...")
        existing_cats = _existing_values(session, Categories, Categories.name)
        unique_cats = df["category"].dropna().unique()
        for cat in unique_cats:
            if cat not in existing_cats:
                session.add(Categories(name=cat))
        session.commit()
        print(f"  [OK] Categories done ({len(unique_cats)} unique).\n")

        # -- 2-c  Suppliers -------------------------------------------
        print("Inserting Suppliers ...")
        existing_sup_names = _existing_values(session, Suppliers, Suppliers.name)
        sup_df = df.drop_duplicates(subset="supplier_name")[
            ["supplier_name", "supplier_email", "supplier_phone", "lead_time_days"]
        ].reset_index(drop=True)

        for idx, row in sup_df.iterrows():
            if row["supplier_name"] in existing_sup_names:
                continue
            sup_id = f"SUP{idx + 1:03d}"
            session.add(Suppliers(
                supplier_id=sup_id,
                name=row["supplier_name"],
                contact_email=row["supplier_email"],
                contact_phone=str(row["supplier_phone"]),
                lead_time_days=int(row["lead_time_days"]),
            ))
        session.commit()
        print(f"  [OK] Suppliers done ({len(sup_df)} unique).\n")

        # Build lookup maps for FK resolution
        cat_map = {name: cid for cid, name in session.query(Categories.category_id, Categories.name).all()}
        sup_map = {name: sid for sid, name in session.query(Suppliers.supplier_id, Suppliers.name).all()}

        # -- 2-d  Products --------------------------------------------
        print("Inserting Products ...")
        existing_pids = _existing_values(session, Products, Products.product_id)
        prod_df = df.drop_duplicates(subset="product_id")[
            ["product_id", "product_name", "category", "unit_price",
             "cost_price", "lead_time_days", "supplier_name"]
        ]
        for _, row in prod_df.iterrows():
            if row["product_id"] in existing_pids:
                continue
            session.add(Products(
                product_id=row["product_id"],
                sku=f"SKU-{row['product_id']}",
                product_name=row["product_name"],
                category_id=cat_map.get(row["category"]),
                unit_price=row["unit_price"],
                cost_price=row["cost_price"],
                lead_time_days=int(row["lead_time_days"]),
                supplier_id=sup_map.get(row["supplier_name"]),
            ))
        session.commit()
        print(f"  [OK] Products done ({len(prod_df)} unique).\n")

        # -- 2-e  Inventory (last record per product by date) ----------
        print("Inserting Inventory ...")
        existing_inv = _existing_values(session, Inventory, Inventory.product_id)
        inv_df = df.sort_values("date").drop_duplicates(subset="product_id", keep="last")[
            ["product_id", "inventory_level", "min_stock", "max_stock"]
        ]
        for _, row in inv_df.iterrows():
            if row["product_id"] in existing_inv:
                continue
            session.add(Inventory(
                product_id=row["product_id"],
                current_stock=int(row["inventory_level"]),
                min_stock=int(row["min_stock"]),
                max_stock=int(row["max_stock"]),
            ))
        session.commit()
        print(f"  [OK] Inventory done ({len(inv_df)} products).\n")

        # -- 2-f  SalesHistory (every row) -----------------------------
        print("Inserting SalesHistory ...")
        sales_objs = []
        for i, row in df.iterrows():
            sales_objs.append(SalesHistory(
                product_id=row["product_id"],
                quantity_sold=int(row["units_sold"]),
                unit_price=row["unit_price"],
                discount=row["discount"],
                weather_condition=row["weather_condition"],
                is_holiday_promotion=int(row["holiday_promotion"]),
                competitor_pricing=row["competitor_pricing"],
                seasonality=row["seasonality"],
                date=row["date"],
            ))
            if (i + 1) % 50_000 == 0:
                print(f"    ... {i + 1:,} rows prepared")
        session.bulk_save_objects(sales_objs)
        session.commit()
        print(f"  [OK] SalesHistory done ({len(sales_objs):,} rows).\n")

        # -- 2-g  StockTransactions (rows where units_ordered > 0) -----
        print("Inserting StockTransactions ...")
        stock_df = df[df["units_ordered"] > 0].reset_index(drop=True)
        stock_objs = []
        for i, row in stock_df.iterrows():
            stock_objs.append(StockTransactions(
                product_id=row["product_id"],
                user_id=1,
                quantity=int(row["units_ordered"]),
                type="IN",
                source="Initial Seed",
                timestamp=row["date"],
            ))
            if (i + 1) % 50_000 == 0:
                print(f"    ... {i + 1:,} rows prepared")
        session.bulk_save_objects(stock_objs)
        session.commit()
        print(f"  [OK] StockTransactions done ({len(stock_objs):,} rows).\n")

        # -- 2-h  Forecasts (every row) --------------------------------
        print("Inserting Forecasts ...")
        forecast_objs = []
        for i, row in df.iterrows():
            forecast_objs.append(Forecasts(
                product_id=row["product_id"],
                forecast_date=row["date"],
                predicted_demand=row["demand_forecast"],
            ))
            if (i + 1) % 50_000 == 0:
                print(f"    ... {i + 1:,} rows prepared")
        session.bulk_save_objects(forecast_objs)
        session.commit()
        print(f"  [OK] Forecasts done ({len(forecast_objs):,} rows).\n")

    except Exception as e:
        session.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        session.close()

    elapsed = time.time() - start
    print("=" * 60)
    print(f"[DONE] All done!  Total time: {elapsed:.2f}s")
    print("=" * 60)


if __name__ == "__main__":
    seed()
