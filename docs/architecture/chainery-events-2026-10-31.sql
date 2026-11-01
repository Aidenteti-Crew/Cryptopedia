-- ════════════════════════════════════════════════════════════════
-- Chainery 소식·행사 확장 (2026-10-31)
-- 설계: apps/docs/events-auth/2-detail-design.md
-- 선행: avalanche-categories-2026-10-12.sql (content.chain_event · chain_event_source · tech_update)
-- 원칙: 추가 전용. 기존 컬럼·제약은 바꾸지 않는다. 기존 코드는 새 컬럼을 몰라도 그대로 동작한다.
--       review_state 기본값은 당분간 'PUBLISHED' — 지금 보이는 행사·소식이 그대로 보이고,
--       검수 화면(/admin/review)이 생기는 S3에서 기본값을 'DRAFT'로 바꾼다.
-- 적용: 수동(DBeaver/psql). 공유 DB 적용 전 팀 승인 필요. 되돌리기: chainery-events-2026-10-31.rollback.sql
-- ════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1. 행사: 모집·대상·수준·참가비·관련 체인·검수 ───────────────────
ALTER TABLE content.chain_event
  ADD COLUMN IF NOT EXISTS registration_deadline        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_status_override VARCHAR(20),
  ADD COLUMN IF NOT EXISTS audience                     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audience_evidence            TEXT,
  ADD COLUMN IF NOT EXISTS level                        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS level_evidence               TEXT,
  ADD COLUMN IF NOT EXISTS fee                          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS fee_evidence                 TEXT,
  ADD COLUMN IF NOT EXISTS related_chains               TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS review_state                 VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS reviewed_by                  UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at                  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_note                  TEXT,
  ADD COLUMN IF NOT EXISTS content_hash                 CHAR(64);

ALTER TABLE content.chain_event
  DROP CONSTRAINT IF EXISTS ck_chev_reg_override,
  DROP CONSTRAINT IF EXISTS ck_chev_level,
  DROP CONSTRAINT IF EXISTS ck_chev_fee,
  DROP CONSTRAINT IF EXISTS ck_chev_audience,
  DROP CONSTRAINT IF EXISTS ck_chev_review_state,
  DROP CONSTRAINT IF EXISTS ck_chev_evidence;
ALTER TABLE content.chain_event
  ADD CONSTRAINT ck_chev_reg_override CHECK
    (registration_status_override IS NULL OR registration_status_override IN ('CLOSED_EARLY')),
  ADD CONSTRAINT ck_chev_level CHECK
    (level IS NULL OR level IN ('BEGINNER_OK', 'EXPERIENCE_RECOMMENDED', 'ADVANCED')),
  ADD CONSTRAINT ck_chev_fee CHECK (fee IS NULL OR fee IN ('FREE', 'PAID')),
  ADD CONSTRAINT ck_chev_audience CHECK
    (audience <@ ARRAY['STUDENT', 'DEVELOPER', 'STARTUP', 'RESEARCHER', 'ANYONE']::TEXT[]),
  ADD CONSTRAINT ck_chev_review_state CHECK
    (review_state IN ('DRAFT', 'NEEDS_REVIEW', 'PUBLISHED', 'REJECTED')),
  -- 원문 근거 없이는 값을 둘 수 없다 (근거가 원문에 실제로 있는지는 pipeline 코드가 확인).
  ADD CONSTRAINT ck_chev_evidence CHECK (
        (level IS NULL OR level_evidence IS NOT NULL)
    AND (fee IS NULL OR fee_evidence IS NOT NULL)
    AND (cardinality(audience) = 0 OR audience_evidence IS NOT NULL)
  );

COMMENT ON COLUMN content.chain_event.registration_status_override IS
  'CLOSED_EARLY(조기 마감)만 저장. OPEN/CLOSING_SOON/CLOSED/UNKNOWN 은 API 응답 시점에 계산한다.';
COMMENT ON COLUMN content.chain_event.level IS
  '원문에 근거 문장이 있을 때만. AI가 추정한 "입문 가능"은 저장하지 않는다.';
COMMENT ON COLUMN content.chain_event.related_chains IS
  '행사가 다루는 체인(원문에 나올 때만). chain 컬럼은 피드 범위(avalanche · web3-kr)다.';
COMMENT ON COLUMN content.chain_event.review_state IS
  '공개 API는 PUBLISHED 만 반환한다.';
COMMENT ON COLUMN content.chain_event.content_hash IS
  '사용자에게 보이는 일정·장소·신청 필드의 해시. 발행 후 바뀌면 NEEDS_REVIEW 로 돌린다.';

CREATE INDEX IF NOT EXISTS idx_chev_published_starts
  ON content.chain_event (chain, starts_at)
  WHERE (revoked_at IS NULL AND review_state = 'PUBLISHED');

-- ── 2. 행사 변경 이력 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content.chain_event_revision (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_event_id  UUID NOT NULL REFERENCES content.chain_event(id),
  revision_no     INT NOT NULL,
  snapshot        JSONB NOT NULL,
  changed_fields  TEXT[] NOT NULL DEFAULT '{}',
  source_url      VARCHAR(1000),
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  CONSTRAINT ck_chevr_snapshot CHECK (jsonb_typeof(snapshot) = 'object')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chevr_no
  ON content.chain_event_revision (chain_event_id, revision_no);
COMMENT ON TABLE content.chain_event_revision IS
  '발행본이 바뀌기 직전 값. 출처 변경 이력과 재검수 diff 에 쓴다.';

-- ── 3. 행사 출처: 대표 출처 판단용 ────────────────────────────────
ALTER TABLE content.chain_event_source
  ADD COLUMN IF NOT EXISTS authority  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE content.chain_event_source DROP CONSTRAINT IF EXISTS ck_chevs_authority;
ALTER TABLE content.chain_event_source
  ADD CONSTRAINT ck_chevs_authority CHECK
    (authority IS NULL OR authority IN ('ORGANIZER', 'PUBLIC_AGENCY', 'PLATFORM', 'AGGREGATOR', 'OFFICIAL'));

-- ── 4. 소식: 제안·확정·적용 + 3문항 요약 + 검수 ────────────────────
ALTER TABLE content.tech_update
  ADD COLUMN IF NOT EXISTS lifecycle_stage  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS stage_evidence   TEXT,
  ADD COLUMN IF NOT EXISTS stage_source_url VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS what_changed     TEXT,
  ADD COLUMN IF NOT EXISTS who_cares        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS who_cares_note   TEXT,
  ADD COLUMN IF NOT EXISTS review_state     VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS reviewed_by      UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_hash     CHAR(64);
ALTER TABLE content.tech_update
  DROP CONSTRAINT IF EXISTS ck_tech_stage,
  DROP CONSTRAINT IF EXISTS ck_tech_who_cares,
  DROP CONSTRAINT IF EXISTS ck_tech_review_state;
ALTER TABLE content.tech_update
  -- 단계는 코드가 ACP 상태·활성화 시각으로 판정한다 (AI 판단 아님).
  ADD CONSTRAINT ck_tech_stage CHECK
    (lifecycle_stage IS NULL OR lifecycle_stage IN ('PROPOSED', 'ACCEPTED', 'ACTIVATED', 'STALE')),
  ADD CONSTRAINT ck_tech_who_cares CHECK
    (who_cares <@ ARRAY['NODE_OPERATOR', 'VALIDATOR', 'DAPP_DEVELOPER', 'L1_BUILDER', 'USER']::TEXT[]),
  ADD CONSTRAINT ck_tech_review_state CHECK
    (review_state IN ('DRAFT', 'NEEDS_REVIEW', 'PUBLISHED', 'REJECTED'));

-- ── 5. 수집기 표시: 기존 NestJS 스케줄러(AI 엔지니어링 평가)가 Chainery 글을 가져가지 않게 ──
-- apps/pipeline 이 source_meta_json.collector = 'chainery' 를 남기고,
-- apps/api ArticleIngestionService.processAllUnprocessed 가 이 소스의 글을 건너뛴다.
-- 아래는 이미 수집된 소스(apps/pipeline/config/sources.yaml, 2026-10-31 기준) 백필.
UPDATE content.source
   SET source_meta_json = jsonb_set(coalesce(source_meta_json, '{}'::jsonb), '{collector}', '"chainery"', true)
 WHERE revoked_at IS NULL
   AND NOT (coalesce(source_meta_json, '{}'::jsonb) ? 'collector')
   AND url_handle IN (
    'https://github.com/ava-labs/avalanchego/releases.atom',
    'https://github.com/ava-labs/coreth/releases.atom',
    'https://github.com/ava-labs/subnet-evm/releases.atom',
    'https://github.com/avalanche-foundation/ACPs',
    'https://build.avax.network/blog',
    'https://build.avax.network/integrations',
    'https://x.com/avax',
    'https://x.com/Team1KOR',
    'https://x.com/AvaxTeam1',
    'https://luma.com/Team1',
    'https://luma.com/Team1KOR',
    'https://luma.com/Team1India',
    'https://luma.com/Team1VN',
    'https://luma.com/Team1France',
    'https://luma.com/team1th',
    'https://luma.com/Team1Africa',
    'https://luma.com/Team1Turkiye'
   );

COMMIT;
