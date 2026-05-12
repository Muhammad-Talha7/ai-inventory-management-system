from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models import Users, Products, Inventory
from app.core.dependencies import get_db, get_current_user, require_admin
from app.ai.forecasting import train_model, forecast_product, bulk_forecast_demand

router = APIRouter()


@router.post("/train", response_model=dict)
def train_forecast_model(
    current_user: Users = Depends(require_admin),
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
    current_user: Users = Depends(get_current_user),
):
    """Identify products likely to stock out in the next 30 days based on forecasted demand."""
    try:
        # Get bulk predictions for all products for next 4 weeks
        demand_by_product = bulk_forecast_demand(weeks=4)

        # Query all products and their current inventory
        items = (
            db.query(Products.product_id, Products.product_name, Inventory.current_stock)
            .join(Inventory, Products.product_id == Inventory.product_id)
            .all()
        )
        
        suggestions = []
        for item in items:
            product_id, product_name, current_stock = item
            
            # Use projected demand from bulk forecast
            projected_demand = demand_by_product.get(product_id, 0)
            if projected_demand == 0:
                continue
                
            shortfall = projected_demand - current_stock
            if shortfall >= 0:
                suggestions.append({
                    "product_id": product_id,
                    "product_name": product_name,
                    "current_stock": current_stock,
                    "projected_demand": round(projected_demand, 2),
                    "suggested_reorder_quantity": round(shortfall, 2)
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
    current_user: Users = Depends(get_current_user),
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
