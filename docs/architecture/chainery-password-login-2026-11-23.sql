-- ════════════════════════════════════════════════════════════════
-- Chainery 이메일 + 비밀번호 로그인 (2026-11-23)
-- 설계: apps/docs/events-auth/3-checklist-table.md 섹션 B5 (2026-11-23 결정)
-- 선행: ddl-v1.1.sql 의 core.app_user
-- 원칙: 추가 전용. NULL 허용 컬럼 하나를 더한다. 기존 행은 그대로(비밀번호 없음).
--       해시는 이메일 링크로 로그인한 세션이나 현재 비밀번호를 아는 세션만 쓴다.
-- 순서: 비밀번호 기능을 쓰기 전에 적용한다. 컬럼이 없어도 새 API 의 이메일 링크·Google 로그인과 /me 는
--       동작한다. 비밀번호 로그인은 모두 401, 비밀번호 정하기는 500 이 된다.
-- 적용: 수동(DBeaver/psql). 공유 DB 적용 전 팀 승인 필요. 되돌리기: chainery-password-login-2026-11-23.rollback.sql
-- ════════════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE core.app_user
  ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;

COMMIT;
