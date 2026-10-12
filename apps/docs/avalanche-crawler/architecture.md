# Avalanche 생태계 신규 게시글 수집 파이프라인

> 브랜치: `hansu-crawl-deploy` (`deploy` 기준, PR Aidenteti-Crew/Cryptopedia#1)
> 최초 작성일: 2026-09-25
> 최종 검토일: 2026-10-13
> 상태: 수집·분류·채점·조회 API 구현 완료(로컬 검증). 공유 DB 마이그레이션·자동 스케줄·crawl4ai 자동생성은 미적용
> 참고 구현: `origin/feature/browser-agent`
> 연동 가이드(API·실행 방법): [`1-backend-frontend-guide.md`](./1-backend-frontend-guide.md)

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

- 수집한 글의 AI 분류(4분류 + 기타), 중요도(1~5)·근거·한국어 요약, 분류별 테이블 적재 (ADR-013·014·017·018)
- 공식 행사 캘린더(Luma) 수집과 글·캘린더 간 같은 행사 중복 제거 (ADR-016·019)
- 화면용 조회 API (`apps/api` ChainFeed 모듈, ADR-020)

대량 과거 데이터 backfill, 게시물 발행, 프론트 화면 교체는 범위에서 제외한다.

## 2. 참고 구현과 포팅 원칙

참고 코드는 `origin/feature/browser-agent`의 다음 구성에 있다.

```text
python_services/packages/browser-agent/
├── apps/pipeline/
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
source config validation ── DB enum compatibility check, chain 필수
    │
    ▼
adapter router                                   [pnpm start]
    ├── ATOM (릴리스) ─────────────┐
    ├── GITHUB_API (ACP) ──────────┤
    ├── GITHUB_MARKDOWN (블로그) ──┤
    ├── APIFY (X 3계정) ───────────┤
    ├── (미사용) RSS / DISCOURSE_API / X_API / CRAWL4AI
    │                              ▼
    │          공통 normalize → validate → dedup → content.article_raw
    │
    ├── GITHUB_DIRECTORY (Builder Hub 프로젝트) ──► content.eco_project (upsert)
    └── LUMA_ICS (Team1 캘린더) ─────────────────► content.chain_event (upsert)
                                                   └─ absorbDuplicateEvents (글에서 온 같은 행사 흡수)

content.article_raw                              [pnpm classify]
    └─ LLM: 분류 + 중요도 + 근거 + 한국어 요약 ─► content.article_classification (글당 1행, 멱등)
          ├─ MACRO       ─► content.macro_news
          ├─ TECH_UPDATE ─► content.tech_update
          ├─ EVENT       ─► content.chain_event (날짜·시간대 확정 시만, 같은 행사면 chain_event_source로 연결)
          ├─ GENERAL     ─► content.general_post
          └─ NOISE       ─► (분류 기록만)

eco_project · chain_event(캘린더)                [pnpm score]
    └─ LLM: 10건씩 묶어 중요도 + 근거

apps/api ChainFeed ─► GET /api/events, /api/ecosystem, /api/ecosystem/{projects,macro,updates,general}

모든 단계: run log / health / cursor 갱신
```

핵심 원칙은 **소스 발견/분석 경로만 어댑터별로 분리하고, 정규화 이후의 검증·dedup·저장·관측 경로는 공유**하는 것이다. 이미 구조화된 데이터(프로젝트 디렉터리, 행사 캘린더)는 글 테이블과 AI 분류를 거치지 않고 해당 표에 바로 넣는다.

### 3.2 소스 설정 모델

DB의 `content.source_type_enum`은 기존 값을 유지한다. 별도 설정 필드로 수집 방식과 콘텐츠 성격을 표현한다.

```yaml
sources:
  - url: 'https://github.com/ava-labs/avalanchego/releases.atom'
    source_name: 'AvalancheGo Releases'
    chain: 'avalanche' # 필수, 소문자 식별자. 모든 분류 표의 chain 값이 된다
    source_type: 'RSS' # DB 호환 분류
    adapter: 'ATOM' # 실제 수집 구현
    content_kind: 'RELEASE' # 콘텐츠 의미
    authority: 'OFFICIAL'
    exclude_title_patterns: ['^graft/'] # 선택, 제목 정규식으로 제외
    recency_window_days: 7
    consecutive_failures_threshold: 3
```

어댑터별 추가 블록: `github`(GITHUB_MARKDOWN·GITHUB_DIRECTORY의 저장소·경로), `apify`(actor·input), `luma`(calendar_id). 해당 어댑터에 블록이 없으면 설정 검증에서 실패한다.

초기 지원 값은 다음과 같다.

| 필드           | 값                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `source_type`  | DB enum의 `RSS`, `TWITTER`, `LINKEDIN`, `YOUTUBE`, `REDDIT`, `KAKAO`, `WEBSITE`, `CUSTOM`                                        |
| `adapter`      | `RSS`, `ATOM`, `GITHUB_API`, `GITHUB_MARKDOWN`, `GITHUB_DIRECTORY`, `DISCOURSE_API`, `CRAWL4AI`, `X_API`, `APIFY`, `LUMA_ICS`, `BROWSER_USE` |
| `content_kind` | `BLOG`, `RELEASE`, `GOVERNANCE`, `FORUM`, `NEWSLETTER`, `SOCIAL`, `DOCUMENTATION`, `PROJECT`, `EVENT`                            |
| `authority`    | `OFFICIAL`, `OFFICIAL_COMMUNITY`, `THIRD_PARTY`                                                                                  |

`source_type`은 DB 저장 호환성을 위한 값이며 adapter routing에 사용하지 않는다. TypeScript의 허용 값은 DB의 실제 8개 값에 맞추고, CI 또는 애플리케이션 시작 시 `pg_enum`과 일치하는지 검사한다.

## 4. 데이터 및 상태 관리

### 4.1 기존 스키마 정합성

| 항목                                                   | 결정                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `content.source`                                       | 기존 테이블 재사용                                                                                     |
| `content.article_raw`                                  | 기존 테이블 재사용. generated hash 컬럼은 INSERT 대상에서 제외                                         |
| `core.run_log`                                         | 모든 adapter 실행 기록에 공통 사용                                                                     |
| `content.crawler_analysis`, `content.crawler_registry` | crawl4ai 자동생성 소스에 사용. 구현 전 `docs/architecture/crawler-autogen-migration.sql` 검토 후 별도 승인하여 적용 |
| `content.source_type_enum`                             | 이번 작업에서 마이그레이션하지 않음                                                                    |
| 분류·행사·프로젝트 표 7개                              | `docs/architecture/avalanche-categories-2026-10-12.sql`(+ `.rollback.sql`). 로컬 docker DB에만 적용·검증, **공유 DB는 팀 승인 후 수동 적용** |

분류·행사·프로젝트 표(스키마 `content`):

| 표                         | 내용                                                                 | 고유 키                    |
| -------------------------- | -------------------------------------------------------------------- | -------------------------- |
| `article_classification`   | 글마다 분류·중요도·근거·모델·원본 응답 JSON·실패 사유 (재분류 방지)  | `article_raw_id`           |
| `macro_news`               | 종류(COLLAB·VOLUME·OTHER), 관련 프로젝트, 요약, 중요도               | `article_raw_id`           |
| `tech_update`              | 종류(RELEASE·ACP·BLOG·OTHER), 네트워크(FUJI·MAINNET·BOTH·OTHER), 업그레이드명, 버전, 활성화 시점 | `article_raw_id` |
| `general_post`             | 기타 정보(교육·해설)                                                 | `article_raw_id`           |
| `chain_event`              | 프론트 이벤트 계약 필드 전부 + `status_override`·신뢰도·중요도·근거  | `(chain, event_key)`       |
| `chain_event_source`       | 한 행사를 알린 추가 출처 글                                          | `(chain_event_id, url)`    |
| `eco_project`              | Builder Hub 프로젝트 디렉터리 + 중요도·근거                          | `(chain, external_key)`    |

모든 표에 `chain`(기본값 없음)과 `importance`·`importance_reason`·`importance_model`·`importance_scored_at`이 있다(분류 표는 `article_classification`에 모델 기록). 이벤트 상태(예정·진행·종료)는 저장하지 않고 조회 시점에 계산한다.

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

### 5.5 X (Apify)

ADR-015에 따라 Apify Actor `apidojo~tweet-scraper`를 `run-sync-get-dataset-items`로 호출한다(`APIFY_TOKEN`, Starter 플랜). 공식 X API 어댑터(`X_API`)는 코드만 유지하고 소스 설정에서는 쓰지 않는다.

- 공식 계정 allowlist: @avax, @Team1KOR, @AvaxTeam1. 실행당 계정별 최대 50건(Actor 최소 과금 단위)
- 리트윗(`isRetweet` 또는 `RT @`)과 글자·숫자가 없는 글(이모지만 등)만 수집 단계에서 버린다. 길이로 자르지 않고 나머지는 AI가 NOISE로 판단한다(ADR-017)
- 게시물 URL `https://x.com/<user>/status/<id>`를 대표 키로, 가장 큰 트윗 id(BigInt 비교)를 cursor로 저장한다
- 응답이 전부 `noResults`이면 플랜 한도 초과 등으로 보고 실패로 기록한다(0건 정상과 구분)
- 비용: 계정당 실행 1회 약 $0.02

### 5.6 Luma 행사 캘린더

Team1 Luma 캘린더의 공개 구독 ICS(`api.lu.ma/ics/get?entity=calendar&id=cal-…`)를 AI 없이 `chain_event`로 바로 적재한다(ADR-016). 현재 Team1 Korea만 켜고 나머지 7개는 설정에만 두고 꺼 둔다(ADR-021).

- 시간대: GEO 좌표 → IANA 시간대(`@photostructure/tz-lookup`). 좌표가 없으면 UTC, 신뢰도 0.7
- 나라: 좌표 → ISO 3166-1 alpha-2(`@rapideditor/country-coder`), 주소 문자열 fallback. 폐기된 코드(VD·FX 등)는 버린다
- 좌표·주소가 없으면 온라인이 아니라 장소 미정. 온라인 단서가 있을 때만 `isOnline=true`
- 링크는 공개 http(s) URL만 저장하고 회의 링크·인증 파라미터가 있는 URL은 버린다
- cursor는 `DTSTAMP`를 뺀 본문 hash. 바뀌면 같은 `event_key`로 갱신(upsert)
- 실행마다(변경 없음이어도) 글에서 나온 같은 행사를 흡수한다(ADR-019)
- 캘린더에서 삭제된 행사 정리는 아직 없다

### 5.7 Builder Hub 프로젝트 디렉터리

`ava-labs/builders-hub`의 `content/integrations/*.mdx`(약 234개)를 `GITHUB_DIRECTORY`로 읽어 `eco_project`에 upsert한다. 파일명이 `external_key`이고, 디렉터리에서 사라진 항목은 `revoked_at`으로 숨긴다. 카테고리는 원본 33종을 그대로 둔다(정리용 묶음 카테고리는 미결정).

### 5.8 AI 분류·채점

- **모델:** OpenAI 호환 API(`LLM_BASE_URL`·`LLM_API_KEY`·`LLM_MODEL`), 현재 NVIDIA build `deepseek-ai/deepseek-v4.1-flash`. 이 모델은 JSON 모드에서 답을 `reasoning_content`에 넣기 때문에 `response_format`을 쓰지 않고 본문에서 JSON을 추출한다. zod 검증 실패 시 교정 요청 1회 재시도
- **분류(`pnpm classify`):** 설정된 소스의 미분류 글만 처리. 본문 6,000자까지 보낸다. 카테고리별 필드는 원문에 근거가 있을 때만 채우고, 날짜·장소·이름·URL은 AI가 만들지 않는다
- **이벤트 저장 조건:** 시작 시각과 유효한 IANA 시간대(`pg_timezone_names`로도 확인)가 확정되고, 게시일과 ±400일 이내일 때만 `chain_event`에 넣는다. 아니면 분류 기록에 사유만 남긴다
- **채점(`pnpm score`):** 프로젝트·캘린더 행사 중 미채점만 10건씩 묶어 중요도와 근거를 받는다
- **기준표:** 원본 Cherry 채점 기준(넓이·긴급성·실행 가능성·지속성, 1~5점)을 `src/classify/rubric.ts` 한 곳에 두고 분류·채점이 함께 쓴다(ADR-018)
- **처리량:** 호출당 25~30초, 동시성 4~8(NVIDIA 무료 티어 분당 약 40회)

### 5.9 같은 행사 중복 제거

같은 체인 + 시작 시각 2시간 이내 + 제목 유사(정규화 후 같음, 한쪽이 다른 쪽을 포함, 또는 단어 60% 이상 겹침)이면 같은 행사로 본다(ADR-019).

- 글에서 나온 행사가 이미 있는 행사와 같으면 새 행을 만들지 않고 `chain_event_source`에 출처로 연결한다
- 캘린더(Luma) 행이 우선한다. 먼저 저장된 글 유래 행사는 Luma 수집 때 숨기고(`revoked_at`) 출처로 옮긴다

### 5.10 조회 API

`apps/api/src/modules/chain_feed`(NestJS, knex raw SQL, 인증 없음). 엔드포인트·파라미터·응답 타입은 [연동 가이드](./1-backend-frontend-guide.md)가 정본이다.

- `GET /api/events`는 프론트 요청서(`apps/docs/avalanche-editorial-ui/event-crawler-data-request.md`) 계약을 따른다. keyset cursor, 상태는 조회 시점 계산(취소·연기 우선, 종료 시각 없으면 현지 날짜가 끝나면 종료), 시각은 현지 offset 포함
- 응답 직전 프론트 `eventEntrySchema` 사본으로 검사해 맞지 않는 항목만 뺀다
- 잘못된 파라미터는 400 `INVALID_EVENT_QUERY` / `INVALID_FEED_QUERY`, 결과 없음은 200 + 빈 배열

## 6. GitHub PR 승인 및 artifact 무결성

자동생성 PR은 `Aidenteti-Crew/Cryptopedia`에 생성한다.

환경 설정:

```text
GITHUB_REPO_OWNER=Aidenteti-Crew
GITHUB_REPO_NAME=Cryptopedia
GITHUB_BASE_BRANCH=deploy   # 개발 단계 (자동생성 경로는 아직 미사용)
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

모든 소스의 `chain`은 `avalanche`다.

| 소스                       | URL                                                     | DB type   | Adapter            | Authority            | 저장 위치      | 상태                                                    |
| -------------------------- | ------------------------------------------------------- | --------- | ------------------ | -------------------- | -------------- | ------------------------------------------------------- |
| Avalanche Builder Hub Blog | `https://build.avax.network/blog`                       | `WEBSITE` | `GITHUB_MARKDOWN`  | `OFFICIAL`           | `article_raw`  | 사용. 블로그 원본(MDX)을 GitHub에서 수집                |
| AvalancheGo Releases       | `https://github.com/ava-labs/avalanchego/releases.atom` | `RSS`     | `ATOM`             | `OFFICIAL`           | `article_raw`  | 사용. `graft/*` 태그(내부 하위 모듈 릴리스) 제외        |
| Coreth Releases            | `https://github.com/ava-labs/coreth/releases.atom`      | `RSS`     | `ATOM`             | `OFFICIAL`           | `article_raw`  | 사용. C-Chain EVM 구현체 릴리스                         |
| Subnet-EVM Releases        | `https://github.com/ava-labs/subnet-evm/releases.atom`  | `RSS`     | `ATOM`             | `OFFICIAL`           | `article_raw`  | 사용. Subnet EVM 구현체 릴리스                          |
| Avalanche ACPs             | `https://github.com/avalanche-foundation/ACPs`          | `CUSTOM`  | `GITHUB_API`       | `OFFICIAL`           | `article_raw`  | 사용. 문서와 상태 변경 이벤트 수집                      |
| Avalanche X                | `https://x.com/avax`                                    | `TWITTER` | `APIFY`            | `OFFICIAL`           | `article_raw`  | 사용 (ADR-015)                                          |
| Team1 Korea X              | `https://x.com/Team1KOR`                                | `TWITTER` | `APIFY`            | `OFFICIAL_COMMUNITY` | `article_raw`  | 사용. 한국 커뮤니티·행사 소식                           |
| Avalanche Team1 X          | `https://x.com/AvaxTeam1`                               | `TWITTER` | `APIFY`            | `OFFICIAL_COMMUNITY` | `article_raw`  | 사용. 행사·커뮤니티 소식                                |
| Builder Hub Integrations   | `https://build.avax.network/integrations`               | `WEBSITE` | `GITHUB_DIRECTORY` | `OFFICIAL`           | `eco_project`  | 사용. 프로젝트 디렉터리 약 234개, upsert                |
| Luma: Team1 Korea          | `https://luma.com/Team1KOR`                             | `WEBSITE` | `LUMA_ICS`         | `OFFICIAL_COMMUNITY` | `chain_event`  | 사용 (ADR-016·021)                                      |
| Luma: Team1 글로벌·인도·베트남·프랑스·태국·아프리카·튀르키예 | `https://luma.com/Team1` 외 6개 | `WEBSITE` | `LUMA_ICS` | `OFFICIAL_COMMUNITY` | `chain_event` | **꺼짐**. 현재 한국만 수집 (ADR-021) |

Builder Hub Blog는 원래 `CRAWL4AI`(browser-use 분석)로 설계했으나, 글 원본이 `ava-labs/builders-hub`의 `content/blog/*.mdx`로 공개돼 있어(기본 브랜치 `master`) GitHub API로 직접 수집한다. frontmatter(title, description, date, authors, topics)를 파싱하고, 기사 URL은 공개 글 URL(`<source.url>/<slug>`)로 고정한다. 신규 글만 가져오며(`added`/`renamed`), 수정된 글은 같은 URL이라 dedup 인덱스가 걸러낸다. 형식이 잘못된 글은 경고 후 건너뛰어 나머지 수집을 막지 않는다. `CRAWL4AI` 경로는 RSS도 GitHub 원본도 없는 사이트를 위해 유지한다.

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

| Phase | 내용                         | 상태 (2026-10-13)                                                                 |
| ----- | ---------------------------- | --------------------------------------------------------------------------------- |
| 1     | 공통 기반과 Atom             | 완료                                                                              |
| 2     | ACP GitHub API               | 완료                                                                              |
| 3     | crawl4ai 생성 파이프라인     | 미착수. Builder Hub 블로그는 GitHub 원본으로 대체(ADR-012)                        |
| 4     | Forum과 X                    | X는 Apify로 완료(ADR-015). Forum은 보류 유지                                      |
| 5     | 분류·채점·행사·조회 API      | 완료(로컬 검증). 공유 DB 마이그레이션·자동 스케줄·Luma 삭제 처리는 남음           |

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

1. `docs/architecture/crawler-autogen-migration.sql` 적용 계획을 재검토하고 별도 승인 후 적용한다.
2. browser-use 분석 결과를 JSON spec으로 제한한다.
3. GitHub base branch 설정화, versioned branch, artifact hash 검증을 구현한다.
4. RSS/GitHub 원본이 없는 사이트(예: Foundation 블로그)를 첫 자동생성 대상으로 검증한다. (Builder Hub Blog는 ADR-012에 따라 `GITHUB_MARKDOWN`으로 이동)

완료 조건: PR에서 수정한 최종 artifact와 실제 실행 artifact hash가 일치하고 rollback 가능한 이전 버전이 남는다.

### Phase 4 — Forum과 X

1. Forum의 URL, DNS/TLS, 운영 상태와 JSON API/RSS 접근성을 다른 실행 환경에서도 재검증한다.
2. Forum을 유지할 경우 category/작성자 정책을 확정하고 Discourse adapter를 추가한다.
3. ~~X API 권한과 비용을 확인한 후 adapter를 추가한다.~~ → Apify로 완료(ADR-015)
4. ~~API 사용이 불가능한 경우에만 제한적 browser-use fallback을 평가한다.~~ → 불필요

### Phase 5 — 분류·채점·행사·조회 API

1. 분류별 표 마이그레이션(로컬 적용, 업그레이드·신규 DB 모두 검증)
2. LLM 분류(`pnpm classify`)와 프로젝트·행사 채점(`pnpm score`)
3. Builder Hub 프로젝트 디렉터리, Luma 캘린더 어댑터, 같은 행사 중복 제거
4. `apps/api` ChainFeed 모듈과 프론트 스키마 대조 검증

완료 조건: 실데이터 이벤트 5건 이상이 프론트 `eventFeedResponseSchema`를, 매크로·업데이트·기타가 `contentEntrySchema`를 통과하고, 재실행해도 분류·행사·프로젝트가 중복 생성되지 않는다. → 로컬에서 충족(이벤트 20건, 글 154건 분류, 프로젝트 234건 채점).

남은 일: 공유 DB 마이그레이션 승인·적용, `start → classify → score` 자동 스케줄, Luma에서 삭제된 행사 정리, `chain_event_source`의 API 노출, 프로젝트 묶음 카테고리, 기존 NestJS 평가 스케줄러에서 아발란체 소스 제외 여부 결정.

## 11. 확정 결정 요약

| ID      | 결정                                                                                                                                                                                                                                                                                                                                                                                                                 | 상태                 |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| ADR-001 | `content.source_type_enum`은 변경하지 않고 코드가 기존 8개 값에 맞춘다                                                                                                                                                                                                                                                                                                                                               | 확정                 |
| ADR-002 | 수집 방식은 별도 `adapter`, 콘텐츠 의미는 `content_kind`로 분리한다                                                                                                                                                                                                                                                                                                                                                  | 확정                 |
| ADR-003 | RSS/Atom은 analyze/generate를 생략하되 공통 health/cursor/검증 경로를 사용한다                                                                                                                                                                                                                                                                                                                                       | 확정                 |
| ADR-004 | ACP는 GitHub API와 commit SHA cursor로 수집한다                                                                                                                                                                                                                                                                                                                                                                      | 확정                 |
| ADR-005 | 자동생성 PR은 `Aidenteti-Crew/Cryptopedia`에 열고 base branch를 설정화한다                                                                                                                                                                                                                                                                                                                                           | 확정                 |
| ADR-006 | PR merge artifact와 active registry hash가 일치해야 활성화한다                                                                                                                                                                                                                                                                                                                                                       | 확정                 |
| ADR-007 | Builder Hub Blog을 1차 공식 소스에 포함하고 newsletter 가입 페이지는 제외한다                                                                                                                                                                                                                                                                                                                                        | 확정                 |
| ADR-008 | 생성물은 Python 코드보다 선언적 JSON extraction spec을 우선한다                                                                                                                                                                                                                                                                                                                                                      | 확정                 |
| ADR-009 | 기존 `news_collector`와 source 식별·정규화·dedup 계약 및 DB 전역 정합성 경계를 공유한다                                                                                                                                                                                                                                                                                                                              | 확정                 |
| ADR-010 | Avalanche Forum은 1차 소스에서 보류하고 Phase 4에서 다른 실행 환경으로 접근성과 신뢰 범위를 재검증한다                                                                                                                                                                                                                                                                                                               | 확정                 |
| ADR-011 | browser-use 분석은 인증, source URL 결합, 네트워크 allowlist, 선언형 결과 제한을 통과해야 저장한다                                                                                                                                                                                                                                                                                                                   | 확정                 |
| ADR-012 | Builder Hub Blog는 AI 분석 대신 GitHub 원본(MDX)을 `GITHUB_MARKDOWN` 어댑터로 수집한다. AI 비용·셀렉터 깨짐이 없고 날짜·주제 메타데이터가 정확하다                                                                                                                                                                                                                                                                   | 확정                 |
| ADR-013 | 화면의 4분류(생태계 프로젝트·매크로 소식·이벤트·기술 업데이트)는 분류별 테이블에 나눠 적재하고(`eco_project`, `macro_news`, `chain_event`, `tech_update`), 한 페이지 조합은 API가 한다. 중요도(1~5)는 각 표에 독립 저장하며 기존 `user_article_ai_state`와 연동하지 않는다. 모든 분류 표에 `chain`을 두며 기본값은 없고(소스 설정의 필수 `chain`에서 채움), 고유 키는 `(chain, external_key)`·`(chain, event_key)`다 | 확정                 |
| ADR-014 | 글 분류·중요도·한국어 요약은 OpenAI 호환 LLM(NVIDIA build, `LLM_*`)이 한 번에 처리한다. 날짜·시간대·나라는 글에 근거가 없으면 비우고, 확정된 날짜가 없는 이벤트는 `chain_event`에 넣지 않는다                                                                                                                                                                                                                        | 확정                 |
| ADR-015 | X 수집은 Apify Actor(`apidojo~tweet-scraper`, `APIFY` 어댑터)로 한다. 무료 플랜(월 5회·회당 10건)으로는 부족해 Starter 플랜으로 전환했고 3개 X 소스를 켰다. Actor는 X 약관상 허용되지 않는 스크래핑이라는 위험을 감수하며, 공식 X API 어댑터는 대안으로 코드에 유지한다                                                                                                                                               | 확정                 |
| ADR-016 | 행사는 Team1의 Luma 공개 캘린더(ICS)에서 AI 없이 `chain_event`로 바로 적재한다. 시간대·나라는 좌표에서 정하고, 좌표가 없으면 온라인이 아니라 장소 미정으로 둔다. 캘린더가 원본이므로 같은 행사는 갱신한다                                                                                                                                                                                                            | 확정                 |
| ADR-017 | 분류 "기타"를 기타 정보(`GENERAL`, `general_post`에 저장·API 제공)와 노이즈(`NOISE`, 분류 기록만)로 나눈다. 길이로 미리 자르지 않고 글자·숫자가 없는 글만 수집 단계에서 버린다                                                                                                                                                                                                                                       | 확정                 |
| ADR-018 | 중요도는 원본 Cherry 채점 기준(1~5점: 넓이·긴급성·실행 가능성·지속성)을 대상만 "아발란체 생태계를 따라가는 사람"으로 바꿔 그대로 쓴다. 기준표는 `rubric.ts` 한 곳에 두고 글 분류·프로젝트·행사 채점이 공유하며, 점수와 함께 한국어 근거·모델·채점 시각을 저장한다. 점수는 이후 온톨로지 구축(ML 엔지니어 전달)의 입력이다 | 확정 |
| ADR-019 | 같은 행사는 같은 체인 + 시작 2시간 이내 + 제목 유사로 판별한다. 캘린더(Luma) 행이 우선하고, 글에서 나온 같은 행사는 새 행 대신 `chain_event_source`에 출처로 연결한다 | 확정 |
| ADR-020 | 조회 API는 `apps/api`의 ChainFeed 모듈로 공개 제공한다. 이벤트는 프론트 요청서 계약을 그대로 따르고 응답 직전 프론트 스키마 사본으로 검사한다. 응답 필드는 프론트 `ContentEntry`·`EventFeedResponse`와 호환되며 `importance`·`importanceReason`을 더한다 | 확정 |
| ADR-021 | Luma는 우선 Team1 Korea 캘린더만 수집한다. 다른 Team1 캘린더 7개는 `sources.yaml`에 `enabled: false`로 두어 필요할 때 켠다 | 확정 |
