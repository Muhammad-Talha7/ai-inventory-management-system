"""
init_db.py -- Create all tables, seed data from walmart.csv, fix suppliers, and apply RBAC.

Run directly:  python app/init_db.py

This is a one-shot setup script for a fresh database.
Idempotent: safe to re-run (skips existing rows, ALTER errors are swallowed).
"""

import sys
import os
import time

import pandas as pd
from sqlalchemy import inspect, text

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import engine, SessionLocal, Base
from app.models import (
    Users, Categories, Suppliers, Products,
    Inventory, SalesHistory, StockTransactions, Forecasts, Alerts,
    PurchaseOrders, PurchaseOrderItems, AuditLogs,
)
from app.core.security import get_password_hash

CSV_PATH = os.path.join(PROJECT_ROOT, "walmart.csv")

SUPPLIER_CATEGORY_MAP = {
    "Electronics":      ["SUP001", "SUP011"],
    "Groceries":        ["SUP002", "SUP012"],
    "Clothing":         ["SUP003", "SUP013"],
    "Health & Beauty":  ["SUP004", "SUP012"],
    "Office Supplies":  ["SUP005", "SUP014"],
    "Furniture":        ["SUP006", "SUP013"],
    "Automotive":       ["SUP007", "SUP011"],
    "Sports":           ["SUP008"],
    "Toys":             ["SUP009", "SUP014"],
    "Garden":           ["SUP010"],
}


def _existing_values(session, model, column):
    return {v for (v,) in session.query(column).all()}


def _add_column(conn, table: str, col_def: str):
    try:
        conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN {col_def}"))
        print(f"  [OK] {table}: added {col_def.split()[0]}")
    except Exception as e:
        if "1060" in str(e) or "Duplicate column" in str(e):
            print(f"  [SKIP] {table}.{col_def.split()[0]} already exists")
        else:
            raise


def _add_fk(conn, table: str, fk_name: str, col: str, ref_table: str, ref_col: str):
    try:
        conn.execute(text(
            f"ALTER TABLE `{table}` "
            f"ADD CONSTRAINT `{fk_name}` "
            f"FOREIGN KEY (`{col}`) REFERENCES `{ref_table}`(`{ref_col}`)"
        ))
        print(f"  [OK] FK {fk_name}")
    except Exception as e:
        err = str(e).lower()
        if "1061" in str(e) or "duplicate key" in err or "1826" in str(e) or "already exists" in err:
            print(f"  [SKIP] FK {fk_name} already exists")
        else:
            raise


def seed_data():
    start = time.time()

    print("=" * 60)
    print("Step 1 -- Creating tables (checkfirst=True) ...")
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print("  [OK] Tables created / verified.\n")

    print("Loading CSV ...")
    df = pd.read_csv(CSV_PATH)
    print(f"  [OK] Loaded {len(df):,} rows from {CSV_PATH}\n")

    session = SessionLocal()

    try:
        print("Inserting Users ...")
        existing_emails = _existing_values(session, Users, Users.email)
        hardcoded_users = [
            {"name": "Admin",   "email": "admin@warehouse.com",   "role": "admin",   "password_hash": get_password_hash("admin123")},
            {"name": "Manager", "email": "manager@warehouse.com", "role": "manager", "password_hash": get_password_hash("admin123")},
            {"name": "Staff",   "email": "staff@warehouse.com",   "role": "staff",   "password_hash": get_password_hash("admin123")},
            {"name": "CV System", "email": "cv_system@warehouse.internal", "role": "staff", "password_hash": "!"},
        ]
        for u in hardcoded_users:
            if u["email"] not in existing_emails:
                session.add(Users(**u))
        session.commit()
        print("  [OK] Users done.\n")

        print("Inserting Categories ...")
        existing_cats = _existing_values(session, Categories, Categories.name)
        unique_cats = df["category"].dropna().unique()
        for cat in unique_cats:
            if cat not in existing_cats:
                session.add(Categories(name=cat))
        session.commit()
        print(f"  [OK] Categories done ({len(unique_cats)} unique).\n")

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

        cat_map = {name: cid for cid, name in session.query(Categories.category_id, Categories.name).all()}
        sup_map = {name: sid for sid, name in session.query(Suppliers.supplier_id, Suppliers.name).all()}

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

        print("Inserting SalesHistory ...")
        existing_sales_count = session.query(SalesHistory).count()
        if existing_sales_count > 0:
            print(f"  [SKIP] SalesHistory already has {existing_sales_count:,} rows. Skipping to avoid duplicates.\n")
        else:
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

        print("Inserting StockTransactions ...")
        existing_stock_count = session.query(StockTransactions).count()
        if existing_stock_count > 0:
            print(f"  [SKIP] StockTransactions already has {existing_stock_count:,} rows. Skipping to avoid duplicates.\n")
        else:
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
                    status="approved",
                    requested_by=1,
                ))
                if (i + 1) % 50_000 == 0:
                    print(f"    ... {i + 1:,} rows prepared")
            session.bulk_save_objects(stock_objs)
            session.commit()
            print(f"  [OK] StockTransactions done ({len(stock_objs):,} rows).\n")

        print("Inserting Forecasts ...")
        existing_forecasts_count = session.query(Forecasts).count()
        if existing_forecasts_count > 0:
            print(f"  [SKIP] Forecasts already has {existing_forecasts_count:,} rows. Skipping to avoid duplicates.\n")
        else:
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
    print(f"  [DONE] Seeding complete. Time: {elapsed:.2f}s\n")


def fix_supplier_categories():
    print("=" * 60)
    print("Step 2 -- Fixing supplier-category assignments ...")
    print("=" * 60)

    with engine.connect() as conn:
        cats = conn.execute(text("SELECT category_id, name FROM categories")).fetchall()
        cat_name_to_id = {name: cid for cid, name in cats}

        for cat_name, supplier_ids in SUPPLIER_CATEGORY_MAP.items():
            cat_id = cat_name_to_id.get(cat_name)
            if cat_id is None:
                print(f"  [WARN] Category '{cat_name}' not found, skipping")
                continue

            rows = conn.execute(
                text("SELECT product_id FROM products WHERE category_id = :cid ORDER BY product_id"),
                {"cid": cat_id}
            ).fetchall()
            product_ids = [r[0] for r in rows]

            if not product_ids:
                print(f"  [SKIP] No products in '{cat_name}'")
                continue

            chunk_size = len(product_ids) // len(supplier_ids)
            remainder = len(product_ids) % len(supplier_ids)

            idx = 0
            for si, sup_id in enumerate(supplier_ids):
                count = chunk_size + (1 if si < remainder else 0)
                batch = product_ids[idx:idx + count]
                if batch:
                    placeholders = ",".join([f"'{pid}'" for pid in batch])
                    conn.execute(text(
                        f"UPDATE products SET supplier_id = :sid WHERE product_id IN ({placeholders})"
                    ), {"sid": sup_id})
                idx += count

            conn.commit()
            print(f"  [OK] {cat_name:20s} -> {', '.join(supplier_ids)} ({len(product_ids)} products)")

    print("  [DONE] Supplier-category fix complete.\n")


def apply_rbac_migrations():
    print("=" * 60)
    print("Step 3 -- Applying RBAC migrations ...")
    print("=" * 60)

    with engine.connect() as conn:
        print("\n  users: updating role enum")
        try:
            conn.execute(text("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin', 'manager', 'staff', 'auditor')"))
            print("  [OK] users: role enum updated")
        except Exception as e:
            print(f"  [SKIP] users: {e}")

        print("\n  stock_transactions: adding RBAC columns")
        _add_column(conn, "stock_transactions", "status VARCHAR(20) DEFAULT 'pending'")
        _add_column(conn, "stock_transactions", "requested_by INT NULL")
        _add_column(conn, "stock_transactions", "approved_by INT NULL")
        _add_column(conn, "stock_transactions", "approved_at DATETIME NULL")
        _add_column(conn, "stock_transactions", "reason VARCHAR(500) NULL")
        _add_fk(conn, "stock_transactions", "fk_st_requested_by", "requested_by", "users", "user_id")
        _add_fk(conn, "stock_transactions", "fk_st_approved_by", "approved_by", "users", "user_id")

        print("\n  purchase_orders: adding approval columns")
        _add_column(conn, "purchase_orders", "supplier_id VARCHAR(10) NULL")
        _add_column(conn, "purchase_orders", "approved_by INT NULL")
        _add_column(conn, "purchase_orders", "approved_at DATETIME NULL")
        _add_column(conn, "purchase_orders", "rejected_by INT NULL")
        _add_column(conn, "purchase_orders", "received_by INT NULL")
        _add_column(conn, "purchase_orders", "received_at DATETIME NULL")
        _add_column(conn, "purchase_orders", "receiving_notes TEXT NULL")
        _add_fk(conn, "purchase_orders", "fk_po_approved_by", "approved_by", "users", "user_id")
        _add_fk(conn, "purchase_orders", "fk_po_rejected_by", "rejected_by", "users", "user_id")
        _add_fk(conn, "purchase_orders", "fk_po_received_by", "received_by", "users", "user_id")
        _add_fk(conn, "purchase_orders", "fk_po_supplier", "supplier_id", "suppliers", "supplier_id")

        print("\n  alerts: adding resolved_by and target_user_id")
        _add_column(conn, "alerts", "resolved_by INT NULL")
        _add_column(conn, "alerts", "resolved_at DATETIME NULL")
        _add_column(conn, "alerts", "target_user_id INT NULL")
        _add_fk(conn, "alerts", "fk_alerts_resolved_by", "resolved_by", "users", "user_id")
        _add_fk(conn, "alerts", "fk_alerts_target_user", "target_user_id", "users", "user_id")

        conn.commit()

    print("\n  Backfilling stock_transactions ...")
    with engine.connect() as conn:
        result = conn.execute(text(
            "UPDATE stock_transactions "
            "SET status = 'approved', requested_by = user_id "
            "WHERE status = 'pending' OR status IS NULL"
        ))
        conn.commit()
        print(f"  [OK] {result.rowcount} rows backfilled\n")

    print("  [DONE] RBAC migrations complete.\n")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  WAREHOUSE DB FULL SETUP")
    print("  Tables + Seed + Supplier Fix + RBAC")
    print("=" * 60 + "\n")

    seed_data()
    fix_supplier_categories()
    apply_rbac_migrations()

    print("=" * 60)
    print("[ALL DONE] Database is fully set up and ready!")
    print("=" * 60)
