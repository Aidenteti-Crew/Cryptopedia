# Cryptopedia 도메인 전환 작업표

> 기준일 2026-10-10 · 브랜치 `develop` (`origin/deploy` 2c2781b 기준)
> 원본: `cherrypickersGuild/cherry-in-the-haystack` (AI 엔지니어링 지식 플랫폼) → 목표: Avalanche 중심 블록체인 지식 플랫폼, 자체 리눅스 서버에 web·api·PostgreSQL 전부 호스팅 (Supabase 미사용)

---

## 0. 한눈에 보기 — 작업 목록

상태: ✅ 완료 · 🟡 진행 중 · ⬜ 시작 전 · ❓ 결정 필요

| # | 단계 | 작업 | 산출물 | 상태 | 선행 |
|---|---|---|---|---|---|
| 1 | 인프라 | 빈 DB 부트스트랩 (Supabase 없이 로컬 PG) | `scripts/db/bootstrap.sh`, 누락 마이그레이션 2건 | ✅ | — |
| 2 | 인프라 | DB SSL 강제 해제 (`DB_SSL` 환경변수로 전환) | API·MCP·scripts 20개 수정 | ✅ | — |
| 3 | 인프라 | 1·2번 작업 커밋 | `b61bceb` — 자체 호스팅 PostgreSQL 설정·부트스트랩 | ✅ | 1, 2 |
| 4 | 화면 | `/`를 Avalanche 에디토리얼 UI로 교체 (Figma Full Service 27개 화면 유형) | `components/cherry/editorial/*`, `public/cryptopedia/*.json` | ✅ | — |
| 5 | 결정 | 기존 Cherry 자산 유지·재사용·폐기 결정 (§3 표) | 결정 목록 | ❓ | — |
| 6 | 결정 | 정적 JSON을 계속 쓸지, DB·API로 옮길지 화면별 결정 (§2 표) | 화면별 목표 데이터 소스 | ❓ | 5 |
| 7 | 분류 | 블록체인 분류 체계 확정 — 엔터티 카테고리, 기사 카테고리, 추적 대상 (§4-3 표) | 카테고리 목록 | ⬜ | 6 |
| 8 | 온톨로지 | Avalanche 개념 온톨로지 작성 (개념·별칭·관계) | 스냅샷 JSON (기존 형식) | ⬜ | 7 |
| 9 | 온톨로지 | 온톨로지 DB 적재 (기존 `scripts/ontology/import-postgres.cjs` 재사용) | `handbook.concept` 등 | ⬜ | 8 |
| 10 | 시드 | AI 기준 데이터 시드를 블록체인 시드로 교체 | 새 시드 SQL, bootstrap 갱신 | ⬜ | 7 |
| 11 | 데이터 | 행사·이벤트 실데이터 연결 (크롤러 → API) | 이벤트 API, 요청서는 `apps/docs/avalanche-editorial-ui/event-crawler-data-request.md` | 🟡 요청서 작성됨 | 6 |
| 12 | 데이터 | 매크로 소식·개발 업데이트 수집 파이프라인 소스 교체 | 소스 레지스트리, 분류 프롬프트 | ⬜ | 7 |
| 13 | 데이터 | 체인 기초·빌더 라이브러리·아카데미 콘텐츠 작성 | articles·collections 데이터 | ⬜ | 6, 8 |
| 14 | 정리 | 미사용 AI 화면·정적 JSON 정리 (§3에서 폐기로 정한 것만) | 삭제 커밋 | ⬜ | 5 |
| 15 | 배포 | 리눅스 서버 구성 — PG·Redis·web·api, `.env` 이전 | 서버 실행 | ⬜ | 3 |
| 16 | 화면 | 확정 목차 + 생태계 지도·케이스 학습·에이전트 스킬·개발 변경 영향 데모 | `hub.json`, 기존 UI 재사용, 스킬 다운로드 | ✅ | 4 |

---

## 1. 현재 상태

- **`/` 화면:** Avalanche 에디토리얼 앱입니다. 데이터는 전부 `apps/web/public/cryptopedia/*.json` 정적 파일이고, API를 호출하지 않습니다. 데이터 공급은 `apps/web/lib/cryptopedia-data.ts`의 저장소 인터페이스 뒤에 있어서, 나중에 API로 바꿔도 화면 컴포넌트는 그대로 둘 수 있습니다. `hub.json`은 공식 출처와 적용 범위를 분리하고 프로젝트·개념·자료·케이스·스킬·변경을 ID로 연결합니다.
- **기존 Cherry 개발자 화면:** 전체 화면은 `/`에서 렌더되지 않습니다. LandscapeGrid, ConceptRoadmap, Workshop InventoryCard, Patch Notes 타임라인 항목은 새로운 목차 안에서 재사용합니다. 기본 표시와 기존 `/start/*` 사용 흐름을 보존합니다.
- **`/start/*` 컨슈머 앱:** URL과 동작이 그대로 유지됩니다.
- **API와 DB:** 로컬에서 정상 동작합니다. 다만 새 `/` 화면은 아직 API를 쓰지 않습니다.

로컬 실행과 DB 접속 방법은 §5에 있습니다.

---

## 2. 새 Cryptopedia 화면 — 데이터 출처와 목표

| 화면 | 메뉴 위치 | 현재 데이터 | 현재 건수 | 목표 데이터 소스 (제안) | 상태 |
|---|---|---|---|---|---|
| 생태계 (첫 화면) | 기본 | `ecosystem.json` | 항목 목록 | 정적 유지 가능 | ❓ |
| 체인 선택 | 데스크탑 네비게이션 / 모바일 상단 | `chains.json` | Avalanche 활성 · Injective·Midnight 비활성 | 정적 유지 | ✅ |
| 체인·프로젝트 | 1차 메뉴 | `hub.json` | 도구·프로젝트 5개 × 분야 4개 | 데모 정적 · 운영 DB 후보 | ✅ 데모 |
| 매크로 소식 | 1차 메뉴 | `macro.json` | Figma 예시 2 | 수집 파이프라인 → `content.article_raw` | ⬜ |
| 행사·이벤트 | 1차 메뉴 | `events.json` | Figma 예시 4 | 이벤트 크롤러 API (요청서 있음) | 🟡 |
| 개발 업데이트 | 1차 메뉴 | `hub.json` | 변경 영향 시나리오 3개 | 데모 정적 · 운영 수집 파이프라인 후보 | ✅ 데모 |
| 01 체인 기초 | 챕터 | `collections.json`, `articles.json` | 4개 문서 | 큐레이션 콘텐츠 (정적 또는 DB) | ❓ |
| 02 빌더 라이브러리 | 챕터 | `collections.json`, `hub.json` | 자료 7 · 스킬 5 | 데모 정적 · 운영 DB 후보 | ✅ 데모 |
| 03 아카데미 | 챕터 | `collections.json`, `articles.json`, `hub.json` | 케이스 3 · 연결 개념 8 | 데모 정적 · 운영 온톨로지 DB 후보 | ✅ 데모 |
| 문서 상세 | 공통 | `articles.json` | 19 | 위 챕터와 동일 | ❓ |
| 책 상세 | 공통 | `books.json` | 5 | 정적 또는 DB | ❓ |
| 행사 아카이브 | 공통 | `events.json` | 위와 동일 | 이벤트 크롤러 API | 🟡 |

"목표 데이터 소스"는 제안이며 확정이 아닙니다. 서버에 올린 뒤 콘텐츠를 바꿀 때마다 재빌드·재배포가 필요하면 정적 JSON, 운영 중에 바뀌어야 하면 DB·API로 옮기는 것이 판단 기준입니다.

---

## 3. 기존 Cherry 자산 — 처분 결정표

| 자산 | 지금 상태 | 데이터 위치 | 블록체인에서 쓸 여지 | 결정 |
|---|---|---|---|---|
| Learning 개념 페이지 + 온톨로지 | `/`에서 미렌더 | DB `handbook.*` (AI 개념 319개) | 아카데미 스킬 그래프, 용어 사전의 기반 | ❓ |
| KaaS 지식 마켓·Admin 대시보드 | `/`에서 미렌더 | DB `kaas.*` | 에이전트 대상 지식 판매 (MCP·x402 메뉴와 연결 가능) | ❓ |
| Patch Notes, 트렌드 | `/`에서 미렌더 | DB `content.article_raw`, `snapshot.*` (0건) | 매크로 소식·개발 업데이트 백엔드로 재사용 | ❓ |
| 소스 제출·관리자 레지스트리 | 동작함 | DB `content.source_submission` 등 | 수집 소스 관리에 그대로 사용 | ❓ |
| Research·Discourse·Cases·Building Blocks | `/`에서 미렌더 | 웹 정적 JSON 약 2MB (AI 자료) | 구조만 재사용, 내용은 전부 교체 대상 | ❓ |
| Frameworks·Prompting 랜드스케이프, Overview 구성 | `/`에서 미렌더 | `apps/api/storage/*.json` | 낮음 | ❓ |
| Arena | `/`에서 미렌더 | 코드 목업 `lib/arena-mock.ts` | 낮음 | ❓ |
| `/start/*` Workshop·Bench·Shop | 동작함 | 목업 + API (`kaas`, bench 세트 코드) | 유지 여부 결정 필요 | ❓ |
| `/demo-hanbit` | 동작함 | 코드 정적 값 | 없음 (고객 데모) | ❓ |
| Python 수집 파이프라인 | 로컬 미실행 | `python_services/*` | 블록체인 뉴스·이벤트 수집 | ❓ |
| 스마트 컨트랙트 | 미사용 | `apps/contracts` (Status/Karma), `apps/contracts-near` | Avalanche C-Chain 이전 후보 | ❓ |

---

## 4. 기존 AI 분류 → 블록체인 대응표

### 4-1. 메뉴

새 메뉴는 팀원 작업으로 이미 정해졌습니다 (`apps/web/lib/cryptopedia-taxonomy.ts`). 아래는 기존 AI 메뉴가 어디로 대응되는지에 대한 제안입니다.

| 기존 그룹 | 기존 메뉴 | 대응하는 새 메뉴 (제안) |
|---|---|---|
| — | Overview | 생태계 (첫 화면) |
| Research & Models | Model Updates | 개발 업데이트 |
| Research & Models | Papers | 빌더 라이브러리 › 빌더 아티클 |
| Research & Models | Benchmarks & Datasets | 대응 없음 |
| Engineering Blocks | Frameworks Best | 빌더 라이브러리 › 코드 레퍼런스 |
| Engineering Blocks | Prompting Best | 대응 없음 |
| Engineering Blocks | Dev Tools | 빌더 라이브러리 › 공식 Docs |
| Engineering Blocks | Building Blocks | 빌더 라이브러리 › MCP · x402 |
| Cases | Domain Applications, Case Studies, Product Discovery | 체인·프로젝트 |
| Discourse | Regulations · Policy · Compliance | 매크로 소식 |
| Discourse | Market & Investment | 매크로 소식 |
| Discourse | Big Tech Trends | 매크로 소식 |
| Discourse | Community | 행사·이벤트 |
| Discourse | Technical Deep Dives, Insights & Opinions | 빌더 라이브러리 › 빌더 아티클 |
| Learning | BASICS 토픽 | 01 체인 기초 |
| Learning | ADVANCED 토픽 | 03 아카데미 |
| 유틸리티 | Archive, Compare Knowledge, Change Tracking | 대응 없음 |

새 메뉴 구조:

| 구분 | 메뉴 | 하위 |
|---|---|---|
| 1차 메뉴 | 체인·프로젝트 · 매크로 소식 · 행사·이벤트 · 개발 업데이트 | — |
| 01 체인 기초 | 체인 개요 · 네트워크·체인 구조 · 합의·밸리데이터 · 핵심 용어 사전 | |
| 02 빌더 라이브러리 | 공식 문서 · 코드·도구 레퍼런스 · 빌더 아티클 · MCP·에이전트 도구 · 스킬 라이브러리 | |
| 03 아카데미 | 입문 · 구조 이해 · 케이스별 실습 · 학습·스킬 그래프 | |

### 4-2. Learning 토픽 → 온톨로지 최상위 개념

기존 AI 토픽 18개는 각각 온톨로지 개념 하나에 묶여 있었습니다. 블록체인 온톨로지(작업 #8)를 만들 때 이 자리를 채우면 됩니다.

| 구분 | 기존 토픽 | 기존 온톨로지 개념 | Avalanche 대응 개념 (채울 칸) |
|---|---|---|---|
| BASICS | prompting-reasoning | PromptEngineering | |
| BASICS | rag-systems | RAG | |
| BASICS | fine-tuning | Finetuning | |
| BASICS | agents-reasoning | AgentArchitecture | |
| BASICS | embeddings | Embedding | |
| BASICS | evaluation-systems | EvaluationMetric | |
| BASICS | model-architecture | ModelArchitecture | |
| BASICS | model-components | ModelComponent | |
| BASICS | training-paradigms | TrainingParadigm | |
| BASICS | application-domains | ApplicationDomain | |
| ADVANCED | chain-of-thought | AdvancedPrompting | |
| ADVANCED | multi-hop-rag | MultiHopRAG | |
| ADVANCED | peft-lora | ParameterEfficientFinetuning | |
| ADVANCED | agent-topologies | MultiAgentOrchestration | |
| ADVANCED | custom-embeddings | CustomEmbedding | |
| ADVANCED | adversarial-eval | AdversarialEvaluation | |
| ADVANCED | inference-optimization | InferenceOptimization | |
| ADVANCED | safety-alignment | SafetyAndAlignment | |

온톨로지 형식은 단순합니다. 같은 형식으로 만들면 기존 적재 스크립트를 그대로 쓸 수 있습니다.

| 요소 | 필드 | 기존 건수 |
|---|---|---|
| 개념 | `node`, `label`, `description`, `aliases` | 319 |
| 관계 | `from`, `to`, `type` (SUBTOPIC · PREREQUISITE · EXTENDS · RELATED · CONTRADICTS) | 343 |

원본 파일: `apps/docs/ontology-migration/ontology-snapshot.json`

### 4-3. DB 기준 카테고리

기사 분류와 엔터티 추적에 쓰는 기준 데이터입니다. 현재 값은 전부 AI 도메인이며, 출처는 `apps/docs/staged_mock/stage-0-foundation.sql`입니다.

| 테이블 | 현재 값 (AI) | 블록체인 값 (채울 칸) |
|---|---|---|
| `content.side_category` | Applied Research · Case Study | |
| `content.entity_category` — 회사·모델군 | OpenAI · OpenAI Family · Anthropic · Anthropic Family · Google · Google Family · Meta Family · Mistral Family · DeepSeek Family · xAI Family · Microsoft · FAANG | |
| `content.entity_category` — 기술 분야 | Agent · RAG · Fine-Tuning · Prompt Engineering · NLP · Multimodal · Coding | |
| `content.entity_category` — 도구·인프라 | LLMOps · Serving · Observability · Infrastructure · Data & Storage · Model Hub · IDE & Plugin | |
| `content.entity_category` — 출처 유형 | Blog · Tutorial · Community · Startup · Korea · International | |
| `content.tracked_entity` | AI 회사·모델·도구 40개 | |
| `content.source` | AI 블로그·뉴스 소스 10개 | |

---

## 5. 로컬 환경

| 항목 | 값 |
|---|---|
| Node | 20 이상 (`nvm use 23` 권장) |
| Postgres | `docker compose up -d postgres`, localhost:15432, DB `cherry_db`, 사용자 `cherry` / `cherry_dev` |
| Redis | `docker compose up -d redis`, localhost:16379 |
| API | `cd apps/api && pnpm start:dev` → :4000 |
| Web | `cd apps/web && pnpm dev` → :3000 (사용 중이면 `pnpm dev -p 3001`) |

새 DB를 처음부터 만들 때:

```bash
DATABASE_URL=postgresql://cherry:cherry_dev@localhost:15432/cherry_db \
  bash scripts/db/bootstrap.sh --with-demo --with-ontology
```

환경변수 예시는 `apps/api/.env.example`에 있습니다. 자체 호스팅 PG에서는 `DB_SSL=false`로 둡니다.

## 6. 2026-10-10 — 홍보용 연결 데모

- 사용자가 확정한 범위: 기존 웹 구조를 재사용해 생태계 탐색 → 목적별 학습 → 에이전트용 스킬 전달 → 변경 영향 확인을 구현. 결제·마켓·Arena는 이번 범위에서 제외하며 기존 파일·라우트는 삭제하지 않는다.
- 구현 계획과 검수: `apps/docs/avalanche-editorial-ui/7-ecosystem-learning-skills-plan.md`.
- 전체 페이지의 위치 표시와 상위 이동은 공통 breadcrumb로 통일. 상세 돌아가기 버튼·중복 경로 문구 제거. 검수는 `apps/docs/avalanche-editorial-ui/8-breadcrumb-plan.md`이며 관련 테스트 64개와 1440/834/390 브라우저 검증 통과.
- 새 데이터 계약: `apps/web/lib/cryptopedia-hub.ts`. 출처 주체와 적용 범위(블록체인 공통/EVM 공통/체인 전용)를 분리하고 정적 JSON의 ID 참조를 검사한다. 선택 체인 조회 시 공통 자료를 함께 제공한다. DB 변경은 아직 없다.
- 대표 케이스: 첫 컨트랙트 준비하기 · 체인 데이터를 읽는 도구 만들기 · 생태계 프로젝트 조사하기.
- 기존 LandscapeGrid, ConceptRoadmap, Workshop InventoryCard, Patch Notes 타임라인 항목을 선택적 에디토리얼 표시로 확장해 재사용한다.
- 다운로드: 선택 스킬의 작업 지침·출처·입력·결과물·체크리스트를 실제 Markdown 파일로 제공. 원격 설치·실행은 수행하지 않는다.
- 검증: 관련 테스트 60개 통과, Chrome 1440/834/390에서 이동·선택·다운로드·학습 체크 상태·키보드 탭 전환·가로 넘침 확인. 기존 독립 라우트 4개 HTTP 200. 타입 검사는 기존 KaaS 오류 8개만 발생.
- 브라우저 증빙: `/private/tmp/cryptopedia-hub-browser-result.json`, `/private/tmp/cryptopedia-hub-home-1440.png`, `/private/tmp/cryptopedia-hub-skills-390.png`.
- 후속: 실제 최신 소식 수집, DB/API 공급자, 스킬 버전 관리, 에이전트 연결·설치. 현재 개발 업데이트의 영향 관계는 수동 작성한 데모 시나리오다.

## 7. 2026-10-14 — 생태계 홈 Cherry Overview UI 재사용

- 기존 `HeroCarousel`과 그라디언트를 재사용해 최상단에 체인·프로젝트 / 매크로 / 행사·이벤트 / 개발 소식 슬라이드 배치. 현재는 정적 예시 소식으로 표시.
- 기존 스포트라이트 카드 구성 응용: ‘사람이 공부하기’ → 케이스별 실습, ‘에이전트에게 전달하기’ → 스킬 라이브러리.
- 기존 `CategoryTreemap` 재사용. Buzz Distribution은 홈에 등록된 예시 소식의 분야별 건수 비중이며 조회수·시장 인기도·실제 주간 통계로 표시하지 않음. 분야 선택으로 해당 메뉴 이동 가능.
- 계획·검수: `apps/docs/avalanche-editorial-ui/9-ecosystem-home-redesign-plan.md`. 대응 관계는 `CRYPTOPEDIA-WEB-MENU-MAPPING.md` 갱신.

## 8. 2026-10-14 — 로컬 작업 커밋·크롤러 PR 통합

- 사용자 승인: 우리 포크 `Aidenteti-Crew/Cryptopedia`의 PR #2를 `deploy`에 머지하고 로컬 변경도 커밋·푸시한다. 원본 upstream 저장소에는 쓰지 않는다.
- PR #2 검토 SHA: `86846577ac4064131d5b19865f496594346ee73e`. GitHub 충돌 없음, 자동 CI 없음.
- 임시 소스에서 pipeline 테스트 169개, API 단위·HTTP 계약 테스트 43개, Python 크롤러 테스트 13개 통과. Pipeline 빌드와 API production 타입 검사 통과.
- 로컬 웹 관련 테스트 70개 통과. 실제 DB 연결을 요구하는 통합 테스트는 미실행이며 DB 마이그레이션·크롤러 실행·배포는 하지 않는다.
- 로컬 변경 백업: `/private/tmp/cryptopedia-local-before-pr2-20261014/`에 tracked patch와 untracked archive 보관.
- 인프라 커밋: `b61bceb`. 웹·문서 변경은 별도 커밋으로 저장하고 PR이 반영된 deploy에 통합한다.
