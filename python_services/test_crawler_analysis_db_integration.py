from __future__ import annotations

import asyncio
import os
from uuid import uuid4

import crawler_analysis_db as database
import psycopg
import pytest

pytestmark = pytest.mark.integration


def database_url() -> str:
    value = os.environ.get("TEST_DATABASE_URL")
    if not value:
        pytest.skip("TEST_DATABASE_URL is required for PostgreSQL integration tests")
    return value


@pytest.mark.asyncio
async def test_crawler_migration_objects_exist() -> None:
    dsn = database_url()
    async with await psycopg.AsyncConnection.connect(dsn) as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                SELECT e.enumlabel
                FROM pg_type AS t
                JOIN pg_enum AS e ON e.enumtypid = t.oid
                JOIN pg_namespace AS n ON n.oid = t.typnamespace
                WHERE n.nspname = 'core'
                  AND t.typname = 'run_kind_enum'
                  AND e.enumlabel = 'CRAWLER_ANALYSIS'
                """
            )
            assert await cursor.fetchone() == ("CRAWLER_ANALYSIS",)
            await cursor.execute(
                """
                SELECT to_regclass('content.crawler_analysis'),
                       to_regclass('content.crawler_registry')
                """
            )
            assert await cursor.fetchone() == (
                "content.crawler_analysis",
                "content.crawler_registry",
            )


@pytest.mark.asyncio
async def test_source_lock_rejects_second_postgres_connection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", database_url())
    await database.init_pool()
    source_id = uuid4()
    first_locked = asyncio.Event()
    release_first = asyncio.Event()

    async def hold_first_lock() -> None:
        async with database.source_lock(source_id) as acquired:
            assert acquired is True
            first_locked.set()
            await release_first.wait()

    first = asyncio.create_task(hold_first_lock())
    try:
        await asyncio.wait_for(first_locked.wait(), timeout=5)
        async with database.source_lock(source_id) as acquired:
            assert acquired is False
        release_first.set()
        await asyncio.wait_for(first, timeout=5)
        async with database.source_lock(source_id) as acquired_after_release:
            assert acquired_after_release is True
    finally:
        release_first.set()
        await asyncio.gather(first, return_exceptions=True)
        await database.close_pool()
