# B 영역 개발 체크리스트 (소식·행사·로그인)

작성 2026-11-09. 근거: 코드 흐름 조사(웹 · API · pipeline), `1-plan.md`, `2-detail-design.md`.

**목표.** 국내 Web3 행사와 체인 소식을 자동으로 모아 검수 후 보여 주고, 로그인 없이도 볼 수 있게 하되 로그인하면 관심 행사 저장·계정 관리를 할 수 있게 한다.

**담당 범위 (설계서 B + 로그인, 2026-11-09 확인).** 프로토콜 변경 · 공식 문서 변경 · 개발 릴리스 · 생태계 프로젝트 소식 · 해커톤·컨퍼런스. AI 요약은 "무엇이 달라졌나 / 누구에게 중요한가 / 출처" 중심, 제안·확정·적용 구분. 여기에 로그인·계정 관리·계정 삭제.

| 설계서 항목 | 칸 |
|---|---|
| 프로토콜 변경 (ACP/EIP) | D1 · D2 |
| 공식 문서 변경 | D5 (D 담당과 합의 후) |
| 개발 릴리스 | D0 · D2 (이미 수집·표시 중) |
| 생태계 프로젝트 소식 | D4 |
| 해커톤·컨퍼런스 | A · C |
| 3문항 요약 · 단계 구분 | D0 (모든 소식 공통) · D1 |
| 로그인·계정 | B |

**진행 방식.** 한 칸 = 작은 변경 하나. 칸마다 "확인"을 통과해야 다음 칸으로 간다. 확인은 테스트만이 아니라 실제 화면이나 실제 응답을 본다. 커밋은 칸 단위로 한다.

**트랙.** 세 트랙은 서로 독립이라 순서를 바꿔도 된다.

| 트랙 | 칸 | DB 마이그레이션 필요 |
|---|---|---|
| A. 행사 화면 | A1 ~ A5 | A1·A2 불필요(스냅샷으로 개발), A3부터 필요 |
| B. 로그인·계정 | B1 ~ B4 | B1~B3 불필요, B4(관심 저장)만 새 테이블 |
| C. 수집·AI·검수 | C1 ~ C7 | C2부터 필요 |
| D. 소식 | D0 ~ D5 | 필요 |

**추천 순서.** A1 → A2 → B1 → B2 → (마이그레이션 적용) → D0 → D1 → A3 → C1 → … 행사 화면과 로그인 앞부분은 DB 없이 바로 시작할 수 있고, 마이그레이션 뒤에는 소식(D0·D1)을 앞당겨 소식과 행사가 같이 자리 잡게 한다.

---

## 0. 준비 (사용자 작업 포함)

- [ ] **Q1 확인.** 공유 DB에 `content.chain_event` 가 있는가. 없으면 `docs/architecture/avalanche-categories-2026-10-12.sql` 먼저.
- [ ] **마이그레이션 적용.** `docs/architecture/chainery-events-2026-10-31.sql`. API 배포보다 먼저.
- [ ] **로컬 테스트 DB.** Docker Postgres + 두 마이그레이션. API·pipeline 통합 테스트는 `TEST_DATABASE_URL` 이 있을 때만 돌고 `content.*` 에 INSERT 한다. **공유 DB 주소를 절대 넣지 않는다.**
- [ ] **API 로컬 실행 (필요할 때).** `apps/api/.env` 는 사용자가 채운다. 공유 DB에 붙으면 부팅만으로 쓰기가 일어난다.
  - `SCHEDULER_ENABLED=false` 유지 (기사 수집 크론).
  - 플래그 없이 도는 것: `bench-key-cleanup.service.ts` (매시간 만료 키 정리 UPDATE), `source-submission.service.ts` 부팅 시 RUNNING→FAILED UPDATE.
  - `RESEND_API_KEY` 가 있으면 로그인 메일이 실제로 나간다.
- [ ] **웹 로컬 실행.** `pnpm --dir apps/web dev`. `NEXT_PUBLIC_API_URL` 이 없으면 `public/cryptopedia/live/*.json` 스냅샷을 읽는다 (빌드 시점에 결정, 실패 시 자동 전환 없음).

**테스트 명령.**
- 웹: `cd apps/web && npx tsx --test components/cherry/editorial/*.test.tsx components/cherry/editorial/*.test.ts lib/*.test.ts`
- API: `cd apps/api && npx jest chain_feed` (또는 해당 모듈)
- pipeline: `cd apps/pipeline && pnpm test`
- 타입: 각 앱에서 `npx tsc --noEmit`

---

## A. 행사 화면

현재 상태. `/events` 는 준비 중 페이지(`app/(chainery)/events/page.tsx:12`). 상단 메뉴 "행사/이벤트"가 여기를 가리킨다(`about-header.tsx:41`). 체인별 수집 행사는 `/knowledge/events` 에 실제로 있다(`EventsPage`, `events-page.tsx:137`). 모집 상태 필드는 스키마에만 있고 화면에서 안 쓴다.

### A1. 모집 상태 배지 컴포넌트
- **파일.** 새 `components/cherry/editorial/registration-badge.tsx` + `.test.tsx`
- **만들 것.** `registrationStatus` + `daysUntilDeadline` → "모집중" / "마감 임박 D-2" / "마감" / 표시 안 함(UNKNOWN). 색은 `data-color` 토큰(`globals.css:512`).
- **확인.**
  - [ ] 테스트: 네 상태 각각 문구, UNKNOWN 은 아무것도 안 그림.
  - [ ] `EventRow`(`events-page.tsx:34`)에 붙여 `/knowledge/events` 에서 눈으로 확인 (스냅샷에 값이 없으면 테스트 데이터로).

### A2. `/events` 목록 페이지 (Luma 구조 참고 · Chainery 디자인, `1-plan.md` §5-0)
- **파일.** `app/(chainery)/events/page.tsx`, 새 `components/cherry/editorial/platform-events-page.tsx` + 테스트
- **만들 것.**
  - 레이아웃: `AboutHeader` + 다크 루트(`platform-placeholder-page.tsx:9` 와 같은 틀).
  - 날짜별 묶음 목록(왼쪽 날짜·요일, 오른쪽 카드). 묶음은 `lib/event-timeline.ts:3` 재사용.
  - 카드: 시간 · 제목 · 주최 · 장소/온라인 · 모집 배지(A1) · 범위 태그(국내 Web3 / Avalanche).
  - 데이터: `getEvents` 를 `scope=all` 로. 스냅샷 모드에선 지금 avalanche 파일뿐이라 우선 그걸로 보이고, A5에서 all 스냅샷 추가.
  - 기본: 다가오는 행사 + 진행 중, 지난 행사는 아래 링크로.
- **확인.**
  - [ ] 테스트: 같은 날 행사 2건이 한 묶음, 날짜 오름차순, 모집 배지 표시.
  - [ ] 브라우저 `/events`: 준비 중 문구가 사라지고 목록이 보임. 모바일 폭(375px)에서 가로 스크롤 없음. 스크린샷.

### A3. 행사 상세 API `GET /api/events/:id`
- **파일.** `apps/api/src/modules/chain_feed/chain-feed.controller.ts`, `chain-feed.service.ts`, 테스트
- **만들 것.** `EventEntry` + 근거(`audience/level/fee` evidence) + 출처 목록(`chain_event_source`) + `lastCheckedAt`. PUBLISHED 만, 없으면 404. 계약은 `2-detail-design.md` §4-3.
- **확인.**
  - [ ] 서비스 테스트(로컬 Docker DB): 발행본 200, DRAFT·없는 id 404.
  - [ ] 로컬 API에서 `curl localhost:4000/api/events/<id>` 응답 확인.

### A4. `/events/[id]` 상세 페이지
- **주의.** 기존 `/knowledge/events/[id]` 는 실제 행사가 아니라 `articles.json` 을 읽는다(`cryptopedia-routes.ts:67`, `editorial-app.tsx:138`). 이걸 고치지 말고 새 경로로 만든다.
- **파일.** 새 `app/(chainery)/events/[id]/page.tsx`, 상세 컴포넌트, `lib/cryptopedia-data.ts` 에 `getEvent(id)`
- **만들 것.** 첫 화면에 언제·어디서·**공식 신청하기(외부 링크)**. 그 아래 소개, 대상·수준·참가비(근거 툴팁), 출처 목록, 마지막 확인 시각.
- **확인.**
  - [ ] 테스트: 신청 링크가 외부로, 근거 없는 필드는 안 보임.
  - [ ] 브라우저: 목록 카드 클릭 → 상세 → 신청 버튼이 공식 페이지로. 스크린샷.

### A5. 스냅샷에 `scope=all` 추가
- **파일.** `apps/web/scripts/snapshot-live-feed.mjs`, `lib/cryptopedia-live-snapshot.ts:8`
- **만들 것.** `events-all-<status>.json` 생성·읽기. API 없이 배포해도 `/events` 가 국내 Web3 행사까지 보이게.
- **확인.** [ ] 스냅샷 테스트, [ ] API 없는 빌드에서 `/events` 에 web3-kr 행사 표시.

### (P2) A6 필터 바 · 캘린더 보기 · 검색
`EventsPage` 의 `DiscoveryFilterPanel`·`EditorialCalendar` 재사용. 필터: 유형 · 지역 · 모집중만 · 대상 · 입문 가능 · 체인.

---

## B. 로그인·계정

현재 상태. API: `signup/signin(매직링크 메일)/login/google-login/refresh/logout/me` 가 있다(`app-user.controller.ts:42~107`). 계정 삭제·프로필 수정 엔드포인트는 없다. 웹: `/login` 에 Google 버튼과 매직링크 URL 처리만 있고 **이메일 입력 폼이 없다**. 옛 Cherry 디자인(`#C94B6E`). 헤더에 로그인 상태 표시가 없다(`about-header.tsx` 오른쪽 자리는 로그인용으로 비워 둠, ~:115).

### B1. 로그인 페이지 새 디자인 + 이메일 입력
- **파일.** `apps/web/app/login/page.tsx`, 새 이메일 폼 컴포넌트 + 테스트
- **만들 것.** Chainery 토큰(grape)으로 다시 그림. Google 버튼 + 이메일 입력 → `POST /api/app-user/signin` → "메일을 확인하세요". 재발송 60초 쿨다운. `?next=` 복귀 유지(`page.tsx:16`).
- **확인.**
  - [ ] 테스트: 잘못된 이메일 막음, 성공 시 안내 문구, 쿨다운 중 버튼 비활성.
  - [ ] 로컬 API + 테스트 메일 주소로 메일 수신 → 링크 클릭 → 로그인 상태. (Resend 도메인 검증은 사용자 작업)

### B2. 헤더 로그인 상태
- **파일.** `components/cherry/editorial/about-header.tsx`, `lib/auth.ts` (`useAuthTick` :172 활용)
- **만들 것.** 비로그인 "로그인", 로그인 시 아바타/이름 + 메뉴(내 계정 · 로그아웃). 데스크톱·모바일 시트 둘 다.
- **확인.** [ ] 테스트(토큰 있음/없음 렌더), [ ] 브라우저에서 로그인 → 헤더 변화 → 로그아웃. 콘텐츠는 비로그인으로도 그대로 보임.

### B3. `/account` + 계정 삭제
- **API.** 새 `DELETE /api/app-user/me` (`AuthGuard('jwt')`). `revoked_at = now()`, `is_active = false`, Redis 리프레시 키 삭제, 쿠키 제거. JWT 전략이 매 요청 `revoked_at` 을 확인하므로(`role-jwt.strategy.ts`) 즉시 차단된다. 이메일·벤치 키 평문을 응답·로그에 남기지 않는다. 벤치 키 컬럼은 함께 비운다.
- **웹.** `/account`: 이메일(일부 가림)·로그인 방식·가입일, 로그아웃, "계정 삭제"(확인 대화상자).
- **확인.**
  - [ ] API 테스트(로컬 DB): 삭제 후 `/me` 401, refresh 실패, 재가입 시 동작 정의대로.
  - [ ] 브라우저: 삭제 → 로그아웃 상태 → 같은 Google 계정 재로그인 시 결과 확인.
- **결정 필요.** 삭제 후 같은 이메일 재가입을 새 계정으로 볼지(소프트 삭제 행과 충돌 여부 확인).

### B4. 관심 행사 저장
- **DB.** 새 테이블 `content.user_saved_event(user_id, chain_event_id, created_at)` — 마이그레이션 추가, 사용자 적용.
- **API.** `GET/PUT/DELETE /api/me/saved-events[/:eventId]`.
- **웹.** 카드·상세의 저장 버튼(비로그인 시 로그인으로 보냄, `?next=` 로 복귀), `/account` 에 저장 목록.
- **확인.** [ ] API 테스트, [ ] 브라우저: 저장 → 새로고침 후 유지 → 해제.

---

## C. 수집·AI·검수

현재 상태. pipeline 의 AI 분류 결과가 `insertEvent`/`insertTech` 로 바로 들어가고 `review_state` 를 쓰지 않아 기본값 PUBLISHED 가 된다(`classification-repository.ts:140,170`). 끼울 자리는 `run-classify.ts` ~:108-118 (buildCategoryRecord 와 insert 사이).

### C1. KISA 공지사항 인증서 해결 → S2 마무리
- **만들 것.** 공개 중간 인증서 PEM 을 저장소에 두고 pipeline 실행 시 `NODE_EXTRA_CA_CERTS`. KISA `enabled: true`. (다운로드·신뢰 추가라 사용자 승인 후)
- **확인.** [ ] 실데이터로 수집 → classify → `chain_event` 에 블록체인 진흥주간 1건, 무관 공지 0건.

### C2. AI 행사 필드 확장
- **파일.** `apps/pipeline/src/classify/schema.ts:51`, `prompt.ts`, `category-records.ts:115`
- **만들 것.** `registration_deadline`, `audience/level/fee` (각 `{value, evidence}`), `related_chains`, category 확장(MEETUP·EDUCATION·CONTEST·SUPPORT_PROGRAM). `2-detail-design.md` §3-1.
- **확인.** [ ] 스키마 테스트, [ ] KISA 글 5건 `--dry-run` 결과 눈으로 확인.

### C3. 근거 검증
- **파일.** 새 `apps/pipeline/src/classify/evidence.ts` + 테스트, `run-classify.ts`
- **만들 것.** evidence 문자열이 원문 본문에 실제로 있는지(NFKC·공백 정규화 후 부분일치). 없으면 그 필드를 null 로 버리고 기록. DB CHECK(`ck_chev_evidence`)는 마지막 방어선.
- **확인.** [ ] 테스트: 원문에 있는 근거 통과, 지어낸 근거 버림, 전각·공백 차이 통과.

### C4. 초안으로 저장 (`review_state = DRAFT`)
- **파일.** `classification-repository.ts` `insertEvent`/`insertTech`, 마이그레이션 기본값 변경 SQL
- **만들 것.** 새 행사·소식은 DRAFT. **같이 고칠 것:** `listUpdates`(`chain-feed.service.ts:230`)·`listMacro`·`listGeneral` 에 PUBLISHED 필터 추가 (지금은 행사만 거른다).
- **확인.** [ ] 통합 테스트(로컬 DB): 분류 직후 공개 API 에 안 보임.

### C5. 검수 API `/api/admin/review`
- **파일.** 새 `apps/api/src/modules/review/` — `source_submission/admin-submission.controller.ts:33` 패턴 그대로 (경로별 `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(Role.ADMIN)`).
- **만들 것.** 목록 · 상세(원문 + 초안 + 근거) · 수정 · 발행(`reviewed_by = req.user.id`) · 반려. `2-detail-design.md` §4-4.
- **확인.** [ ] 테스트: 일반 사용자 403, 발행 후 공개 API 에 보임.

### C6. 검수 화면 `/admin/review`
- **웹.** 큐 목록 → 원문/초안 나란히 → 수정 · 발행 · 반려. 근거 문장을 원문에서 강조.
- **확인.** [ ] 브라우저(본인 계정 role=admin): 초안 1건 발행 → `/events` 에 나타남. 스크린샷.

### C7. 소스 추가와 주기
- KISA 블록체인 포털 연구 자료(`/bbso/bbsoRsrchList.do`, 필요 시), Luma 국내 캘린더, BUIDL Korea, KBIPA, ICT콤플렉스.
- `min_interval_hours` (소스별 최소 간격), Dokploy 스케줄 작업(6시간).
- **확인.** [ ] 소스마다 실데이터 dry-run, [ ] 두 번 돌려 중복 0.

---

## D. 소식 (프로토콜 변경 · 개발 릴리스 · 프로젝트 소식 · 문서 변경)

현재 상태. 개발 릴리스(avalanchego·coreth·subnet-evm Atom)와 ACP 는 이미 수집되어 `/knowledge/updates` 에 보인다(`listUpdates`, `chain-feed.service.ts:230`). 업계 소식은 `/macro`. 웹 스키마에 단계 필드가 없고 활성화(`activations` MAINNET/FUJI)만 있다(`cryptopedia-types.ts:52`). ACP 어댑터는 상태(Proposed·Implementable·Activated·Stale)를 읽지만 글 본문 텍스트로만 넘긴다(`acp-github-adapter.ts:6,59,93`). 요약은 `summary_ko` 한 덩어리다.

### D0. 소식 공통 요약 형식 (모든 소식)
- **화면 기준.** 목업 `docs/chainery-redesign/mockups/learning-ux-v2.html` §5 (ACP-267 상세).
- **만들 것.** 모든 소식(릴리스 · 프로토콜 · 프로젝트 소식 · 업계 동향)에 같은 형식:
  - 한 줄 설명 (기존 `summary`)
  - 무엇이 바뀌나요 `what_changed` = `[{ text, source }]` 2~4줄, 줄마다 근거 번호
  - 누구에게 해당하나요 `who_cares` = `[{ audience, impact(HIGH·LOW), reason }]` — 화면에 "체이너리 해석"
  - 근거 목록 (원문, 관련 릴리스 노트)
- **파일.** `apps/pipeline/src/classify/schema.ts` · `prompt.ts` · `category-records.ts`, `classification-repository.ts` `insertTech`. 근거 검증은 C3 재사용(줄마다 원문에 있는지).
- **확인.** [ ] zod·근거 테스트, [ ] 릴리스 · ACP · 블록체인 포털 동향 각 3건 `--dry-run` 을 사람이 읽고 판단.

### D1. 프로토콜 단계 판정 (코드가 판정, AI 아님)
- **만들 것.**
  - ACP 상태: Proposed→PROPOSED(제안), Implementable→ACCEPTED(확정), Activated→ACTIVATED(적용), Stale→STALE. `stage_evidence`·`stage_source_url`.
  - 날짜: `proposal_created_at`(처음 공개) · `proposal_updated_at`(마지막 수정).
  - 구현 기록: 릴리스 노트(avalanchego 등)에서 `ACP-<번호>` 언급을 찾아 `included_in_release`·`included_release_url`.
  - **확인 중**: 문서 상태와 구현 기록이 어긋나면(예: Proposed 인데 릴리스에 포함) API 가 "확인 중"으로 응답. 저장하지 않고 계산.
  - 네트워크별 적용(Fuji·Mainnet)은 기존 activations 유지. 이더리움 EIP(Draft·Review·Last Call·Final)·하드포크도 같은 단계에 대응(체인 추가 시).
- **확인.**
  - [x] 매핑·머리 줄·릴리스 선택 테스트, 분류 시 단계 저장 테스트 (pipeline 198 통과, 2026-11-09)
  - [x] 실제 ACP 3건(13 · 77 · 267) GitHub 실데이터로 단계·날짜·포함 릴리스 확인
  - [ ] 마이그레이션 적용 후 실제 DB 에 classify → `tech_update` 단계 컬럼 확인
  - [ ] 이미 저장된 ACP 행 보정(재수집 또는 보정 스크립트)
  - "확인 중" 계산은 API 쪽이라 D2 에서 (문서 상태와 포함 릴리스가 어긋날 때)

### D2. 소식 상세 화면 (목업 §5) + 목록 배지
- **만들 것.**
  - API: `listUpdates` 응답에 `lifecycleStage`·`stageNeedsCheck`·`whatChanged`·`whoCares`·`proposalCreatedAt/UpdatedAt`·`includedInRelease`. 상세 `GET /api/ecosystem/updates/:id`.
  - 웹: 상세를 **주소로 열 수 있게** (지금 `/updates/<id>` 는 "Unknown article" — 목록에서 눌러야만 열림). 섹션 순서는 목업대로. 웹 스키마는 기본값으로 구 스냅샷 호환.
  - 목록: "ACP 제안" 고정 라벨 대신 실제 단계 배지(제안 · 확정 · 적용 · 중단 · 확인 중).
- **확인.** [ ] 계약·컴포넌트 테스트, [ ] 브라우저에서 ACP-267 상세가 목업과 같은 구성, 목록에서 단계가 한눈에 구분됨. 스크린샷.
- **나중(A 담당과 합의).** "먼저 읽으면 좋아요" — 소식 ↔ 학습 개념 페이지 연결.

### D3. 검수 대상에 소식 포함
- C4·C5·C6 이 행사와 소식을 같이 다루는지 확인(검수 큐 `kind=update`). 소식 API 에 PUBLISHED 필터.
- **확인.** [ ] 소식 초안이 공개 API 에 안 보이고, 발행 후 보임.

### D4. 생태계 프로젝트 소식
- **먼저 정할 것 (D 담당과).** 프로젝트 목록·히트맵은 D, 프로젝트 소식은 B. 어떤 출처(프로젝트 공식 블로그·X·GitHub 릴리스)를 어느 프로젝트까지 모을지, 프로젝트 id 를 어떻게 공유할지.
- **만들 것.** 합의된 출처를 `sources.yaml` 에 추가(기존 ATOM·APIFY·HTML_BOARD 재사용), 소식에 프로젝트 id 연결, 프로젝트 화면에서 해당 소식 보기.
- **확인.** [ ] 프로젝트 2곳 실데이터 수집, [ ] 프로젝트 화면에 소식 표시.

### D5. 공식 문서 변경 소식 (P2)
- D 가 가져온 공식 문서의 버전(수정일·커밋 SHA)을 비교 → 바뀐 부분 요약 초안 → 검수. D 의 저장 형식 확정 후.

---

## 나중 (P2)

- 변경 감지: `content_hash` · `chain_event_revision` · 바뀐 발행본은 NEEDS_REVIEW 로 (`2-detail-design.md` §5-4).
- 마감 알림 메일 (관심 저장 B4 이후).

## 위험

| 위험 | 어디서 | 지킬 것 |
|---|---|---|
| 공유 DB 오염 | 0, C 전부 | 통합 테스트는 로컬 Docker DB 만. 로컬 pipeline 실행은 프로덕션에 쓴다 |
| 마이그레이션 전 API 배포 | A3, C4 | `/api/events` 가 `review_state` 를 읽어 실패. 항상 DB 먼저 |
| 초안 기본값 전환 시 소식이 그대로 공개 | C4 | updates·macro·general 에도 PUBLISHED 필터 |
| 회원 정보 노출 | B 전부 | 이메일·키·지갑을 응답·로그·GA 에 평문으로 남기지 않음 |
| 옛 상세 경로 혼동 | A4 | `/knowledge/events/[id]` 는 기사 JSON. 새 상세는 `/events/[id]` |
