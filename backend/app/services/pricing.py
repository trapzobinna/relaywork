import math
import json
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import PricingConfig, CatalogItem, SkillCategory
from app.services.geolocation import haversine_distance

DEFAULT_PRICING_CONFIG = {
    'version': 'v1.0',
    'base_inspection_kobo': 500000,       # ₦5,000
    'rate_per_km_kobo': 25000,            # ₦250 / km
    'rate_per_min_kobo': 4000,            # ₦40 / min
    'min_call_out_kobo': 600000,          # ₦6,000
    'circuity_factor': 1.3,               # Road network vs straight-line
    'avg_speed_kmh': 25.0,                # Lagos urban driving speed
    'peak_surge': 1.2,                    # Peak hours (07:00-09:30, 16:30-19:30 M-F)
    'night_surge': 1.4,                   # 21:00-06:00
    'emergency_surge': 1.4,               # Explicit emergency dispatch
    'surge_cap': 1.6,                     # Max combined surge
    'diagnostic_credit_percent': 50.0,    # 50% of call-out credited off labor
    'commission_call_out_percent': 7.5,   # 7.5% platform, 92.5% pro
    'commission_labor_percent': 7.5,      # 7.5% platform, 92.5% pro
    'commission_materials_percent': 0.0,  # 0% on materials
}

def get_active_pricing_config(db: Session) -> Dict[str, Any]:
    row = db.query(PricingConfig).order_by(PricingConfig.effective_from.desc()).first()
    if not row:
        return DEFAULT_PRICING_CONFIG
    try:
        data = json.loads(row.params)
        data['version'] = row.version
        return data
    except Exception:
        return DEFAULT_PRICING_CONFIG

def calculate_surge(
    now: Optional[datetime] = None,
    is_emergency: bool = False,
    config: Optional[Dict[str, Any]] = None
) -> Tuple[float, Optional[str]]:
    cfg = config or DEFAULT_PRICING_CONFIG
    if now is None:
        now = datetime.now(timezone.utc)
    
    # Lagos is UTC+1 (WAT)
    hour_wat = (now.hour + 1) % 24
    weekday = now.weekday()  # 0=Monday, 6=Sunday

    reasons = []
    multiplier = 1.0

    # 1. Emergency
    if is_emergency:
        multiplier *= cfg.get('emergency_surge', 1.4)
        reasons.append('Emergency Dispatch (1.4x)')

    # 2. Night hours (21:00 - 06:00 WAT)
    if hour_wat >= 21 or hour_wat < 6:
        multiplier *= cfg.get('night_surge', 1.4)
        reasons.append('Night Call-out (1.4x)')

    # 3. Peak traffic hours (Monday - Friday 07:00-09:30 or 16:30-19:30)
    elif weekday < 5 and ((7 <= hour_wat < 10) or (16 <= hour_wat < 20)):
        multiplier *= cfg.get('peak_surge', 1.2)
        reasons.append('Peak Rush Hours (1.2x)')

    cap = cfg.get('surge_cap', 1.6)
    if multiplier > cap:
        multiplier = cap
        reasons.append(f'Capped at {cap}x max')

    reason_str = ', '.join(reasons) if reasons else 'Standard Rate'
    return round(multiplier, 2), reason_str

def calculate_call_out_fee(
    client_lat: float,
    client_lng: float,
    pro_lat: float,
    pro_lng: float,
    is_emergency: bool = False,
    tolls_kobo: int = 0,
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    cfg = config or DEFAULT_PRICING_CONFIG

    straight_km = haversine_distance(client_lat, client_lng, pro_lat, pro_lng)
    road_km = max(1.0, straight_km * cfg.get('circuity_factor', 1.3))
    travel_minutes = max(5.0, (road_km / cfg.get('avg_speed_kmh', 25.0)) * 60.0)

    surge_mult, surge_reason = calculate_surge(is_emergency=is_emergency, config=cfg)

    base = cfg.get('base_inspection_kobo', 500000)
    km_rate = cfg.get('rate_per_km_kobo', 25000)
    min_rate = cfg.get('rate_per_min_kobo', 4000)
    min_call_out = cfg.get('min_call_out_kobo', 600000)

    raw_fee = (base + (road_km * km_rate) + (travel_minutes * min_rate)) * surge_mult
    final_call_out = int(math.ceil(max(min_call_out, raw_fee) + tolls_kobo))

    # Round to nearest ₦100 (10,000 kobo) for clean professional presentation
    final_call_out = int(round(final_call_out / 10000.0) * 10000)

    return {
        'call_out_kobo': final_call_out,
        'call_out_naira': final_call_out / 100.0,
        'straight_distance_km': round(straight_km, 2),
        'estimated_road_km': round(road_km, 1),
        'estimated_minutes': int(round(travel_minutes)),
        'surge_multiplier': surge_mult,
        'surge_reason': surge_reason,
        'diagnostic_credit_kobo': int(final_call_out * (cfg.get('diagnostic_credit_percent', 50.0) / 100.0)),
        'diagnostic_credit_naira': (final_call_out * (cfg.get('diagnostic_credit_percent', 50.0) / 100.0)) / 100.0,
        'pricing_version': cfg.get('version', 'v1.0')
    }

def get_call_out_range(
    client_lat: Optional[float] = None,
    client_lng: Optional[float] = None,
    is_emergency: bool = False,
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Returns estimated call-out range (e.g. ₦6,000 – ₦9,500) shown to client
    before a specific pro is selected or booked.
    """
    cfg = config or DEFAULT_PRICING_CONFIG
    surge_mult, surge_reason = calculate_surge(is_emergency=is_emergency, config=cfg)

    min_fee = int(cfg.get('min_call_out_kobo', 600000))
    # Typical upper bound within city radius ~18km + 45min
    high_road_km = 18.0
    high_minutes = 45.0
    base = cfg.get('base_inspection_kobo', 500000)
    km_rate = cfg.get('rate_per_km_kobo', 25000)
    min_rate = cfg.get('rate_per_min_kobo', 4000)

    high_fee_raw = (base + (high_road_km * km_rate) + (high_minutes * min_rate)) * surge_mult
    max_fee = int(round(math.ceil(high_fee_raw) / 10000.0) * 10000)

    if max_fee < min_fee:
        max_fee = min_fee + 250000

    return {
        'min_kobo': min_fee,
        'max_kobo': max_fee,
        'min_naira': min_fee / 100.0,
        'max_naira': max_fee / 100.0,
        'display_range': f"₦{min_fee // 100:,} – ₦{max_fee // 100:,}",
        'surge_multiplier': surge_mult,
        'surge_reason': surge_reason,
        'diagnostic_credit_percent': cfg.get('diagnostic_credit_percent', 50.0),
        'pricing_version': cfg.get('version', 'v1.0')
    }
