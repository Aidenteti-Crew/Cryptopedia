import asyncio
import os
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import crawler_analysis_db as analysis_db
from crawler_analysis import AnalyzeRequest, AnalyzeResponse, analyze
from fastapi import FastAPI, Header, HTTPException
from loguru import logger
from pydantic import BaseModel


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("API starting up...")
    await analysis_db.init_pool()
    try:
        yield
    finally:
        await analysis_db.close_pool()
        logger.info("API shutting down...")


app = FastAPI(
    title="Cherry in the Haystack API",
    description="AI Engineering knowledge handbook services",
    version="0.0.1",
    lifespan=lifespan,
)


class HealthResponse(BaseModel):
    status: str
    timestamp: str


class EchoRequest(BaseModel):
    message: str


class EchoResponse(BaseModel):
    echo: str
    timestamp: str


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/")
def root() -> dict[str, str]:
    """Root endpoint with API information."""
    return {
        "name": "Cherry in the Haystack API",
        "version": "0.0.1",
        "status": "running",
    }


@app.post("/echo", response_model=EchoResponse)
def echo(request: EchoRequest) -> EchoResponse:
    """Echo endpoint for testing."""
    return EchoResponse(
        echo=request.message,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/crawler/analyze", response_model=AnalyzeResponse)
async def analyze_crawler(
    request: AnalyzeRequest,
    authorization: str | None = Header(default=None),
) -> AnalyzeResponse:
    """Analyze an allowlisted public page into a declarative crawler specification."""
    expected_token = os.environ.get("CRAWLER_ANALYSIS_API_TOKEN")
    if not expected_token or len(expected_token) < 32:
        raise HTTPException(status_code=503, detail="crawler analysis is not configured")
    scheme, _, provided_token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not secrets.compare_digest(provided_token, expected_token):
        raise HTTPException(status_code=401, detail="invalid crawler analysis credentials")
    if not analysis_db.is_ready():
        raise HTTPException(status_code=503, detail="crawler analysis database is unavailable")
    try:
        return await analyze(request, analysis_db)
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="crawler analysis timed out") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Crawler analysis failed")
        raise HTTPException(status_code=502, detail="crawler analysis failed") from exc


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8000"))
    logger.info(f"Starting API on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
