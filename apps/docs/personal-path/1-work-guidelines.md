# 플랫폼 구조 개편 + 맞춤 학습 경로 — 작업 지침

> 기획 화면(팀 공유용): `~/Downloads/chainery 맞춤 학습 경로 기획/index.html` (저장소 밖, 2026-10-28)
> 브랜치: `feature/personal-learning-path` (deploy 에서 분기)
> 결정 기록: 2026-11-04 사용자 결정 — 주소 구조(`/` = 플랫폼 입구), 섹션 이름(`/knowledge`), 설문 노출 조건, 플랫폼 행사는 별개 페이지.
> 2026-11-04 추가 결정 — C1(플랫폼 행사 = `/events`, 지식 쪽 체인별 행사 → `/knowledge/events`), D1(지식 홈의 빌더 유형 테스트 배너 내림, `/builder-test` 페이지는 유지), E(채용 = `/careers`).

## 1. 배경 · 목표

- 사용자 피드백: "chainery 에 들어와도 어디부터 봐야 할지 모르겠다."
- 프로젝트를 **플랫폼**으로 키운다. 지금의 생태계 홈·LIVE·LEARN 은 플랫폼의 한 섹션 **"블록체인 지식"** 이 되고, 그 옆에 **채용 · 행사/이벤트** 가 생긴다.
- 블록체인 지식에 들어오면 **곧바로 전체 화면 "내 경로 만들기"** 로 시작해, 하는 일 · 해본 것 · 하고 싶은 것에 맞춰 학습 지도 위에 내 경로를 그려 준다.

## 2. 범위

### Part A — 플랫폼 구조
| # | 기능 |
|---|---|
| A1 | `/` = 플랫폼 입구 (지금의 `/about` 랜딩). `/about` 은 `/` 로 redirect |
| A2 | 블록체인 지식 홈 = `/knowledge` (지금의 `/` 생태계 홈). 하위 주소(`/academy` `/concepts` `/skills` `/projects` `/macro` `/updates` `/chains` …)는 **그대로** |
| A3 | 입구 상단 nav: **채용 · 행사/이벤트 · 블록체인 지식**. 오른쪽 컬렉션(체인 선택) 버튼 제거 → 빈 자리(나중에 로그인·내 정보) |
| A4 | 채용 `/careers`, 행사/이벤트 페이지: **빈 페이지**("준비 중") |
| A5 | 로고·"홈" 링크 정리: 지식 섹션 로고 → `/`, 체인 선택 후 이동 → `/knowledge` |

### Part B — 맞춤 학습 경로 (1단계)
| # | 기능 |
|---|---|
| B1 | 경로 계산 로직 (순수 함수 · 테스트) — 목표 개념 + 선행 개념 거슬러 올라가기 + 해본 것으로 아는 개념 표시 |
| B2 | 설문: 방식(처음부터 쌓기 / 목표 하나) → 하는 일 → 해본 것 → (목표) → 확인 |
| B3 | **전체 화면 시작**: `/knowledge` 에 들어올 때 저장된 경로가 없고 "나가기"를 누른 적 없으면 설문을 전체 화면으로 띄움. 작은 **나가기** → 지식 홈. 나가기는 기억하고, 이후엔 사이드바 "내 학습 경로"로 언제든 시작. 개념·스킬 등 하위 주소로 바로 들어온 사람은 막지 않음 |
| B4 | 내 경로 화면 `/academy/my-path`: 다음 할 것 · 학습 지도(개인화) · 순서 목록 |
| B5 | 학습 지도 개인화: ✓ 완료/이미 앎 · ▶ 여기서 시작 · 순서 번호 |
| B6 | 개념 상세: 경로 맥락 띠(n/전체 · 다음) + "다 읽었어요 / 이미 알아요" · 완료 취소 |
| B7 | 경로 여러 개: 전환 · 추가 · 삭제 (완료 기록은 공유) |
| B8 | 저장: localStorage 한 키, 저장소 인터페이스 뒤에 숨김 |

### 이번에 안 하는 것
- 채용·플랫폼 행사의 **실제 내용**, 로그인 버튼·내 정보 — 자리만.
- AI 심층 질문(직접 적은 목표) — 2단계. 이번엔 "직접 적기" 선택지를 보여 주지 않는다.
- 로그인 동기화 · 서버 테이블 · 퀴즈 · GA — 뒤 단계. **DB·API 는 건드리지 않는다.**

## 3. 설계

### 3-1. 주소
| 주소 | 화면 | 바꾸는 곳 |
|---|---|---|
| `/` | 플랫폼 입구 (`AboutPage`) | `app/(chainery)/page.tsx` |
| `/about` | → `/` redirect (308) | `next.config.mjs` redirects |
| `/knowledge` | 블록체인 지식 홈 (`EditorialApp` ecosystem) | 새 `app/(chainery)/knowledge/page.tsx`, `lib/cryptopedia-routes.ts` 의 `ecosystem: '/'` → `'/knowledge'` |
| `/careers` | 채용 (빈 페이지) | 새 라우트 |
| `/events` | 플랫폼 행사 (빈 페이지) — 결정 C1 | 새 `app/(chainery)/events/page.tsx` |
| `/knowledge/events` · `/knowledge/events/archive` · `/knowledge/events/:id` | 지식 쪽 체인별 행사 (옮김) | `(ecosystem)/events/*` → `knowledge/events/*`, `cryptopedia-routes.ts`, 옛 `/events/:path+` → `/knowledge/events/:path+` redirect |
| `/academy/my-path` | 내 경로 | 허브 항목 추가 (3-3) |

- 지식 섹션 안의 "생태계 홈" 링크·브레드크럼은 `pathForEditorialView` 를 거치므로 매핑 한 줄로 따라 바뀐다.
- 직접 `/`·`/about` 을 쓰는 곳: `editorial-app.tsx`(로고 → `/about`), `about-header.tsx`(로고·체인 선택 → `/`), `cryptopedia-routes.ts`(`/about` 해석). 이 셋만 고친다. (`app/start`·`app/template` 의 `href="/"` 는 컨슈머 앱 쪽이라 이번 범위 밖 — 플랫폼 입구로 가도 문제 없음.)

### 3-2. 플랫폼 입구 헤더
- `about-header.tsx` 의 메뉴를 지식 섹션 메뉴(생태계 홈·아카데미·…)에서 **플랫폼 메뉴 3개**로 바꾼다. 블록체인 지식에 마우스를 올리면 지금처럼 하위 띠(생태계 홈 · LIVE · LEARN)를 보여 준다.
- 오른쪽 `EditorialCollectionButton` 제거. 지식 섹션 셸(사이드바)의 체인 선택은 그대로 둔다.
- 랜딩 본문(`about-page.tsx`)은 이번엔 손대지 않는다. 본문 안 링크가 지식 섹션 주소를 가리키면 `pathForEditorialView` 로 따라간다.

### 3-3. 맞춤 경로 로직 (`apps/web/lib/learner/`)
| 파일 | 내용 |
|---|---|
| `tracks.ts` | 역할 6개 → 트랙(목표 개념·뒤에 붙는 것), 해본 것 7개 → 아는 개념, 목표(케이스 4개) 추천 역할. **id 는 hub.json 의 실제 id**. |
| `route.ts` | `computeRoute(hub, path, progress)` 순수 함수 → `{ steps, start, added, doneCount, minutesLeft }`. 선행(`PREREQUISITE`)을 깊이 우선으로 거슬러 올라가 정렬, hub 에 없는 id 는 뺀다. |
| `store.ts` | `LearnerState` 타입(v1) · `LearnerStore` 인터페이스 · localStorage 구현. 읽기 실패·형식 불일치 시 빈 상태. |
| `use-learner.ts` | 화면이 쓰는 훅. 저장소 종류를 모른다(3단계에 API 저장소로 교체할 자리). |

- 저장 키 `cryptopedia-learner:v1` — `profile` · `progress`(항목별 `known`/`done`) · `paths[]` · `activePathId` · `ui.onboardingDismissed`. **경로 순서는 저장하지 않고 매번 계산**.
- 케이스 실습 완료는 기존 `cryptopedia-study:<케이스>` 기록을 읽어 판단(같은 정보를 두 곳에 쓰지 않음).

### 3-4. 화면
- **설문** `components/cherry/editorial/my-path-onboarding.tsx` — 전체 화면(지식 홈 진입 시)과 `/academy/my-path`(경로 없을 때) 둘 다 이 컴포넌트를 쓴다. 전체 화면일 때만 오른쪽 위 작은 "나가기".
- **내 경로** `my-path-page.tsx` — `HUB_ENTRY_IDS` 에 `'my-path'`, 아카데미 children 맨 앞 "내 학습 경로", `editorial-app.tsx` 허브 분기에서 이 컴포넌트.
- **학습 지도** — `LearningMap` 에 선택 prop `progress`·`start` 만 추가. 없으면 지금과 똑같이 그린다.
- **개념 상세** — `hub-detail-page.tsx` 개념 화면에서 개념이 경로 안일 때만 띠 + 완료 박스.
- 디자인은 기존 editorial 토큰·`hub-shared` 부품. 새 색·라이브러리 없음.

## 4. 구현 순서 (각 단계 끝에 검수표 항목 실행)

| 단계 | 내용 | 확인 |
|---|---|---|
| P1 | Part A 주소·헤더·빈 페이지 | 브라우저: `/` 입구 · `/about`→`/` · `/knowledge` 지식 홈 · 하위 주소 그대로 · 로고 이동 · 기존 테스트 통과 |
| P2 | `lib/learner/*` 로직 + 테스트 | `npx tsx --test` · 트랙·목표 id 가 hub.json 에 모두 있는지 |
| P3 | 설문 + 전체 화면 시작 + 나가기 | 첫 방문 → 전체 화면 · 나가기 후 재방문 시 안 뜸 · 하위 주소 직접 진입 시 안 뜸 |
| P4 | 내 경로 화면 + 지도 개인화 | 조건 3개(입문자·주니어·시니어)로 경로 확인 · 기존 학습 지도 회귀 없음 |
| P5 | 개념 상세 띠 + 완료 · 경로 여러 개 | 완료 → ✓ · 다음 이동 · 새로고침 유지 · 경로 2개 완료 공유 · 모바일 폭 |

## 5. 설계 3원칙 적용

1. **좁은 스코프** — 채용·플랫폼 행사는 빈 페이지, 로그인은 자리만, AI 질문·퀴즈·GA 제외. 지식 섹션 하위 주소는 옮기지 않는다.
2. **단순화** — 주소는 매핑 한 줄 + 직접 쓰는 3곳만. 경로는 저장하지 않고 계산. 라우팅은 기존 허브 항목 방식 재사용. 설문 컴포넌트 하나를 전체 화면·페이지 두 곳에서 같이 쓴다.
3. **동작 가시성** — 경로 계산은 순수 함수라 node 테스트로 입력→출력을 바로 본다. 지도 ✓·▶·번호로 결과가 화면에 그대로 보인다.

## 6. 갈림길 (사용자 결정)

- **C. 플랫폼 행사/이벤트 주소** — `/events` 는 지금 지식 섹션(체인별 크롤링 행사)이 쓴다. 플랫폼 행사는 모든 체인 + 어드민 등록을 포함하는 상위 개념.
  - C1) 플랫폼이 `/events` 를 갖고, 지식 쪽 체인별 행사는 `/knowledge/events`(+ `/knowledge/events/archive`)로 옮긴다. 옛 `/events` 링크는 상위 페이지로 오게 되어 뜻이 맞다. (추천)
  - C2) 플랫폼 행사는 새 주소(예: `/meetups`), 지식 쪽 `/events` 는 그대로.
- **D. 지식 홈의 기존 "빌더 유형 테스트" 배너** — 전체 화면 설문이 같은 역할(나에게 맞는 경로)을 하므로 입구가 겹친다.
  - D1) 지식 홈에서 배너를 내리고, 빌더 유형 테스트 페이지(`/builder-test`)는 그대로 둔다. (추천)
  - D2) 배너를 "내 경로 다시 만들기 / 이어서 하기"로 바꾼다.
  - D3) 그대로 둔다.
- **E. 채용 주소** — `/careers` 로 제안.

## 7. 가정 · 위험

- ⚠️ `/` 가 바뀌면 외부에 공유된 `/` 링크·북마크는 입구로 간다(지식 홈이 아님). 의도와 맞다고 가정.
- ⚠️ 배포 쪽(Dokploy·Vercel) 설정이 `/` 나 `/about` 을 따로 참조하는지 **미확인** — 배포는 사용자가 하므로 확인 부탁.
- 트랙·목표는 Avalanche 개념 id 기준. 다른 체인 hub 에선 없는 id 가 빠져 경로가 짧아진다(깨지지 않음).
- localStorage 가 막힌 환경에선 메모리로만 동작하고 "이 브라우저에 저장할 수 없어요"를 보인다. 이때 전체 화면 설문은 매 방문 뜰 수 있다.
