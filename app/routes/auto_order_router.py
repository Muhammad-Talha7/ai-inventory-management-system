from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models import Inventory, PurchaseOrders, Users
from app.ai.forecasting import bulk_forecast_demand
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/run-weekly")
def run_weekly_forecast(
    db: Session = Depends(get_db),
    # Require authentication if needed, but the prompt didn't specify. 
    # I'll include it because other endpoints use it.
    current_user: Users = Depends(get_current_user)
):
    """
    Run weekly forecast using the pre-trained ML model.
    Predicts 2-week demand and automatically creates purchase orders for deficits.
    """
    try:
        # Load the pre-trained model implicitly and predict 2-week sales demand
        demand_by_product = bulk_forecast_demand(weeks=2)
        
        if not demand_by_product:
            raise HTTPException(status_code=400, detail="Could not generate forecast. Model might be missing or no sales data.")

        # Query Inventory to get product_id and current_stock
        inventory_records = db.query(Inventory).all()
        
        orders_scheduled = 0
        for inv in inventory_records:
            pid = inv.product_id
            current_stock = inv.current_stock
            
            predicted_demand = demand_by_product.get(pid, 0)
            
            # For any product where predicted_demand > current_stock, calculate the difference
            if predicted_demand > current_stock:
                order_qty = int(predicted_demand - current_stock)
                
                # Insert a new record into the Purchase_Orders table
                if order_qty > 0:
                    new_order = PurchaseOrders(
                        product_id=pid,
                        order_quantity=order_qty,
                        status='Scheduled'
                    )
                    db.add(new_order)
                    orders_scheduled += 1
        
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
