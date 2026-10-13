# Avalanche 생태계·매크로 데이터 — 백엔드·프론트 연동 가이드

Avalanche 공식 소스를 수집하고, AI로 분류·채점해서 화면의 4분류(생태계 프로젝트 · 매크로 소식 · 이벤트·행사 · 기술 업데이트)와 기타 정보로 제공하는 기능의 사용 설명서입니다.

> **현재 상태 (2026-10-13)**
> - 코드는 브랜치 `hansu-crawl-deploy`(`deploy` 기준)에만 있고 **아직 푸시·배포 전**입니다.
> - DB 테이블 마이그레이션은 **공유 DB에 적용 전**입니다. 로컬 docker DB에서만 검증했습니다.
> - 프론트(`apps/web`)는 아직 정적 JSON을 쓰며, 이 API로 교체하는 작업은 하지 않았습니다.

**누가 어디를 읽으면 되나**

| 읽는 사람 | 볼 곳 |
|---|---|
| 프론트 개발자 | [2. API 사용법](#2-프론트엔드-api-사용법) → [3. 요청서 답변](#3-프론트-요청서event-crawler-data-requestmd-답변) |
| 백엔드 개발자 | [4. 구조와 운영](#4-백엔드-구조와-운영) → [5. 운영 전 확인](#5-운영-전-확인할-것-결정주의) |
| 모두 | [1. 전체 구조](#1-전체-구조) |

---

## 1. 전체 구조

```
[수집 apps/pipeline: pnpm start]
  GitHub 릴리스(Atom) · ACP(GitHub API) · Builder Hub 블로그(GitHub MDX) · X(Apify) ──► content.article_raw
  Builder Hub 프로젝트 디렉터리(GitHub) ─────────────────────────────────────────────► content.eco_project
  Luma 캘린더(ICS) ──────────────────────────────────────────────────────────────────► content.chain_event

[분류 apps/pipeline: pnpm classify]  article_raw → AI(분류 + 중요도 1~5 + 한국어 요약)
  MACRO → macro_news · TECH_UPDATE → tech_update · EVENT → chain_event · GENERAL → general_post · NOISE → 저장 안 함

[채점 apps/pipeline: pnpm score]  eco_project · chain_event(Luma) → AI 중요도 1~5 + 근거

[조회 apps/api: ChainFeed 모듈]  GET /api/events · /api/ecosystem · /api/ecosystem/{projects,macro,updates,general}
```

- 날짜·장소·이름 같은 **사실 정보는 원본 그대로**이고, AI는 분류·요약·중요도만 정합니다.
- 모든 표에 `chain` 컬럼이 있습니다(현재 값은 `avalanche`). 다른 체인을 붙여도 표를 바꿀 필요가 없습니다.

---

## 2. 프론트엔드: API 사용법

### 2.1 기본 정보

| 항목 | 값 |
|---|---|
| Base URL | `{NEXT_PUBLIC_API_URL}/api` (로컬 `http://localhost:4000/api`) |
| 인증 | 없음 (공개 조회 API) |
| Swagger | `{API}/api/docs` (태그: `Chain events`, `Chain ecosystem`) |
| 공통 파라미터 | `chain` (기본 `avalanche`, 소문자 식별자) |
| 시간 형식 | ISO 8601. 이벤트 시각은 **행사 현지 offset 포함**(`2026-10-17T14:00:00+09:00`), 그 외는 UTC(`...Z`) |

### 2.2 엔드포인트

| 메서드 · 경로 | 용도 | 파라미터 |
|---|---|---|
| `GET /api/events` | 행사·이벤트 목록 (프론트 요청서 계약 그대로) | `chain`, `status`(upcoming·ongoing·past·cancelled·postponed), `from`·`to`(YYYY-MM-DD, 시작일 기준, `to`는 그날 포함), `limit`(기본 20, 최대 100), `cursor` |
| `GET /api/ecosystem` | 한 페이지용 묶음: 프로젝트 카테고리 집계 + 매크로 5 + 예정 행사 5 + 기술 업데이트 5 + 기타 정보 5 | `chain` |
| `GET /api/ecosystem/projects` | 생태계 프로젝트 디렉터리 + 카테고리별 개수 | `chain`, `category`, `sort`(name·importance), `limit`(기본·최대 500) |
| `GET /api/ecosystem/macro` | 매크로 소식 | `chain`, `limit`(기본 30, 최대 100), `minImportance`(1~5), `sort`(latest·importance) |
| `GET /api/ecosystem/updates` | 기술 업데이트 | 위와 같음 |
| `GET /api/ecosystem/general` | 기타 정보(교육·해설 글) | 위와 같음 |

**정렬:** 이벤트는 upcoming·ongoing·상태 미지정이면 `startsAt` 오름차순, past는 내림차순입니다. 취소·연기는 원래 시작일 기준입니다. 페이지가 더 있으면 `nextCursor`가 오고, 그 값을 `cursor`로 다시 보내면 됩니다.

**오류:**

| 상황 | 응답 |
|---|---|
| 잘못된 이벤트 파라미터 | `400 {"code":"INVALID_EVENT_QUERY","message":"from must be earlier than to"}` |
| 잘못된 생태계 파라미터 | `400 {"code":"INVALID_FEED_QUERY","message":"..."}` |
| 결과 없음 | `200` + `items: []` |
| 서버·DB 오류 | `500` (DB 접속 정보·SQL은 응답에 포함되지 않음) |

### 2.3 응답 타입

```ts
// GET /api/events — apps/web/lib/cryptopedia-types.ts 의 EventEntry/EventFeedResponse 와 같음
interface EventEntry {
  id: string                    // 재수집해도 안 바뀌는 키 (Luma: "luma-evt-...")
  title: string
  summary: string
  startsAt: string              // 현지 offset 포함
  endsAt: string | null
  timezone: string              // IANA, 예: "Asia/Seoul"
  allDay: boolean
  status: 'UPCOMING' | 'ONGOING' | 'PAST' | 'CANCELLED' | 'POSTPONED'  // 조회 시점에 계산
  organizer: string | null
  venueName: string | null
  venueAddress: string | null
  city: string | null
  country: string | null        // ISO 3166-1 alpha-2, 예: "KR"
  isOnline: boolean
  sourceUrl: string | null      // 공식 행사 페이지(Luma) 또는 원문 글
  registrationUrl: string | null
  imageUrl: string | null
  category: string | null       // COMMUNITY | CONFERENCE | HACKATHON | TRADING_CONTEST | OTHER
  tags: string[]
  chain: string | null          // 표시용, 예: "Avalanche"
  project: string | null
  publishedAt: string | null    // 안내 글 게시일 (행사일 아님)
  fetchedAt: string
  confidence: number | null     // 0~1
  importance: number | null     // 추가 필드: AI 중요도 1~5
  importanceReason: string | null // 추가 필드: 점수 근거(한국어)
}
interface EventFeedResponse { items: EventEntry[]; nextCursor: string | null; generatedAt: string }

// GET /api/ecosystem/{macro,updates,general} — 프론트 ContentEntry 와 호환 (추가 필드는 프론트 스키마가 무시)
interface ContentFeedItem {
  id: string
  title: string                 // AI가 만든 한국어 제목
  summary: string               // AI가 만든 한국어 요약 1~2문장
  kind: 'MACRO' | 'UPDATE' | 'ARTICLE'
  subKind: string               // macro: COLLAB|VOLUME|OTHER, updates: RELEASE|ACP|BLOG|OTHER, general: GENERAL
  sourceName: string            // 예: "AvalancheGo Releases", "Team1 Korea X"
  sourceUrl: string             // 원문 링크
  publishedAt: string
  collectedAt: string
  importance: number | null
  importanceReason: string | null
  relatedProject?: string | null  // macro
  network?: string                // updates: FUJI|MAINNET|BOTH|OTHER (원문에 적힌 경우만, 아니면 OTHER)
  upgradeName?: string | null     // updates: 예 "Helicon"
  version?: string | null         // updates: 예 "v1.15.1"
  activatedAt?: string | null     // updates: 원문에 활성화 시점이 있을 때만
}
interface ContentFeedResponse { items: ContentFeedItem[]; generatedAt: string }

// GET /api/ecosystem/projects
interface ProjectItem {
  id: string; key: string; name: string
  category: string | null       // Builder Hub 원본 분류 (33종, 정리 전)
  developer: string | null; websiteUrl: string | null; documentationUrl: string | null
  description: string | null; chains: string[]; sourceUrl: string | null
  importance: number | null; importanceReason: string | null
}
interface ProjectsResponse {
  items: ProjectItem[]
  categories: { name: string; count: number }[]  // 조회 시점 집계
  total: number
  generatedAt: string
}

// GET /api/ecosystem
interface EcosystemHubResponse {
  projects: { total: number; categories: { name: string; count: number }[] }
  macro: ContentFeedItem[]      // 중요도순 5
  events: EventEntry[]          // 예정 5
  updates: ContentFeedItem[]    // 최신 5
  general: ContentFeedItem[]    // 최신 5
  generatedAt: string
}
```

### 2.4 `CryptopediaRepository`(apps/web/lib/cryptopedia-data.ts) 교체 방법

| 메서드 | 연결할 API | 비고 |
|---|---|---|
| `getEvents()` | `GET /api/events` 응답 그대로 | 실제 데이터 전체가 `eventFeedResponseSchema`를 통과함 |
| `getMacroArticles()` | `GET /api/ecosystem/macro` 의 `items` | `contentEntrySchema` 통과 확인 |
| `getUpdates()` | `GET /api/ecosystem/updates` 의 `items` | `contentEntrySchema` 통과 확인 |
| (신규) 기타 정보 | `GET /api/ecosystem/general` 의 `items` | 화면에 보일지는 기획 결정 |
| `getEcosystem()` | 소개 문구는 정적 유지, `latest`에 `/api/ecosystem`의 `macro`·`updates`를 쓰는 방식 추천 | 응답 모양이 다름 |
| `getProjects()` | `GET /api/ecosystem/projects` | **모양이 다름**: 프론트 `CollectionVolume`(책장형)과 달리 234개 디렉터리라 화면 설계 결정 필요 |

**검증 결과(로컬 실데이터):** 매크로 26 · 업데이트 77 · 기타 20건이 `contentEntrySchema`를, 이벤트 20건이 모든 status·페이지에서 `eventFeedResponseSchema`를 통과했습니다. API는 응답 직전에 이벤트를 프론트 스키마 사본으로 검사해, 맞지 않는 항목만 빼고 응답합니다(한 건 때문에 목록 전체가 깨지지 않도록).

### 2.5 화면에서 쓰면 좋은 값

- **중요도(`importance`)와 근거(`importanceReason`):** 정렬, "중요한 것만 보기"(`minImportance=4`), 카드의 "왜 중요한가" 문구에 사용.
- **노이즈(인사·밈·내용 없는 홍보)는 API에 나오지 않습니다.** 따로 거를 필요가 없습니다.
- **상태 배지:** `status`는 서버가 응답 시점에 계산합니다. 프론트에서 다시 계산하지 마세요.
- **장소 미정:** `isOnline=false`이고 장소 필드가 모두 `null`이면 "장소 미정"입니다(Luma에서 주소 비공개).

---

## 3. 프론트 요청서(`event-crawler-data-request.md`) 답변

**완료 기준**

| 기준 | 상태 |
|---|---|
| `publishedAt`과 `startsAt` 분리 | ✅ 별도 컬럼·필드 |
| `startsAt` ISO 8601 + timezone 해석 가능 | ✅ IANA timezone, 현지 offset 포함 |
| 온라인·오프라인·장소 미정이 계약에 맞음 | ✅ 실데이터 스키마 검증 통과 |
| 종료일 없는 행사의 상태 규칙 | ✅ 해당 timezone의 날짜가 끝나면 PAST |
| 취소·연기 구분 | ✅ 원문에 명시되면 시간 계산보다 우선 |
| 최소 5개 실데이터 스키마 통과 | ✅ 20건 (Team1 Korea Luma 16 + X 공지에서 날짜 확정 4) |
| 같은 행사 중복 제거 | ✅ 아래 4.5 규칙. 공식 페이지(Luma) 우선 |
| upcoming·past 정렬 | ✅ |
| 빈 결과는 200 + 빈 배열 | ✅ |
| 프론트 목 JSON과 같은 구조 | ✅ `EventFeedResponse` 그대로 (+`importance`, `importanceReason`) |

**전달 요청 1~7**

1. **Base URL·인증:** `{API}/api/events`, 인증 없음. 배포 주소는 배포 후 확정.
2. **호출 예시:** `GET /api/events?chain=avalanche&status=upcoming&from=2026-10-01&to=2026-12-31&limit=20`
3. **응답 샘플:**
   ```json
   {"id":"luma-evt-5I3vezpRHD0bJ1z","title":"Univ Connect: Aidenteti Crew","summary":"Hosted by Team1 Korea, Team1 & AidentetiCrew",
    "startsAt":"2026-10-17T14:00:00+09:00","endsAt":"2026-10-17T16:00:00+09:00","timezone":"Asia/Seoul","allDay":false,"status":"UPCOMING",
    "organizer":"Team1 Korea","venueName":"서울용산시제품제작소","venueAddress":"South Korea, Seoul, Yongsan District, Cheongpa-ro, 77 서울용산시제품제작소 2층, 3층",
    "city":"Seoul","country":"KR","isOnline":false,"sourceUrl":"https://luma.com/f95ppglk","registrationUrl":null,"imageUrl":null,
    "category":"COMMUNITY","tags":["Avalanche","Team1","Team1 Korea"],"chain":"Avalanche","project":null,"publishedAt":null,
    "fetchedAt":"2026-10-13T06:20:00.000Z","confidence":1,"importance":3,"importanceReason":"대학 연계 프로그램으로 파트너와의 밋업"}
   ```
4. **원본 출처:** Team1 Korea Luma 캘린더(공개 구독 ICS) + Team1·Avalanche 공식 X 공지에서 날짜가 확정된 행사. 다른 국가 Team1 캘린더 7개는 설정에 있지만 현재 꺼둠.
5. **날짜·시간대 추출 실패:** 추정하지 않습니다. 시작 날짜·IANA 시간대가 확정되지 않거나 게시일과 400일 이상 차이 나면 이벤트로 저장하지 않고 분류 기록에만 사유를 남깁니다. Luma는 좌표로 시간대를 정하고, 좌표가 없으면 UTC·신뢰도 0.7.
6. **중복 제거 기준:** 같은 체인 + 시작 2시간 이내 + 제목 유사 → 한 행사. Luma 행을 남기고 X 공지는 추가 출처로 연결.
7. **갱신 주기·마지막 수집 시각:** 자동 스케줄은 아직 없음(아래 4.3). 소스별 마지막 성공 시각은 `content.source.last_success_at`(API 미노출). 응답의 `fetchedAt`은 그 행사를 마지막으로 받은 시각.

---

## 4. 백엔드: 구조와 운영

### 4.1 코드 위치

| 경로 | 내용 |
|---|---|
| `apps/api/src/modules/chain_feed/` | 조회 API (NestJS, knex raw SQL, 공개 라우트) |
| `apps/pipeline/` | 수집·분류·채점 CLI (TypeScript, ESM) |
| `apps/pipeline/config/sources.yaml` | 소스 목록 (`chain` 필수, `enabled`로 켜고 끔) |
| `apps/pipeline/src/classify/rubric.ts` | 중요도 기준표 (한 곳에서 정의, 분류·채점 공용) |
| `docs/architecture/avalanche-categories-2026-10-12.sql` (+ `.rollback.sql`) | DB 마이그레이션 |
| `apps/docs/avalanche-crawler/architecture.md` | 설계 문서 (ADR-001~017) |

### 4.2 DB 테이블 (스키마 `content`)

| 표 | 내용 | 키 |
|---|---|---|
| `article_raw`·`source` (기존) | 수집 원문 (다른 수집기와 공유) | 대표 URL로 중복 방지 |
| `article_classification` | 글마다 AI 분류 결과·중요도·모델·원본 JSON·실패 사유 | 글당 1행 |
| `macro_news` | 매크로 소식 (종류, 관련 프로젝트, 요약, 중요도) | 글당 1행 |
| `tech_update` | 기술 업데이트 (종류, 네트워크, 업그레이드, 버전, 활성화 시점) | 글당 1행 |
| `general_post` | 기타 정보 | 글당 1행 |
| `chain_event` | 행사 (요청서 필드 전부, `status_override`, 신뢰도, 중요도·근거) | `(chain, event_key)` |
| `chain_event_source` | 한 행사를 알린 추가 출처 글 | `(행사, URL)` |
| `eco_project` | 프로젝트 디렉터리 (카테고리, 체인, 링크, 중요도·근거) | `(chain, external_key)` |

**마이그레이션 적용:** 저장소 관례대로 수동 적용(DBeaver/psql)이며 **공유 DB 적용 전 팀 승인 필요**합니다. 새 DB와 초안이 적용된 DB 모두에서 같은 파일로 동작하고, 다시 적용해도 변화가 없게(멱등) 만들었습니다.

### 4.3 실행 명령과 권장 주기

```bash
cd apps/pipeline && pnpm build
pnpm start                     # 수집: 켜진 소스 전부 (변경 없으면 NOT_MODIFIED로 건너뜀)
pnpm classify --limit 300      # 새 글 분류 (--concurrency 8, --dry-run 지원)
pnpm score --kind all          # 프로젝트·행사 중 아직 채점 안 된 것만 채점
```

- **자동 실행은 아직 없습니다.** 권장 순서는 `start → classify → score`, 주기는 하루 1~2회입니다(Luma 피드 권장 갱신 간격 12시간). 기존 `apps/api`의 `@nestjs/schedule` 모듈에 붙이거나 서버 cron으로 돌리면 됩니다.
- **환경변수**(루트 `.env`, 예시는 `.env.example`): `DATABASE_URL`, `GITHUB_TOKEN`, `APIFY_TOKEN`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`(현재 `deepseek-ai/deepseek-v4.1-flash`, NVIDIA build).
- **비용:** X(Apify Starter $19/월) 1회 계정당 약 $0.02 → 하루 1회 약 $2/월. NVIDIA 무료 티어는 개발·시범용 성격이라 운영 전 약관·한도 확인 필요.

### 4.4 소스

| 소스 | 방식 | 저장 위치 | 상태 |
|---|---|---|---|
| AvalancheGo / Coreth / Subnet-EVM 릴리스 | GitHub Atom (`graft/*` 태그 제외) | article_raw | 사용 |
| ACP (거버넌스 제안) | GitHub API | article_raw | 사용 |
| Builder Hub 블로그 | GitHub MDX | article_raw | 사용 |
| Builder Hub 프로젝트 디렉터리 | GitHub MDX | eco_project | 사용 |
| X: @avax, @Team1KOR, @AvaxTeam1 | Apify (리트윗·이모지만 있는 글 제외) | article_raw | 사용 |
| Luma: Team1 Korea | 공개 ICS | chain_event | 사용 |
| Luma: Team1 글로벌·인도·베트남·프랑스·태국·아프리카·튀르키예 | 공개 ICS | chain_event | **꺼짐** (현재 한국만 수집) |

### 4.5 분류·채점·중복 제거 규칙

**중요도 기준표** (원본 Cherry 채점 기준, 대상만 "아발란체 생태계를 따라가는 사람"으로 변경)

- 5점: 모두가 알아야 함. 영향이 넓고, 급하고, 바로 실행 가능하고, 오래 감.
- 4점: 의미 있지만 확실성·긴급성·범위 중 하나가 부족함.
- 3점: 알아두면 좋은 배경 지식.
- 2점: 실무 영향이 작음. 틈새 도구나 추측성 내용.
- 1점: 가치 없음. 낡은 정보, 과장, 근거 부족.

**분류:** MACRO(협업·통합·도입·지표·투자·규제) · TECH_UPDATE(릴리스·업그레이드·ACP) · EVENT(특정 행사) · GENERAL(쓸모 있는 교육·해설) · NOISE(인사·밈·내용 없는 홍보, 저장 안 함). 애매하면 GENERAL로 보내도록 지시돼 있습니다.

**AI가 바꾸지 않는 것:** 날짜·장소·이름·URL. 이벤트는 날짜·시간대가 확정될 때만 저장하고, 링크는 http(s) 공개 URL만(회의 링크·토큰 포함 URL 제거) 저장합니다.

**행사 중복 제거:** 같은 체인 + 시작 시각 2시간 이내 + 제목 유사(정규화 후 같음 / 포함 / 단어 60% 이상) → 한 행사. Luma 행이 이기고, 나중에 온 X 공지는 `chain_event_source`에 출처로 연결, 먼저 있던 X 행사는 Luma 수집 때 숨김 처리.

### 4.6 테스트

```bash
cd apps/pipeline && TEST_DATABASE_URL=postgresql://cherry:cherry_dev@localhost:5432/cherry_db pnpm test   # 181개
cd apps/api && TEST_DATABASE_URL=... npx jest src/modules/chain_feed                                       # 57개
```
`TEST_DATABASE_URL`이 없으면 실제 DB 테스트는 건너뜁니다. 실제 DB 테스트는 각자 고유한 체인 이름을 써서 기존 데이터와 섞이지 않습니다.

---

## 5. 운영 전 확인할 것 (결정·주의)

1. **기존 NestJS 스케줄러와의 관계:** 기존 스케줄러는 `article_raw`의 모든 활성 글을 AI 엔지니어링용 평가 대기열에 넣습니다. 켜져 있으면 아발란체 글이 그쪽 평가에도 들어가 비용이 이중으로 나가거나 다른 페이지에 섞일 수 있습니다. 소스 단위 제외가 필요한지 확인해 주세요.
2. **X 수집 방식:** Apify Actor는 X 공식 API가 아닌 스크래핑입니다(X 약관 위험). 공식 API(종량제) 어댑터도 코드에 있습니다.
3. **프로젝트 카테고리 정리:** 원본 33종에 비슷한 것이 섞여 있습니다(예: Audit Firms / Security Audits). "묶음 카테고리" 컬럼 추가를 제안합니다.
4. **아직 없는 것:** 자동 스케줄, Luma에서 삭제된 행사 정리, 출처 연결(`chain_event_source`)의 API 노출, 매크로 세부 종류 확장, 온톨로지(그래프 DB) 연결.
