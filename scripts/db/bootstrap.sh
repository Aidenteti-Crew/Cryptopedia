#!/usr/bin/env bash
# 빈 PostgreSQL 에 Cryptopedia 스키마 + 최소 시드를 적용한다. (로컬 / 자체 호스팅 서버 공용)
# 사용: DATABASE_URL=postgresql://cherry:cherry_dev@localhost:15432/cherry_db bash scripts/db/bootstrap.sh [--with-demo] [--with-ontology]
#   --with-demo      KaaS 데모 시드(개념 9·에이전트 3·크레딧 원장) 삽입
#   --with-ontology  apps/docs/ontology-migration/ontology-snapshot.json 의 온톨로지(개념/관계/별칭) 삽입
# 재실행 안전: 대부분 IF NOT EXISTS / ON CONFLICT DO NOTHING. 단 stage-0-foundation·kaas 데모 시드는 중복 삽입될 수 있으니 1회만.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${DATABASE_URL:-postgresql://cherry:cherry_dev@localhost:15432/cherry_db}"
WITH_DEMO=0; WITH_ONTOLOGY=0
for a in "$@"; do case "$a" in --with-demo) WITH_DEMO=1;; --with-ontology) WITH_ONTOLOGY=1;; esac; done

run() { echo "==> $1"; psql "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/$1"; }

echo "DB: $DB"
pg_isready -d "$DB" >/dev/null || { echo "PostgreSQL 에 연결할 수 없습니다: $DB" >&2; exit 1; }

# 1. 기본 스키마 (core/content/handbook/kaas/personal/publishing/snapshot — 57 테이블)
#    파일 안의 CREATE DATABASE cherry_platform 은 제외하고 현재 DB($DB)에 적용한다.
echo "==> docs/architecture/ddl-v1.2.sql"
grep -vE '^CREATE DATABASE cherry_platform|^\s+WITH ENCODING' "$ROOT/docs/architecture/ddl-v1.2.sql" | psql "$DB" -v ON_ERROR_STOP=1 -q

# 2. 증분 마이그레이션 (원본 팀이 Supabase 에 순차 적용했던 것)
run apps/docs/staged_mock/handbook-key-idea-absorb-migration.sql
run apps/docs/staged_mock/kaas-tables-v2-schema.sql
run apps/docs/staged_mock/kaas-agent-task-migration.sql
run apps/docs/staged_mock/kaas-purchase-delivery-migration.sql
run apps/docs/staged_mock/kaas-curator-reward-migration.sql
run apps/docs/staged_mock/kaas-concept-created-by.sql
run apps/docs/staged_mock/kaas-concept-revoked-at.sql
run apps/docs/staged_mock/concept-on-sale-migration.sql
run apps/docs/staged_mock/concept-sale-discount-migration.sql
run apps/docs/staged_mock/google-login-migration.sql
run apps/docs/staged_mock/bench-member-key-migration.sql
run apps/docs/staged_mock/bench-key-expiry-migration.sql
run docs/architecture/concept-relation-migration-2026-08-19.sql
run docs/architecture/concept-page-contributor-2026-08-19.sql
# 2-b. 커밋된 DDL 에 빠져 있던 것 (문서/코드에서 복원)
run scripts/db/migrations/2026-09-14-source-submission-upload.sql
run scripts/db/migrations/2026-09-24-app-user-karma-tier.sql

# 3. 필수 시드 (시스템 유저 + 카테고리/엔터티 기준 데이터)
run apps/docs/seed_data/system-user.sql
run apps/docs/staged_mock/stage-0-foundation.sql
run apps/docs/seed_data/system-user-entity-follow.sql

# 4. 선택
if [ "$WITH_DEMO" = 1 ]; then
  echo "==> KaaS 데모 시드"
  # 원본 파일의 curator_reward INSERT 가 구 컬럼(curator_id)을 써서 현재 스키마에 맞게 치환
  sed -e "s/(curator_id, query_log_id, amount, withdrawn, created_at)/(curator_name, curator_wallet, query_log_id, amount, withdrawn, created_at)/" \
      -e "s/(sys_user_id, 'b000/('System', NULL, 'b000/" \
      "$ROOT/apps/docs/staged_mock/kaas-seed-demo-data.sql" | psql "$DB" -v ON_ERROR_STOP=1 -q
fi
if [ "$WITH_ONTOLOGY" = 1 ]; then
  echo "==> 온톨로지 스냅샷 import (apps/api/.env 의 LOCAL_DB_* 사용)"
  node "$ROOT/scripts/ontology/import-postgres.cjs" --confirm
fi

echo "✓ 완료. 테이블 수: $(psql "$DB" -Atc "select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema')")"
