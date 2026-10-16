# 컬러풀 비교안 구현 결과

브랜치: `feature/ecosystem-colorful`.
기획: `17-colorful-comparison-plan.md`.

## 비교 주소

| 버전 | 주소 | 작업 폴더 |
|---|---|---|
| 기존 A | http://localhost:3000 | ../ecosystem-readability |
| 컬러풀 B | http://localhost:3001 | 현재 폴더 |

공유 API: http://localhost:4000. 로컬 실행의 CORS에 3000/3001을 모두 허용했다. 같은 PostgreSQL/Redis 데이터를 읽고, 수집 스케줄러는 비활성 상태다. DB 변경은 없다.

## 구현

- 홈 ‘어떻게 시작할까요’: 보라/그린 그라데이션과 옅은 원형 그래픽으로 두 진입 카드 구분. 작은 설명의 대비를 위해 그라데이션의 끝색을 조정.
- 네 화면: 공통 메타 헤더에 선명한 색을 적용하고 본문은 #242129의 일정한 배경 유지. 16px 모서리, 데스크톱 20px/모바일 16px 여백.
- 프로젝트: 실제 33개 분야를 히트맵과 공유하는 8색 팔레트에 명시적으로 매핑. 정렬·필터에 따라 색이 변하지 않으며 미매핑은 중립색. 카드/리스트에 동일 적용.
- 매크로: 공개일·시각·출처와 유형 배지를 블루 헤더에서 구분.
- 행사: 시간·상태를 오렌지 헤더에 표시. 제목·주최자·장소는 본문에서 읽기. 달력의 일정 있는 날과 선택 테두리도 강화.
- 개발: 월별/버전 이력 모두 그린 헤더, 기술 아티클/릴리스/출시 후보 배지의 색 구별. 상세·제품 탭·원문 링크 유지.

## 검증

- 전체 관련 회귀 테스트 185개 통과. 후속 배지/달력 조정의 핵심 테스트 17개 통과.
- 변경 TS/TSX ESLint 및 git diff --check 통과.
- 전체 웹 타입 검사: 기존 KaaS 오류 8개. 이번 변경 파일의 신규 타입 오류 없음.
- Chrome 1440px/390px에서 홈 및 네 화면 확인. 모바일 가로 넘침 없음.
- 실제 사용: 프로젝트 리스트 24개 헤더/넘침 없음, 매크로 ‘테더’ 검색 1개 및 달력 전환, Coreth 탭 4개 확인.
- 카드 헤더의 밝은 쪽 배경과 기본 텍스트 대비: 보라 7.16, 블루 6.78, 그린 5.88, 오렌지 5.99, 로즈 7.18. 그린 제품명 5.32.
- 홈 그라데이션의 가장 밝은 끝색 대비 설명: 사람 카드 5.32, 에이전트 카드 5.12.
- A/B 주소 모두 HTTP 200. A 프로젝트에 새 메타 헤더 0개, B에서 새 메타 헤더 정상 확인.

## 주요 변경 파일

- `apps/web/app/globals.css`
- `apps/web/components/cherry/editorial/content-colors.ts` (신규)
- `apps/web/components/cherry/editorial/ecosystem-page.tsx`
- `apps/web/components/cherry/editorial/project-directory-page.tsx`
- `apps/web/components/cherry/editorial/macro-news-page.tsx`
- `apps/web/components/cherry/editorial/events-page.tsx`
- `apps/web/components/cherry/editorial/development-changelog.tsx`
- `apps/web/components/cherry/editorial/development-update-row.tsx`
- `apps/web/components/cherry/editorial/editorial-calendar.tsx`

## 화면 증빙

- `/private/tmp/colorful-home-audience.png`
- `/private/tmp/colorful-projects-desktop.png`
- `/private/tmp/colorful-macro-desktop.png`
- `/private/tmp/colorful-events-desktop.png`
- `/private/tmp/colorful-updates-desktop.png`
- `/private/tmp/colorful-release-desktop.png`
- `/private/tmp/colorful-projects-mobile.png`
- `/private/tmp/colorful-macro-mobile.png`
- `/private/tmp/colorful-updates-mobile.png`
- `/private/tmp/colorful-home-mobile.png`

의존성은 A안의 설치된 node_modules를 로컬 심볼릭 링크로 재사용한다. 소스와 .next 출력 폴더는 분리되어 있다. UI 코드 수정은 B안에만 적용했고 커밋·푸시·배포는 하지 않았다.

## 후속 수정 — 분야 색상 연결 및 달력 밝기

- 실제 API와 타입/쿼리에서 프로젝트의 category는 단일 문자열이고 chains만 배열임을 확인했다. ‘그 외 N개 분야’ 히트맵 타일은 여러 카테고리를 합친 예외라 중립색이다.
- 불일치 원인: 히트맵이 표시 index로 색을 고르고 프로젝트 카드는 독립적인 5색 그룹을 사용했다.
- `lib/project-category-colors.ts`를 정본으로 히트맵의 SVG gradient stop과 프로젝트 메타 헤더의 CSS gradient를 공유한다. 흰 작은 글씨를 위해 명암비 4.6 이상인 색을 양쪽에 동일 적용했다.
- 실제 홈 DeFi 타일 클릭 → `/ecosystem/projects?category=DeFi` → 12개 카드. 히트맵 stop `#2869a6/#3677a7`와 카드의 `rgb(40,105,166)/rgb(54,119,167)` 일치 확인.
- 달력: 행사 오렌지/매크로 블루 월 헤더, 밝힌 플럼 날짜 바탕, 일정 날짜의 색 바탕과 건수, 선택 테두리, 오늘 원형 표시로 구분.
- 관련 회귀와 새 팔레트 검증 테스트 24개 통과. ESLint/diff 검사 통과. 행사 17일 선택/오늘 16일 구분과 390px 가로 넘침 없음 확인.
- 추가 파일: `lib/project-category-colors.ts`, `lib/project-category-colors.test.ts`, `ecosystem-heatmap.tsx`.
- 화면: `/private/tmp/colorful-heatmap-matched.png`, `/private/tmp/colorful-category-defi-matched.png`, `/private/tmp/colorful-calendar-events.png`, `/private/tmp/colorful-calendar-macro.png`, `/private/tmp/colorful-calendar-events-mobile.png`.

## 달력 재검토 — 중립 다크 배경

- 사용자 요청으로 UI/UX와 시각 디자인 역할의 별도 에이전트 2개가 실제 화면을 독립 검토했다. 반복된 회보라 날짜 칸과 밝은 보라 격자가 원인이라는 결론이 일치했다.
- 날짜 칸 #202024, 격자 #38383f, 바깥 빈 칸 #18181b로 변경. 행사 오렌지/매크로 블루 헤더와 일정 날짜에만 색을 집중한다.
- 오늘: 숫자 아래 점 + aria-current=date. 선택: 2px 테두리와 체크. 일정: 채운 건수 배지. 주말: 숫자색만 구분.
- 실제 브라우저 computed style로 중립색 반영 확인, 모바일 390px 넘침 없음. 관련 테스트 4개 및 ESLint/diff 검사 통과. 시각 디자인 담당의 수정 후 화면 재검토에서도 탁한 보라/대비 관련 명백한 문제 없음 확인.
- 개발 서버의 이전 CSS 캐시가 남아 `.next`를 `/private/tmp/ecosystem-colorful-next-before-neutral-calendar-20261016`로 보관하고 재생성했다. 소스 삭제 없음. 현재 B안은 :3001에서 실행 중.
- 증빙: `/private/tmp/calendar-neutral-events.png`, `/private/tmp/calendar-neutral-macro.png`.

## 최종 톤 통합 검수

- 화면별 `--tone-gradient`를 하나로 정의해 페이지 아이콘·카드·달력이 공유한다. 홈의 사람/에이전트 진입 카드도 보라/그린 공통값을 사용한다.
- 브라우저 computed style 비교: 행사와 매크로 각각 달력 헤더와 카드 헤더의 gradient 문자열 완전 일치. 카드 본문과 빈 날짜 모두 rgb(32,32,36).
- 검색·정렬·필터·기간 팝오버·상세 패널의 남은 골드/푸른 회색을 중립 다크와 라벤더 선택색으로 통합. 행사 상태 배지는 어두운 독립 배경으로 대비 확보.
- 히트맵과 프로젝트 분야의 공통 팔레트 연결은 유지한다.
- 홈/프로젝트/매크로/행사/개발의 다섯 실제 화면을 시각 디자인 담당이 함께 재검토했다. 명백한 색상 불일치나 읽기 방해 없음 확인.
- 회귀 테스트 188개 통과. ESLint/diff 검사 통과. 헤더 흰 글씨의 밝은 끝색 대비: 보라 7.21, 블루 5.47, 오렌지 5.04, 그린 5.63. 홈 설명은 보라 5.32, 그린 4.56.
- 모바일 390px 필터와 기간 선택을 실제로 열어 확인. 필터 358×419px, 기간 팝오버 274×386px로 화면 내 표시, 두 팝오버 배경 rgb(41,41,46), 가로 넘침 없음.
- 최종 증빙: `/private/tmp/tone-final-home.png`, `/private/tmp/tone-final-projects.png`, `/private/tmp/tone-final-macro.png`, `/private/tmp/tone-final-events.png`, `/private/tmp/tone-final-updates.png`, `/private/tmp/tone-final-mobile-filter.png`.
- 현재 B안 :3001, 기존 A안 :3000. B안 개발 캐시는 `/private/tmp/ecosystem-colorful-next-before-tone-unification-20261016`에 보관 후 재생성했다.

### 달력 색상 배치 최종 조정

사용자 요청에 따라 월 헤더는 중립 배경으로 바꾸고, 일정 있는 날짜 및 직접 선택한 날짜에 오른쪽 카드 헤더의 공통 gradient를 적용했다. 색 있는 칸의 작은 글씨는 흰색으로 대비를 확보했다. 행사·매크로 각각 브라우저에서 헤더 background-image=none 및 날짜 칸/카드 gradient 일치를 확인했다. 화면: `/private/tmp/calendar-neutral-header-colored-dates.png`.

### 최신 결정 — 색 면적 축소

날짜 칸의 모든 색 채움을 제거했다. 일정은 카드 헤더 팔레트의 작은 점과 건수, 선택은 1px 테두리, 오늘은 날짜 숫자의 원형 테두리로 구분한다. 체크 표시는 제거하고 제목은 밝은 회색으로 유지한다. 행사·매크로 브라우저에서 모든 날짜 칸 background-image=none 확인. 증빙: `/private/tmp/calendar-quiet-events.png`.

후속 사용자 조정: 칸 구분을 보완하기 위해 일정 있는 날짜에는 카드 계열색 14%, 선택 날짜에는 22%의 옅은 색 면을 추가했다. 빈 날짜는 중립 배경 유지. 실제 행사/매크로 computed style 확인. 증빙: `/private/tmp/calendar-soft-tint.png`.
