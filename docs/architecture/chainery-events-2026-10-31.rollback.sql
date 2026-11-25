-- chainery-events-2026-10-31.sql 되돌리기. 새로 쌓인 모집·근거·검수·이력 값은 사라진다.
BEGIN;

UPDATE content.source
   SET source_meta_json = source_meta_json - 'collector'
 WHERE source_meta_json ->> 'collector' = 'chainery';

ALTER TABLE content.tech_update
  DROP CONSTRAINT IF EXISTS ck_tech_stage,
  DROP CONSTRAINT IF EXISTS ck_tech_what_changed,
  DROP CONSTRAINT IF EXISTS ck_tech_who_cares,
  DROP CONSTRAINT IF EXISTS ck_tech_review_state,
  DROP COLUMN IF EXISTS lifecycle_stage,
  DROP COLUMN IF EXISTS stage_evidence,
  DROP COLUMN IF EXISTS stage_source_url,
  DROP COLUMN IF EXISTS proposal_created_at,
  DROP COLUMN IF EXISTS proposal_updated_at,
  DROP COLUMN IF EXISTS included_in_release,
  DROP COLUMN IF EXISTS included_release_url,
  DROP COLUMN IF EXISTS what_changed,
  DROP COLUMN IF EXISTS who_cares,
  DROP COLUMN IF EXISTS review_state,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS content_hash;

ALTER TABLE content.chain_event_source
  DROP CONSTRAINT IF EXISTS ck_chevs_authority,
  DROP COLUMN IF EXISTS authority,
  DROP COLUMN IF EXISTS is_primary;

DROP TABLE IF EXISTS content.chain_event_revision;

DROP INDEX IF EXISTS content.idx_chev_published_starts;
ALTER TABLE content.chain_event
  DROP CONSTRAINT IF EXISTS ck_chev_reg_override,
  DROP CONSTRAINT IF EXISTS ck_chev_level,
  DROP CONSTRAINT IF EXISTS ck_chev_fee,
  DROP CONSTRAINT IF EXISTS ck_chev_audience,
  DROP CONSTRAINT IF EXISTS ck_chev_review_state,
  DROP CONSTRAINT IF EXISTS ck_chev_evidence,
  DROP COLUMN IF EXISTS registration_deadline,
  DROP COLUMN IF EXISTS registration_status_override,
  DROP COLUMN IF EXISTS audience,
  DROP COLUMN IF EXISTS audience_evidence,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS level_evidence,
  DROP COLUMN IF EXISTS fee,
  DROP COLUMN IF EXISTS fee_evidence,
  DROP COLUMN IF EXISTS related_chains,
  DROP COLUMN IF EXISTS review_state,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS review_note,
  DROP COLUMN IF EXISTS content_hash;

COMMIT;
