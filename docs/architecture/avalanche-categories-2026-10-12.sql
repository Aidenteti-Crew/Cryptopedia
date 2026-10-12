-- ════════════════════════════════════════════════════════════════
-- Avalanche 생태계·매크로 4분류 테이블 (2026-10-12)
-- 크롤러(apps/pipeline)가 content.article_raw 에 쌓은 글을 AI(NVIDIA)로 분류한 결과와,
-- 생태계 프로젝트 디렉터리를 4개 화면(프로젝트 / 매크로 / 이벤트 / 기술 업데이트)용으로 나눠 저장한다.
-- 원칙: 신규 표만 추가. 기존 표 변경 없음. 모든 분류 표에 chain 을 두며 기본값은 두지 않는다
--       (다른 체인의 데이터가 avalanche 로 잘못 저장되지 않도록 쓰는 쪽이 반드시 값을 준다).
-- 점수(importance 1~5)는 각 표에 독립 저장하며
--       기존 user_article_ai_state(AI 엔지니어링용 평가)와 연동하지 않는다.
-- 적용: 수동(DBeaver/psql). 공유 DB 적용 전 팀 승인 필요. 되돌리기: avalanche-categories-2026-10-12.rollback.sql
-- ════════════════════════════════════════════════════════════════
BEGIN;

-- ── 1. 분류 기록 (재분류 방지·실패 추적) ─────────────────────────
CREATE TABLE IF NOT EXISTS content.article_classification (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_raw_id  UUID NOT NULL REFERENCES content.article_raw(id),
  category        VARCHAR(20),
  importance      SMALLINT,
  status          content.ai_status_enum NOT NULL DEFAULT 'PENDING',
  model_name      VARCHAR(100),
  raw_json        JSONB,
  error_msg       TEXT,
  attempts        INT NOT NULL DEFAULT 0,
  classified_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_acls_category CHECK
    (category IS NULL OR category IN ('PROJECT', 'MACRO', 'EVENT', 'TECH_UPDATE', 'GENERAL', 'NOISE')),
  CONSTRAINT ck_acls_importance CHECK (importance IS NULL OR importance BETWEEN 1 AND 5),
  CONSTRAINT ck_acls_raw_json CHECK (raw_json IS NULL OR jsonb_typeof(raw_json) = 'object')
);
COMMENT ON TABLE content.article_classification IS
  'article_raw 한 건당 한 번의 AI 분류 결과. 행이 있으면 재분류하지 않는다(실패는 status=FAILED 로 남아 재시도 대상).';
CREATE UNIQUE INDEX IF NOT EXISTS uq_acls_article ON content.article_classification (article_raw_id);
CREATE INDEX IF NOT EXISTS idx_acls_pending
  ON content.article_classification (status) WHERE (status <> 'SUCCESS');

-- ── 2. 생태계 프로젝트 (builders-hub integrations 디렉터리, AI 불필요) ──
CREATE TABLE IF NOT EXISTS content.eco_project (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain             VARCHAR(50) NOT NULL,
  external_key      VARCHAR(200) NOT NULL,
  name              VARCHAR(200) NOT NULL,
  category          VARCHAR(100),
  developer         VARCHAR(200),
  website_url       VARCHAR(1000),
  documentation_url VARCHAR(1000),
  description       TEXT,
  chains            TEXT[] NOT NULL DEFAULT '{}',
  source_url        VARCHAR(1000),
  importance        SMALLINT,
  importance_reason    TEXT,
  importance_model     VARCHAR(100),
  importance_scored_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at        TIMESTAMPTZ,
  CONSTRAINT ck_ecop_importance CHECK (importance IS NULL OR importance BETWEEN 1 AND 5)
);
COMMENT ON COLUMN content.eco_project.external_key IS
  '출처 파일명(예: aave). 재수집해도 변하지 않는 안정 키.';

-- ── 3. 매크로 소식 (협업 발표, 거래량 급증 등) ─────────────────────
CREATE TABLE IF NOT EXISTS content.macro_news (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_raw_id  UUID NOT NULL REFERENCES content.article_raw(id),
  chain           VARCHAR(50) NOT NULL,
  kind            VARCHAR(20) NOT NULL DEFAULT 'OTHER',
  related_project VARCHAR(200),
  title           VARCHAR(500) NOT NULL,
  summary         TEXT NOT NULL,
  importance      SMALLINT,
  published_at    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  CONSTRAINT ck_macro_kind CHECK (kind IN ('COLLAB', 'VOLUME', 'OTHER')),
  CONSTRAINT ck_macro_importance CHECK (importance IS NULL OR importance BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_macro_article
  ON content.macro_news (article_raw_id) WHERE (revoked_at IS NULL);

-- ── 4. 이벤트·행사 (프론트 EventEntry 계약: event-crawler-data-request.md) ──
CREATE TABLE IF NOT EXISTS content.chain_event (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key             VARCHAR(200) NOT NULL,
  first_article_raw_id  UUID REFERENCES content.article_raw(id),
  title                 VARCHAR(500) NOT NULL,
  summary               TEXT NOT NULL,
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ,
  timezone              VARCHAR(64) NOT NULL,
  all_day               BOOLEAN NOT NULL DEFAULT FALSE,
  organizer             VARCHAR(200),
  venue_name            VARCHAR(300),
  venue_address         VARCHAR(500),
  city                  VARCHAR(100),
  country               CHAR(2),
  is_online             BOOLEAN NOT NULL DEFAULT FALSE,
  source_url            VARCHAR(1000),
  registration_url      VARCHAR(1000),
  image_url             VARCHAR(1000),
  category              VARCHAR(50),
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  chain                 VARCHAR(50) NOT NULL,
  project               VARCHAR(200),
  status_override       VARCHAR(20),
  confidence            NUMERIC(3, 2),
  importance            SMALLINT,
  importance_reason    TEXT,
  importance_model     VARCHAR(100),
  importance_scored_at TIMESTAMPTZ,
  published_at          TIMESTAMPTZ,
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at            TIMESTAMPTZ,
  CONSTRAINT ck_chev_status CHECK
    (status_override IS NULL OR status_override IN ('CANCELLED', 'POSTPONED')),
  CONSTRAINT ck_chev_confidence CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  CONSTRAINT ck_chev_importance CHECK (importance IS NULL OR importance BETWEEN 1 AND 5),
  CONSTRAINT ck_chev_range CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
COMMENT ON TABLE content.chain_event IS
  '행사 개최일(starts_at)과 안내 글 게시일(published_at)은 다른 값이다. 날짜를 확정할 수 없는 글은 이 표에 넣지 않는다.';
COMMENT ON COLUMN content.chain_event.event_key IS
  '같은 행사의 여러 안내 글을 하나로 합치는 안정 키(예: crypto-house-seoul-2026).';
COMMENT ON COLUMN content.chain_event.status_override IS
  'CANCELLED/POSTPONED 만 저장. UPCOMING/ONGOING/PAST 는 API 응답 시점에 시간으로 계산한다.';
CREATE INDEX IF NOT EXISTS idx_chev_country
  ON content.chain_event (country) WHERE (revoked_at IS NULL);

-- ── 5. 기술 업데이트 (Fuji/메인넷에 무엇이 올라갔나) ───────────────
CREATE TABLE IF NOT EXISTS content.tech_update (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_raw_id  UUID NOT NULL REFERENCES content.article_raw(id),
  chain           VARCHAR(50) NOT NULL,
  kind            VARCHAR(20) NOT NULL DEFAULT 'OTHER',
  network         VARCHAR(20) NOT NULL DEFAULT 'OTHER',
  upgrade_name    VARCHAR(200),
  version         VARCHAR(100),
  title           VARCHAR(500) NOT NULL,
  change_summary  TEXT NOT NULL,
  activated_at    TIMESTAMPTZ,
  importance      SMALLINT,
  published_at    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  CONSTRAINT ck_tech_kind CHECK (kind IN ('RELEASE', 'ACP', 'BLOG', 'OTHER')),
  CONSTRAINT ck_tech_network CHECK (network IN ('FUJI', 'MAINNET', 'BOTH', 'OTHER')),
  CONSTRAINT ck_tech_importance CHECK (importance IS NULL OR importance BETWEEN 1 AND 5)
);
COMMENT ON COLUMN content.tech_update.activated_at IS
  '실제 활성화 시점(글에서 확인된 경우만). ACP 의 published_at 은 수집일이라 여기에 쓰지 않는다.';
CREATE UNIQUE INDEX IF NOT EXISTS uq_tech_article
  ON content.tech_update (article_raw_id) WHERE (revoked_at IS NULL);

-- ── 5-1. 기타 정보 (네 분류에 안 맞지만 버리기엔 아까운 글: 교육·해설·일반 정보) ──
-- NOISE(인사·밈·내용 없는 홍보)는 어떤 표에도 넣지 않고 분류 기록만 남긴다.
CREATE TABLE IF NOT EXISTS content.general_post (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_raw_id  UUID NOT NULL REFERENCES content.article_raw(id),
  chain           VARCHAR(50) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  summary         TEXT NOT NULL,
  importance      SMALLINT,
  published_at    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  CONSTRAINT ck_general_importance CHECK (importance IS NULL OR importance BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_general_article
  ON content.general_post (article_raw_id) WHERE (revoked_at IS NULL);

-- ── 6. chain 컬럼과 체인 단위 인덱스 ──────────────────────────────
-- 새 DB에서는 CREATE TABLE 이 chain 을 이미 만들어 ADD COLUMN 은 아무것도 하지 않는다.
-- 첫 초안(chain 없는 버전)이 적용된 로컬 DB에서는 기존 행을 avalanche 로 채운 뒤 기본값을 없앤다.
-- 체인이 들어간 인덱스는 컬럼이 확실히 생긴 뒤인 여기서만 만든다.
ALTER TABLE content.eco_project  ADD COLUMN IF NOT EXISTS chain VARCHAR(50) NOT NULL DEFAULT 'avalanche';
ALTER TABLE content.macro_news   ADD COLUMN IF NOT EXISTS chain VARCHAR(50) NOT NULL DEFAULT 'avalanche';
ALTER TABLE content.tech_update  ADD COLUMN IF NOT EXISTS chain VARCHAR(50) NOT NULL DEFAULT 'avalanche';
ALTER TABLE content.eco_project  ALTER COLUMN chain DROP DEFAULT;
ALTER TABLE content.macro_news   ALTER COLUMN chain DROP DEFAULT;
ALTER TABLE content.tech_update  ALTER COLUMN chain DROP DEFAULT;
ALTER TABLE content.chain_event  ALTER COLUMN chain DROP DEFAULT;
DROP INDEX IF EXISTS content.uq_ecop_external_key;
DROP INDEX IF EXISTS content.idx_ecop_category;
DROP INDEX IF EXISTS content.idx_macro_published;
DROP INDEX IF EXISTS content.uq_chev_event_key;
DROP INDEX IF EXISTS content.idx_chev_starts;
DROP INDEX IF EXISTS content.idx_tech_published;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecop_chain_key
  ON content.eco_project (chain, external_key) WHERE (revoked_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_ecop_chain_category
  ON content.eco_project (chain, category) WHERE (revoked_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_macro_chain_published
  ON content.macro_news (chain, published_at DESC) WHERE (revoked_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chev_chain_event_key
  ON content.chain_event (chain, event_key) WHERE (revoked_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_chev_chain_starts
  ON content.chain_event (chain, starts_at, id) WHERE (revoked_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_tech_chain_published
  ON content.tech_update (chain, published_at DESC) WHERE (revoked_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_general_chain_published
  ON content.general_post (chain, published_at DESC) WHERE (revoked_at IS NULL);

-- 디렉터리·캘린더처럼 AI 분류를 거치지 않는 표는 별도 채점 작업(pnpm score)이 importance 와
-- 그 근거·모델·시각을 채운다. importance_scored_at 이 비어 있으면 아직 채점 전이다.
ALTER TABLE content.eco_project ADD COLUMN IF NOT EXISTS importance_reason TEXT;
ALTER TABLE content.eco_project ADD COLUMN IF NOT EXISTS importance_model VARCHAR(100);
ALTER TABLE content.eco_project ADD COLUMN IF NOT EXISTS importance_scored_at TIMESTAMPTZ;
ALTER TABLE content.chain_event ADD COLUMN IF NOT EXISTS importance_reason TEXT;
ALTER TABLE content.chain_event ADD COLUMN IF NOT EXISTS importance_model VARCHAR(100);
ALTER TABLE content.chain_event ADD COLUMN IF NOT EXISTS importance_scored_at TIMESTAMPTZ;

-- 첫 초안의 분류값 OTHER 는 GENERAL/NOISE 로 나뉘었다. 초안이 적용된 DB에 남은 OTHER 기록은
-- 재분류 대상(FAILED, attempts 0)으로 돌린 뒤 제약을 새 값 목록으로 바꾼다. 새 DB에서는 해당 행이 없다.
UPDATE content.article_classification
   SET category = NULL, importance = NULL, status = 'FAILED', attempts = 0,
       error_msg = 'reclassify: OTHER was split into GENERAL and NOISE'
 WHERE category = 'OTHER';
ALTER TABLE content.article_classification DROP CONSTRAINT IF EXISTS ck_acls_category;
ALTER TABLE content.article_classification ADD CONSTRAINT ck_acls_category CHECK
  (category IS NULL OR category IN ('PROJECT', 'MACRO', 'EVENT', 'TECH_UPDATE', 'GENERAL', 'NOISE'));

-- ── 7. updated_at 자동 갱신 ────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['article_classification', 'eco_project', 'macro_news', 'chain_event', 'tech_update', 'general_post']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_set_updated_at ON content.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_set_updated_at BEFORE UPDATE ON content.%I
       FOR EACH ROW EXECUTE FUNCTION core.set_updated_at()', t, t);
  END LOOP;
END $$;

COMMIT;
