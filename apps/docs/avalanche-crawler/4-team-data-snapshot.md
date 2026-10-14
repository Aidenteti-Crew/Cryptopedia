# 팀 개발용 Avalanche 크롤러 데이터 스냅샷

생성 시각: 2026-10-14 (KST)

파일: [`snapshots/avalanche-crawler-2026-10-14.dump`](snapshots/avalanche-crawler-2026-10-14.dump)

크기: 369,922 bytes (약 362 KiB)

SHA-256: `090504b9c1ea80385491004b71530cfcf6046b01c4290a3a237c00aa0dc73ac2`

## 무엇이 들어 있나

로컬 `cherry_db`의 크롤러·API 테이블 데이터만 PostgreSQL custom dump로 내보냈다. 전체 DB 백업이 아니며 스키마 정의와 환경 설정·API 키는 포함하지 않는다. `source` 20행, 원문 기사 145건, AI 분류 145건, 프로젝트 235건, 매크로 26건, 행사 18건, 행사 출처 1건, 기술 업데이트 72건, 일반 글 18건이다. X 게시물의 본문을 포함한 원문 자료도 있으므로 팀 내부 개발·검증 목적으로만 사용한다.

이 스냅샷은 그 시점의 고정 데이터다. 가져오는 데 LLM 키가 필요하지 않고, 저장된 분류 결과를 다시 생성할 필요도 없다. 각 `article_classification` 행에는 분류 상태·모델명·원 JSON이 저장돼 있다. 새 기사를 수집하거나 다시 분류할 때는 팀에서 승인된 자체 개발 키와 모델 설정이 필요하다. `.env` 파일이나 API 키는 스냅샷에 추가하지 않는다.

## 로컬 개발 DB에 복원하기

복원 대상은 팀원의 **로컬 전용 개발 DB**여야 한다. 운영 DB나 공용 DB에는 복원하지 않는다. 스냅샷에 포함된 테이블이 이미 채워진 DB에는 그대로 복원하지 않는다. 중복 키가 발생할 수 있으므로 비어 있는 로컬 개발 DB를 준비한다.

1. 저장소의 일반 API 마이그레이션으로 `content.source`와 `content.article_raw` 등 기반 테이블을 준비한다.
2. `docs/architecture/avalanche-categories-2026-10-12.sql`을 해당 로컬 DB에 적용한다. 이 파일이 분류·생태계 테이블을 만든다.
3. PostgreSQL 16 호환 `pg_restore`를 사용해 스냅샷 데이터를 넣는다. `LOCAL_DATABASE_URL`은 팀원 자신의 로컬 개발 DB 연결 문자열로 설정한다. 값을 채팅이나 LLM 프롬프트에 붙여 넣지 않는다.

```sh
pg_restore \
  --data-only \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --single-transaction \
  --dbname="$LOCAL_DATABASE_URL" \
  apps/docs/avalanche-crawler/snapshots/avalanche-crawler-2026-10-14.dump
```

복원 후 API를 실행해 확인한다.

```sh
curl 'http://localhost:4000/api/ecosystem?chain=avalanche'
curl 'http://localhost:4000/api/ecosystem/macro?chain=avalanche&sort=latest'
curl 'http://localhost:4000/api/ecosystem/updates?chain=avalanche&sort=latest'
curl 'http://localhost:4000/api/events?chain=avalanche&status=upcoming'
```

웹 생태계 홈은 `NEXT_PUBLIC_API_URL`이 가리키는 API의 매크로·업데이트·행사 조회를 사용한다. 로컬 API로 테스트할 때 그 환경 설정이 로컬 API를 가리키는지 확인한다.

## 분류 기준과 LLM 참고

분류는 사람이 수동 입력한 라벨이 아니다. 저장된 결과는 NVIDIA 호환 API의 `deepseek-ai/deepseek-v4.1-flash` 모델로 생성했다. 팀원은 이 스냅샷의 라벨을 그대로 써서 API·화면을 개발할 수 있다. 자체 LLM이 있다고 해서 초기 데이터를 다시 분류할 필요는 없다.

다섯 분류는 `TECH_UPDATE`(프로토콜·소프트웨어 변경), `EVENT`(특정 행사), `MACRO`(협업·시장·투자·규제), `GENERAL`(유용한 설명·분석·가이드), `NOISE`(정보 없는 홍보·밈 등)다. 중요도 1~5점은 영향 범위·긴급성·실행 가능성·지속성을 기준으로 한다. 행사 날짜와 장소는 원문에서 확인되지 않으면 추측하지 않는다. 이 규칙의 정본은 아래 코드다.

## 팀원과 코딩 LLM이 읽을 순서

1. `apps/docs/agent-read/에이전트-작업지침.md` — 저장소 작업 규칙과 권한 경계
2. 이 문서와 `apps/docs/avalanche-crawler/2-local-normalization-plan.md` — 스냅샷 범위와 로컬 수집 결과
3. `docs/architecture/avalanche-categories-2026-10-12.sql` — 테이블 스키마와 제약
4. `apps/pipeline/src/classify/prompt.ts`, `schema.ts`, `rubric.ts` — 실제 LLM 분류 기준·출력 검증·중요도 기준
5. `apps/pipeline/src/classify/category-records.ts`와 `apps/pipeline/src/db/classification-repository.ts` — 결과를 DB 레코드로 저장하는 규칙
6. `apps/api/src/modules/chain_feed/chain-feed.controller.ts` 및 같은 폴더의 query/mapper 파일 — 피드 API 계약
7. `apps/web/lib/cryptopedia-data.ts`, `apps/web/components/cherry/editorial/ecosystem-page.tsx` — 웹 조회·표시 동작

LLM에게 작업을 맡길 때는 “현재 동작과 스키마는 문서 설명보다 코드를 기준으로 확인하고, 모르는 동작은 추측하지 말고 미확인으로 표시해 달라”고 전달한다. 분류 로직을 바꾸는 작업은 프롬프트만 수정하지 말고 스키마, 저장 규칙, API 계약, 기존 스냅샷과의 호환성도 함께 검토한다.

## 새 스냅샷을 만들 때

새 수집 결과를 팀에 공유할 때 이 파일을 덮어쓰지 말고 날짜가 붙은 새 dump를 만든 뒤, 이 문서의 건수·크기·SHA-256·생성일을 갱신한다. 스냅샷 생성에는 로컬 DB의 `pg_dump --data-only --format=custom`을 사용하고, 위 테이블만 선택한다. 새 스냅샷은 데이터가 채워진 로컬 전용 DB에서만 만든다. 공유 전에 `pg_restore --list`에서 선택된 테이블을 확인하고, 키나 전체 DB dump가 섞이지 않았는지 검토한다.
