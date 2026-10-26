from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import CatalogItem, ProProfile, SkillCategory
from app.schemas import PricingEstimateRequest, PricingEstimateResponse, CatalogItemOut
from app.services.pricing import calculate_call_out_fee, get_call_out_range, get_active_pricing_config

router = APIRouter(prefix='/api/pricing', tags=['Pricing'])

@router.post('/estimate', response_model=PricingEstimateResponse)
def estimate_call_out(
    payload: PricingEstimateRequest,
    db: Session = Depends(get_db)
):
    config = get_active_pricing_config(db)
    client_lat = payload.client_lat or 6.5244
    client_lng = payload.client_lng or 3.3792

    # If pro_id is provided, calculate exact fee based on pro's specific location
    if payload.pro_id:
        pro_prof = db.query(ProProfile).filter(
            (ProProfile.id == payload.pro_id) | (ProProfile.user_id == payload.pro_id)
        ).first()
        if pro_prof and pro_prof.latitude is not None and pro_prof.longitude is not None:
            calc = calculate_call_out_fee(
                client_lat=client_lat,
                client_lng=client_lng,
                pro_lat=pro_prof.latitude,
                pro_lng=pro_prof.longitude,
                is_emergency=payload.is_emergency,
                tolls_kobo=payload.tolls_kobo,
                config=config
            )
            exact_kobo = calc['call_out_kobo']
            return PricingEstimateResponse(
                min_kobo=exact_kobo,
                max_kobo=exact_kobo,
                min_naira=exact_kobo / 100.0,
                max_naira=exact_kobo / 100.0,
                display_range=f"₦{exact_kobo // 100:,}",
                exact_call_out_kobo=exact_kobo,
                exact_call_out_naira=exact_kobo / 100.0,
                straight_distance_km=calc['straight_distance_km'],
                estimated_road_km=calc['estimated_road_km'],
                estimated_minutes=calc['estimated_minutes'],
                surge_multiplier=calc['surge_multiplier'],
                surge_reason=calc['surge_reason'],
                diagnostic_credit_percent=config.get('diagnostic_credit_percent', 50.0),
                pricing_version=calc['pricing_version']
            )

    # Otherwise return estimated dynamic range for trade & region
    range_info = get_call_out_range(
        client_lat=client_lat,
        client_lng=client_lng,
        is_emergency=payload.is_emergency,
        config=config
    )

    return PricingEstimateResponse(
        min_kobo=range_info['min_kobo'],
        max_kobo=range_info['max_kobo'],
        min_naira=range_info['min_naira'],
        max_naira=range_info['max_naira'],
        display_range=range_info['display_range'],
        surge_multiplier=range_info['surge_multiplier'],
        surge_reason=range_info['surge_reason'],
        diagnostic_credit_percent=range_info['diagnostic_credit_percent'],
        pricing_version=range_info['pricing_version']
    )

@router.get('/catalog-items', response_model=List[CatalogItemOut])
def get_catalog_items(
    category_id: Optional[int] = None,
    trade: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CatalogItem).filter(CatalogItem.is_active == True)
    if category_id:
        query = query.filter(CatalogItem.skill_category_id == category_id)
    if trade:
        query = query.filter(CatalogItem.trade == trade)
    
    items = query.all()
    results = []
    for item in items:
        results.append(CatalogItemOut(
            id=item.id,
            skill_category_id=item.skill_category_id,
            trade=item.trade,
            name=item.name,
            labor_kobo=item.labor_kobo,
            labor_naira=item.labor_kobo / 100.0,
            parts_allowance_kobo=item.parts_allowance_kobo,
            parts_allowance_naira=item.parts_allowance_kobo / 100.0,
            included_parts=item.included_parts,
            is_active=item.is_active
        ))
    return results
