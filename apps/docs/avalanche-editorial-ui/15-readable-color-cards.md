# 가독성을 우선한 공통 컬러 카드

## 구현 범위

사용자 승인: 네 화면의 항목을 홈의 컬러와 연결되는 카드로 통일한다. 프로젝트 보라, 매크로 블루, 행사 앰버, 개발 민트. 공통 배경·테두리·16px 모서리·20px 여백·12px 항목 간격을 사용한다. 날짜 그룹 및 버전 연결선은 카드 밖에 유지한다.

## 구현 순서

1. 공통 카드 CSS와 프로젝트 카드/리스트에 적용하고 실제 데이터를 확인한다.
2. 뉴스·행사·개발 월별 목록·제품별 릴리스에도 같은 규칙을 적용한다.
3. 데스크톱/모바일 경계·대비·넘침, 검색·탭·원문 링크 회귀를 확인한다.

## 검수 기준

- 텍스트 뒤 배경은 어둡고 일정하며 제목/요약/메타 정보의 대비가 충분하다.
- 색뿐 아니라 간격과 테두리로 항목을 구분할 수 있다.
- 프로젝트의 카드/리스트 양쪽, 달력 안팎 뉴스/행사, 개발 두 탭 모두 카드가 적용된다.
- 카드가 가로로 넘치지 않고 검색·필터·상세·공식 링크를 유지한다.

## 구현 및 검증 결과

- `apps/web/app/globals.css`의 `.editorial-content-card`가 배경·테두리·여백·모서리·hover/focus를 공통 제어한다. 보조 텍스트는 카드 안에서 #b5bfcb로 조정한다.
- 프로젝트 카드/리스트, 매크로, 행사, 개발 월별 목록 및 버전 타임라인에 적용했다.
- 관련 회귀 테스트 17개 통과, 변경 TSX ESLint와 git diff --check 통과.
- 실제 1440px 데스크톱 및 390px 모바일에서 네 화면을 확인했다. 모바일 가로 넘침 없음. 프로젝트 양쪽 보기와 릴리스 전체 11개 카드 확인.
- 기본 카드의 가장 밝은 배경 혼합색 대비 보조 텍스트 명암비: 보라 7.23, 블루 6.84, 앰버 6.53, 민트 6.92. 제목은 더 밝은 기존 본문색을 유지한다.
- 화면 증빙: `/private/tmp/projects-color-cards.png`, `/private/tmp/projects-list-color-cards.png`, `/private/tmp/macro-color-cards.png`, `/private/tmp/events-color-cards.png`, `/private/tmp/updates-color-cards.png`, `/private/tmp/releases-color-cards.png`.
- 모바일 증빙: `/private/tmp/projects-color-mobile.png`, `/private/tmp/macro-color-mobile.png`, `/private/tmp/events-color-mobile.png`, `/private/tmp/releases-color-mobile.png`.
