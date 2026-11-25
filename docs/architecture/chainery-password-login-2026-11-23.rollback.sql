-- chainery-password-login-2026-11-23.sql 되돌리기. 저장된 비밀번호 해시가 사라진다.
-- 비밀번호를 정한 회원은 이메일 링크나 Google 로 로그인해야 한다. 새 API 는 컬럼이 없어도 그 두 로그인을 처리한다.
BEGIN;

ALTER TABLE core.app_user
  DROP COLUMN IF EXISTS password_hash;

COMMIT;
