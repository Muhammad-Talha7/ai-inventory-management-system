"""
migrate_rbac.py -- Add RBAC & approval-workflow columns to existing tables.

Run directly:  python app/migrate_rbac.py

Idempotent: each ALTER TABLE is wrapped in try/except so re-running is safe.
"""

import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models import Users
from app.core.security import get_password_hash


# ---------------------------------------------------------------------------
# Helper: run an ALTER TABLE, swallowing "duplicate column" errors
# ---------------------------------------------------------------------------
def _add_column(conn, table: str, col_def: str):
    """Try to add a column; silently skip if it already exists (MySQL 1060)."""
    try:
        conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN {col_def}"))
        print(f"  [OK] {table}: added {col_def.split()[0]}")
    except Exception as e:
        if "1060" in str(e) or "Duplicate column" in str(e):
            print(f"  [SKIP] {table}.{col_def.split()[0]} already exists")
        else:
            raise


def migrate():
    print("=" * 60)
    print("RBAC Migration — Adding approval & audit columns")
    print("=" * 60)

    with engine.connect() as conn:
        # -- users ------------------------------------------------------------
        print("\n0) users")
        try:
            conn.execute(text("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin', 'manager', 'staff', 'auditor')"))
            print("  [OK] users: updated role enum to include auditor")
        except Exception as e:
            print(f"  [ERROR] users: {e}")

        # -- stock_transactions -----------------------------------------------
        print("\n1) stock_transactions")
        _add_column(conn, "stock_transactions",
                    "status VARCHAR(20) DEFAULT 'pending'")
        _add_column(conn, "stock_transactions",
                    "requested_by INT NULL")
        _add_column(conn, "stock_transactions",
                    "approved_by INT NULL")
        _add_column(conn, "stock_transactions",
                    "approved_at DATETIME NULL")
        _add_column(conn, "stock_transactions",
                    "reason VARCHAR(500) NULL")

        # Add FK constraints (skip if they already exist)
        for fk_name, col in [
            ("fk_st_requested_by", "requested_by"),
            ("fk_st_approved_by", "approved_by"),
        ]:
            try:
                conn.execute(text(
                    f"ALTER TABLE `stock_transactions` "
                    f"ADD CONSTRAINT `{fk_name}` "
                    f"FOREIGN KEY (`{col}`) REFERENCES `users`(`user_id`)"
                ))
                print(f"  [OK] FK {fk_name}")
            except Exception as e:
                if "1061" in str(e) or "Duplicate key" in str(e) or "1826" in str(e) or "already exists" in str(e).lower():
                    print(f"  [SKIP] FK {fk_name} already exists")
                else:
                    raise

        # -- purchase_orders --------------------------------------------------
        print("\n2) purchase_orders")
        _add_column(conn, "purchase_orders",
                    "approved_by INT NULL")
        _add_column(conn, "purchase_orders",
                    "approved_at DATETIME NULL")
        _add_column(conn, "purchase_orders",
                    "rejected_by INT NULL")
        _add_column(conn, "purchase_orders",
                    "received_quantity INT NULL")
        _add_column(conn, "purchase_orders",
                    "received_by INT NULL")
        _add_column(conn, "purchase_orders",
                    "received_at DATETIME NULL")
        _add_column(conn, "purchase_orders",
                    "receiving_notes TEXT NULL")

        for fk_name, col in [
            ("fk_po_approved_by", "approved_by"),
            ("fk_po_rejected_by", "rejected_by"),
            ("fk_po_received_by", "received_by"),
        ]:
            try:
                conn.execute(text(
                    f"ALTER TABLE `purchase_orders` "
                    f"ADD CONSTRAINT `{fk_name}` "
                    f"FOREIGN KEY (`{col}`) REFERENCES `users`(`user_id`)"
                ))
                print(f"  [OK] FK {fk_name}")
            except Exception as e:
                if "1061" in str(e) or "Duplicate key" in str(e) or "1826" in str(e) or "already exists" in str(e).lower():
                    print(f"  [SKIP] FK {fk_name} already exists")
                else:
                    raise

        # -- alerts -----------------------------------------------------------
        print("\n3) alerts")
        _add_column(conn, "alerts",
                    "resolved_by INT NULL")
        try:
            conn.execute(text(
                "ALTER TABLE `alerts` "
                "ADD CONSTRAINT `fk_alerts_resolved_by` "
                "FOREIGN KEY (`resolved_by`) REFERENCES `users`(`user_id`)"
            ))
            print("  [OK] FK fk_alerts_resolved_by")
        except Exception as e:
            if "1061" in str(e) or "Duplicate key" in str(e) or "1826" in str(e) or "already exists" in str(e).lower():
                print("  [SKIP] FK fk_alerts_resolved_by already exists")
            else:
                raise

        # -- audit_logs -------------------------------------------------------
        print("\n4) audit_logs")
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS `audit_logs` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `user_id` INT NULL,
                    `action` VARCHAR(255),
                    `entity_type` VARCHAR(100),
                    `entity_id` VARCHAR(100),
                    `old_values` TEXT NULL,
                    `new_values` TEXT NULL,
                    `ip_address` VARCHAR(45) NULL,
                    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`)
                )
            """))
            print("  [OK] audit_logs table created")
        except Exception as e:
            print(f"  [ERROR] audit_logs: {e}")
        # -- purchase_order_items ---------------------------------------------
        print("\n4.5) purchase_order_items")
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS `purchase_order_items` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `order_id` INT NOT NULL,
                    `product_id` VARCHAR(10) NOT NULL,
                    `order_quantity` INT NOT NULL,
                    `received_quantity` INT NULL,
                    CONSTRAINT `fk_poi_order_id` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`order_id`),
                    CONSTRAINT `fk_poi_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`)
                )
            """))
            print("  [OK] purchase_order_items table created")
        except Exception as e:
            print(f"  [ERROR] purchase_order_items: {e}")

        # Migrate data from purchase_orders to purchase_order_items
        try:
            # Only migrate if columns still exist in purchase_orders
            conn.execute(text("SELECT product_id FROM purchase_orders LIMIT 1"))
            print("  [INFO] Migrating existing POs to purchase_order_items...")
            conn.execute(text("""
                INSERT INTO purchase_order_items (order_id, product_id, order_quantity, received_quantity)
                SELECT order_id, product_id, order_quantity, received_quantity
                FROM purchase_orders
                WHERE product_id IS NOT NULL
            """))
            print("  [OK] Data migrated successfully.")

            # Drop old columns (requires dropping foreign keys first if any, but product_id has one)
            try:
                conn.execute(text("ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_ibfk_1`"))
            except Exception:
                pass # ignore if it doesn't exist
            
            try:
                conn.execute(text("ALTER TABLE `purchase_orders` DROP FOREIGN KEY `fk_po_product_id`"))
            except Exception:
                pass
                
            conn.execute(text("ALTER TABLE `purchase_orders` DROP COLUMN `product_id`"))
            conn.execute(text("ALTER TABLE `purchase_orders` DROP COLUMN `order_quantity`"))
            conn.execute(text("ALTER TABLE `purchase_orders` DROP COLUMN `received_quantity`"))
            print("  [OK] Dropped product_id, order_quantity, received_quantity from purchase_orders")
            
        except Exception as e:
            if "Unknown column" in str(e):
                print("  [SKIP] Data already migrated, old columns do not exist.")
            else:
                print(f"  [ERROR] Data migration: {e}")

        conn.commit()

    # -- Backfill existing stock_transactions ---------------------------------
    print("\n5) Backfill: existing stock_transactions -> status='approved', requested_by=user_id")
    with engine.connect() as conn:
        result = conn.execute(text(
            "UPDATE stock_transactions "
            "SET status = 'approved', requested_by = user_id "
            "WHERE status = 'pending' OR status IS NULL"
        ))
        conn.commit()
        print(f"  [OK] {result.rowcount} rows updated")

    # -- Seed cv_system actor -------------------------------------------------
    print("\n6) Seed reserved cv_system actor")
    session = SessionLocal()
    try:
        existing = session.query(Users).filter(
            Users.email == "cv_system@warehouse.internal"
        ).first()
        if existing:
            print(f"  [SKIP] cv_system already exists (user_id={existing.user_id})")
        else:
            cv_user = Users(
                name="CV System",
                email="cv_system@warehouse.internal",
                password_hash="!",  # un-matchable — cannot login
                role="staff",
            )
            session.add(cv_user)
            session.commit()
            session.refresh(cv_user)
            print(f"  [OK] cv_system created (user_id={cv_user.user_id})")
    finally:
        session.close()

    print("\n" + "=" * 60)
    print("[DONE] RBAC migration complete.")
    print("=" * 60)


if __name__ == "__main__":
    migrate()
