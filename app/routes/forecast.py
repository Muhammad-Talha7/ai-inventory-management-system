from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models import Users
from app.core.dependencies import get_db, get_current_user, require_admin
from app.ai.forecasting import train_model, forecast_product

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
