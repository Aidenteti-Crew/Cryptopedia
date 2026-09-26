import asyncio
import os
from datetime import datetime, timezone

from crawler_analysis import AnalyzeRequest, AnalyzeResponse, analyze
from fastapi import FastAPI, HTTPException
from loguru import logger
from pydantic import BaseModel

app = FastAPI(
    title="Cherry in the Haystack API",
    description="AI Engineering knowledge handbook services",
    version="0.0.1",
)


class HealthResponse(BaseModel):
    status: str
    timestamp: str


class EchoRequest(BaseModel):
    message: str


class EchoResponse(BaseModel):
    echo: str
    timestamp: str


@app.on_event("startup")
def startup_event() -> None:
    logger.info("API starting up...")


@app.on_event("shutdown")
def shutdown_event() -> None:
    logger.info("API shutting down...")


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
async def analyze_crawler(request: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze an allowlisted public page into a declarative crawler specification."""
    try:
        return await analyze(request)
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="crawler analysis timed out") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8000"))
    logger.info(f"Starting API on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
