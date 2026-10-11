from ipaddress import ip_address
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings
from threat_intelligence.live_provider import LiveThreatIntelProvider

router = APIRouter(prefix="/threat-intel", tags=["threat_intel"])
ti_provider = LiveThreatIntelProvider()


class LookupRequest(BaseModel):
    indicator: str
    type: str = "ip"


def _serialize_result(result) -> Dict[str, Any]:
    return {
        "indicator": result.indicator,
        "ip": result.indicator if result.type == "IP" else None,
        "type": result.type,
        "threat_status": result.threat_status,
        "is_malicious": result.is_malicious,
        "confidence": result.confidence,
        "details": result.details,
        "source": result.source,
        "provider": result.source,
        "tags": result.tags,
        **result.metadata,
    }


@router.get("/status")
async def get_threat_intel_status() -> Dict[str, Any]:
    return {
        "mode": "LIVE",
        "live_api_configured": bool(ti_provider.abuse_key),
        "provider": "AbuseIPDB" if ti_provider.abuse_key else "IPsum",
        "description": "AbuseIPDB is used when configured; the bundled IPsum snapshot provides conservative exact-match fallback results.",
    }


@router.get("/ip/{ip}")
async def lookup_ip(ip: str) -> Dict[str, Any]:
    try:
        ip_address(ip)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address.")
    return _serialize_result(ti_provider.lookup_ip(ip))


@router.get("/domain/{domain}")
async def lookup_domain(domain: str) -> Dict[str, Any]:
    cleaned = domain.strip().lower()
    if not cleaned or "." not in cleaned or len(cleaned) < 3:
        raise HTTPException(status_code=400, detail="Invalid domain name. Please enter a valid FQDN (e.g. example.com).")
    return _serialize_result(ti_provider.lookup_domain(cleaned))


@router.post("/lookup")
async def lookup_indicator(payload: LookupRequest) -> Dict[str, Any]:
    indicator_type = payload.type.lower()
    if indicator_type == "domain":
        return await lookup_domain(payload.indicator)
    elif indicator_type == "ip":
        return await lookup_ip(payload.indicator)
    else:
        raise HTTPException(status_code=400, detail="Only IP and Domain reputation lookups are supported.")
