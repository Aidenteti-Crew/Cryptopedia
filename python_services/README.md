# Python Services API

FastAPI server for cherry-in-the-haystack Python services.

## Installation

```bash
# Using Poetry (recommended)
poetry install

# Or using pip
pip install -r python_services/requirements.txt

# Test and lint dependencies
pip install -r python_services/requirements-dev.txt

# Browser runtime required by /crawler/analyze
python -m playwright install chromium
```

## Running

```bash
# Default: http://127.0.0.1:8000
python python_services/api.py

# Custom host/port
API_HOST=0.0.0.0 API_PORT=8080 python python_services/api.py
```

## Endpoints

- `GET /` — API information
- `GET /health` — Health check
- `POST /echo` — Echo test endpoint
- `POST /crawler/analyze` — Analyze an allowlisted HTTPS page into a declarative crawler spec

The analysis endpoint requires bearer authentication, an initialized PostgreSQL connection, and
the separately approved `docs/crawler-autogen-migration.sql`. It reuses a cached analysis unless
`force=true`, records new analysis attempts in `core.run_log`, and returns HTTP 409 while another
process holds the same source's PostgreSQL advisory lock.

## Testing

```bash
# Unit tests (no database required)
pytest python_services/test_crawler_analysis.py python_services/test_crawler_api.py

# PostgreSQL integration tests (migration objects + real advisory-lock behavior)
docker-compose up -d postgres
psql "$DATABASE_URL" -f docs/architecture/ddl-v1.1.sql
psql "$DATABASE_URL" -c "ALTER TYPE core.run_kind_enum ADD VALUE IF NOT EXISTS 'CRAWLER_ANALYSIS';" \
                      -c "ALTER TYPE core.run_kind_enum ADD VALUE IF NOT EXISTS 'CRAWLER_GENERATION';" \
                      -c "ALTER TYPE core.run_kind_enum ADD VALUE IF NOT EXISTS 'CRAWLER_EXECUTION';" \
                      -c "ALTER TYPE core.run_kind_enum ADD VALUE IF NOT EXISTS 'CRAWLER_FALLBACK';"
psql "$DATABASE_URL" -f docs/crawler-autogen-migration.sql
TEST_DATABASE_URL="$DATABASE_URL" pytest python_services/test_crawler_analysis_db_integration.py -m integration
```

The enum values are added in a separate `psql` call first because `ALTER TYPE ... ADD VALUE` cannot be
used in the same transaction that adds it. `docs/crawler-autogen-migration.sql` repeats the same
`ADD VALUE IF NOT EXISTS` statements at its top for standalone use — running it again here is a no-op.

## Environment Variables

| Variable                           | Default                      | Description                                          |
| ---------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `API_HOST`                         | `127.0.0.1`                  | Bind address                                         |
| `API_PORT`                         | `8000`                       | Port number                                          |
| `CRAWLER_ANALYSIS_ALLOWED_HOSTS`   | required                     | Comma-separated exact hostnames allowed for analysis |
| `CRAWLER_ANALYSIS_TIMEOUT_SECONDS` | `300`                        | Analysis timeout; maximum 300 seconds                |
| `CRAWLER_ANALYSIS_API_TOKEN`       | required                     | Bearer token shared with the TypeScript pipeline     |
| `ANTHROPIC_API_KEY`                | required for analysis        | Anthropic API key used by browser-use                |
| `ANTHROPIC_MODEL`                  | `claude-3-5-sonnet-20241022` | Analysis model                                       |
