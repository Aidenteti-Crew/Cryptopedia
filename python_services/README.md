# Python Services API

FastAPI server for cherry-in-the-haystack Python services.

## Installation

```bash
# Using Poetry (recommended)
poetry install

# Or using pip
pip install -r requirements.txt
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
`force=true`, and records new analysis attempts in `core.run_log`.

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
