from __future__ import annotations

import asyncio
import json
import socket
from unittest.mock import patch
from uuid import uuid4

import pytest
from crawler_analysis import (
    AnalysisJson,
    AnalyzeRequest,
    analyze,
    extract_analysis_json,
    validate_target_url,
)
from pydantic import ValidationError

VALID_ANALYSIS = {
    "content_selector": "article",
    "title_selector": "h2",
    "date_selector": "time",
    "author_selector": "",
    "url_selector": "h2 a",
    "body_selector": ".summary",
    "body_on_detail": True,
    "detail_body_selector": "main",
    "pagination_type": "none",
    "dynamic_load": False,
    "notes": "",
    "wait_for": None,
    "magic_mode": False,
}


def public_dns(*args: object, **kwargs: object) -> list[tuple[object, ...]]:
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]


@pytest.mark.asyncio
async def test_analyze_returns_validated_declarative_result(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    loop = asyncio.get_running_loop()
    with patch.object(loop, "getaddrinfo", side_effect=public_dns):
        result = await analyze(
            AnalyzeRequest(source_id=uuid4(), url="https://build.avax.network/blog"),
            runner=lambda _: asyncio.sleep(0, result=json.dumps(VALID_ANALYSIS)),
        )
    assert result.analysis_json.content_selector == "article"
    assert "js_code" not in result.analysis_json.model_dump()


@pytest.mark.asyncio
async def test_url_requires_exact_allowlisted_https_host(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    with pytest.raises(ValueError, match="HTTPS"):
        await validate_target_url("http://build.avax.network/blog")
    with pytest.raises(ValueError, match="not allowlisted"):
        await validate_target_url("https://evil.example/blog")


@pytest.mark.asyncio
async def test_url_rejects_private_dns_result(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    loop = asyncio.get_running_loop()
    with patch.object(
        loop,
        "getaddrinfo",
        return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))],
    ):
        with pytest.raises(ValueError, match="non-public"):
            await validate_target_url("https://build.avax.network/blog")


def test_analysis_schema_rejects_executable_and_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        AnalysisJson.model_validate({**VALID_ANALYSIS, "js_code": "alert(1)"})
    with pytest.raises(ValidationError, match="wait_for"):
        AnalysisJson.model_validate({**VALID_ANALYSIS, "wait_for": "js:()=>true"})


def test_agent_output_size_is_bounded() -> None:
    with pytest.raises(ValueError, match="64 KiB"):
        extract_analysis_json(" " * (64 * 1024 + 1))
