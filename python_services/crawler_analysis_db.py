"""PostgreSQL persistence for crawler analysis and its run log."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from contextvars import ContextVar
from typing import Any, cast
from uuid import UUID, uuid4

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool

_pool: AsyncConnectionPool | None = None
_locked_connection: ContextVar[AsyncConnection[Any] | None] = ContextVar(
    "crawler_analysis_locked_connection", default=None
)


async def init_pool() -> None:
    global _pool
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        return
    _pool = AsyncConnectionPool(
        conninfo=dsn.replace("postgresql+psycopg://", "postgresql://"),
        min_size=1,
        max_size=4,
        open=False,
        kwargs={"autocommit": True},
    )
    await _pool.open(wait=True, timeout=10)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def is_ready() -> bool:
    return _pool is not None


def _require_pool() -> AsyncConnectionPool:
    if _pool is None:
        raise RuntimeError("crawler analysis database is not initialized")
    return _pool


@asynccontextmanager
async def _connection() -> AsyncIterator[AsyncConnection[Any]]:
    locked = _locked_connection.get()
    if locked is not None:
        yield locked
        return
    async with _require_pool().connection() as connection:
        yield connection


@asynccontextmanager
async def source_lock(source_id: UUID) -> AsyncIterator[bool]:
    """Hold a session advisory lock and reuse its connection for this request."""
    async with _require_pool().connection() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "SELECT pg_try_advisory_lock(hashtextextended(%s, 0))",
                (str(source_id),),
            )
            row = await cursor.fetchone()
        acquired = bool(row and row[0])
        if not acquired:
            yield False
            return

        token = _locked_connection.set(connection)
        try:
            yield True
        finally:
            _locked_connection.reset(token)
            async with connection.cursor() as cursor:
                await cursor.execute(
                    "SELECT pg_advisory_unlock(hashtextextended(%s, 0))",
                    (str(source_id),),
                )


async def get_source_url(source_id: UUID) -> str | None:
    async with _connection() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "SELECT url_handle FROM content.source WHERE id = %s AND revoked_at IS NULL",
                (source_id,),
            )
            row = await cursor.fetchone()
    return None if row is None else row[0]


async def get_analysis(source_id: UUID) -> dict[str, Any] | None:
    async with _connection() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "SELECT id, analysis_json FROM content.crawler_analysis WHERE source_id = %s",
                (source_id,),
            )
            row = await cursor.fetchone()
    if row is None:
        return None
    return {"id": row[0], "analysis_json": row[1]}


async def create_run_log(source_id: UUID, model_name: str) -> UUID:
    run_log_id = uuid4()
    async with _connection() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                INSERT INTO core.run_log (
                    id, run_kind, status, related_entity_type,
                    related_entity_id, model_name
                ) VALUES (
                    %s, 'CRAWLER_ANALYSIS', 'RUNNING', 'SOURCE', %s, %s
                )
                """,
                (run_log_id, source_id, model_name),
            )
    return run_log_id


async def persist_success(
    *,
    source_id: UUID,
    run_log_id: UUID,
    analysis_json: dict[str, Any],
    model_name: str,
) -> UUID:
    """Upsert analysis and complete its run log in one transaction."""
    analysis_id = uuid4()
    async with _connection() as connection:
        async with connection.transaction():
            async with connection.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO content.crawler_analysis (
                        id, source_id, analysis_json, run_log_id, model_name
                    ) VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (source_id) DO UPDATE SET
                        analysis_json = EXCLUDED.analysis_json,
                        run_log_id = EXCLUDED.run_log_id,
                        model_name = EXCLUDED.model_name,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                    """,
                    (analysis_id, source_id, Jsonb(analysis_json), run_log_id, model_name),
                )
                row = await cursor.fetchone()
                if row is None:
                    raise RuntimeError("crawler analysis upsert returned no row")
                analysis_id = cast(UUID, row[0])
                await cursor.execute(
                    """
                    UPDATE core.run_log
                    SET status = 'SUCCESS', processed_count = 1,
                        ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (run_log_id,),
                )
    return analysis_id


async def mark_failed(run_log_id: UUID, error: str) -> None:
    async with _connection() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                UPDATE core.run_log
                SET status = 'FAILED', error_msg = %s,
                    ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (error[:4000], run_log_id),
            )
