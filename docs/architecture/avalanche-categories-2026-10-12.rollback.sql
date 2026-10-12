-- Avalanche 4분류 테이블 되돌리기 (avalanche-categories-2026-10-12.sql)
-- 주의: 분류 결과와 적재된 프로젝트·이벤트 데이터가 모두 삭제된다. article_raw 는 건드리지 않는다.
BEGIN;
DROP TABLE IF EXISTS content.general_post;
DROP TABLE IF EXISTS content.tech_update;
DROP TABLE IF EXISTS content.chain_event;
DROP TABLE IF EXISTS content.macro_news;
DROP TABLE IF EXISTS content.eco_project;
DROP TABLE IF EXISTS content.article_classification;
COMMIT;
