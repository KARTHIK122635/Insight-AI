import os
import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

# Add project root to sys.path
project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Load environment variables
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("insight_ai")

from typing import Any
from fastapi.responses import JSONResponse
from backend.data.sanitizer import sanitize_for_json

class SafeJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        return super().render(sanitize_for_json(content))

# Import API routers
from backend.api.datasets import router as datasets_router
from backend.api.dashboard import router as dashboard_router
from backend.api.chat import router as chat_router
from backend.api.insights import router as insights_router
from backend.api.stories import router as stories_router
from backend.api.sql_studio import router as sql_router
from backend.api.custom_chart import router as custom_chart_router
from backend.api.formulas import router as formulas_router
from backend.api.relationships import router as relationships_router
from backend.api.analytics_tools import router as analytics_tools_router
from backend.api.statistics import router as statistics_router
from backend.api.cleaning import router as cleaning_router
from backend.api.mongodb_tools import router as mongodb_router
from backend.api.auth import router as auth_router
from backend.api.shares import router as shares_router
from backend.data.store import dataset_store

@asynccontextmanager
async def lifespan(app: FastAPI):
    dataset_store.purge_demo_datasets()
    logger.info("InsightAI enterprise analytics engine started with clean state (0 preloaded datasets & legacy demo data purged).")
    yield


app = FastAPI(
    title="InsightAI — AI-Native Analytics & Dashboard Intelligence Platform",
    description="Deterministic DuckDB + Qwen Analytical Engine with Full Security Protections",
    version="1.0.0",
    default_response_class=SafeJSONResponse,
    lifespan=lifespan,
)

# Enterprise Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' "
        "https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com "
        "https://fonts.googleapis.com https://fonts.gstatic.com "
        "https://accounts.google.com https://apis.google.com https://oauth2.googleapis.com "
        "https://*.googleusercontent.com https://images.unsplash.com data: blob:; "
        "frame-src 'self' https://accounts.google.com; "
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://*.google.com http://localhost:* http://127.0.0.1:* https://insight-ai-zi5z.onrender.com;"
    )
    return response

# Enable CORS for Next.js or external frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(datasets_router)
app.include_router(dashboard_router)
app.include_router(chat_router)
app.include_router(insights_router)
app.include_router(stories_router)
app.include_router(sql_router)
app.include_router(custom_chart_router)
app.include_router(formulas_router)
app.include_router(relationships_router)
app.include_router(analytics_tools_router)
app.include_router(statistics_router)
app.include_router(cleaning_router)
app.include_router(mongodb_router)
app.include_router(auth_router)
app.include_router(shares_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "platform": "InsightAI",
        "primary_model": os.getenv("PRIMARY_MODEL", "Qwen/Qwen2.5-Coder-32B-Instruct"),
        "active_dataset": dataset_store.active_dataset_id,
        "datasets_count": len(dataset_store.datasets)
    }

# Mount static frontend directory and Vite assets
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
assets_dir = static_dir / "assets"
assets_dir.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
def serve_ui():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "InsightAI API is operational. Static UI is loading..."}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting InsightAI server at http://localhost:{port}")
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)
