# Avalanche 생태계 신규 게시글 수집 파이프라인

> 브랜치: `hansu-crawl`
> 최초 작성일: 2026-09-25
> 최종 검토일: 2026-09-25
> 상태: 설계 확정 — 구현 전
> 참고 구현: `origin/feature/browser-agent`

## 1. 목표와 범위

`cherry-in-the-haystack`의 크롤러 자동생성 구조를 기반으로 Avalanche 생태계의 신규 공식 게시물을 자동 수집한다. 첫 구현이 안정화되면 같은 소스/어댑터 모델을 다른 프로토콜에도 확장한다.

이 설계가 담당하는 범위는 다음과 같다.

- 공식 소스 등록과 수집 방식 선택
- 정형 소스(RSS/Atom/API) 증분 수집
- 비정형 웹사이트의 browser-use 분석 및 crawl4ai 설정 생성
- 생성 결과에 대한 GitHub PR 사람 승인
- 검증, 중복 제거, `content.article_raw` 저장
- 실패 감지, 제한적 fallback, 재분석 및 재생성
- 실행 상태, cursor, 오류와 artifact 버전의 관측 가능성

대량 과거 데이터 backfill, 콘텐츠 요약/분류 및 게시물 발행은 1차 범위에서 제외한다.

## 2. 참고 구현과 포팅 원칙

참고 코드는 `origin/feature/browser-agent`의 다음 구성에 있다.

```text
python_services/packages/browser-agent/
├── packages/pipeline/
│   ├── config/sources.yaml
│   └── src/
│       ├── config/source-config.ts
│       ├── db/crawler-db.ts
│       ├── jobs/browser-crawl.ts
│       └── publication/github-committer.ts
└── python_services/api/
    ├── models/crawler.py
    ├── prompts/crawler_analysis.py
    ├── prompts/crawler_fallback.py
    └── routers/crawler.py
```

참고 구현의 lifecycle과 검증/dedup 로직은 재사용하되 아래 항목은 그대로 이식하지 않는다.

- 모든 소스를 browser-use → crawl4ai로 처리하는 방식
- 콘텐츠 의미와 수집 방식을 하나의 `source_type`으로 표현하는 방식
- DB에 저장한 Python 문자열을 검증 없이 `exec()`하는 방식
- PR 머지만 확인하고 실제 머지된 artifact를 다시 검증하지 않는 방식
- 고정 base branch 및 재생성 때 기존 리뷰 PR/branch를 닫고 삭제하는 방식

## 3. 목표 아키텍처

### 3.1 전체 흐름

```text
sources.yaml
    │
    ▼
source config validation ── DB enum compatibility check
    │
    ▼
adapter router
    ├── RSS / ATOM ───────────────┐
    ├── GITHUB_API ───────────────┤
    ├── DISCOURSE_API ────────────┤
    ├── X_API 또는 제한적 fallback ┤
    └── CRAWL4AI                  │
          └─ 신규/재생성 시에만    │
             browser-use analyze  │
             → JSON spec 생성     │
             → PR 리뷰/머지        │
                                  ▼
                         공통 normalize
                                  ▼
                         validate → dedup
                                  ▼
                      content.article_raw
                                  ▼
                 run log / health / cursor 갱신
```

핵심 원칙은 **소스 발견/분석 경로만 어댑터별로 분리하고, 정규화 이후의 검증·dedup·저장·관측 경로는 공유**하는 것이다.

### 3.2 소스 설정 모델

DB의 `content.source_type_enum`은 기존 값을 유지한다. 별도 설정 필드로 수집 방식과 콘텐츠 성격을 표현한다.

```yaml
sources:
  - url: 'https://github.com/ava-labs/avalanchego/releases.atom'
    source_name: 'AvalancheGo Releases'
    source_type: 'RSS' # DB 호환 분류
    adapter: 'ATOM' # 실제 수집 구현
    content_kind: 'RELEASE' # 콘텐츠 의미
    authority: 'OFFICIAL'
    recency_window_days: 7
    consecutive_failures_threshold: 3
```

초기 지원 값은 다음과 같다.

| 필드           | 값                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------- |
| `source_type`  | DB enum의 `RSS`, `TWITTER`, `LINKEDIN`, `YOUTUBE`, `REDDIT`, `KAKAO`, `WEBSITE`, `CUSTOM` |
| `adapter`      | `RSS`, `ATOM`, `GITHUB_API`, `DISCOURSE_API`, `CRAWL4AI`, `X_API`, `BROWSER_USE`          |
| `content_kind` | `BLOG`, `RELEASE`, `GOVERNANCE`, `FORUM`, `NEWSLETTER`, `SOCIAL`, `DOCUMENTATION`         |
| `authority`    | `OFFICIAL`, `OFFICIAL_COMMUNITY`, `THIRD_PARTY`                                           |

`source_type`은 DB 저장 호환성을 위한 값이며 adapter routing에 사용하지 않는다. TypeScript의 허용 값은 DB의 실제 8개 값에 맞추고, CI 또는 애플리케이션 시작 시 `pg_enum`과 일치하는지 검사한다.

## 4. 데이터 및 상태 관리

### 4.1 기존 스키마 정합성

| 항목                                                   | 결정                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `content.source`                                       | 기존 테이블 재사용                                                                                     |
| `content.article_raw`                                  | 기존 테이블 재사용. generated hash 컬럼은 INSERT 대상에서 제외                                         |
| `core.run_log`                                         | 모든 adapter 실행 기록에 공통 사용                                                                     |
| `content.crawler_analysis`, `content.crawler_registry` | crawl4ai 자동생성 소스에 사용. 구현 전 `docs/crawler-autogen-migration.sql` 검토 후 별도 승인하여 적용 |
| `content.source_type_enum`                             | 이번 작업에서 마이그레이션하지 않음                                                                    |

### 4.2 어댑터 실행 상태

RSS와 API 소스도 crawler registry를 완전히 우회하지 않고 공통 health/cursor를 유지해야 한다. 구현 시 다음 정보를 `content.source`의 적절한 기존 컬럼 또는 별도 `content.source_adapter_state` 테이블에 저장한다.

- `source_id`, `adapter`
- `cursor`: 마지막 처리 commit SHA, feed GUID/시간, API cursor 등
- `etag`, `last_modified`
- `last_attempt_at`, `last_success_at`
- `consecutive_failures`, `last_error_code`
- `config_hash`

새 테이블이 필요하면 실제 DB 적용 전에 별도 migration 승인을 받는다.

### 4.3 증분 수집과 중복 제거

- `recency_window_days`만으로 처리 여부를 결정하지 않는다. 장애 복구 후 누락을 막기 위해 영속 cursor/watermark를 사용한다.
- 현행 공통 `representative_key`는 기존 `news_collector`와의 교차 파이프라인 dedup을 위해 원본 URL을 그대로 사용한다. GUID, canonical URL과 normalized URL hash는 보조 조회 신호로 저장한다. 더 강한 대표키로 전환할 때는 두 writer와 기존 데이터 migration을 하나의 버전 변경으로 처리한다.
- 하나의 글이 블로그, RSS, X에 동시에 나타나는 경우 canonical URL과 콘텐츠 hash로 교차 소스 중복을 판별한다.
- `0건 수집`은 정상 결과일 수 있으며 fetch/parser 오류와 구분한다.
- 최초 backfill 범위와 매일 증분 수집 범위를 별도 설정한다.

### 4.4 기존 `news_collector`와의 공유 계약

Avalanche 파이프라인과 기존 `python_services/packages/news_collector`는 `content.source`와 `content.article_raw`를 공유하며, 별도 namespace나 파이프라인별 중복 영역을 만들지 않는다. 동일 콘텐츠가 어느 파이프라인에서 먼저 수집되더라도 DB 전역에서 한 건만 남아야 한다.

- source 식별 및 생성은 공통 repository/service를 사용해 같은 소스가 중복 생성되지 않게 한다.
- `representative_key` 생성 규칙과 URL 정규화 규칙은 두 파이프라인이 공유한다.
- DB가 생성하는 `url_hash`, `guid_hash`, `normalized_url_hash`, `canonical_url_hash`, `representative_key_hash`는 직접 INSERT하지 않는다.
- 최종 동시성 제어는 `uq_article_raw_representative_key_hash`와 원자적 `ON CONFLICT DO NOTHING`에 맡긴다. 사전 SELECT는 최적화일 뿐 정합성 경계가 아니다.
- 기존 `news_collector`의 agent API는 현재 URL 중복을 먼저 확인하고 `representative_key = url`로 저장하므로, Phase 1에서 GUID/canonical URL 우선순위와 source 식별 규칙을 공통 계약으로 정리한다.

## 5. 어댑터별 설계

### 5.1 RSS/Atom

RSS/Atom은 browser-use 분석, crawl4ai 설정 생성과 PR 절차를 생략한다.

```text
conditional GET → feed parse → item normalize
  → 필요 시 원문 hydrate → validate → dedup → insert
  → cursor/ETag/health 갱신
```

요구사항:

- ETag와 Last-Modified conditional request 지원
- RSS와 Atom 날짜/ID 차이 정규화
- `published`와 `updated`를 별도 취급
- summary만 있는 피드는 원문 hydration을 선택적으로 수행
- parser 오류, 원문 hydration 오류, 항목 validation 오류를 구분
- 부분 성공을 전체 실행 실패로 취급하지 않음

### 5.2 GitHub API — ACP

ACP는 listing page를 스크래핑하지 않고 `avalanche-foundation/ACPs` 저장소를 canonical source로 사용한다.

초기 동기화:

1. 기본 브랜치의 tree를 조회한다.
2. `ACPs/*/README.md`만 선택한다.
3. 각 문서의 metadata와 본문을 파싱한다.
4. 처리한 head commit SHA를 cursor로 저장한다.

증분 동기화:

1. 저장된 SHA와 현재 head SHA를 비교한다.
2. 변경된 `ACPs/*/README.md` 경로만 가져온다.
3. `number`, `title`, `status`, `authors`, `track`을 정규화한다.
4. 다음 이벤트 중 하나로 기록한다.
   - `ACP_CREATED`
   - `ACP_CONTENT_UPDATED`
   - `ACP_STATUS_CHANGED`
   - `ACP_ACTIVATED`
5. 새 head SHA는 관련 INSERT가 성공한 뒤에만 저장한다.

ACP 공식 상태는 `Proposed`, `Implementable`, `Activated`, `Stale`로 취급한다. Pull Request와 GitHub Discussion은 아직 canonical ACP가 아닌 draft/논의 자료이므로, 필요할 때 별도 스트림과 낮은 authority로 추가한다.

API 호출은 인증된 GitHub App 또는 fine-grained token과 ETag conditional request를 사용한다. rate-limit header와 secondary rate limit을 관측하고 backoff한다.

운영 배포에는 `GITHUB_TOKEN`을 필수 secret으로 설정한다. 비인증 public API는 초기 ACP 동기화만으로도 다수의 contents 요청을 사용해 rate limit에 쉽게 도달하므로 개발용 fallback으로만 취급한다. 포맷이 잘못된 ACP 하나가 전체 batch를 중단하지 않도록 malformed 문서 격리와 재처리 큐는 후속 hardening 백로그로 관리한다.

### 5.3 Discourse Forum

**1차 수집 대상에서는 보류한다.** 2026-09-26 재확인 시 검색 인덱스에는 최근 페이지가 남아 있었지만 `https://forum.avax.network/`, `/latest`, `/latest.json`, `/latest.rss` 직접 접근을 안정적으로 확인하지 못했다. 네트워크 환경 또는 일시 장애일 가능성이 있으므로 폐쇄로 단정하지 않고 Phase 4에서 URL, DNS/TLS, API/RSS 응답과 운영 주체를 다시 검증한다.

재검증 후 포함할 경우 `/latest.rss`보다 Discourse JSON API를 우선하고, API 사용이 불가능할 때 RSS로 fallback한다.

포럼은 공식 운영 플랫폼이지만 일반 사용자 게시물 전체가 공식 발표는 아니다. 다음 중 하나를 적용한다.

- 공식 공지/ACP 등 allowlist category만 수집
- staff 또는 신뢰된 계정 게시물만 `OFFICIAL`로 표시
- 나머지는 `OFFICIAL_COMMUNITY`로 저장하고 후속 필터링

### 5.4 crawl4ai 자동생성

비정형 웹 목록에만 사용한다.

```text
browser-use analyze
  → selector JSON spec 생성
  → fixture 대상 dry-run 및 schema validation
  → GitHub PR
  → 사람 리뷰/머지
  → 머지 artifact hash 확인
  → active
```

생성물은 가능하면 임의 Python 코드가 아니라 검증 가능한 JSON extraction spec으로 저장하고, 고정 runner가 이를 해석한다. 과도기적으로 Python을 저장해야 한다면 import allowlist, 파일/프로세스/내부망 접근 차단, 실행 시간과 메모리 제한을 둔 별도 프로세스 또는 컨테이너에서 실행한다.

분석 endpoint는 서비스 간 bearer token을 요구하고 다음 경계를 fail-closed로 적용한다.

- 등록된 source URL과 요청 URL의 일치 확인
- HTTPS와 exact-host allowlist 강제
- DNS 결과의 private/loopback/link-local 주소 거부
- browser-use 세션에도 단일 대상 host를 `allowed_domains`로 전달해 redirect와 후속 탐색 제한
- 최대 300초 timeout과 64 KiB 결과 크기 제한
- JavaScript 및 알 수 없는 결과 필드는 strict schema에서 거부
- 성공한 분석과 `core.run_log` 성공 전환은 같은 DB transaction으로 저장

DNS public-address 검사는 Chromium 탐색 전 사전 방어이며 navigation 시점의 DNS rebinding을 완전히 제거하지는 못한다. 운영 환경에서는 crawler 컨테이너의 link-local, RFC1918, loopback 및 클라우드 metadata 대역 egress를 네트워크 정책으로 차단한다.

### 5.5 X

공식 API 사용을 우선한다. browser-use는 API 사용이 불가능하고 이용 조건을 확인한 경우에만 제한적으로 사용한다.

- 공식 계정 allowlist 적용
- 짧은 게시물을 고려해 source별 최소 본문 길이 설정
- 원문 링크가 있으면 게시물과 링크 대상을 별개 레코드로 구분
- 로그인 만료, rate limit, 페이지 구조 변경을 명시적 오류 코드로 기록
- fallback 실패가 crawl4ai 재생성을 촉발하지 않도록 adapter별 복구 정책 분리

## 6. GitHub PR 승인 및 artifact 무결성

자동생성 PR은 `Aidenteti-Crew/Cryptopedia`에 생성한다.

환경 설정:

```text
GITHUB_REPO_OWNER=Aidenteti-Crew
GITHUB_REPO_NAME=Cryptopedia
GITHUB_BASE_BRANCH=hansu-crawl   # 개발 단계
```

운영 전환 시 `GITHUB_BASE_BRANCH=main`으로 변경하되 branch protection과 필수 CI를 먼저 설정한다. 참고 구현의 하드코딩된 `feature/browser-crawl-agent`는 제거한다.

PR lifecycle:

1. `feat/crawler/<source-slug>/<generation-id>` 불변 branch를 생성한다.
2. extraction spec, 테스트 fixture와 생성 metadata를 함께 commit한다.
3. schema validation, fixture test, 허용 도메인/URL 검사 CI를 수행한다.
4. 승인된 PR을 merge한다.
5. merge commit에서 artifact를 다시 읽고 SHA-256을 계산한다.
6. DB registry의 artifact와 일치하거나 merge artifact를 DB에 반영한 경우에만 `active`로 전환한다.

다음 불변식을 만족해야 한다.

```text
active_registry.artifact_hash == merged_artifact.sha256
```

리뷰 중인 기존 PR을 자동으로 닫거나 branch를 삭제하지 않는다. 같은 소스의 새 generation이 생기면 별도 PR을 열고 기존 PR에는 superseded 표시만 남긴다.

인증에는 PAT보다 repository-scoped GitHub App을 우선하며 최소 권한은 `Metadata: read`, `Contents: write`, `Pull requests: write`로 제한한다. bot이 workflow 파일이나 다른 경로를 수정하지 못하도록 허용 경로도 검사한다.

## 7. 확정된 1차 소스

| 우선순위 | 소스                       | URL                                                     | DB type   | Adapter      | Authority  | 결정                                                     |
| -------: | -------------------------- | ------------------------------------------------------- | --------- | ------------ | ---------- | -------------------------------------------------------- |
|        1 | Avalanche Builder Hub Blog | `https://build.avax.network/blog`                       | `WEBSITE` | `CRAWL4AI`   | `OFFICIAL` | 포함. 네트워크 업그레이드·보안·개발자 게시물의 핵심 소스 |
|        2 | AvalancheGo Releases       | `https://github.com/ava-labs/avalanchego/releases.atom` | `RSS`     | `ATOM`       | `OFFICIAL` | 포함                                                     |
|        3 | Avalanche ACPs             | `https://github.com/avalanche-foundation/ACPs`          | `CUSTOM`  | `GITHUB_API` | `OFFICIAL` | 포함. 문서와 상태 변경 이벤트 수집                       |
|        4 | Avalanche X                | `https://x.com/avax`                                    | `TWITTER` | `X_API`      | `OFFICIAL` | API 우선, browser-use는 제한적 fallback                  |
|        5 | Coreth Releases            | `https://github.com/ava-labs/coreth/releases.atom`      | `RSS`     | `ATOM`       | `OFFICIAL` | 포함. C-Chain EVM 구현체 릴리스                          |
|        6 | Subnet-EVM Releases        | `https://github.com/ava-labs/subnet-evm/releases.atom`  | `RSS`     | `ATOM`       | `OFFICIAL` | 포함. Subnet EVM 구현체 릴리스                           |

coreth/subnet-evm은 avalanchego보다 릴리스 빈도가 낮아 `recency_window_days`를 설정하지 않는다 — 설정하면 최근 릴리스가 창을 벗어나 매 실행마다 0건으로 필터링될 수 있다.

보류 소스:

| 소스            | URL                          | 잠정 adapter    | Authority            | 보류 사유                                         | 재검증 시점 |
| --------------- | ---------------------------- | --------------- | -------------------- | ------------------------------------------------- | ----------- |
| Avalanche Forum | `https://forum.avax.network` | `DISCOURSE_API` | `OFFICIAL_COMMUNITY` | 직접 URL/API/RSS 접근 불안정, 일반 사용자 글 중심 | Phase 4     |

추가 후보:

- ACP GitHub Discussions/PRs: draft와 합의 과정을 수집할 때 별도 authority로 추가
- 공식 YouTube/Telegram announcement: 텍스트 수집 품질과 운영 API를 검증한 뒤 추가
- 기존 Avalanche Foundation 블로그: 현재 canonical URL, Builder Hub와의 중복 및 갱신 여부를 확인한 뒤 추가

Newsletter 가입 페이지는 공개 게시물 archive가 아니므로 1차 소스에서 제외한다. 향후 공식 archive URL 또는 수신 전용 mailbox ingest 경로를 확보하면 추가한다.

## 8. 실패 처리와 재생성 정책

| 실패 유형                     | 처리                                                      |
| ----------------------------- | --------------------------------------------------------- |
| 네트워크 timeout/429/5xx      | 지수 backoff와 jitter, cursor 유지                        |
| RSS/API parse 일부 실패       | 정상 항목은 저장하고 실패 항목 quarantine                 |
| 인증 실패                     | 즉시 alert, 자동 재생성 금지                              |
| crawl4ai 결과 0건             | 최근 실제 게시 여부를 확인한 후 실패 판정                 |
| selector/schema 실패 연속 N회 | 기존 active artifact를 deprecated 처리하고 재분석 PR 생성 |
| fallback 실패                 | source health에 기록하되 무한 재생성 금지                 |
| DB 저장 실패                  | cursor를 전진시키지 않고 idempotent 재시도                |

fallback은 가용성 보조 수단이지 canonical 실행 경로가 아니다. fallback 결과에도 동일한 validation, dedup과 authority metadata를 적용한다.

## 9. 보안 및 운영 요구사항

- URL scheme은 HTTPS만 허용하고 redirect 후 최종 host도 allowlist로 재검증한다.
- localhost, link-local, private network 및 cloud metadata IP 접근을 차단해 SSRF를 방지한다.
- browser-use가 읽은 페이지 텍스트는 신뢰하지 않으며 페이지 내 지시를 agent 명령으로 실행하지 않는다.
- 생성 artifact는 정적 검증과 fixture test를 통과하기 전 실행하지 않는다.
- source 단위 advisory lock으로 스케줄러 중복 실행을 막는다.
- secret은 로그와 PR body에 기록하지 않는다.
- source별 robots.txt, 이용약관, rate limit을 확인하고 요청 간격을 설정한다.
- run log에는 adapter, source, config/artifact hash, cursor before/after, 수집/검증/중복/저장 건수와 오류 코드를 남긴다.
- alert 조건은 인증 실패, 연속 실패 임계치, cursor 장기 정체, 예상 게시물이 있는데 0건인 경우로 구분한다.

## 10. 구현 순서와 완료 조건

### Phase 1 — 공통 기반과 Atom vertical slice

1. `source-config.ts`를 DB enum에 맞추고 `adapter`, `content_kind`, `authority`를 추가한다.
2. 기존 `news_collector`와 공유할 source 식별, URL 정규화 및 `representative_key` 계약을 확정한다.
3. 공통 normalized item 계약, validation, dedup, run logging을 분리한다.
4. Atom adapter와 cursor/ETag 상태 저장을 구현한다.
5. AvalancheGo Releases를 로컬 환경에서 backfill 후 증분 실행한다.

완료 조건: 같은 feed를 반복 실행하거나 기존 `news_collector`와 동시에 같은 URL을 넣어도 `article_raw`가 한 건만 남고, source가 중복 생성되지 않으며, 장애 후 누락 없이 재개되고, 0건 정상 실행과 실패가 구분된다.

### Phase 2 — ACP GitHub API

1. tree/contents 및 commit diff 기반 ACP adapter를 구현한다.
2. metadata parser와 상태 변경 이벤트 테스트를 추가한다.
3. ETag, rate limit, 마지막 성공 SHA를 저장한다.

완료 조건: 신규 ACP, 본문 수정, 상태 변경을 각각 재현하며 cursor는 DB 저장 성공 후에만 전진한다.

### Phase 3 — crawl4ai 생성 파이프라인

1. `docs/crawler-autogen-migration.sql` 적용 계획을 재검토하고 별도 승인 후 적용한다.
2. browser-use 분석 결과를 JSON spec으로 제한한다.
3. GitHub base branch 설정화, versioned branch, artifact hash 검증을 구현한다.
4. Builder Hub Blog을 첫 자동생성 대상으로 검증한다.

완료 조건: PR에서 수정한 최종 artifact와 실제 실행 artifact hash가 일치하고 rollback 가능한 이전 버전이 남는다.

### Phase 4 — Forum과 X

1. Forum의 URL, DNS/TLS, 운영 상태와 JSON API/RSS 접근성을 다른 실행 환경에서도 재검증한다.
2. Forum을 유지할 경우 category/작성자 정책을 확정하고 Discourse adapter를 추가한다.
3. X API 권한과 비용을 확인한 후 adapter를 추가한다.
4. API 사용이 불가능한 경우에만 제한적 browser-use fallback을 평가한다.

## 11. 확정 결정 요약

| ID      | 결정                                                                                                   | 상태 |
| ------- | ------------------------------------------------------------------------------------------------------ | ---- |
| ADR-001 | `content.source_type_enum`은 변경하지 않고 코드가 기존 8개 값에 맞춘다                                 | 확정 |
| ADR-002 | 수집 방식은 별도 `adapter`, 콘텐츠 의미는 `content_kind`로 분리한다                                    | 확정 |
| ADR-003 | RSS/Atom은 analyze/generate를 생략하되 공통 health/cursor/검증 경로를 사용한다                         | 확정 |
| ADR-004 | ACP는 GitHub API와 commit SHA cursor로 수집한다                                                        | 확정 |
| ADR-005 | 자동생성 PR은 `Aidenteti-Crew/Cryptopedia`에 열고 base branch를 설정화한다                             | 확정 |
| ADR-006 | PR merge artifact와 active registry hash가 일치해야 활성화한다                                         | 확정 |
| ADR-007 | Builder Hub Blog을 1차 공식 소스에 포함하고 newsletter 가입 페이지는 제외한다                          | 확정 |
| ADR-008 | 생성물은 Python 코드보다 선언적 JSON extraction spec을 우선한다                                        | 확정 |
| ADR-009 | 기존 `news_collector`와 source 식별·정규화·dedup 계약 및 DB 전역 정합성 경계를 공유한다                | 확정 |
| ADR-010 | Avalanche Forum은 1차 소스에서 보류하고 Phase 4에서 다른 실행 환경으로 접근성과 신뢰 범위를 재검증한다 | 확정 |
| ADR-011 | browser-use 분석은 인증, source URL 결합, 네트워크 allowlist, 선언형 결과 제한을 통과해야 저장한다     | 확정 |
