import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_database, get_session
from services.auth_service import auth_service
from services.monitoring_service import monitoring_service
from config import settings

from api.routes import auth, telemetry, processes, network, alerts, digital_twin, ml, security, threat_intel, simulation, reports, settings as settings_route, incidents
from api.websocket import router as websocket_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    init_database()
    
    logger.info("Ensuring default admin...")
    with get_session() as db:
        auth_service.ensure_default_admin(db)
        
    logger.info("Starting monitoring service...")
    await monitoring_service.start()
    
    yield
    
    # Shutdown
    logger.info("Shutting down monitoring service...")
    await monitoring_service.stop()

app = FastAPI(
    title="Digital Twin Security Monitoring System",
    description="API for the Digital Twin Security Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")
app.include_router(processes.router, prefix="/api")
app.include_router(network.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(digital_twin.router, prefix="/api")
app.include_router(ml.router, prefix="/api")
app.include_router(security.router, prefix="/api")
app.include_router(threat_intel.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(settings_route.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(websocket_router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "monitoring": monitoring_service.is_running}

@app.get("/")
async def root():
    return {"message": "Digital Twin Security Monitoring API"}
