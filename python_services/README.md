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

The analysis endpoint currently returns an ephemeral `analysis_id`. Database-backed caching,
run logging, and stable analysis IDs are added in the persistence integration step; callers must
not activate an artifact until that integration is enabled.

## Environment Variables

| Variable                           | Default                      | Description                                          |
| ---------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `API_HOST`                         | `127.0.0.1`                  | Bind address                                         |
| `API_PORT`                         | `8000`                       | Port number                                          |
| `CRAWLER_ANALYSIS_ALLOWED_HOSTS`   | required                     | Comma-separated exact hostnames allowed for analysis |
| `CRAWLER_ANALYSIS_TIMEOUT_SECONDS` | `300`                        | Analysis timeout; maximum 300 seconds                |
| `ANTHROPIC_API_KEY`                | required for analysis        | Anthropic API key used by browser-use                |
| `ANTHROPIC_MODEL`                  | `claude-3-5-sonnet-20241022` | Analysis model                                       |
