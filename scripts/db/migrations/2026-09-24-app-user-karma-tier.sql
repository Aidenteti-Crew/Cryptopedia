-- core.app_user.karma_tier — kaas 모듈(kaas-knowledge.service 등)이 조회하지만
-- 커밋된 DDL 어디에도 없던 컬럼 (원본 팀이 Supabase에 직접 추가한 것으로 추정).
ALTER TABLE core.app_user
  ADD COLUMN IF NOT EXISTS karma_tier varchar(20) NOT NULL DEFAULT 'Bronze';
