from sqlalchemy import (
    Column, Integer, String, DateTime, Numeric, Date, Text, Enum, ForeignKey
)
from sqlalchemy.sql import func

from app.database import Base


class Users(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255))
    role = Column(Enum("admin", "manager", "staff", "auditor"))
    created_at = Column(DateTime, default=func.now())


class Categories(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)


class Suppliers(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(String(10), primary_key=True)
    name = Column(String(100))
    contact_email = Column(String(100))
    contact_phone = Column(String(20))
    lead_time_days = Column(Integer)


class Products(Base):
    __tablename__ = "products"

    product_id = Column(String(10), primary_key=True)
    sku = Column(String(100), unique=True, nullable=False)
    product_name = Column(String(200))
    category_id = Column(Integer, ForeignKey("categories.category_id"))
    unit_price = Column(Numeric(10, 2))
    cost_price = Column(Numeric(10, 2))
    lead_time_days = Column(Integer)
    supplier_id = Column(String(10), ForeignKey("suppliers.supplier_id"))


class Inventory(Base):
    __tablename__ = "inventory"

    product_id = Column(String(10), ForeignKey("products.product_id"), primary_key=True)
    current_stock = Column(Integer)
    min_stock = Column(Integer)
    max_stock = Column(Integer)
    last_updated = Column(DateTime, default=func.now())


class StockTransactions(Base):
    __tablename__ = "stock_transactions"

    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(10), ForeignKey("products.product_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    quantity = Column(Integer)
    type = Column(Enum("IN", "OUT"))
    source = Column(String(100))
    timestamp = Column(DateTime, default=func.now())
    status = Column(String(20), default="pending")
    requested_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    reason = Column(String(500), nullable=True)


class SalesHistory(Base):
    __tablename__ = "sales_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(10), ForeignKey("products.product_id"))
    quantity_sold = Column(Integer)
    unit_price = Column(Numeric(10, 2))
    discount = Column(Numeric(5, 2))
    weather_condition = Column(String(50))
    is_holiday_promotion = Column(Integer)
    competitor_pricing = Column(Numeric(10, 2))
    seasonality = Column(String(20))
    date = Column(Date)


class Forecasts(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(10), ForeignKey("products.product_id"))
    forecast_date = Column(Date)
    predicted_demand = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=func.now())


class Alerts(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(10), ForeignKey("products.product_id"), nullable=True)
    alert_type = Column(String(50))
    target_role = Column(String(20))
    target_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    message = Column(Text)
    is_resolved = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    resolved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)


class PurchaseOrders(Base):
    __tablename__ = "purchase_orders"

    order_id = Column(Integer, primary_key=True, autoincrement=True)
    status = Column(String(50), default="Scheduled")
    created_at = Column(DateTime, default=func.now())
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    received_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    received_at = Column(DateTime, nullable=True)
    receiving_notes = Column(Text, nullable=True)

class PurchaseOrderItems(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("purchase_orders.order_id"))
    product_id = Column(String(10), ForeignKey("products.product_id"))
    order_quantity = Column(Integer)
    received_quantity = Column(Integer, nullable=True)

class AuditLogs(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    action = Column(String(255))
    entity_type = Column(String(100))
    entity_id = Column(String(100))
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=func.now())
