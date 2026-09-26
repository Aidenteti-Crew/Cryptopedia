"""Safe browser-use analysis boundary for generated crawler specifications."""

from __future__ import annotations

import asyncio
import ipaddress
import json
import os
import re
import socket
from collections.abc import Awaitable, Callable
from typing import Any, Protocol
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

DEFAULT_TIMEOUT_SECONDS = 300.0
MAX_TIMEOUT_SECONDS = 300.0
MAX_AGENT_OUTPUT_BYTES = 64 * 1024


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_id: UUID
    url: str = Field(min_length=1, max_length=2048)
    force: bool = False


class AnalysisJson(BaseModel):
    """Declarative fields accepted by the TypeScript artifact generator."""

    model_config = ConfigDict(extra="forbid")

    content_selector: str = Field(min_length=1, max_length=2048)
    title_selector: str = Field(min_length=1, max_length=2048)
    date_selector: str = Field(default="", max_length=2048)
    author_selector: str = Field(default="", max_length=2048)
    url_selector: str = Field(min_length=1, max_length=2048)
    body_selector: str = Field(default="", max_length=2048)
    body_on_detail: bool = False
    detail_body_selector: str = Field(default="", max_length=2048)
    pagination_type: str
    dynamic_load: bool
    notes: str = Field(default="", max_length=4000)
    wait_for: str | None = Field(default=None, max_length=2048)
    magic_mode: bool = False

    @field_validator("content_selector", "title_selector", "url_selector")
    @classmethod
    def selector_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("selector must not be blank")
        return value

    @field_validator("pagination_type")
    @classmethod
    def pagination_must_be_supported(cls, value: str) -> str:
        if value not in {"none", "click", "scroll"}:
            raise ValueError("pagination_type must be none, click, or scroll")
        return value

    @field_validator("wait_for")
    @classmethod
    def wait_condition_must_be_declarative(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("css:"):
            raise ValueError("wait_for only accepts a css: selector")
        return value


class AnalyzeResponse(BaseModel):
    analysis_id: UUID
    analysis_json: AnalysisJson


AnalysisRunner = Callable[[str], Awaitable[str]]


class AnalysisRepository(Protocol):
    async def get_source_url(self, source_id: UUID) -> str | None: ...

    async def get_analysis(self, source_id: UUID) -> dict[str, Any] | None: ...

    async def create_run_log(self, source_id: UUID, model_name: str) -> UUID: ...

    async def persist_success(
        self,
        *,
        source_id: UUID,
        run_log_id: UUID,
        analysis_json: dict[str, Any],
        model_name: str,
    ) -> UUID: ...

    async def mark_failed(self, run_log_id: UUID, error: str) -> None: ...


def allowed_hosts() -> set[str]:
    return {
        host.strip().lower().rstrip(".")
        for host in os.environ.get("CRAWLER_ANALYSIS_ALLOWED_HOSTS", "").split(",")
        if host.strip()
    }


async def validate_target_url(url: str) -> str:
    """Reject non-HTTPS, non-allowlisted, and private-network targets."""
    parsed = urlsplit(url)
    hostname = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme != "https" or not hostname:
        raise ValueError("url must use HTTPS and include a hostname")
    if parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("url credentials and non-standard ports are not allowed")

    configured_hosts = allowed_hosts()
    if not configured_hosts:
        raise ValueError("CRAWLER_ANALYSIS_ALLOWED_HOSTS must be configured")
    if hostname not in configured_hosts:
        raise ValueError(f"hostname is not allowlisted: {hostname}")

    loop = asyncio.get_running_loop()
    try:
        addresses = await asyncio.wait_for(
            loop.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM), timeout=5.0
        )
    except (TimeoutError, socket.gaierror) as exc:
        raise ValueError(f"hostname could not be resolved: {hostname}") from exc
    if not addresses:
        raise ValueError(f"hostname could not be resolved: {hostname}")
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise ValueError("target hostname resolves to a non-public address")
    return url


def analysis_timeout_seconds() -> float:
    try:
        configured = float(
            os.environ.get("CRAWLER_ANALYSIS_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS)
        )
    except ValueError as exc:
        raise ValueError("CRAWLER_ANALYSIS_TIMEOUT_SECONDS must be numeric") from exc
    if configured <= 0 or configured > MAX_TIMEOUT_SECONDS:
        raise ValueError(f"analysis timeout must be between 0 and {MAX_TIMEOUT_SECONDS:g} seconds")
    return configured


def extract_analysis_json(raw_output: str) -> AnalysisJson:
    if len(raw_output.encode("utf-8")) > MAX_AGENT_OUTPUT_BYTES:
        raise ValueError("browser-use output exceeds the 64 KiB limit")
    text = raw_output.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("browser-use output does not contain a JSON object")
        text = text[start : end + 1]
    return AnalysisJson.model_validate(json.loads(text))


ANALYSIS_PROMPT = """\
Navigate to {url} and inspect only that site's article listing structure.
Return only one JSON object with these exact fields:
content_selector, title_selector, date_selector, author_selector, url_selector,
body_selector, body_on_detail, detail_body_selector, pagination_type,
dynamic_load, notes, wait_for, magic_mode.
Use only CSS selectors. wait_for must be null or start with "css:".
Do not return JavaScript, executable code, markdown, or prose outside the JSON object.
pagination_type must be one of: none, click, scroll.
"""


async def run_browser_use_analysis(url: str) -> str:
    """Run browser-use lazily so API imports and tests do not require Chromium."""
    from browser_use import Agent, BrowserSession
    from browser_use.llm.anthropic.chat import ChatAnthropic

    api_key = os.environ["ANTHROPIC_API_KEY"]
    model = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    hostname = urlsplit(url).hostname
    if hostname is None:
        raise ValueError("analysis URL has no hostname")
    browser_session = BrowserSession(allowed_domains=[hostname])
    agent = Agent(
        task=ANALYSIS_PROMPT.format(url=url),
        llm=ChatAnthropic(model=model, api_key=api_key),
        browser_session=browser_session,
        max_failures=3,
    )
    history = await agent.run()
    result = history.final_result()
    if not result:
        raise ValueError("browser-use agent returned an empty result")
    return result


async def analyze(
    request: AnalyzeRequest,
    repository: AnalysisRepository,
    runner: AnalysisRunner = run_browser_use_analysis,
) -> AnalyzeResponse:
    url = await validate_target_url(request.url)
    source_url = await repository.get_source_url(request.source_id)
    if source_url is None:
        raise ValueError(f"source does not exist: {request.source_id}")
    if source_url.rstrip("/") != url.rstrip("/"):
        raise ValueError("request URL does not match the registered source URL")
    existing = await repository.get_analysis(request.source_id)
    if existing is not None and not request.force:
        return AnalyzeResponse(
            analysis_id=existing["id"],
            analysis_json=AnalysisJson.model_validate(existing["analysis_json"]),
        )

    model_name = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    run_log_id = await repository.create_run_log(request.source_id, model_name)
    try:
        raw_output = await asyncio.wait_for(runner(url), timeout=analysis_timeout_seconds())
        analysis_json = extract_analysis_json(raw_output)
        analysis_id = await repository.persist_success(
            source_id=request.source_id,
            run_log_id=run_log_id,
            analysis_json=analysis_json.model_dump(),
            model_name=model_name,
        )
    except Exception as exc:
        await repository.mark_failed(run_log_id, f"{type(exc).__name__}: {exc}")
        raise
    return AnalyzeResponse(analysis_id=analysis_id, analysis_json=analysis_json)
