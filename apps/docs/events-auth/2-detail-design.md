# 소식·행사 — 상세 설계 (실행 환경 · AI 추출 · API · 상태 규칙)

> 작성: 2026-10-31 · 선행 문서: [`1-plan.md`](./1-plan.md)
> 이 문서는 S1(마이그레이션·계약) 착수 전에 확정할 내용이다. 1-plan과 다르면 **이 문서가 우선**한다(§6 변경점 참고).

---

## 0. 조사로 확인한 현재 상태

| 항목 | 현재 | 근거 |
|---|---|---|
| 수집 실행 | **자동 실행 없음.** 사람이 `pnpm start → classify → score` 수동 실행 | `apps/docs/avalanche-crawler/1-backend-frontend-guide.md` §4.3 |
| 공유 DB | avalanche 카테고리 테이블(`chain_event`·`tech_update` 등) **공유 DB 미적용**으로 기록됨 | `architecture.md` 상단 상태 |
| 배포 화면 데이터 | API 없으면 `public/cryptopedia/live/*.json` 스냅샷 사용 | `apps/web/scripts/snapshot-live-feed.mjs` |
| 기존 스케줄러 | `apps/api` `@nestjs/schedule` — 20분마다 `article_raw` 전체를 AI 엔지니어링 평가 큐로 보냄 (`SCHEDULER_ENABLED`) | `modules/schedule/ingestion-schedule.service.ts` |
| AI 분류 | `article_raw` → `classify`(LLM) → `category-records` → `chain_event`/`tech_update`. 날짜·시간대 불확실하면 행사로 안 만듦 | `apps/pipeline/src/classify/*` |
| LLM | `LLM_MODEL=deepseek-ai/deepseek-v4.1-flash` (NVIDIA build) | 가이드 §4.3 |
| 행사 카테고리 | COMMUNITY · CONFERENCE · HACKATHON · TRADING_CONTEST · OTHER | `classify/schema.ts` |
| event_key | `slug(행사명)-시작일` | `category-records.ts` |
| ACP 상태 | Proposed · Implementable · Activated · Stale 를 이미 파싱 | `adapters/acp-github-adapter.ts` |
| 관리자 권한 | `@UseGuards(AuthGuard('jwt'), RolesGuard) @Roles(Role.ADMIN)` 경로별 부착 패턴 존재 | `source_registry/source-registry.controller.ts` |

**→ 선결 확인 1개:** 공유 DB에 `content.chain_event` 등이 실제로 있는지(사용자가 확인). 없으면 S1 마이그레이션은 "기존 avalanche-categories SQL 적용 → 이번 추가분 적용" 2단계가 된다.

---

## 1. 수집 실행 환경

### 1-1. 어디서 돌리나 — 권장: **Dokploy에 pipeline 전용 서비스(스케줄 작업) 추가**

| 안 | 장점 | 단점 | 판단 |
|---|---|---|---|
| A. API(NestJS) `@Cron`에서 pipeline 호출 | 인프라 추가 없음 | pipeline은 별도 패키지(`node dist/...`). LLM 호출이 길어 API 응답 지연·메모리 위험, API 재배포마다 수집 중단 | ✗ |
| **B. Dokploy 스케줄 작업 / 별도 컨테이너** | API와 격리, 실패해도 사이트 영향 없음, 기존 배포 방식 유지 | Dockerfile 1개 추가 | **권장** |
| C. 서버 crontab | 가장 간단 | 배포·환경변수가 코드 밖으로 흩어짐 | 차선 |

- 에이전트는 Dockerfile·실행 스크립트만 작성. **Dokploy 등록·배포는 사용자.**
- 실행 단위: `apps/pipeline/scripts/run-cycle.sh` = `start → classify → score` (한 단계 실패해도 다음 단계는 이전 데이터로 진행).
- 크론: **6시간마다 1회** (`0 */6 * * *`, KST 기준 0·6·12·18시).

### 1-2. 소스별 주기 — 크론 하나 + 소스별 최소 간격
`sources.yaml` 에 `min_interval_hours` 추가. 사이클마다 `core.run_log` 마지막 성공 시각을 보고 간격이 안 됐으면 건너뛴다.

| 소스 | `min_interval_hours` |
|---|---|
| Luma 캘린더 | 6 |
| KISA · KBIPA · ICT콤플렉스 | 24 |
| BUIDL Korea · KBW (연례) | 24 (시즌 외 168) |
| NIPA · 이벤터스 · 해커톤 모음 (발견용) | 168 |

### 1-3. 동시 실행·장애
- 소스 단위 advisory lock(기존 설계) → 크론이 겹쳐도 같은 소스 두 번 안 돎.
- 실패 3회 연속 → `deprecated` (기존). 
- **알림:** 사이클 끝에 실패 소스가 있으면 운영자 화면(`/admin/review` 상단 배지)에 표시. 메일/슬랙 알림은 P2.

### 1-4. ⚠️ 기존 스케줄러와 충돌
기존 NestJS 스케줄러가 `article_raw` **전체**를 AI 엔지니어링 평가 큐로 보낸다. KISA 글이 그쪽에도 들어가 비용 이중 지출 + 다른 화면 오염.
→ **S1에서 처리:** 기존 스케줄러의 대상 쿼리에 "Chainery 소스 제외" 조건 추가 (소스의 `chain` 값 기준).

---

## 2. 수집 경로와 관련성 필터

### 2-1. 두 가지 경로

```
[구조화 경로]  Luma ICS ──────────────────────────────▶ ChainEventInput ─▶ chain_event   (LLM 없음)
[글 경로]      KISA·KBIPA·ICT콤플렉스·BUIDL 게시판
               └▶ 1차 키워드 필터 ─▶ article_raw ─▶ classify(LLM) ─▶ category-records ─▶ chain_event
                                                                                    └─▶ tech_update
```

### 2-2. 공통 게시판 어댑터 `HTML_BOARD` (사이트별 코드 대신 설정)
사이트마다 코드를 짜지 않고 `sources.yaml` 설정으로 처리한다 (architecture.md의 "JSON extraction spec" 방침과 일치).

```yaml
- url: 'https://www.kisa.or.kr/...공지 목록...'
  chain: 'web3-kr'                # §2-4
  source_name: 'KISA 공지'
  adapter: 'HTML_BOARD'
  content_kind: 'NOTICE'
  authority: 'PUBLIC_AGENCY'      # 대표 출처 우선순위에 사용
  min_interval_hours: 24
  board:
    list_item: 'table.board tbody tr'
    title: 'td.title a'
    link: 'td.title a@href'
    date: 'td.date'
    detail_body: 'div.view_content'
    max_pages: 2
  include_keywords: [블록체인, Web3, 웹3, 분산원장, 디지털자산, 가상자산, NFT, 토큰, DID, 진흥주간, 해커톤]
  exclude_keywords: [입찰, 채용, 인사발령]
```
- 실제 셀렉터는 S2에서 사이트 확인 후 채운다. robots.txt·이용약관 확인 결과를 같은 항목 주석에 남긴다.
- 첨부(HWP/PDF)는 본문 추출 안 함, 링크만 저장.
- 요청 간격 ≥ 2초, User-Agent에 서비스명·연락처.

### 2-3. 관련성 필터 2단계
1. **키워드 필터(어댑터, 무료):** 제목+본문에 `include_keywords` 하나 이상, `exclude_keywords` 없음. 탈락 글은 `article_raw`에 넣지 않고 `run_log`에 "탈락: 키워드 없음" 건수와 제목 샘플 5개 기록 → 놓친 글 점검용.
2. **LLM 분류(기존):** NOISE/GENERAL로 분류되면 행사·소식 표에 안 들어감.

**품질 측정(S2 완료 조건):** KISA 최근 공지 100건에 직접 정답(관련/무관) 표시 → 키워드 필터 재현율 ≥ 95%(관련 글 놓침 5% 이하), LLM 단계 후 정밀도 ≥ 90%.

### 2-4. `chain` 값 처리 — NOT NULL 유지
1-plan의 `chain DROP NOT NULL` 대신:
- `chain` = **피드 범위**. 기존 Avalanche 소스는 `'avalanche'`, 새 국내 Web3 소스는 `'web3-kr'`.
- 새 컬럼 `related_chains TEXT[]` = 행사가 다루는 체인(원문에 있을 때만).
- API에 `scope=all` 추가 → 두 범위를 합쳐 보여준다.
- 이유: 공유 DB에서 제약 완화(NOT NULL 해제)를 피하고, 기존 쿼리(`chain = ?`)가 그대로 동작.

---

## 3. AI 추출 상세

### 3-1. 행사 스키마 확장 (`classify/schema.ts` `eventSchema`)

| 필드 | 타입 | 규칙 |
|---|---|---|
| `category` | 기존 enum **확장**: + `MEETUP`, `EDUCATION`, `CONTEST`, `SUPPORT_PROGRAM` | 1-plan의 별도 `event_type` 컬럼은 만들지 않음. COMMUNITY는 유지(기존 데이터) |
| `registration_deadline` | ISO 문자열 \| null | 날짜만 있으면 그 날 현지 23:59:59 |
| `audience` | `{ values: (STUDENT\|DEVELOPER\|STARTUP\|RESEARCHER\|ANYONE)[], evidence: string }` \| null | |
| `level` | `{ value: BEGINNER_OK\|EXPERIENCE_RECOMMENDED\|ADVANCED, evidence: string }` \| null | |
| `fee` | `{ value: FREE\|PAID, evidence: string }` \| null | |
| `related_chains` | string[] | 원문에 체인명이 나올 때만 |
| `image_url` | string \| null | 원문 대표 이미지(og:image 우선, 어댑터가 채움 — LLM 아님) |

### 3-2. 근거 검증 (환각 방지 장치)
LLM이 준 `evidence` 문자열이 **원문 본문 안에 실제로 있는지 코드로 확인**한다 (공백·전각 정규화 후 부분일치).
- 없으면 그 필드를 null로 버리고 분류 기록에 `evidence_not_found` 남김.
- 결과: "입문 가능"·"무료" 같은 값은 원문 문장이 있을 때만 화면에 뜬다. DB에도 `*_evidence` 컬럼으로 저장 → 상세 페이지 툴팁, 검수 화면 하이라이트.

### 3-3. 소식(tech_update) 요약 포맷
LLM은 **문장만** 쓰고, 단계(제안/확정/적용)는 **코드가 공식 데이터로 판정**한다.

화면 기준은 목업 `docs/chainery-redesign/mockups/learning-ux-v2.html` §5(ACP-267 상세, 2026-11-09 확정): 배지 → 제목 → 한 줄 설명 → 무엇이 바뀌나요(줄마다 근거 번호) → 지금 상태(문서 상태 · 구현 기록 · 날짜) → 누구에게 해당하나요(체이너리 해석) → 오른쪽 근거 목록.

| LLM 출력 | 모양 (JSONB) | 규칙 |
|---|---|---|
| `what_changed` | `[{ text, source }]` 2~4줄 | `source` = 근거 번호(1부터). 줄마다 근거 문장이 원문에 실제로 있어야 저장(§3-2) |
| `who_cares` | `[{ audience, impact, reason }]` | `audience` ∈ NODE_OPERATOR · VALIDATOR · DAPP_DEVELOPER · L1_BUILDER · USER, `impact` ∈ HIGH · LOW. 화면에 "체이너리 해석"으로 표시 |

| 코드가 채우는 값 | 출처 |
|---|---|
| `lifecycle_stage`, `stage_evidence`, `stage_source_url` | ACP README 상태 줄 |
| `proposal_created_at`, `proposal_updated_at` | 처음 공개(GitHub) · 마지막 문서 수정 |
| `included_in_release`, `included_release_url` | 그 ACP 를 언급한 릴리스 노트(예: avalanchego v1.15.0) |

| 단계 | 판정 규칙 (코드) |
|---|---|
| 제안 `PROPOSED` | ACP Status = Proposed |
| 확정 `ACCEPTED` | ACP Status = Implementable · 또는 릴리스 노트에 포함됐으나 활성화 시각 전 |
| 적용 `ACTIVATED` | ACP Status = Activated · 또는 `update-evidence` activations 시각 경과. **네트워크별 따로** (Fuji 적용 / Mainnet 예정) |
| 보류 `STALE` | ACP Status = Stale (화면엔 "중단됨") |
| **확인 중** (저장 안 함, API 계산) | 문서 상태와 구현 기록이 어긋날 때. 예: 문서는 Proposed 인데 릴리스 노트에 포함됨 → 배지 "제안 · 확인 중", "적용이 끝났는지는 확인하지 못했어요" 문구. 어긋남을 숨기지 않고 두 기록을 나란히 보여 준다 |

출처: `source_url` 필수. 공식 출처가 없는 글(X 재게시 등)은 단계 배지 없이 "참고" 표시.

### 3-4. 모델·비용·실패
- 모델: 기존 `LLM_MODEL` 유지. 한국어 공공 공지 정확도는 S3에서 20건 샘플로 비교 후 필요시 교체.
- 입력 상한: 본문 12,000자에서 자름(공공 공지 대부분 이내).
- 비용 상한: 사이클당 분류 최대 300건(`--limit 300` 기존). 키워드 필터가 앞단에서 줄임.
- 실패: 응답 JSON 파싱 실패 → 1회 재시도 → 그래도 실패면 분류 실패로 기록, 다음 사이클 재시도(최대 3회 후 제외).

### 3-5. 같은 행사 판별 보강
기존: event_key 일치 또는 (시작 ±2h + 제목 유사).
추가: **`all_day=true`인 행사는 "현지 날짜 같음 + 제목 유사"**. 공공 공지는 시간 없이 날짜만 있는 경우가 많아서.
- 대표 출처 우선순위(`authority`): `ORGANIZER`(주최 공식) > `PUBLIC_AGENCY` > `PLATFORM`(Luma·이벤터스) > `AGGREGATOR`(모음 사이트).
- 병합 시 값 충돌(날짜가 다름 등) → 자동 병합하지 않고 `NEEDS_REVIEW` + 검수 화면에서 "병합" 버튼.
- `AGGREGATOR`에서만 나온 행사는 자동 발행 금지(주최 원문 확인 필요 표시).

---

## 4. API 계약

### 4-1. `EventEntry` 추가 필드 (기존 필드 변경 없음)
```ts
category: 'COMMUNITY'|'CONFERENCE'|'HACKATHON'|'TRADING_CONTEST'|'MEETUP'|'EDUCATION'|'CONTEST'|'SUPPORT_PROGRAM'|'OTHER' | null
registrationDeadline: string | null           // ISO, offset 포함
registrationStatus: 'OPEN'|'CLOSING_SOON'|'CLOSED'|'UNKNOWN'   // 응답 시 계산 (§5)
daysUntilDeadline: number | null              // CLOSING_SOON 배지용 D-n
audience: string[]                            // 근거 없으면 []
level: 'BEGINNER_OK'|'EXPERIENCE_RECOMMENDED'|'ADVANCED' | null
fee: 'FREE'|'PAID' | null
relatedChains: string[]
scope: 'avalanche' | 'web3-kr'
```
- **하위 호환:** 웹 zod 스키마(`apps/web/lib/cryptopedia-types.ts`)에서 새 필드는 `.default([])` / `.nullable().default(null)` → 기존 스냅샷 JSON도 그대로 파싱됨.
- API 계약(`event-contract.ts`)과 웹 스키마는 같은 PR에서 함께 수정(기존 주석 규칙).

### 4-2. 목록 `GET /api/events` 파라미터 추가
| 파라미터 | 값 | 기본 |
|---|---|---|
| `scope` | `avalanche` · `web3-kr` · `all` | `avalanche` (기존 호출 호환). Chainery 행사 화면은 `all` |
| `category` | 쉼표 여러 개 | 전체 |
| `region` | `seoul` · `gyeonggi` · `busan` · `online` · `overseas` | 전체 |
| `recruiting` | `true` → OPEN·CLOSING_SOON만 | false |
| `audience` | STUDENT 등 | 전체 |
| `level` | `BEGINNER_OK` | 전체 |
| `q` | 제목·주최 검색 (P2) | — |

- `chain` 파라미터는 `scope`의 별칭으로 유지(기존 클라이언트).
- **공개 API는 `review_state = 'PUBLISHED'`만.**

### 4-3. 상세 `GET /api/events/:id` (신규)
`EventEntry` + 
```ts
evidence: { audience: string|null; level: string|null; fee: string|null }
sources: { url: string; name: string; authority: string; isPrimary: boolean }[]
lastCheckedAt: string          // 마지막 수집 확인 시각
revisionCount: number
```

### 4-4. 운영자 API (role=admin, 경로별 가드 — 기존 패턴)
| 메서드 | 경로 | 내용 |
|---|---|---|
| GET | `/api/admin/review?kind=event\|update&state=DRAFT\|NEEDS_REVIEW\|REJECTED` | 검수 큐 |
| GET | `/api/admin/review/:kind/:id` | 원문 + 초안 + 근거 + (변경 시) 이전 발행본 diff |
| PATCH | `/api/admin/review/:kind/:id` | 필드 수정 |
| POST | `/api/admin/review/:kind/:id/publish` | 발행 (`reviewed_by/at` 기록) |
| POST | `/api/admin/review/:kind/:id/reject` | 반려 `{ reason }` |
| POST | `/api/admin/review/event/:id/merge` | `{ intoId }` 다른 행사에 출처로 합치기 |
| GET | `/api/admin/runs` | 최근 사이클·소스별 성공/실패 |

### 4-5. 스냅샷 스크립트
`snapshot-live-feed.mjs` 에 `scope=all` 행사 파일 추가: `events-all-<status>.json`. 웹 데이터 레이어(`lib/cryptopedia-data.ts`)가 스냅샷 모드에서도 같은 필터를 클라이언트에서 적용.

---

## 5. 상태 계산 규칙

### 5-1. 모집 상태 `registrationStatus` (응답 시점 계산, 위에서부터 먼저 맞는 것)
| 순서 | 조건 | 결과 |
|---|---|---|
| 1 | 행사 상태가 CANCELLED · PAST | `CLOSED` |
| 2 | `registration_status_override = CLOSED_EARLY` | `CLOSED` |
| 2-1 | 행사 상태가 POSTPONED | `UNKNOWN` (옛 마감일은 새 일정과 무관) |
| 3 | 마감일 있음 · 지금 > 마감 | `CLOSED` |
| 4 | 마감일 있음 · 마감까지 ≤ **3일** | `CLOSING_SOON` (D-n) |
| 5 | 마감일 있음 | `OPEN` |
| 6 | 마감일 없음 · 행사 시작 전 | `UNKNOWN` ("신청 마감 정보 없음 — 공식 페이지 확인") |
| 7 | 마감일 없음 · 진행 중 | `UNKNOWN` |

- 마감일이 날짜만 → 행사 현지 23:59:59.
- 마감일 없을 때 시작일을 마감으로 **추정하지 않는다**.

### 5-2. 행사 상태 (기존 유지)
CANCELLED/POSTPONED 우선 → 시작 전 UPCOMING → 진행 중 ONGOING → 종료 후 PAST. `endsAt` 없으면 현지 날짜 끝에 PAST.

### 5-3. 목록 기본값·정렬
- `/events` 기본: `scope=all` · 상태 UPCOMING+ONGOING · 앞으로 60일.
- 정렬: ONGOING 먼저 → `startsAt` 오름차순. "모집중만" 켜면 `registrationDeadline` 오름차순(마감 빠른 순).

### 5-4. 변경 감지 해시 대상 필드
`title, starts_at, ends_at, timezone, venue_name, venue_address, is_online, registration_url, registration_deadline, status_override, fee`
(요약 문구·태그 변경은 재검수 대상 아님 — 수집마다 문구가 바뀌어 큐가 넘치는 것 방지)

---

## 6. 1-plan 대비 변경점

| 1-plan | 이 문서 | 이유 |
|---|---|---|
| 새 컬럼 `event_type` | 기존 `category` enum 확장 | 같은 개념 두 컬럼 방지 |
| `chain DROP NOT NULL` + `chains` | `chain`=범위(`web3-kr`) 유지 + `related_chains` | 공유 DB 제약 완화 회피, 기존 쿼리 유지 |
| 소식 단계를 AI가 판단 | 코드가 ACP 상태·활성화 시각으로 판정, AI는 문장만 | 공식 근거 기반, 오판 방지 |
| 근거 "필수"(DB CHECK) | + 근거 문장이 원문에 실제로 있는지 코드 검증 | CHECK만으론 AI가 지어낸 근거를 못 막음 |

---

## 7. 구현 기록

### 7-1. S1 (2026-10-31, 커밋 18b4d03)

| 항목 | 파일 |
|---|---|
| 마이그레이션 + 롤백 | `docs/architecture/chainery-events-2026-10-31{,.rollback}.sql` |
| 모집 상태 계산 + 테스트 | `apps/api/src/modules/chain_feed/registration-status{,.spec}.ts` |
| 응답 계약·매퍼·`scope` 파라미터·PUBLISHED 필터 | `chain_feed/{chain-feed.types,event-contract,event-mapper,event-query,chain-feed.service}.ts` |
| 웹 스키마(기본값으로 구 스냅샷 호환) | `apps/web/lib/cryptopedia-types.ts` |
| Chainery 소스 표시 | `apps/pipeline/src/db/source-repository.ts` (`source_meta_json.collector`) |
| 기존 스케줄러 제외 | `apps/api/src/modules/pipeline/article-ingestion.service.ts` |

**적용 순서(중요):** ① 공유 DB에 마이그레이션 적용 → ② API 배포. API가 `review_state` 컬럼을 읽으므로 역순이면 `/api/events`가 실패한다. 마이그레이션은 기존 코드와 호환(추가 전용·기본값 PUBLISHED)이라 먼저 적용해도 안전하다.

**아직 DB로 검증 못 한 것:** `chain-feed.service.spec.ts`의 실제 DB 테스트(초안 숨김·모집 상태)는 로컬 Postgres가 없어 건너뜀. 로컬 Docker DB에 두 마이그레이션 적용 후 `TEST_DATABASE_URL=… npx jest chain-feed` 로 확인.

### 7-2. S2 (2026-11-02) — KISA 게시판 어댑터 · 키워드 필터 · 같은 날짜 병합

| 항목 | 파일 |
|---|---|
| `HTML_BOARD` 설정 스키마(`board`, `include_keywords`, `exclude_keywords`), `content_kind: NOTICE` | `apps/pipeline/src/config/source-config.ts` |
| 게시판 어댑터 (목록 → 상세 본문 → 키워드 필터) | `apps/pipeline/src/adapters/html-board-adapter.ts` |
| 키워드 필터 | `apps/pipeline/src/ingestion/keyword-filter.ts` |
| 실행기 + 파이프라인 연결 + 탈락 로그 | `apps/pipeline/src/jobs/run-html-board-source.ts`, `run-pipeline.ts`, `bin/pipeline.ts` |
| 같은 날짜 병합 (`startsMatch`) | `apps/pipeline/src/events/dedup.ts`, `db/chain-event-repository.ts`, `db/classification-repository.ts` |
| KISA 공지사항 소스 (`enabled: false`) · KISA 블록체인 포털 최신동향 소스 | `apps/pipeline/config/sources.yaml` |
| HTML 파서 의존성 | `node-html-parser@6.1.13` |

**동작:**
- 목록 `max_pages`(2)쪽 → 커서 날짜(지난번 본 가장 최근 등록일) **이후·같은 날** 글만 상세 요청. 상단 고정글(옛 날짜)은 커서보다 이전이라 건너뜀. 같은 날 재요청분은 article 삽입에서 중복 제거.
- 링크에서 `page`·`lang_type` 제거 → 글이 다음 쪽으로 밀려도 URL이 같아 중복 저장 안 됨.
- 키워드: 제목+본문에 include 하나 이상. exclude는 **제목만** 본다(진흥주간 본문의 "채용 상담" 같은 오탈락 방지). NFKC·대소문자·공백 무시.
- 탈락 건수(키워드 없음 / 제외어)와 제목 5개를 실행 결과·로그에 남김. DB `run_log` 테이블은 아직 없어 콘솔 로그(Dokploy 로그)로 남는다.
- 첫 쪽에서 글이 0건이면 실패 처리(셀렉터가 깨진 걸 "새 글 없음"으로 오인하지 않게).
- 요청 간격 2초 이상(설정에서 2000ms 미만 거부). User-Agent `ChaineryBot/0.1`, 연락처는 env `CRAWLER_CONTACT`(없으면 생략).
- 같은 행사 판별: ±2h 또는 **한쪽이 all_day면 그 쪽 시간대의 같은 날짜** + 제목 유사. 후보 조회 범위 ±26h.

**품질 측정 (KISA 공지 100건, 2026-06-11 ~ 10-29, 제목만):** 통과 35건. 내 판단으로 Web3 관련 글 놓친 것 0건, 무관 통과 1건("양자내성암호 해커톤" — LLM 단계에서 걸러야 함). 정답 표시는 사용자 재확인 필요. 본문까지 보면 통과가 늘 수 있음(본문 속 "토큰" 등).
- 주의: KISA 공지의 "Avalanche"는 네트워크 성능시험 장비 이름. 키워드에 넣지 않는다.

**⚠️ 막힌 것 — KISA TLS 인증서 체인:** `www.kisa.or.kr`이 중간 인증서("GeoTrust TLS RSA CA G1")를 보내지 않아 Node `fetch`가 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`로 실패한다(curl·브라우저는 macOS가 보완해 성공). `--use-system-ca`로도 실패. 그래서 소스는 `enabled: false`.
- 해결안(권장): DigiCert 공개 중간 인증서 PEM을 저장소에 두고 pipeline 실행 시 `NODE_EXTRA_CA_CERTS`로 지정. 신뢰 추가라 사용자 승인 후 진행.
- 쓰지 않는 안: `NODE_TLS_REJECT_UNAUTHORIZED=0`(전체 검증 끔 — 금지).

**추가 소스 — KISA 블록체인 포털 최신동향 (2026-11-09, 사용자 요청):** `https://blockchain.kisa.or.kr/bbso/bbsoAnalsList.do`
- 행사가 아니라 블록체인 기술·정책·산업 **주간 동향 요약** → B의 업계 소식. `content_kind: NEWSLETTER`, `chain: web3-kr`, 켜 둠(`enabled` 기본).
- 링크가 `javascript:fn_goView('BBSOID_…')`라 어댑터에 `link_id_pattern` + `detail_url` 설정을 추가(ID를 뽑아 `/bbso/bbsoAnalsDetail.do?searchBbsoMngId={id}`로). 상세 페이지가 GET으로도 열림을 확인. 페이지 이동은 `?pageIndex=N`.
- 인증서 체인 정상(Node 접속 OK). robots.txt 404(미게시).
- 실데이터 시험(DB 없이, 2026-11-09): 2쪽 10건 중 **9건 통과**, 1건 탈락("시티버스 환경의 이동형 기지국 경로 최적화" — 6G, 블록체인 언급 없음). 본문은 140자 안팎(2~3줄 요약), 자세한 내용은 첨부 파일.
- 이웃 메뉴 `/bbso/bbsoRsrchList.do`(연구 자료)도 있음 — 필요하면 같은 설정으로 추가 가능.

**아직 안 한 것:** KISA 실데이터로 끝까지(수집 → classify → chain_event) 확인(위 인증서 해결 후), `min_interval_hours`(§1-2), robots/이용약관 — robots.txt 403(미게시), 게시물에 공공누리 표시 있음(유형별 조건은 글마다 확인 필요; 우리는 요약+원문 링크만 노출).

### 7-3. D1 (2026-11-09) — 프로토콜 단계 판정

| 항목 | 파일 |
|---|---|
| 단계 대응표·머리 줄 해석·릴리스 선택 | `apps/pipeline/src/classify/protocol-stage.ts` (+ `tests/protocol-stage.test.ts`) |
| 문서별 처음/마지막 커밋 날짜, 글 날짜 = 문서 마지막 수정일 | `apps/pipeline/src/adapters/acp-github-adapter.ts` `documentDates` |
| 분류 시 단계 붙이기 | `apps/pipeline/src/jobs/run-classify.ts` |
| 단계 컬럼 저장, 포함 릴리스 조회 | `apps/pipeline/src/db/classification-repository.ts` `insertTech`, `findIncludingRelease` |

**규칙.**
- 단계는 ACP 문서 상태만 본다(Proposed→PROPOSED, Implementable→ACCEPTED, Activated→ACTIVATED, Stale→STALE). AI 판단 없음.
- 포함 릴리스 = 노트가 ACP **문서로 링크를 건** 릴리스. 단순 언급("ACP-176 gas target" 같은 지표 설명)은 제외. 정식 태그(`v1.15.0`)를 Fuji(`v1.15.0-fuji`)보다 우선, 그다음 가장 이른 것. 실제 avalanchego 노트에서 업그레이드마다 정확히 한 묶음씩 링크됨을 확인(v1.11.0 · v1.12.0 · v1.13.0 · v1.14.0 · v1.15.0).
- 글 날짜(`published_at`)를 저장소 최신 커밋 → **문서 마지막 수정일**로 바꿈. 첫 수집 때 ACP 36건이 전부 같은 날짜였던 원인.

**실데이터 확인 (DB 없이, ACP 3건):** ACP-13 STALE · ACP-77 ACTIVATED(v1.12.0) · ACP-267 ACTIVATED(v1.15.0). 목업의 ACP-267 "제안 · 확인 중"은 지난 상태였고 2026-11-04 문서가 Activated 로 바뀜.

**한계.** "처음 공개일"은 현재 경로의 첫 커밋이다. 2024-05-03 저장소 폴더 정리 이전에 만들어진 ACP(예: 13, 77)는 그날로 나온다. 화면 문구는 "문서 첫 기록"으로 쓰고, 원 제안일이 필요하면 GitHub Discussion 날짜를 따로 가져온다(후속).

**적용 전제.** `insertTech` 가 새 컬럼에 쓰므로 마이그레이션 적용 전에 `pnpm classify` 를 돌리면 실패한다. 이미 저장된 ACP 행은 날짜·단계가 비어 있다 → 마이그레이션 후 ACP 소스 커서를 지우고 재수집하거나 한 번짜리 보정 스크립트(후속).

## 8. 결정 기록

| # | 질문 | 결정 (2026-10-31) |
|---|---|---|
| Q1 | 공유 DB에 `content.chain_event` 등이 이미 적용돼 있나? | **미확인 — 사용자 확인 대기** |
| Q2 | 수집 실행 위치 | ✅ Dokploy 스케줄 작업(안 B) |
| Q3 | 마감 임박 기준 | ✅ 3일 |
| Q4 | 새 범위 이름 | ✅ `web3-kr` |
| Q5 | 기존 NestJS 스케줄러에서 Chainery 소스 제외 | ✅ S1에서 함께 처리 |
| Q6 | 운영자 계정 | ✅ 본인 계정 `role=admin` 지정(사용자가 DB에서) |
