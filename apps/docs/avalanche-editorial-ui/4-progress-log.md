# Avalanche Editorial UI 진행 로그

## 2026-10-08 — 1차 정적 데이터 구현

### 구현 범위

- `/`를 Avalanche Cryptopedia 진입점으로 교체
- Figma Ecosystem을 `/` 첫 화면으로 구현
- Chains 선택 화면과 Avalanche·Injective·Midnight 상태 구현
- Figma 1440·834·390 공통 responsive shell
- Projects, Macro, Events, Updates
- Fundamentals, Builders, Academy
- Article reader, Event archive, Book detail
- 타입이 지정된 정적 JSON repository
- 이벤트 실데이터 전환용 `EventFeedResponse`

### 데이터

```text
collections.json  Fundamentals·Builders·Academy 각 4개
projects.json     Chain 3개 + Project 2개
macro.json        Figma 예시 2개
events.json       Figma 예시 4개
updates.json      Figma 예시 2개
articles.json     목록·상세·관련 링크 데이터
books.json        Avalanche·Beam·Dexalot·All blue·Pengolin
```

### 테스트

실행 명령:

```bash
cd apps/web
pnpm exec tsx --test lib/cryptopedia-*.test.ts components/cherry/editorial/*.test.ts components/cherry/editorial/*.test.tsx
```

결과: 전체 테스트 46개 통과, 실패 0개.

### 페이지 전환 모션

- 헤더와 목차는 고정하고 읽기 콘텐츠만 전환하도록 구성했다.
- 첫 진입은 애니메이션을 생략하고, 이후 이동은 180ms 진입·120ms 퇴장으로 처리했다.
- `prefers-reduced-motion`에서는 이동과 지속 시간을 제거한다.
- 목록 → 책 → 문서 상세와 빠른 연속 메뉴 이동을 실제 브라우저에서 확인했다.
- 앱은 기존 요구대로 `/` 내부 상태 전환을 유지한다. 외부 원문·등록 URL은 목데이터에서 아직 `null` 또는 등록 예정 상태다.

`npx tsc --noEmit` 결과는 기존부터 기록된 오류 8개만 재현됐다.

```text
kaas-admin-page.tsx                 1개
kaas-dashboard-page.tsx            7개
Avalanche Editorial UI 신규 오류   0개
```

`pnpm build` 결과: Next.js production build 성공, 정적 route 10개 생성.

기존 `next.config.mjs`의 더 이상 지원되지 않는 `eslint` 옵션 경고와 Node `module.register()` deprecation 경고는 이번 범위에서 수정하지 않았다.

### 브라우저 실동작

확인한 흐름:

- `/` 첫 진입 → Ecosystem
- `Avalanche ↗` → Chains → Avalanche 열기 → Ecosystem
- Projects → Avalanche book → Projects
- Fundamentals → Chain overview → Fundamentals
- Macro 목록
- Events → Event archive
- Updates 목록
- Builders 4개 항목
- Academy 4개 항목
- 독립 route 5개 HTTP 200

증빙:

```text
/private/tmp/cryptopedia-1440.png
/private/tmp/cryptopedia-events-1440.png
/private/tmp/cryptopedia-events-834.png
/private/tmp/cryptopedia-events-390.png
/private/tmp/cryptopedia-fundamentals-390.png
```

### 변경하지 않은 범위

- `apps/api`
- SQL·DB·마이그레이션
- 기존 Cherry API와 인증
- `cherrypickersGuild/cherry-in-the-haystack` tracked files
- 커밋·푸시·배포

### 후속 연동

- 현재 데이터 공급자: `createStaticCryptopediaRepository`
- 후속 데이터 공급자: API 응답을 같은 타입으로 반환하는 구현
- 이벤트 API 요청 계약: `event-crawler-data-request.md`
- 자동 API fallback은 사용하지 않는다. 데이터 공급자는 명시적으로 전환한다.

## 2026-10-10 — Collection 네비게이션과 드롭다운

- 사용자 요청: 데스크탑 Collection을 네비게이션에 배치하고, 체인 선택 페이지 이동을 드롭다운 선택으로 교체. Injective·Midnight은 비활성화.
- `editorial-shell.tsx`: 데스크탑 사이드바 로고 아래에 선택창 배치, 기존 데스크탑 상단 바 제거. 모바일 상단 위치 유지.
- `editorial-brand.tsx`: `chains.json`을 사용하는 기본 HTML select로 교체. `AVAILABLE` 항목만 선택 가능하며 준비 중인 항목은 `Coming soon` 표시와 disabled 적용. 현재 체인 로고 유지.
- `editorial-app.tsx`: 선택 가능한 체인의 상태 갱신과 Ecosystem 이동을 연결. 목록 열기 자체는 페이지를 이동시키지 않음.
- 검증: `editorial-shell.test.tsx`와 `collection-navigation-pages.test.tsx` 총 8개 통과. `git diff --check` 통과.
- 타입 검사: 수정 파일 오류 없음. 기존 `kaas-admin-page.tsx`·`kaas-dashboard-page.tsx` 오류 8개로 전체 검사는 실패.
- 브라우저 검증: 로컬 3000 서버가 실행 중이지 않아 미실시.

### Collection 커스텀 드롭다운 후속 수정

- 기본 HTML select와 바깥 label을 기존 Radix Select로 교체. Collection 문구·로고·이름 전체를 하나의 버튼에 넣어 어디를 눌러도 목록이 열리도록 수정.
- 버튼 테두리는 하나만 표시하고, 포털로 열리는 목록에도 editorial 색상·폰트·강조 상태 적용. 포털의 `.editorial-root` 최소 높이는 0으로 재설정해 목록이 화면 전체 높이로 늘어나는 문제 방지.
- Injective·Midnight 비활성화 유지. 관련 렌더링 테스트 8개 통과.

### 모바일 상단바 높이와 본문 여백

- 모바일 상단바 높이 56px → 64px.
- 모든 본문 화면과 loading·empty·error 상태의 모바일 좌우 여백 24px → 16px로 변경해 상단 네비게이션과 정렬. 기존 `sm` 이상 본문 여백과 세로 여백 유지.
- 관련 화면 테스트 8개와 `git diff --check` 통과. 브라우저 실화면 확인은 미실시.

## 2026-10-10 — 확정 목차와 체인 지식·스킬 데모

- 합의한 목차 반영: 생태계 홈, 체인·프로젝트, 개발 업데이트, 체인 기초, 공식 문서·코드·도구·아티클·MCP·스킬 라이브러리, 입문·구조 이해·케이스별 실습·학습·스킬 그래프. 결제·마켓·Arena는 제외.
- 정적 `hub.json`: 프로젝트·도구 5, 자료 7, 개념 8, 케이스 3, 스킬 5, 개발 변경 시나리오 3. 출처 주체와 적용 범위를 독립적으로 저장하고 ID 연결의 무결성을 검사.
- 기존 LandscapeGrid의 그리드·선택 상태, ConceptRoadmap의 자동 배치·텍스트 맞춤, Workshop InventoryCard의 카드·출처 확인, Patch Notes 타임라인 항목을 재사용. 에디토리얼 표시는 선택적 확장이며 기존 기본값은 보존.
- 케이스별 학습과 에이전트 묶음 선택, 개별 스킬 미리보기·다운로드, 브라우저 학습 체크 상태 저장, 연결된 자료 이동과 실제 이전 화면으로 돌아가기 구현.
- 검증: 관련 테스트 60개 통과. `tsc --noEmit --incremental false`는 기존 KaaS 타입 오류 8개만 발생. `git diff --check` 통과.
- Chrome 브라우저: 1440/834/390에서 탐색·상세·그래프·필터·체크 상태 저장·다운로드 3회·키보드 탭 이동·가로 넘침 없음·콘솔 pageerror 0. `/start`, `/start/workshop`, `/start/login`, `/login` HTTP 200.
- 증빙: `/private/tmp/cryptopedia-hub-browser-result.json`, `/private/tmp/cryptopedia-hub-home-1440.png`, `/private/tmp/cryptopedia-hub-bundle-1440.png`, `/private/tmp/cryptopedia-hub-skills-390.png`, `/private/tmp/cryptopedia-case-bundle.md`.
- 구현 계획·검수 정본: `7-ecosystem-learning-skills-plan.md`. 전체 작업 상태는 루트 `CRYPTOPEDIA-WORKPLAN.md` §6에 기록.
- 제한: 최신 소식 수집·자동 영향 분석·원격 에이전트 설치는 후속. 현재는 실제 공식 출처를 연결한 정적 데모와 수동 작성 영향 관계다. 이번 작업에서는 API·DB·커밋·배포를 수행하지 않았다.

## 2026-10-10 — 전체 페이지 breadcrumb 통일

- 사용자 요청에 따라 상세의 목록으로 돌아가기 버튼과 목록의 클릭 불가능한 경로 문구를 제거하고 공통 셸에 breadcrumb를 한 번만 표시.
- 홈 → 상위 메뉴 → 해당 목록 → 현재 페이지를 기준으로 위치 표시와 상위 이동 제공. 케이스·스킬·개념·자료 상세 및 행사 아카이브를 포함하며 현재 항목은 클릭하지 않는다.
- 모바일 좌우 16px 정렬과 긴 경로 줄바꿈 유지. 중복 상단 여백을 정리하고 앱의 이전 화면 이력 저장을 제거.
- 관련 테스트 64개 통과. 타입 검사는 기존 KaaS 오류 8개만 발생. Chrome 1440/834/390에서 실제 breadcrumb 이동·Enter 키 이동·중복 없음·돌아가기 버튼 없음·가로 넘침 없음·pageerror 0 확인.
- 계획·검수: `8-breadcrumb-plan.md`. 증빙: `/private/tmp/cryptopedia-breadcrumb-browser-result.json`, `/private/tmp/cryptopedia-breadcrumb-390.png`.

## 2026-10-10 — 네비게이션 간격과 폰트 확인

- `editorial-index.tsx`: 하위 항목 사이 간격 4px, 그룹 사이 8px, 섹션 사이 24px로 확대. 항목의 세로 여백과 아이콘 간격도 늘렸으며 같은 컴포넌트를 쓰는 모바일 메뉴에 함께 적용.
- Chrome 실제 스타일: 네비게이션과 일반 본문은 둘 다 Noto Sans KR. 각각 13.5px/600, 14px/400으로 크기·굵기가 다름. 브랜드와 `.editorial-display` 제목은 Cormorant.
- 사용자에게 Noto Sans KR 통일을 추천하며 폰트 변경은 선택 전 미적용.
- 브라우저 1440/390에서 간격과 모바일 넘침 확인. `git diff --check` 통과. 증빙: `/private/tmp/cryptopedia-navigation-spacing-1440.png`, `/private/tmp/cryptopedia-navigation-spacing-390.png`.

### breadcrumb 그룹 기준 보정

- 사용자 요청에 따라 breadcrumb 시작점을 사이드바 그룹인 `ECOSYSTEM` / `CHAPTERS`로 변경. 체인 기초·빌더 라이브러리·아카데미를 생태계 홈 하위로 표시하지 않는다.
- 그룹명은 분류 표시이며, 아래 실제 상위 페이지와 목록으로 이동하는 기능은 유지.
- 관련 테스트 64개 통과. Chrome 1440/834/390에서 경로·상위 이동·모바일 줄바꿈 확인. 증빙은 `/private/tmp/cryptopedia-breadcrumb-browser-result.json`.

### 생태계 홈 계층·화살표 정렬 보정

- ECOSYSTEM 하위 메뉴에 클릭 가능한 생태계 홈을 복원: `ECOSYSTEM → 생태계 홈 → 체인·프로젝트`. CHAPTERS 경로에는 생태계 홈을 넣지 않음.
- 화살표의 상단 margin 제거와 수직 중앙 정렬 적용. 브라우저에서 텍스트와 화살표 중심 높이 차이 1px 미만 확인.
- 관련 테스트 64개와 Chrome 1440/834/390 경로·이동 검증 통과.

## 2026-10-14 — 생태계 홈 Overview UI 재사용

- 사용자 요청: 페이지별 디자인 개선의 첫 대상으로 생태계 홈을 변경. 기존 Cherry Overview의 UI를 최대한 재사용하고 가장 상단에 네 분야 최신 소식 슬라이드, 사람·에이전트 이동 카드 구성.
- `nd-overview-page.tsx`의 HeroCarousel과 HERO_GRADIENTS를 내보내 내부 페이지 이동용 슬라이드 렌더링을 추가. 기존 순환·자동재생·스냅 유지, 슬라이드 사이 16px 간격을 이동 거리 계산에 반영, 화면 크기 변경·타이머 정리·일시정지·클론 접근성 보완.
- ‘사람이 공부하기’ → 케이스별 실습, ‘에이전트에게 전달하기’ → 스킬 라이브러리. 두 카드 구성은 기존 Overview의 스포트라이트 구조 응용.
- Buzz Distribution은 기존 landing-stat.service.ts의 최근 7일 분야별 기사 건수 비중이라는 의미를 설명. 현재는 CategoryTreemap을 재사용해 홈 예시 소식 4개만 집계하며 실제 주간 통계·조회수·시장 인기도로 표현하지 않음. 분야 선택 이동·빈 데이터 시 AI 폴백 방지.
- 검증: 관련 테스트 69개 통과. 타입 검사는 기존 KaaS 오류 8개만 발생. Chrome 1440/834/390에서 네 소식의 내부 이동·순환·인디케이터·사용자 카드·Buzz Enter 이동·가로 넘침 없음·reduced motion 자동재생 정지·pageerror 0 확인.
- 계획·검수 정본: `9-ecosystem-home-redesign-plan.md`. 루트 매칭표의 실제 재사용 컴포넌트를 여섯 개로 갱신.
- 증빙: `/private/tmp/cryptopedia-home-redesign-result.json`, `/private/tmp/cryptopedia-home-redesign-1440.png`, `/private/tmp/cryptopedia-home-redesign-390.png`.

### DEMO 문구 제거

- 사용자 요청에 따라 전체 에디토리얼 화면의 DEMO 배지·접두사·개발 업데이트 분야 표시를 제거. 다운로드 지침과 묶음의 `Cryptopedia Demo`도 `Cryptopedia`로 변경.
- 내용과 데이터 상태는 유지하며 표시 문구만 수정. 빈 배지와 남는 구분점 제거. 소스 검색으로 화면의 영문 DEMO 문구가 없음을 확인하고 `git diff --check` 통과.

### 공식 체인 홈페이지 문구

- 기존 ‘체인의 지식에서, 다음 빌드까지.’는 에이전트가 작성한 플랫폼 소개 문구였으며 공식 문구가 아니었음을 사용자에게 설명.
- 2026-10-14 공식 홈페이지 확인: Avalanche ‘Technology Built for Business’ (`https://www.avalanche.com/`), Injective ‘Enter the New Internet Economy’ (`https://injective.com/`), Midnight ‘Midnight is live’ (`https://midnight.network/`). Midnight는 현재 홈페이지의 출시 메시지이며 영구 슬로건으로 간주하지 않는다.
- `chains.json`에 체인별 원문·출처·확인일 저장. 선택 체인에서 홈 문구를 가져오고 출처 링크 표시. Avalanche 기본 ecosystem 문구도 공식 원문으로 교체. 비활성 체인 상태 유지.
- 사용자가 숨긴 생태계 둘러보기 영역은 유지하고 기존 홈 테스트의 오래된 서가 제목 기대를 현재 슬라이드의 분야명 기대에 맞춤.
- 관련 테스트 69개 통과. 타입 검사에는 기존 KaaS 오류 8개만 발생.

## 2026-10-14 — 공통 footer

- `editorial-footer.tsx`를 만들고 공통 셸의 main 다음에 한 번 적용. 모든 에디토리얼 목록·상세·로딩·오류에 공통 표시.
- 브랜드·제작팀·연도와 생태계 홈 / 케이스별 실습 / 스킬 라이브러리 바로가기 제공. 페이지별 footer 제거, 문서의 공식 Docs·다음 문서 이동은 일반 컨테이너로 유지.
- 관련 테스트 70개 통과. Chrome 1440/834/390에서 홈·목록·상세의 단일 footer·바로가기·가로 넘침 없음·pageerror 0 확인. `git diff --check` 통과.
- 검수 정본: `10-common-footer-plan.md`. 증빙: `/private/tmp/cryptopedia-footer-browser-result.json`, `/private/tmp/cryptopedia-footer-390.png`.
