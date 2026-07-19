from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import math

from app.models import Users, Products, Inventory, PurchaseOrders, PurchaseOrderItems
from app.core.dependencies import get_db, require_role
from app.ai.forecasting import train_model, forecast_product, bulk_forecast_demand

router = APIRouter()


@router.post("/train", response_model=dict)
def train_forecast_model(
    current_user: Users = Depends(require_role("admin")),
):
    """Admin-only endpoint to trigger model (re)training."""
    try:
        result = train_model()
        return {
            "success": True,
            "data": result,
            "message": "Model trained successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reorder-suggestions", response_model=dict)
def get_reorder_suggestions(
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager", "admin")),
):
    """Identify products likely to stock out in the next 30 days based on forecasted demand."""
    try:
        # Get bulk predictions for all products for next 4 weeks
        demand_by_product = bulk_forecast_demand(weeks=4)

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

        # Query all products, inventory, and incoming stock
        items = (
            db.query(
                Products.product_id, 
                Products.product_name, 
                Inventory.current_stock, 
                Inventory.min_stock,
                func.coalesce(incoming_subq.c.incoming_stock, 0).label("incoming_stock")
            )
            .join(Inventory, Products.product_id == Inventory.product_id)
            .outerjoin(incoming_subq, Products.product_id == incoming_subq.c.product_id)
            .all()
        )
        
        suggestions = []
        for item in items:
            product_id, product_name, current_stock, min_stock, incoming_stock = item
            
            # Use projected demand from bulk forecast
            projected_demand = demand_by_product.get(product_id, 0)
            
            # Target stock should be at least min_stock or projected demand, whichever is higher
            safe_min_stock = min_stock if min_stock is not None else 0
            target_stock = max(projected_demand, safe_min_stock)
            
            # Cast incoming_stock to float to avoid Decimal vs float subtraction errors
            incoming_stock = float(incoming_stock) if incoming_stock is not None else 0.0
            effective_stock = current_stock + incoming_stock
            shortfall = target_stock - effective_stock
            suggested_order = math.ceil(shortfall)
            
            if suggested_order > 0:
                suggestions.append({
                    "product_id": product_id,
                    "product_name": product_name,
                    "current_stock": current_stock,
                    "projected_demand": round(projected_demand, 2),
                    "suggested_reorder_quantity": suggested_order
                })
                
        # Sort by most critical shortfall first
        suggestions.sort(key=lambda x: x["suggested_reorder_quantity"], reverse=True)

        return {
            "success": True,
            "data": suggestions,
            "message": "Reorder suggestions generated successfully"
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}", response_model=dict)
def get_forecast(
    product_id: str,
    weeks: int = Query(default=4, ge=1, le=12, description="Number of weeks to forecast (1-12)"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager", "admin")),
):
    """Get demand forecast for a product for the next N weeks."""
    try:
        predictions = forecast_product(product_id, weeks)
        return {
            "success": True,
            "data": predictions,
            "message": f"Forecast generated for {weeks} weeks",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
