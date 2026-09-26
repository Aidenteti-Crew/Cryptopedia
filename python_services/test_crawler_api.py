from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import api as api_module
import pytest
from crawler_analysis import AnalysisInProgressError, AnalysisJson, AnalyzeResponse
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_analyze_endpoint_requires_configured_bearer_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_API_TOKEN", "a" * 32)
    async with AsyncClient(
        transport=ASGITransport(app=api_module.app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/crawler/analyze",
            json={"source_id": str(uuid4()), "url": "https://build.avax.network/blog"},
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_analyze_endpoint_fails_when_database_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    token = "b" * 32
    monkeypatch.setenv("CRAWLER_ANALYSIS_API_TOKEN", token)
    with patch.object(api_module.analysis_db, "is_ready", return_value=False):
        async with AsyncClient(
            transport=ASGITransport(app=api_module.app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/crawler/analyze",
                headers={"Authorization": f"Bearer {token}"},
                json={"source_id": str(uuid4()), "url": "https://build.avax.network/blog"},
            )
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_analyze_endpoint_returns_persisted_result(monkeypatch: pytest.MonkeyPatch) -> None:
    token = "c" * 32
    monkeypatch.setenv("CRAWLER_ANALYSIS_API_TOKEN", token)
    expected = AnalyzeResponse(
        analysis_id=uuid4(),
        analysis_json=AnalysisJson(
            content_selector="article",
            title_selector="h2",
            url_selector="a",
            pagination_type="none",
            dynamic_load=False,
        ),
    )
    with (
        patch.object(api_module.analysis_db, "is_ready", return_value=True),
        patch.object(api_module, "analyze", new=AsyncMock(return_value=expected)),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=api_module.app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/crawler/analyze",
                headers={"Authorization": f"Bearer {token}"},
                json={"source_id": str(uuid4()), "url": "https://build.avax.network/blog"},
            )
    assert response.status_code == 200
    assert response.json()["analysis_id"] == str(expected.analysis_id)


@pytest.mark.asyncio
async def test_analyze_endpoint_returns_conflict_for_overlapping_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    token = "d" * 32
    monkeypatch.setenv("CRAWLER_ANALYSIS_API_TOKEN", token)
    with (
        patch.object(api_module.analysis_db, "is_ready", return_value=True),
        patch.object(
            api_module,
            "analyze",
            new=AsyncMock(side_effect=AnalysisInProgressError("analysis already in progress")),
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=api_module.app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/crawler/analyze",
                headers={"Authorization": f"Bearer {token}"},
                json={"source_id": str(uuid4()), "url": "https://build.avax.network/blog"},
            )
    assert response.status_code == 409
