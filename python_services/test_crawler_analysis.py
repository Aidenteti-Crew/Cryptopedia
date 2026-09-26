from __future__ import annotations

import asyncio
import json
import socket
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from crawler_analysis import (
    AnalysisInProgressError,
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


class FakeRepository:
    def __init__(
        self, existing: dict[str, Any] | None = None, *, fail_mark_failed: bool = False
    ) -> None:
        self.existing = existing
        self.run_log_id = uuid4()
        self.analysis_id = uuid4()
        self.persisted: dict[str, Any] | None = None
        self.failed: str | None = None
        self.locked = False
        self.fail_mark_failed = fail_mark_failed

    @asynccontextmanager
    async def source_lock(self, source_id: UUID) -> AsyncIterator[bool]:
        if self.locked:
            yield False
            return
        self.locked = True
        try:
            yield True
        finally:
            self.locked = False

    async def get_source_url(self, source_id: UUID) -> str | None:
        return "https://build.avax.network/blog"

    async def get_analysis(self, source_id: UUID) -> dict[str, Any] | None:
        return self.existing

    async def create_run_log(self, source_id: UUID, model_name: str) -> UUID:
        return self.run_log_id

    async def persist_success(self, **values: Any) -> UUID:
        self.persisted = values
        return self.analysis_id

    async def mark_failed(self, run_log_id: UUID, error: str) -> None:
        if self.fail_mark_failed:
            raise RuntimeError("database failed")
        self.failed = error


def public_dns(*args: object, **kwargs: object) -> list[tuple[object, ...]]:
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]


@pytest.mark.asyncio
async def test_analyze_returns_validated_declarative_result(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    repository = FakeRepository()
    loop = asyncio.get_running_loop()
    with patch.object(loop, "getaddrinfo", side_effect=public_dns):
        result = await analyze(
            AnalyzeRequest(source_id=uuid4(), url="https://build.avax.network/blog"),
            repository,
            runner=lambda _: asyncio.sleep(0, result=json.dumps(VALID_ANALYSIS)),
        )
    assert result.analysis_json.content_selector == "article"
    assert "js_code" not in result.analysis_json.model_dump()
    assert repository.persisted is not None


@pytest.mark.asyncio
async def test_analyze_reuses_cached_analysis(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    analysis_id = uuid4()
    repository = FakeRepository({"id": analysis_id, "analysis_json": VALID_ANALYSIS})
    loop = asyncio.get_running_loop()
    runner_called = False

    async def runner(_: str) -> str:
        nonlocal runner_called
        runner_called = True
        return json.dumps(VALID_ANALYSIS)

    with patch.object(loop, "getaddrinfo", side_effect=public_dns):
        result = await analyze(
            AnalyzeRequest(source_id=uuid4(), url="https://build.avax.network/blog"),
            repository,
            runner=runner,
        )
    assert result.analysis_id == analysis_id
    assert runner_called is False


@pytest.mark.asyncio
async def test_analyze_records_runner_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    repository = FakeRepository()
    loop = asyncio.get_running_loop()

    async def failing_runner(_: str) -> str:
        raise RuntimeError("browser failed")

    with patch.object(loop, "getaddrinfo", side_effect=public_dns):
        with pytest.raises(RuntimeError, match="browser failed"):
            await analyze(
                AnalyzeRequest(source_id=uuid4(), url="https://build.avax.network/blog"),
                repository,
                runner=failing_runner,
            )
    assert repository.failed == "RuntimeError: browser failed"


@pytest.mark.asyncio
async def test_run_log_failure_does_not_mask_runner_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    repository = FakeRepository(fail_mark_failed=True)
    loop = asyncio.get_running_loop()

    async def failing_runner(_: str) -> str:
        raise ValueError("original browser failure")

    with patch.object(loop, "getaddrinfo", side_effect=public_dns):
        with pytest.raises(ValueError, match="original browser failure") as error:
            await analyze(
                AnalyzeRequest(source_id=uuid4(), url="https://build.avax.network/blog"),
                repository,
                runner=failing_runner,
            )
    assert isinstance(error.value.__cause__, RuntimeError)
    assert str(error.value.__cause__) == "database failed"


@pytest.mark.asyncio
async def test_analyze_rejects_overlapping_run_for_same_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "build.avax.network")
    repository = FakeRepository()
    source_id = uuid4()
    started = asyncio.Event()
    release = asyncio.Event()
    runner_calls = 0

    async def slow_runner(_: str) -> str:
        nonlocal runner_calls
        runner_calls += 1
        started.set()
        await release.wait()
        return json.dumps(VALID_ANALYSIS)

    loop = asyncio.get_running_loop()
    with patch.object(loop, "getaddrinfo", side_effect=public_dns):
        first = asyncio.create_task(
            analyze(
                AnalyzeRequest(source_id=source_id, url="https://build.avax.network/blog"),
                repository,
                runner=slow_runner,
            )
        )
        await started.wait()
        with pytest.raises(AnalysisInProgressError, match="already in progress"):
            await analyze(
                AnalyzeRequest(source_id=source_id, url="https://build.avax.network/blog"),
                repository,
                runner=slow_runner,
            )
        release.set()
        await first

    assert runner_calls == 1


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
