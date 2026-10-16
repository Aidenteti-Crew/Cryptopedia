# Avalanche Editorial UI 진행 로그

## 2026-10-16 — 네 화면 통합 UI/UX 구현 완료

- 12-ecosystem-four-screen-ux-plan.md 승인 기획을 반영했다. 프로젝트 24개 더 보기/개별 공식 링크/간결한 리스트, 매크로 뉴스 위계/상세, 행사 시간·주최자·장소·행동/정렬, 개발 Changelog·버전 이력에 공통 탐색을 적용했다.
- 공통 팝오버 필터/체크박스/유형 메뉴/결과 수를 재사용한다. 체인별 검색·조건·보기·날짜·더 보기 개수와 화면 복귀 위치를 보존한다. 기존 보기 설정 localStorage와 호환한다.
- 프로젝트/매크로 커서 API와 전체 페이지 로딩, 행사 후속 커서 처리를 추가했다. 실제 GET 검증: 프로젝트 235건/7페이지, 매크로 10건/4페이지, 중복·누락 없음.
- 웹 회귀 117개, 최종 핵심 23개, API 단위 21개 통과. ESLint 및 diff check 통과. 기존 타입 오류(웹 KaaS 8개/API KaaS 테스트 1개)는 남아 있고 변경 파일 오류는 없다.
- 실제 Chrome 네 화면 모두 1440/834/390px에서 확인. 필터 바깥 클릭/Escape, 첫 날짜 선택 결과 유지, 기간 적용, 상세/공식 링크, 빈 날짜 이동, 달력 스크롤, 보기/필터 상태 복원을 확인했다.
- 전체 파일 목록·화면 캡처·남은 데이터 과제는 13-four-screen-implementation-result.md에 기록했다. DB 쓰기·마이그레이션·커밋·푸시·배포 없음.

## 2026-10-15 — 체크박스 필터 및 네 화면 통합 기획

- 개발 업데이트 필터의 제품/환경/변경 성격/릴리스 단계를 바로 보이는 체크박스로 변경했다. 같은 그룹은 OR, 다른 그룹은 AND로 결합하며, 미선택은 전체다. 기간 선택은 기존 두 날짜+적용을 유지한다.
- DevelopmentFilters의 네 상세 조건에 배열 선택을 추가하고 기존 단일 문자열 호출과 호환한다. 제품 태그의 단일 선택, 버전 이력 기준 제품, 두 보기의 독립 릴리스 단계, 검색/조건 초기화를 유지한다.
- 변경 파일: development-updates-page.tsx, development-discovery.ts, development-discovery.test.ts. 관련 테스트 21개/ESLint 통과. 타입 검사는 기존 KaaS 오류 8개만 남았다.
- 실제 미리보기에서 Coreth+Subnet-EVM 두 체크박스를 동시에 선택해 11건 확인. 필터 패널 내 combobox 0개, 390px 가로 넘침 없음. 캡처 /private/tmp/development-checkbox-filters.png.
- 전체 UI/UX 기획은 12-ecosystem-four-screen-ux-plan.md에 저장했다. Alchemy Dapp Store/The Block News/Luma Seoul/GitHub Changelog를 화면별 주 참고로 선택하고 DefiLlama는 비교용 보조로 검토했다. 홈의 실제 CSS 토큰/폰트/여백/카드 규칙을 기준으로 기획했다. 네 화면 전체 개편은 이번 턴에서 구현하지 않았다.

## 2026-10-15 — GitHub형 유형 메뉴와 Filters 배치

- 사용자 요청에 따라 개발 업데이트의 유형 메뉴를 색상 아이콘+텍스트+선택 밑줄의 한 줄 탐색 바로 바꾸고 오른쪽에 필터 버튼을 배치했다. 실제 수집 유형(전체/릴리스/기술 아티클/ACP 제안/기타)만 사용하며 데이터가 없는 유형은 숨긴다.
- 제품·환경·변경 성격·공개일·릴리스 단계 선택은 펼침형 필터 패널로 모았다. 적용한 상세 조건 수를 필터 버튼에 표시하고 조건 초기화는 검색어와 유형 선택을 유지한다. 제품별 버전 보기의 기준 제품은 검색 바에 유지한다.
- 모바일은 유형 영역만 가로 스크롤되고 필터 버튼은 오른쪽에 유지된다. 스크롤 막대는 숨기되 키보드와 터치 스크롤은 유지한다.
- 변경 소스: development-updates-page.tsx. 관련 테스트 20개 및 ESLint 통과. 실제 Coreth 선택 결과 4개/필터 1개 적용 확인. 390px 필터 패널 가로 넘침 없음. 타입 검사는 기존 KaaS 오류 8개만 남았다.

## 2026-10-15 — 선택한 빈 날짜 안내·GitHub Changelog형 목록

- 사용자 요청: 빈 날짜 피드백과 GitHub Changelog를 참고한 개발 업데이트 표시. 참고: https://github.blog/changelog/ (월 그룹, 날짜/유형, 제목/제품 태그 중심 목록).
- 매크로/행사 달력의 최초 진입은 빈 오늘 구획 없이 가장 가까운 실제 항목으로 이동한다. 날짜/월을 직접 선택한 경우에만 빈 날짜 안내와 가까운 실제 날짜로 이동하는 버튼을 표시한다. 달력 토글은 직접 날짜 선택으로 취급하지 않는다.
- 직접 선택 여부를 target.explicit에 보존하고 부모의 날짜 선택 함수로 가까운 날짜 버튼을 연결했다. 여러 날 행사 포함 여부와 180ms 스크롤 동기화는 유지한다. 필터 결과가 전혀 없는 경우에는 전체 빈 결과 상태를 사용한다.
- 개발 업데이트 전체 보기를 한국시간 공개 월별 그룹으로 바꿨다. 각 행은 날짜·유형, 제목, 제품 태그·버전·중요 변경, 검증된 적용 일정과 공식 링크를 표시한다. 긴 요약은 기존 상세 패널에서 읽는다. 제목/설명/버전/출처 검색은 유지한다.
- 콘텐츠 유형은 바로 보이는 선택 버튼으로 바꾸고 중복 유형 드롭다운을 제거했다. 제품 태그 클릭으로 해당 제품만 필터링한다. 실제 데이터에 없는 GitHub의 Improvement/Retired 분류를 임의로 생성하지 않는다.
- 제품별 버전 이력은 선/점 타임라인을 유지하고 큰 개별 카드 배경을 간결한 구분선으로 정리했다. 기존 다크 브랜드와 금색 강조를 유지한다.
- 변경 파일: development-changelog.tsx 및 테스트(신규), development-updates-page.tsx, development-update-row.tsx, synced-event-timeline.tsx, synced-date-list.test.tsx, feed-page.tsx, events-page.tsx, ecosystem-pages.test.tsx.
- 검증: 관련 테스트 26개, 변경 소스 ESLint, git diff --check 통과. 타입 검사는 기존 KaaS 오류 8개만 남았다.
- 실제 Chrome: 행사 첫 진입 빈 구획/안내 없음; 10월 16일 선택 시 안내와 10월 17일 이동 버튼 표시; 이동 후 selected=2026-10-17 및 빈 안내 제거 확인. 릴리스 유형 11건, Coreth 태그 4건, 초기화 17건. 390px 월별 목록 가로 넘침 없음, 임시 viewport 복원.
- 증빙: /private/tmp/development-github-changelog.png.

## 2026-10-15 — 반반 달력 및 제품별 릴리스 타임라인 구현

- 승인된 최종 기획 반영. 매크로 소식과 행사·이벤트는 고정 448px 제한을 제거하고 xl 이상에서 두 열을 1:1로 사용한다. 달력은 6주를 고정해 표시하고 같은 영역의 목록 높이를 CSS 변수로 맞춘다. 모바일/태블릿에서는 달력과 목록을 위아래로 쌓는다.
- 날짜 칸을 모바일 88px/데스크톱 96px로 넓혔다. 자료가 있는 날은 은은한 배경·건수·첫 제목 두 줄·추가 건수를 표시한다. 오늘 숫자와 선택 날짜 테두리는 구분하고 다일 행사 표시를 유지한다.
- 개발 업데이트에서 달력 버튼/패널/동기화 상태를 제거했다. 전체 업데이트는 날짜별 목록, 제품별 버전 이력은 공개 순서의 세로선/점 타임라인이다. 정식은 채운 점, 프리릴리스는 빈 점과 옅은 제목, 미확인 단계는 회색 점과 안내로 구분한다. Git 분기 관계는 생성하지 않는다.
- 기존 ReleaseHistory를 실제 제품별 보기에서 사용하도록 연결했다. 버전 제목 클릭 시 기존 상세 패널이 열리며 원문/적용 일정/공식 비교 링크를 유지한다. 제품·검색·기간·단계·환경·정렬 동작을 유지한다.
- 변경 파일: editorial-calendar.tsx, synced-event-timeline.tsx, development-updates-page.tsx, development-release-history.tsx, development-update-row.tsx, development-release-history.test.tsx, ecosystem-pages.test.tsx 및 기획/검수 문서.
- 검증: 관련 테스트 36개 및 변경 파일 ESLint, git diff --check 통과. 타입 검사는 기존 KaaS 화면 오류 8개로 실패하며 수정 파일 신규 오류는 없다.
- 실제 1440px Chrome에서 매크로/행사 두 열 각각 520×688px, 같은 top 위치 확인. 행사 10월 17일 선택 후 해당 날짜가 현재 구획으로 표시된다. 개발 업데이트의 달력 버튼 0개, Coreth 공개 순서/정식·프리릴리스 점 4개와 상세 패널 연결 확인.
- 모바일 390px에서 달력은 350px 전체 너비와 세로 배치, 릴리스 타임라인 4개 및 가로 넘침 없음 확인. 임시 viewport는 복원했다.
- 증빙: /private/tmp/ecosystem-calendar-half.png, /private/tmp/development-release-timeline.png.

## 2026-10-15 — 세 화면 조회 달력 크기·표시 통일

- 사용자 요청: 페이지마다 다른 달력 크기를 하나로 맞추고, 가장 작은 점 표시형은 사용하지 않으며 자료가 있는 날짜를 명확히 표시한다.
- 매크로 소식/행사 및 이벤트/개발 업데이트가 같은 EDITORIAL_CALENDAR_LAYOUT을 사용한다. 데스크톱 열 너비 448px, 달력 최대 너비 448px, 동일한 72px 헤더와 6주 42칸을 적용했다. 개발 업데이트의 compact 옵션과 280px 열을 제거했다.
- 모든 화면에서 자료가 있는 날짜에 보라색 건수 배지와 첫 항목 제목을 표시한다. 전체 제목은 툴팁 및 접근성 이름으로 제공한다. 자료가 없는 날짜는 표시를 만들지 않는다. 여러 날 행사는 포함된 날짜마다 표시한다.
- 모바일 날짜 칸 높이를 72px(데스크톱 80px)로 통일하고 현재 화면 너비 안에서 줄어든다. 날짜 범위 선택용 팝오버는 조회 달력과 용도가 달라 기존 선택기를 유지한다.
- 변경 파일: editorial-calendar.tsx, editorial-calendar.test.tsx, events-page.tsx, feed-page.tsx, development-updates-page.tsx.
- 검증: 건수·제목·빈 날짜·월 경계의 여러 날 행사 테스트를 추가하고 관련 테스트 총 16개 통과. 변경 소스 ESLint, git diff --check 통과.
- 실제 Chrome 1440px에서 행사/매크로/개발 달력 모두 448×592px 측정. 행사 10월 17일 1건, 매크로 8개 날짜, 개발 9월 8일 1건 표시 확인. 390px에서는 350×544px, 가로 넘침 없음. 임시 viewport는 원래대로 복원했다.
- 증빙: /private/tmp/ecosystem-calendar-unified.png.

## 2026-10-15 — 개발 업데이트 테마 통일

- 사용자 요청에 따라 체인·프로젝트/매크로 소식/행사·이벤트의 공통 DiscoveryHeader와 DiscoveryToolbar를 개발 업데이트에도 적용했다. 제목 아이콘 크기·건수·본문 여백, 한 줄에서 감싸지는 검색·필터 바를 통일했다.
- 밑줄 탭을 금색 선택 배경의 둥근 탭으로 변경했다. 날짜 그룹은 유지하고 항목은 매크로 소식과 같은 20px 모서리·얇은 테두리·은은한 보라색 배경을 적용했다. 링크·선택·상세 패널 강조는 공통 금색을 사용한다.
- compact 달력의 월과 오늘 버튼이 좁은 폭에서 줄바꿈되던 것을 크기·간격·줄바꿈 설정으로 보정했다. 다른 화면의 기본 달력 크기는 유지한다.
- 변경 파일: development-updates-page.tsx, development-update-row.tsx, development-update-detail.tsx, editorial-calendar.tsx.
- 검증: 관련 렌더링 테스트 14개, 변경 파일 ESLint, git diff --check 통과. Chrome에서 화면 표시 확인, 390px viewport에서 scrollWidth 382px로 넘침 없음. 임시 viewport는 원래대로 복원했다.
- 증빙: /private/tmp/development-shared-theme.png.

## 2026-10-15 — 개발 업데이트 Changelog 개편

사용자 승인 기획에 따라 전체 업데이트/제품별 버전 이력, 날짜 그룹, 작은 선택형 달력, 제품·유형·환경·변경 성격·공개일 필터, 상세 패널을 구현했다. 기존 브랜드와 내비게이션을 재사용했다.

- 기본은 날짜별 목록, 요약 최대 두 줄. 제목 클릭 시 전체 요약·공식 근거·네트워크 일정(KST/UTC)·제공된 비교 링크를 상세 패널에 표시한다. 원문 링크는 목적지를 표시한다.
- 버전 이력은 제품 하나를 선택한다. 정식/프리릴리스/미확인 단계 필터를 제공한다. 두 탭의 단계 선택은 별도로 유지해 숨은 필터가 적용되지 않게 했다.
- 공식 GitHub API는 기존 수집 항목의 버전·공개일·prerelease·compare URL을 검증한다. 저장소 3개로 제한, 저장소당 15분 캐시, 2.5초 timeout. 장애 시 수집 목록을 유지하고 미확인 단계는 정식으로 추정하지 않는다.
- 공식 원문에 명시된 필수/호환성/보안/프로토콜 변경만 근거와 함께 분류하고 부정문은 제외한다. AI 점수만으로 중요 공지를 만들지 않는다. 90일 이상 지났거나 명시된 적용 일정이 모두 지난 항목은 상단에 계속 강조하지 않는다.
- 같은 문단에 네트워크·날짜·UTC 시각이 각각 하나로 명시된 경우만 일정으로 추출한다. 모호한 activatedAt은 공식 일정으로 단정하지 않는다. 날짜만 제공된 공개일에 임의 시각을 붙여 표시하지 않는다.
- 업데이트 API 커서(공개일+ID)와 전체 페이지 로딩으로 100개 이후도 검색한다. 동일 URL만 중복 제거하고 서로 다른 글은 유지한다. 기존 커서 없는 호출은 호환된다.
- 달력은 280px/점 표시, 목록 정지 180ms 후 월 동기화. 날짜 클릭은 실제 공개 날짜로 이동하고 빈 오늘 제목을 생성하지 않는다. 날짜 범위는 적용 후 반영한다.

### 이번 개편의 변경 파일

이전 네 화면 작업 파일은 제외하고 이번에 추가·수정한 파일을 기록한다.

```text
apps/web/components/cherry/editorial/development-updates-page.tsx
apps/web/components/cherry/editorial/development-update-row.tsx
apps/web/components/cherry/editorial/development-update-detail.tsx
apps/web/components/cherry/editorial/feed-page.tsx
apps/web/components/cherry/editorial/editorial-calendar.tsx
apps/web/components/cherry/editorial/synced-event-timeline.tsx
apps/web/components/cherry/editorial/discovery-date-range.tsx
apps/web/components/ui/sheet.tsx
apps/web/lib/development-discovery.ts
apps/web/lib/development-updates.ts
apps/web/lib/cryptopedia-types.ts
apps/web/lib/cryptopedia-data.ts
apps/web/lib/development-discovery.test.ts
apps/web/lib/cryptopedia-live.test.ts
apps/web/components/cherry/editorial/synced-date-list.test.tsx
apps/web/components/cherry/editorial/ecosystem-pages.test.tsx
apps/api/src/modules/chain_feed/chain-feed.service.ts
apps/api/src/modules/chain_feed/chain-feed.types.ts
apps/api/src/modules/chain_feed/chain-feed.controller.ts
apps/api/src/modules/chain_feed/feed-query.ts
apps/api/src/modules/chain_feed/feed-query.spec.ts
apps/api/src/modules/chain_feed/update-evidence.ts
apps/api/src/modules/chain_feed/update-evidence.spec.ts
apps/api/src/modules/chain_feed/official-releases.ts
apps/api/src/modules/chain_feed/official-releases.spec.ts
apps/docs/avalanche-editorial-ui/11-ecosystem-subpage-readability-plan.md
apps/docs/avalanche-editorial-ui/3-checklist-table.md
apps/docs/avalanche-editorial-ui/4-progress-log.md
```

### 검증

- 웹 관련 테스트 110개, API 단위 테스트 20개 통과. 변경 소스 ESLint 및 git diff --check 통과.
- 웹 타입 검사는 기존 kaas-admin-page.tsx/kaas-dashboard-page.tsx 오류 8개, API는 수정하지 않은 kaas-credit.service.spec.ts:154의 인자 개수 오류 1개로 실패. 변경 파일의 오류는 없다.
- 실제 API: 3건씩 6페이지, 17건, 중복 0건, 전체 조회와 동일 순서. 모든 릴리스 버전과 원문 URL 태그 일치. 스크립트 /private/tmp/verify-development-update-pages.py.
- 브라우저 1440/834/390px, 가로 넘침 없음. v0.16.0 검색 2개, Coreth 정식 필터 2개. 기간 첫 클릭 후 17건 유지/적용 비활성 확인. 빈 결과·초기화, 상세 Escape·초점 복원 확인.
- 달력 목록 1000px 스크롤 후 2025년 11월로 동기화. 11월 6일 클릭 후 해당 날짜 구획 및 scrollTop 1635 확인.
- 사용자 Chrome localhost:3000 탭에서 새 개발 업데이트 화면 표시 확인.
- 증빙: /private/tmp/development-redesign-desktop.png, development-redesign-versions.png, development-redesign-detail.png, development-redesign-calendar.png, development-redesign-mobile.png, development-redesign-mobile-calendar.png, development-redesign-tablet.png, development-redesign-empty-mobile.png.

### 데이터 문제 및 남은 작업

1. 로컬 업데이트 17건 중 AvalancheGo 릴리스 0건, 원문도 0건. source cursor는 v1.15.1, last_success_at은 2026-10-14 02:22 UTC. 공식 latest는 v1.15.1(2026-10-01 19:46:37 UTC / 10-02 04:46:37 KST). 운영 DB는 확인하지 않았다.
2. sources.yaml의 recency_window_days: 7 및 validateArticle의 STALE_DATE 조건이 10월 14일 수집에서 10월 1일 릴리스를 제외하는 경로를 확인했다. runAtomSource는 제외 후에도 cursor/etag를 기록하므로 수집 성공과 원문 저장은 다를 수 있다. 최초 이력 수집 정책 보완 및 1회 재수집이 필요하다. 이번 작업에서 수집 설정·cursor·DB는 변경하거나 분류 작업을 실행하지 않았다.
3. Granite activatedAt은 글마다 00:00Z/16:00Z로 다르다. UI는 해당 필드를 공식 일정으로 확정하지 않고 원문 근거 일정만 표시한다. 저장 값 자체는 수정하지 않았다.
4. 원문 URL 중복 0건. 과거 RC/커스텀 태그의 공식 메타데이터가 없으면 후보 표기는 버전 이름을 보조로 활용하고 정식 여부는 만들지 않는다.
5. 여러 네트워크 일정이 한 문단에 섞이는 등 모호한 표현은 자동 확정하지 않는다. 검토된 구조화 일정·제품 매핑·수집 건강 상태는 후속 개선 대상이다.

DB 쓰기·마이그레이션·커밋·푸시·배포는 하지 않았다.

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

## 2026-10-15 — 생태계 하위 네 화면 가독성

- 범위: 체인·프로젝트, 매크로 소식, 행사·이벤트, 개발 업데이트. 생태계 홈은 변경하지 않음. 기획: `11-ecosystem-subpage-readability-plan.md`.
- 프로젝트 235건·33개 분야의 검색, 다중 분야 선택, 이름/중요도 정렬, 분야별 6개 미리보기와 펼치기 추가. `Analytics & Data` 15건을 선택하고 `Artemis` 검색을 더해 1건만 남는 것을 브라우저에서 확인.
- 매크로·업데이트에 발행일·출처·실제 세부 종류, 검색·기간·출처·종류 필터, 정렬과 달력/리스트 전환 추가. 반복되는 `UPDATE` 종류 문구 제거. 날짜는 한국시간 기준으로 표시하며 업데이트 버전·적용일은 있을 때만 표시.
- 행사에 월 달력 기본 보기, 날짜 선택 상세, 리스트 전환, 기간·상태·참여 방식·종류 필터와 검색 추가. 상태나 검색을 바꾸면 결과가 있는 월로 이동. 행사 시간대·주최자·장소/온라인·원문/신청 링크 표시. 모바일 날짜 칸은 건수로 표시.
- `contentEntrySchema`가 크롤러 세부 종류·버전·적용일 등을 보존. 목차의 `OVERVIEW` 종류 표시가 사라지는 회귀를 확장 테스트에서 발견해 복원.
- 검증: 관련 웹 테스트 88개 통과, 수정 파일 ESLint 통과, `git diff --check` 통과. Chrome 실데이터에서 네 화면 탐색·프로젝트 필터·소식 날짜 선택·행사 상태 필터·개발 업데이트 검색·보기 방식 기억 확인. 390px 프로젝트/행사 화면 가로 넘침 0. 전체 웹 타입 검사는 기존 KaaS 파일 오류 8개만 발생.
- 증빙: `/private/tmp/ecosystem-projects-mobile.png`, `/private/tmp/ecosystem-events-mobile.png`. 로컬 스냅샷의 `content.eco_project` 235건을 로컬 전용 DB에 복원해 화면을 검수했다. API·DB 스키마·수집 파이프라인 코드는 수정하지 않았다.

### 홈 스타일로 하위 화면 재디자인

- 사용자 승인 후 네 화면에 아이콘·제목·건수 헤더, 검색/필터 통합 탐색 바, 맞춤 필터 팝오버와 선택 조건 칩 적용.
- 리스트/달력 토글은 아이콘과 툴팁으로 표시. 소식·행사를 라운드 카드로 바꾸고 프로젝트 카드에 홈과 같은 은은한 색감 적용.
- 달력과 선택 날짜 상세를 1440px에서 나란히 배치. 390px에서는 세로 배치와 가로 넘침 없음 확인. 실제 매크로 종류 필터 선택 후 3건으로 좁혀지는 동작 확인.
- 증빙: `/private/tmp/readability-redesign-projects.png`, `/private/tmp/readability-redesign-events-desktop.png`, `/private/tmp/readability-redesign-events-mobile.png`.
- 검증: 관련 테스트 89개 통과, 수정 파일 ESLint와 `git diff --check` 통과. 타입 검사는 기존 KaaS 오류 8개만 발생.

### 오늘 기본 선택과 행사·릴리스 타임라인

- 달력 기본값을 이번 달·오늘로 변경. 오늘 소식이 없으면 최근 게시물, 오늘 행사가 없으면 같은 달의 다가오는 일정을 별도 표시. 다른 달의 다음 일정으로 이동 버튼도 제공.
- 행사는 날짜별 타임라인과 같은 화면의 예정/지난 전환·정렬로 통합. 기간 프리셋과 별도 지난 행사 이동 버튼 제거. 단일 종류/참여 방식 필터 숨김.
- 매크로 단일 출처 필터 숨김, COLLAB은 협업·도입으로 표시. 매크로·업데이트의 발행 기간은 달력 범위 선택으로 변경.
- 업데이트 릴리스는 소프트웨어별 발표 이력으로 표시하고 버전 문자열의 rc/alpha/beta 등을 출시 후보로 구분. Git 분기 관계는 생성하지 않음.
- 분야 팝오버의 바깥 클릭·Escape 닫힘 적용. 브라우저에서 바깥 클릭 후 Analytics & Data 15건 선택 유지, 날짜 범위 결과 1건, 릴리스 11건의 소프트웨어별 이력을 확인.
- 관련 테스트 92개, 수정 파일 ESLint, `git diff --check` 통과. 모바일 390px 가로 넘침 없음. 증빙: `/private/tmp/events-timeline-today.png`, `/private/tmp/events-timeline-mobile.png`.

### 날짜 선택 중 조기 적용·단일 선택 중복 칩 수정

- 날짜 팝오버는 임시 시작일/종료일을 관리하고 적용할 때만 부모 필터를 변경. 종료일이 없으면 적용 비활성화, 취소·바깥 클릭은 기존 범위 유지.
- 매크로·업데이트·행사의 단일 선택과 검색어 중복 칩 제거. 초기화 버튼과 프로젝트 다중 분야 칩 유지.
- 브라우저에서 첫 클릭·종료일 선택 동안 10건 유지, 적용 후 7건, 다른 날짜를 고른 뒤 취소해도 7건 유지 확인. 관련 테스트 20개와 수정 파일 ESLint·diff 검사 통과. 타입 검사는 기존 KaaS 오류 8건만 재현.

### 행사 달력·타임라인 양방향 동기화

- 월별로 목록을 잘라내던 달력 모드를 여러 달 연속 타임라인으로 변경. 오른쪽 스크롤이 왼쪽 월·날짜를 갱신하고 달력 클릭은 해당 날짜로 이동한다.
- 일정 없는 날짜의 구획, 진행 중인 여러 날 행사, 보기 전환 후 선택 날짜 유지 처리. 스크롤 관측은 이동 요청을 다시 만들지 않아 피드백 루프를 방지한다.
- 실제 브라우저: 위로 650px 스크롤 → 9월 22일, 다음 달 → 10월 15일, 10월 17일 클릭 → 해당 행사, 10월 20일 클릭 → 빈 날짜 구획 상단 12px 정렬, 위아래 900px 왕복 후 날짜 동기화 확인. 모바일 390px 가로 넘침 없음.
- 관련 테스트 13개, 수정 파일 ESLint 통과. 타입 검사는 기존 KaaS 오류 8건만 발생. 증빙: `/private/tmp/events-calendar-sync.png`.

### 행사 달력의 잦은 갱신 완화

- 행사 링크를 `자세히 보기`로 변경. 스크롤 동기화를 마지막 스크롤 후 180ms로 지연하고, 직접 달력 조작은 즉시 실행한다.
- 달력 6주 고정, 스크롤 추적 날짜는 배경색 없는 테두리로 표시.
- 브라우저에서 60ms 간격 6회 연속 스크롤 동안 10월 유지, 종료 후 8월 29일로 한 번 변경 확인. 10월·8월 높이 모두 595px. 오늘 버튼 즉시 이동과 링크 16개 문구 변경 확인.
- 관련 테스트 13개, 수정 파일 ESLint·diff 검사 통과. 증빙: `/private/tmp/events-stable-calendar.png`.

### 행사 달력 표시 토글·프로젝트 카드/리스트

- 행사 예정/지난 탭과 별도 리스트 분기를 제거. 한 타임라인을 계속 유지하면서 달력 아이콘 하나로 달력을 표시/숨김.
- 프로젝트에 카드/리스트 아이콘 토글과 가로형 프로젝트 행 추가. 검색·분야·정렬은 보기와 독립적으로 유지하며 선호 보기를 저장.
- 브라우저에서 행사 10월 17일 유지 상태로 타임라인 너비 559→1060→559px 확인. 프로젝트 `Artemis` 검색과 `Analytics & Data` 분야 선택을 유지한 카드/리스트 왕복 확인. 모바일 390px 가로 넘침 없음.
- 관련 테스트 13개와 수정 파일 ESLint 통과. 타입 검사는 기존 KaaS 오류 8건만 발생. 증빙: `/private/tmp/projects-list-view.png`.

### 매크로·개발 업데이트 달력 목록 동기화

- 행사 동기화 엔진을 `SyncedDateList`로 일반화하고, 두 소식 화면의 달력 모드에 연결선 없는 날짜별 카드 목록 적용. 180ms 대기·직접 날짜 이동·선택 테두리 동작 공유.
- 실브라우저: 매크로 스크롤 → 10월 13일 선택, 10월 7일 클릭 → 2건·목록 상단 12px 정렬. 업데이트 스크롤 → 2026년 2월 20일, 2월 11일 클릭 → 해당 글 확인. 모바일 390px 가로 넘침 없음.
- 관련 테스트 14개, 수정 파일 ESLint 통과. 타입 검사는 기존 KaaS 오류 8건만 발생. 증빙: `/private/tmp/updates-calendar-synced-cards.png`.

### 소식 화면 달력 버튼 통일

- 누락된 매크로·개발 업데이트 토글을 행사와 동일한 단일 달력 표시/숨기기 버튼으로 변경. 세 화면이 공통 `CalendarVisibilityToggle`을 사용한다.
- 브라우저에서 두 소식 화면에 달력 버튼 하나만 표시됨을 확인. 매크로 10월 7일 선택 후 닫기/열기에도 해당 날짜 유지. 관련 테스트 12개와 수정 파일 ESLint·diff 검사 통과.

### 개발 업데이트 탐색 목적 분리

- `최신 소식 / 제품별 버전 이력` 탭 구현. 기본 최신 소식에서 기술 글과 제품별 릴리스를 발행일순으로 혼합하며, 이전 제품별 묶음 출력 제거.
- 제품별 보기에서는 Coreth·Subnet-EVM 등 한 제품의 버전 이력만 표시. 버전 번호를 제목으로 사용하고 후보 포함 체크·정식/후보 배지·발표일·릴리스 노트 링크 제공. 후보 판별 함수를 일반 피드와 공유한다.
- 검색·날짜 범위·정렬은 공유하고 최신 소식의 출처/종류는 해당 보기에서 보존. 버전 이력의 제품/후보 설정도 별도 보존. 키보드 화살표·Home·End 탭 이동 지원.
- 실브라우저: Coreth 후보 포함 4→제외 2건, Subnet-EVM 7건, v0.8.0 검색 6건을 보기 전환해 유지. 기술 글 필터로 최신 소식 6건인 상태에서도 버전 이력은 7건 표시, 복귀 시 기술 글 조건 유지. 날짜 범위 2026-10-01~31도 버전 이력에서 유지하고 빈 결과 표시·초기화 복원 확인.
- 관련 웹 테스트 100개, 수정 파일 ESLint, `git diff --check` 통과. 전체 타입 검사는 기존 KaaS 오류 8건만 있음. 모바일 390px 가로 넘침 없음.
- 증빙: `/private/tmp/development-product-history-desktop.png`, `/private/tmp/development-product-history-mobile.png`. 사용자 Chrome에는 제품별 버전 이력을 열어두었다.
