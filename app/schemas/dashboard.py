from pydantic import BaseModel
from typing import List
from datetime import datetime

class RecentTransaction(BaseModel):
    transaction_id: int
    product_name: str
    sku: str
    quantity: int
    type: str
    timestamp: datetime

class LowStockItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    current_stock: int
    min_stock: int

class DashboardResponse(BaseModel):
    total_products: int
    total_inventory_value: float
    low_stock_count: int
    out_of_stock_count: int
    active_alerts: int
    total_categories: int
    recent_transactions: List[RecentTransaction]
    low_stock_items: List[LowStockItem]
