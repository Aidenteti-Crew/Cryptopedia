ALTER TYPE content.source_submission_status_enum ADD VALUE IF NOT EXISTS 'ON_HOLD' AFTER 'PENDING';
ALTER TABLE content.source_submission
  ADD COLUMN IF NOT EXISTS kind        varchar(10) NOT NULL DEFAULT 'URL',
  ADD COLUMN IF NOT EXISTS file_key    varchar(500),
  ADD COLUMN IF NOT EXISTS file_name   varchar(300),
  ADD COLUMN IF NOT EXISTS file_size   integer,
  ADD COLUMN IF NOT EXISTS file_mime   varchar(100),
  ADD COLUMN IF NOT EXISTS file_sha256 char(64),
  ADD COLUMN IF NOT EXISTS analysis    jsonb;
ALTER TABLE content.source_submission ALTER COLUMN url DROP NOT NULL;
ALTER TABLE content.source_submission DROP CONSTRAINT IF EXISTS ck_submission_payload;
ALTER TABLE content.source_submission
  ADD CONSTRAINT ck_submission_payload
  CHECK ((kind='URL' AND url IS NOT NULL) OR (kind='FILE' AND file_key IS NOT NULL));
CREATE INDEX IF NOT EXISTS ix_submission_sha256 ON content.source_submission (file_sha256)
  WHERE file_sha256 IS NOT NULL;
