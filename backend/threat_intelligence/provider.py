from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class ThreatIntelResult:
    indicator: str
    type: str
    source: str
    is_malicious: Optional[bool]
    confidence: float
    details: str
    tags: List[str] = field(default_factory=list)
    threat_status: str = "UNKNOWN"
    metadata: Dict[str, Any] = field(default_factory=dict)

class ThreatIntelProvider(ABC):
    @abstractmethod
    def lookup_ip(self, ip: str) -> ThreatIntelResult:
        pass

    @abstractmethod
    def lookup_domain(self, domain: str) -> ThreatIntelResult:
        pass

    @abstractmethod
    def lookup_hash(self, file_hash: str) -> ThreatIntelResult:
        pass
