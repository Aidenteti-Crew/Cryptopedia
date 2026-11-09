# 소식·행사 + 사용자 인증 — 구체 작업 계획

> 작성: 2026-10-31 · 담당: hansu · 브랜치: `hansu-event-auth`
> 기준 코드: `hansu-설계` 브랜치(로컬 전용, main보다 167커밋 앞섬). **main에는 아래 "이미 있는 것"이 없다.**
> 원칙: 공식 출처 우선 · AI는 원문에 없는 값을 만들지 않는다 · 로그인 없이 열람 가능.

---

## 범위 — 서비스 설계서(1차 초안) 기준 B 담당

| 섹션 | 담당 | 내용 |
|---|---|---|
| A. 교육 | 나중에 | — |
| **B. 소식·행사 (나)** | hansu | **체인별 기술 업데이트**(체인마다 릴리스·ACP/EIP·네트워크 업그레이드 출처 수집까지 B, 제안/확정/적용) · **업계 소식**(생태계 프로젝트·협업·시장) · **행사**(해커톤·밋업·컨퍼런스·교육) · **공식 문서 변경 소식**(D가 가져온 문서가 바뀌면 변경 요약) · 요약·검수·발행 틀 · 로그인 |
| C. 채용 | 다른 담당 | — |
| D. 체인 허브 | 다른 담당 | 체인별(Avalanche·Ethereum…) **공식 문서** 수집·재구성, 기술 구조, 생태계 허브 화면 |

**B ↔ D 연결점 (D 담당자와 맞출 것)**
1. **문서 변경:** D가 공식 문서를 저장할 때 버전·수정일(또는 커밋 SHA)을 남기면, B가 이전 버전과 비교해 "무엇이 달라졌나" 소식을 만든다. → 문서 저장 형식·버전 키 합의 필요.
2. **체인 허브의 소식·행사 위젯:** D 허브는 B API를 `scope=<체인>`으로 불러 보여준다 (S1에서 `scope` 추가함).
3. **체인 태그:** B의 `chain`/`related_chains` 값과 D의 체인 키를 같은 문자열로 (`avalanche`, `ethereum`).
4. **생태계 프로젝트:** 프로젝트 목록·히트맵은 D, 프로젝트 관련 뉴스는 B.

---

## 0. 출발점 — 이미 있는 것 / 없는 것

| 영역 | 이미 있음 (`hansu-설계`) | 없음 → 이번에 만들 것 |
|---|---|---|
| 행사 DB | `content.chain_event` + `chain_event_source`(한 행사·여러 출처) · `event_key` 안정 키 · `status_override`(취소/연기) · `confidence` | 모집 상태·마감일·참가 대상·참여 수준·참가비·행사 유형 컬럼 · **검수 상태** · 변경 이력 · `chain NOT NULL` 완화(KISA 행사는 체인 무관) |
| 행사 수집 | Luma 캘린더 어댑터(`apps/pipeline/src/adapters/luma-calendar-adapter.ts`) · ICS 파서 · 중복 판별(`events/dedup.ts`: 시작시각 ±2h + 제목 유사도) · sanitize | KISA·KBIPA·ICT콤플렉스·BUIDL Korea 어댑터 · 사이트별 robots/약관 확인 · 관련성 필터 · 출처 간 병합(공공 공지 ↔ 이벤터스 신청 페이지) |
| 행사 API | `GET /api/events` + zod 계약(`chain_feed/event-contract.ts`) · 상태를 응답 시점에 계산 | 새 필드 계약 · 필터(유형/지역/온오프/모집중/대상) · `published` 만 노출 · 상세 `GET /api/events/:id` |
| 행사 화면 | `/knowledge/events` · `/knowledge/events/archive` · `/knowledge/events/[id]` (체인별 수집 행사, 2026-11 deploy에서 이동) · `/events` 자리 표시 페이지 · `editorial-calendar` · `synced-event-timeline` | `/events` 채우기: Luma **구조 참고**·Chainery 디자인의 목록 카드 · 상세 페이지 · 필터 바 · 상단 메뉴 "행사" 정리 (§5) |
| 소식(업데이트) | `/updates` · `official-releases.ts`(GitHub 릴리스) · `update-evidence.ts`(Fuji/Mainnet 활성화 근거) | **제안/확정/적용** 단계 표기 · 3문항 요약 포맷 · 검수→발행 |
| 인증 | 이메일 매직링크(`signin`/`login`) · Google 로그인(`google-login`, google_sub→email 백필) · refresh(Redis+쿠키) · logout · me | 로그인 화면에 이메일 입력 복구 · 계정 설정 화면 · **계정 삭제** · 로그인으로 쓸 사용자 기능(관심 행사 저장) |
| 운영자 | crawler_registry PR 검수 흐름(크롤러 코드용) | **콘텐츠 검수 큐**(초안 승인/반려/수정) |

---

## 1. 결정해야 할 것 (작업 전)

| # | 결정 | 권장안 | 이유 |
|---|---|---|---|
| D1 | 작업 기준 브랜치 | `hansu-event-auth`를 **`hansu-설계` 위로 다시 만든다** (지금은 main 기반, 커밋 0개라 비용 없음) | 행사·인증 기반 코드가 전부 `hansu-설계`에만 있음 |
| D2 | 이메일 로그인 방식 | **매직링크 유지**(비밀번호 없음) | 이미 구현됨 · 링크 클릭 = 이메일 인증 · 비밀번호 저장/재설정 부담 없음. 단 Resend 도메인 검증이 선결 |
| D3 | 행사 범위 | Avalanche 전용 → **Web3 전반 + 체인 태그** | KISA·KBIPA 행사는 특정 체인이 아님. `chain` 은 nullable, `chains TEXT[]` 태그로 |
| D4 | 운영자 검수 UI 위치 | `/admin/review` (role=admin 만) — 웹 안에 최소 화면 | Notion 등 외부 도구보다 원문↔초안 대조가 쉬움 |
| D5 | 로그인이 필요한 첫 기능 | **관심 행사 저장 + 마감 D-3 메일** | "로그인할 이유"가 있어야 가입이 생김. 열람은 계속 무로그인 |

---

## 2. 데이터 모델 변경 (P0)

> ⚠️ 로컬·프로덕션이 같은 DB. 마이그레이션은 **추가 전용(ADD COLUMN IF NOT EXISTS)**, 파일만 작성하고 적용은 사용자가 한다.

### 2-1. `content.chain_event` 추가 컬럼

> ⚠️ [`2-detail-design.md`](./2-detail-design.md) §6에서 일부 변경됨: `event_type` → 기존 `category` 확장, `chains`/`DROP NOT NULL` → `chain`=범위 유지 + `related_chains`.

| 컬럼 | 타입 | 값 | 규칙 |
|---|---|---|---|
| `event_type` | VARCHAR(30) | HACKATHON · MEETUP · CONFERENCE · EDUCATION · CONTEST · SUPPORT_PROGRAM · OTHER | `category`와 별도(카테고리는 기존 유지) |
| `registration_deadline` | TIMESTAMPTZ NULL | 접수 마감 | 원문에 없으면 NULL |
| `registration_status_override` | VARCHAR(20) NULL | CLOSED_EARLY(조기마감) | OPEN/CLOSING_SOON/CLOSED는 응답 시 계산 |
| `audience` | TEXT[] | STUDENT · DEVELOPER · STARTUP · ANYONE · RESEARCHER | **원문 근거 있을 때만** |
| `level` | VARCHAR(20) NULL | BEGINNER_OK · EXPERIENCE_RECOMMENDED · ADVANCED | **원문 근거 있을 때만**, 없으면 NULL ("정보 없음" 표시) |
| `level_evidence` / `audience_evidence` | TEXT NULL | 원문 인용 한 줄 | 값이 있으면 근거 필수 (DB CHECK) |
| `fee` | VARCHAR(20) NULL | FREE · PAID · UNKNOWN | |
| `chains` | TEXT[] | ['avalanche'], ['ethereum','avalanche'], [] | 기존 `chain` NOT NULL 은 `DROP NOT NULL` |
| `review_state` | VARCHAR(20) NOT NULL DEFAULT 'DRAFT' | DRAFT · NEEDS_REVIEW · PUBLISHED · REJECTED | API는 PUBLISHED만. **기존 행은 같은 마이그레이션에서 PUBLISHED로 백필** (안 하면 지금 보이는 행사가 전부 사라짐) |
| `reviewed_by` / `reviewed_at` | UUID / TIMESTAMPTZ | 검수자 | |
| `content_hash` | CHAR(64) | 사용자에게 보이는 필드들의 해시 | 변경 감지용 |

### 2-2. 신규 `content.chain_event_revision`
발행본이 바뀔 때마다 이전 값을 남긴다: `(chain_event_id, revision_no, snapshot JSONB, changed_fields TEXT[], detected_at, source_url, reviewed_at)`.
→ "출처와 변경 이력 관리" 완료 기준을 충족.

### 2-3. 소식(`content.tech_update`) 추가 컬럼
| 컬럼 | 값 |
|---|---|
| `lifecycle_stage` | PROPOSED(제안) · ACCEPTED(확정) · ACTIVATED(적용) |
| `stage_evidence` | 단계 판단 근거 인용 + URL (ACP 상태, 릴리스 노트, 활성화 블록/시각) |
| `what_changed` / `who_cares` | AI 요약 3문항 중 2개 (출처는 `source_url`) |
| `review_state`, `content_hash` | 행사와 동일 |

단계 판정 규칙(Avalanche 예):
- **제안**: ACP가 Proposed/Draft · 포럼 제안만 있음
- **확정**: ACP Accepted / 릴리스에 포함됐으나 활성화 전
- **적용**: Fuji 또는 Mainnet 활성화 시각 도달 (`update-evidence.ts` activations 재사용, 네트워크별 따로 표기: "Fuji 적용 · Mainnet 예정 11/20")

---

## 3. 수집 (P0: KISA → P1: 나머지 4곳)

### 3-1. 공통 파이프라인
```
fetch(어댑터) → 추출(제목·본문·게시일·URL) → 관련성 필터 → 행사 필드 추출(LLM, 원문 근거 필수)
 → 중복/병합(event_key, dedup.ts) → content_hash 비교 → DRAFT 또는 NEEDS_REVIEW → 검수 큐
```

### 3-2. 소스별 계획

| 순서 | 소스 | 방식 | 관련성 필터 | 주기 | 비고 |
|---|---|---|---|---|---|
| 1 | **KISA** 공지/행사 | 게시판 목록 HTML → 상세 | 제목·본문 키워드: 블록체인, Web3, 분산원장, 진흥주간, NFT, 토큰, 디지털자산 | 1일 | robots/이용약관 확인 먼저 · 첨부(HWP/PDF)는 링크만 · ⚠️ TLS 인증서 체인 문제로 보류(2-detail §7-2) |
| 1-1 | **KISA 블록체인 포털 최신동향** (`blockchain.kisa.or.kr/bbso/bbsoAnalsList.do`) — **소식(업계 동향)**, 행사 아님 | 같은 `HTML_BOARD` (링크가 `fn_goView('ID')` → 상세 GET URL로 변환) | 키워드 필터(일반 ICT 글 소수 제외) | 1일 | 2026-11-09 사용자 요청 추가 · 주 5건 내외 · 본문은 2~3줄 요약, 자세한 내용은 첨부 |
| 2 | **Luma** | 기존 어댑터 확장: Web3 KR 캘린더 목록(ICS) 추가 | 캘린더 단위로 이미 선별 | 6시간 | 공개 ICS만 사용 |
| 3 | **BUIDL Korea** | `/events` 페이지 | 전부 관련 | 1일(시즌) | 연례 — 시즌 외 주 1회 |
| 4 | **KBIPA** | 공지/행사 게시판 | 대부분 관련, 회원사 홍보 글 제외 | 1일 | |
| 5 | **ICT콤플렉스** | 행사/교육 목록 | 키워드 필터 필수(일반 ICT 다수) | 1일 | |
| 보조 | NIPA · 이벤터스 · KBW · Hackathon Korea · HACK:ON | **신규 행사 발견용 + 병합 대상** | | 주 1회 | 모음 사이트 값은 주최 원문에서 재확인 전엔 PUBLISHED 금지 |

- 어댑터 위치: `apps/pipeline/src/adapters/<source>-adapter.ts` (Luma 어댑터와 같은 인터페이스 → `ChainEventInput`).
- 가능하면 RSS/API 우선. 없으면 정적 HTML(crawl4ai), 막히면 browser-use fallback(이미 있음).
- 요청 간격 ≥ 2초, User-Agent 명시, 실패 3회 → registry `deprecated` (기존 로직 재사용).

### 3-3. 중복·병합 규칙 (블록체인 진흥주간 사례)
1. 같은 `event_key` → 같은 행사.
2. 시작일 같은 날 + 제목 유사(`titlesMatch`) → 같은 행사. 공공 공지는 시간이 없어서 **±2h 창 대신 "같은 날짜(현지)"** 규칙 추가.
3. 대표 출처 우선순위: 주최 공식 페이지 > 공공기관 공지 > 행사 플랫폼 > 모음 사이트.
4. 신청 링크(이벤터스 등)는 `registration_url` 로, 나머지는 `chain_event_source` 로.
5. 병합 시 더 구체적인 값(시간 있음 > 날짜만)을 채택, 충돌하면 NEEDS_REVIEW.

### 3-4. 변경 감지 (P2)
- 사용자에게 보이는 필드(일정·장소·마감·신청링크·상태) 해시 비교.
- PUBLISHED 행사의 해시가 바뀌면: 이전 값 → `chain_event_revision`, `review_state = NEEDS_REVIEW`, **화면엔 마지막 발행본 유지** + 운영자 큐에 diff 표시.
- 취소/연기 키워드 감지 시 우선순위 높게.

---

## 4. AI 초안 · 검수 · 발행 (P1)

### 4-1. AI 출력 포맷 (소식)
```
무엇이 달라졌나: (1~2문장)
누구에게 중요한가: (노드 운영자 / dApp 개발자 / 일반 사용자 …)
단계: 제안 | 확정 | 적용(Fuji/Mainnet 각각)
출처: 공식 URL 1개 이상
```
### 4-2. AI 출력 포맷 (행사)
- 한국어 소개 2~3문장 + 위 2-1 필드.
- **금지**: 원문에 없는 참여 수준·대상·참가비 추정. 모르면 null.
- 각 필드에 근거 인용(`*_evidence`)을 함께 반환 → 검수 화면에 원문 하이라이트.
- 날짜 확정 불가 → 행사로 저장하지 않고 "날짜 미정 후보"로 분리(기존 규칙 유지).

### 4-3. 검수 화면 `/admin/review` (role=admin)
- 탭: 신규 초안 / 변경 감지 / 반려됨
- 좌: 원문(출처 링크·스크린샷) · 우: 초안 필드 편집
- 버튼: 발행 · 수정 후 발행 · 반려(사유) · 다른 행사와 병합
- API: `GET /api/admin/review?type=event|update&state=...`, `POST /api/admin/review/:id/{publish|reject|merge}`

---

## 5. 행사 UI (P1 목록·상세 → P2 캘린더·필터)

### 5-0. 디자인 방향 — Luma는 구조만 참고 (2026-11-09 결정)
Luma를 **똑같이 만들지 않는다.** 빠르게 훑어보기 좋은 정보 구조만 가져오고, 생김새는 Chainery 디자인 시스템(2026-11 deploy의 밝은 테마 · grape 메인 · green 보조)을 따른다.

| 구분 | 내용 |
|---|---|
| **가져올 것 (구조)** | 날짜별 묶음 목록(왼쪽 날짜·요일, 오른쪽 카드) · 카드에 핵심만(시간·제목·주최·장소/온라인·썸네일) · 상단 간단한 필터와 목록/캘린더 전환 · 상세는 "언제·어디서·신청" 이 첫 화면에 |
| **안 가져올 것** | Luma의 색·폰트·레이아웃 그대로 따라 하기 · 참가 신청·티켓·참석자 목록 기능 (신청은 공식 페이지로 연결만) |
| **우리만의 것** | 모집 상태 배지(모집중 / 마감 임박 D-n / 마감) · 대상·수준·참가비(원문 근거가 있을 때만, 근거 툴팁) · 출처 표시와 여러 출처 합치기 · 관련 체인 태그 · 범위 구분(국내 Web3 / Avalanche) |

**경로 (2026-11 deploy 반영):** `/events` = 모든 체인 행사 + Chainery가 직접 여는 행사(지금은 자리 표시 페이지 → S4에서 채움). 체인별 수집 행사는 `/knowledge/events`(목록·archive·상세 이미 있음). 아래 표의 경로는 이 기준.

| 화면 | 경로 | 내용 |
|---|---|---|
| 목록 | `/events` | 카드: 대표이미지·유형 배지·제목·일정·장소/온라인·**모집 상태 배지(모집중/마감임박 D-n/마감)**·주최. 기본 정렬: 모집중 → 시작일 오름차순 |
| 상세 | `/events/[id]` (기존 `/knowledge/events/[id]` 화면 재사용 검토) | 행사명·이미지·주최·일정(현지시간+내 시간)·장소(지도 링크)·온/오프·소개·대상·참여수준(근거 툴팁)·참가비·마감·**공식 신청 버튼(외부)**·출처 목록·최종 확인 시각 |
| 캘린더 | `/events?view=calendar` | 기존 `editorial-calendar` 재사용 |
| 필터 | 목록 상단 | 유형 · 지역(서울/경기/부산/온라인) · 모집중만 · 대상 · 입문 가능 · 체인 |
| 지난 행사 | `/events/archive` | 기존 `/knowledge/events/archive` 재사용 검토 |
| 메뉴 | `(chainery)/layout.tsx` | 상단 "행사"·"소식" 노출, 모바일 하단 탭 포함 |

"내가 실제로 참여할 수 있는 행사" 원칙: 기본 필터 = **모집중 + 앞으로 30일**, 마감 지난 행사는 아래로.

---

## 6. 인증 (P1)

| 항목 | 할 일 | 파일 |
|---|---|---|
| 로그인 화면 | `/login` 에 Google 버튼 + **이메일 입력(매직링크)** 둘 다. 현재는 Google만 | `apps/web/app/login/page.tsx` |
| 이메일 인증 | 매직링크 = 인증. 토큰 만료 15분·1회용 확인, 재발송 쿨다운 60초 | `app-user-auth.service.ts` `signin/login` |
| 메일 발송 | Resend 도메인 검증(SPF/DKIM) — **선결 과제** | env, DNS (사용자 작업) |
| 세션 | access(메모리) + refresh(httpOnly 쿠키·Redis) 기존 유지. 새로고침 시 silent refresh 동작 확인 | `lib/auth.ts` |
| 로그아웃 | 기존 `POST /logout` + 전 기기 로그아웃(Redis 해당 유저 refresh 전부 삭제) | |
| 동일 이메일 정책 | Google `email_verified=true` 일 때만 기존 이메일 계정에 연결(현재 구현). 반대로 Google 가입자가 매직링크 요청 → 같은 계정 로그인. **계정 1개 = 이메일 1개** | 기존 `findOrCreateGoogleUser` |
| 계정 관리 | `/account`: 이메일·이름·아바타·연결된 로그인 수단 표시, 이름 수정 | `GET/PATCH /app-user/me` |
| 계정 삭제 | `DELETE /app-user/me`: 즉시 `is_active=false` + refresh 전부 폐기 + bench key 삭제(`purgeBenchKey` 재사용) → 30일 후 이메일/이름/google_sub 익명화 배치. 재가입 시 새 계정 | 신규 |
| 로그인 필요 기능 | 행사 "관심 저장"(♡) · `/account/saved` · 마감 D-3 메일(P2) | 신규 `core.user_saved_event` |
| 보안 | 이메일/토큰 로그 금지, 응답에 google_sub 미노출, 레이트리밋(signin 5회/10분/IP) | |

---

## 7. 작업 순서 (스프린트 단위)

| 단계 | 작업 | 완료 확인 |
|---|---|---|
| **S0** | D1~D5 결정 · 브랜치 재생성 · 소스 5곳 robots/약관 확인표 | 결정표 채움 |
| **S1 (P0)** | 마이그레이션 SQL 작성(2-1~2-3) · `ChainEventInput`/zod 계약 확장 · 상태 계산(모집 상태) 단위테스트 | 사용자 DB 적용 후 기존 `/events` 깨지지 않음 |
| **S2 (P0)** | KISA 어댑터 + 관련성 필터 + 같은 날짜 병합 규칙 | KISA 실데이터로 블록체인 진흥주간 1건, 무관 공지 0건 |
| **S3 (P1)** | AI 행사 필드 추출(근거 필수) · DRAFT 저장 · `/admin/review` 최소판 · API는 PUBLISHED만 | 초안 → 발행 → `/events`에 노출 |
| **S4 (P1)** | 행사 목록 카드 리뉴얼 · 상세 페이지 · 메뉴 | 일정·장소·신청 링크 확인 가능 |
| **S5 (P1)** | 로그인 화면(Google+이메일) · `/account` · 계정 삭제 · 관심 저장 | 두 방식 로그인/로그아웃/삭제 E2E |
| **S6 (P1)** | Luma 캘린더 추가 · BUIDL Korea · KBIPA · ICT콤플렉스 어댑터 | 5곳 정기 수집, 중복 0 |
| **S7 (P1)** | 소식 3문항 요약 + 제안/확정/적용 단계 + 검수 | `/updates`에 단계 배지 |
| **S8 (P2)** | 필터 바 · 캘린더 뷰 연결 · 검색 | |
| **S9 (P2)** | 변경 감지 · revision · 재검수 큐 · 마감 알림 메일 | 일정 바뀐 행사가 큐에 diff로 뜸 |
| **S10 (P2)** | 공식 문서 변경 소식 — D의 문서 버전 비교 → 변경 요약 초안 → 검수 | D 문서 1건 수정 시 소식 초안 생성 (D 저장 형식 확정 후) |

---

## 8. 완료 기준 ↔ 검증 방법

| 완료 기준 | 검증 |
|---|---|
| 정해진 주기로 수집 | registry `last_run_at` 대시보드/로그, 소스별 성공률 |
| 중복·무관 정보 구분 | KISA·NIPA·이벤터스에 동시에 뜬 진흥주간이 1건 + 출처 3개 · 필터 탈락 로그 샘플 검토 |
| AI 초안 검수·발행 | `/admin/review`에서 발행/반려 · 미발행 초안은 공개 API에 없음 |
| 일정·장소·신청 링크 확인 | 상세 페이지 E2E |
| Google·이메일 로그인 | 로컬 + 스테이징 E2E (가입·로그인·새로고침 유지·로그아웃·삭제) |
| 출처·변경 이력 | `chain_event_source` + `chain_event_revision` 조회 |

## 9. 리스크

- **공유 DB**: 마이그레이션은 추가 전용, 적용은 사용자. `chain` NOT NULL 해제가 유일한 제약 완화.
- **Resend 도메인 미검증** 시 이메일 로그인 불가 → Google만 먼저 출시 가능하게 플래그.
- **사이트 구조 변경**으로 어댑터 깨짐 → 기존 실패 카운트·fallback 재사용.
- **AI 과추론**(입문 가능 등) → 근거 없는 값은 DB CHECK로 막고 검수에서 재확인.
- `hansu-설계`가 원격에 없음 → 로컬 유실 위험. 푸시 여부 결정 필요.
