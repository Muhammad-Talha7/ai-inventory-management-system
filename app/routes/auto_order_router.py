from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, require_role
from app.models import Inventory, PurchaseOrders, PurchaseOrderItems, Users
from sqlalchemy import func
from app.ai.forecasting import bulk_forecast_demand
from app.core.audit import log_audit
import math
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/run-weekly")
def run_weekly_forecast(
    db: Session = Depends(get_db),
    # Require authentication if needed, but the prompt didn't specify. 
    # I'll include it because other endpoints use it.
    current_user: Users = Depends(require_role("manager", "admin"))
):
    """
    Run weekly forecast using the pre-trained ML model.
    Predicts 2-week demand and automatically creates purchase orders for deficits.
    """
    try:
        # Match the 4-week forecast used by Reorder Suggestions
        demand_by_product = bulk_forecast_demand(weeks=4)
        
        if not demand_by_product:
            raise HTTPException(status_code=400, detail="Could not generate forecast. Model might be missing or no sales data.")

        # Subquery to calculate incoming stock (Scheduled or Approved Purchase Orders)
        incoming_subq = (
            db.query(
                PurchaseOrderItems.product_id,
                func.sum(PurchaseOrderItems.order_quantity).label("incoming_stock")
            )
            .join(PurchaseOrders, PurchaseOrderItems.order_id == PurchaseOrders.order_id)
            .filter(PurchaseOrders.status.in_(["Scheduled", "Pending Approval"]))
            .group_by(PurchaseOrderItems.product_id)
            .subquery()
        )

        # Query Inventory and incoming stock
        inventory_records = (
            db.query(
                Inventory.product_id,
                Inventory.current_stock,
                Inventory.min_stock,
                func.coalesce(incoming_subq.c.incoming_stock, 0).label("incoming_stock")
            )
            .outerjoin(incoming_subq, Inventory.product_id == incoming_subq.c.product_id)
            .all()
        )
        
        items_to_order = []
        for inv in inventory_records:
            pid = inv.product_id
            current_stock = inv.current_stock
            incoming_stock = inv.incoming_stock
            min_stock = inv.min_stock
            
            predicted_demand = demand_by_product.get(pid, 0)
            
            # Target stock should be at least min_stock or projected demand, whichever is higher
            safe_min_stock = min_stock if min_stock is not None else 0
            target_stock = max(predicted_demand, safe_min_stock)
            
            # Cast incoming_stock to float to avoid Decimal vs float subtraction errors
            incoming_stock = float(incoming_stock) if incoming_stock is not None else 0.0
            effective_stock = current_stock + incoming_stock
            shortfall = target_stock - effective_stock
            order_qty = math.ceil(shortfall)
            
            if order_qty > 0:
                items_to_order.append({"product_id": pid, "order_qty": order_qty})
        
        orders_scheduled = 0
        if items_to_order:
            new_order = PurchaseOrders(status='Scheduled')
            db.add(new_order)
            db.flush()
            
            for item in items_to_order:
                po_item = PurchaseOrderItems(
                    order_id=new_order.order_id,
                    product_id=item["product_id"],
                    order_quantity=item["order_qty"]
                )
                db.add(po_item)
                
            orders_scheduled = 1
            
            log_audit(
                db=db,
                user_id=current_user.user_id,
                action="create_ai_order",
                entity_type="purchase_order",
                entity_id=new_order.order_id,
                new_values={"item_count": len(items_to_order)}
            )
        
        # Commit to the database
        db.commit()
        return {
            "message": "Weekly forecast complete. Deficits scheduled.",
            "orders_scheduled": orders_scheduled
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in run_weekly_forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))
