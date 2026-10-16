# 네 화면 통합 UI/UX 구현 결과

완료 기준일: 2026-10-16. 브랜치 feature/ecosystem-readability.
정본 기획: 12-ecosystem-four-screen-ux-plan.md.

## 구현 결과

| 화면 | 반영 내용 |
|---|---|
| 체인·프로젝트 | 분야 체크박스와 검색, 24개씩 더 보기, 카드 3/2/1열과 간결한 리스트, 홈페이지/문서 각각의 링크, 선택 분야 요약 |
| 매크로 소식 | 유형 아이콘 탐색, 날짜·시각·출처·유형·제목·요약 두 줄, 원문 링크와 상세 패널, 공개일 범위/복수 출처 필터 |
| 행사·이벤트 | 시간(KST)·상태·행사명·주최자·장소 순서, 실제 이미지가 있을 때 썸네일, 실제 신청 링크가 있고 신청 가능한 상태일 때 참가 신청 우선, 날짜 정렬 |
| 개발 업데이트 | 월별 Changelog 및 제품별 버전 타임라인, 공통 체크박스 필터, 제품 태그 탐색과 상세/공식 링크 유지 |

- 네 화면 모두 홈의 배경/글꼴/금색 강조/보라·민트 보조색/둥근 카드와 내비게이션을 재사용한다. 홈의 시각 요소 자체를 수정하지 않았다.
- 공통 필터는 한 번 열면 체크박스를 직접 선택할 수 있는 팝오버다. 바깥 클릭/Escape/닫기/결과 보기로 닫히며, 모바일에서는 내부 옵션만 스크롤되고 결과 버튼은 남는다.
- 같은 그룹의 선택은 OR, 다른 그룹은 AND. 미선택은 전체다. 출처/종류/참여 방식의 실질 선택지가 하나면 해당 필터를 숨긴다.
- 날짜는 시작일/종료일을 모두 선택하고 적용해야 결과가 바뀐다. 상세 조건 초기화는 검색어/주요 유형을 유지하고 전체 초기화는 기본 정렬까지 복원한다.
- 매크로/행사 달력과 목록은 데스크톱 1:1, 같은 시작 위치와 높이. 모바일은 세로 배치. 빈 날짜 안내는 직접 선택한 경우에만 보이고 가까운 날짜로 이동할 수 있다.
- 행사 설명이 단순 Hosted by... 형식일 때는 주최자 줄로 합쳐 같은 정보를 반복하지 않는다. 임의의 로고·매진·잔여석·금융 지표를 추가하지 않았다.
- 검색·필터·보기·더 보기 개수·보고 있는 날짜는 체인/화면별 브라우저 메모리에서 복원한다. 페이지 스크롤 위치도 화면 이동 시 저장하고 복귀 후 복원한다. 기존 카드/리스트 및 달력 보기 설정은 localStorage와 호환한다. 검색어는 서버/영구 저장소에 저장하지 않는다.

## 수집 목록 전체 검색

- 프로젝트 API에 이름+ID 커서, 매크로 API에 공개일+ID 커서를 추가했다. 같은 이름/시각의 항목도 ID로 정렬해 페이지 경계를 안정화한다.
- 웹은 모든 페이지를 가져온 뒤 필터/검색을 적용한다. 프로젝트는 500개, 매크로는 100개를 넘는 이력도 포함한다.
- 행사 API의 상태별 nextCursor도 끝까지 읽고 ID 중복을 제거한다. 개발 업데이트의 기존 전체 페이지 처리를 유지한다.
- 기존 커서 없는 API 호출은 호환된다. DB 쓰기/스키마 마이그레이션은 없다.

## 검증 결과

| 항목 | 결과 |
|---|---|
| 웹 관련 전체 회귀 테스트 | 117개 통과 |
| 후속 변경의 핵심 회귀 테스트 | 23개 통과 |
| API 커서/원문 근거/공식 릴리스 검증 단위 테스트 | 21개 통과 |
| 변경 파일 ESLint / git diff --check | 통과 |
| 전체 타입 검사 | 웹의 기존 KaaS 오류 8개, API의 기존 KaaS 테스트 오류 1개로 실패. 변경 파일 신규 오류 없음 |
| 실제 프로젝트 페이지 조회 | 37건씩 7페이지 / 235건 / 중복 0 / 전체 조회 순서와 일치 |
| 실제 매크로 페이지 조회 | 3건씩 4페이지 / 10건 / 중복 0 / 전체 조회 순서와 일치 |
| 프로젝트 사용 흐름 | 첫 24개 → 48개 더 보기, 복귀 후 48개 유지. Analytics & Data 15개, 바깥 클릭 닫기, 리스트 전환 확인 |
| 매크로 기간 선택 | 첫 날짜 선택 후 10개 유지/적용 비활성. 10.13–10.14 적용 후 2개. 상세 원문 URL 확인 |
| 행사 달력/목록 | 각각 520×688px, 같은 top. 10.16 빈 날짜 → 가까운 10.17 이동. PageUp 후 9월/9.22로 양방향 동기화 확인 |
| 개발 복수 필터 | Coreth+Subnet-EVM 선택 시 11개. 제품별 독립 단계/상세/공식 비교 링크 유지 |
| 모바일 필터 | 390px에서 팝오버가 화면 안에 위치, 내부 스크롤 및 결과 버튼(하단 831px) 확인 |
| 네 화면 반응형 | 실제 Chrome 1440px 및 각 화면 834/390px 검증. 모든 화면 overflow=false |

실제 API 검증 스크립트: /private/tmp/verify-ecosystem-pagination.py.
브라우저 검증: 별도 Chrome 탭 1052932449. 임시 viewport는 원래대로 복원했다.

## 이번 구현의 주요 파일

```text
apps/web/components/cherry/editorial/discovery-filters.tsx       신규 공통 필터·체크박스·유형 바·결과
apps/web/components/cherry/editorial/discovery-state.ts         신규 화면 상태·스크롤·보기 보존
apps/web/components/cherry/editorial/macro-news-page.tsx        신규 뉴스 목록·상세
apps/web/components/cherry/editorial/project-directory-page.tsx 디렉터리 개편
apps/web/components/cherry/editorial/feed-page.tsx              뉴스/개발 화면 연결 정리
apps/web/components/cherry/editorial/events-page.tsx            일정 정보·필터·정렬 개편
apps/web/components/cherry/editorial/development-updates-page.tsx 공통 탐색 적용
apps/web/components/cherry/editorial/synced-event-timeline.tsx   행사 정렬 지원
apps/web/components/cherry/editorial/editorial-app.tsx           체인별 상태 키·복귀 위치 연결
apps/web/components/ui/popover.tsx                             공통 닫기 요소 제공
apps/web/lib/editorial-discovery.ts                            행사 장소 검색 범위 보완
apps/web/lib/cryptopedia-data.ts                               전체 페이지 로딩
apps/web/lib/cryptopedia-types.ts                              선택 커서 필드
apps/web/lib/cryptopedia-live.test.ts                           501/101개와 행사 후속 페이지 검증
apps/web/components/cherry/editorial/ecosystem-pages.test.tsx   새 검색 문구 및 기존 동작 검증
apps/api/src/modules/chain_feed/feed-query.ts                   프로젝트 커서 검증
apps/api/src/modules/chain_feed/feed-query.spec.ts              유효·비정상 커서 테스트
apps/api/src/modules/chain_feed/chain-feed.service.ts            프로젝트/매크로 커서 조회
apps/api/src/modules/chain_feed/chain-feed.controller.ts         매크로 커서 연결
apps/api/src/modules/chain_feed/chain-feed.types.ts              추가 선택 응답 필드
```

## 화면 증빙

- /private/tmp/ecosystem-projects-redesign.png
- /private/tmp/ecosystem-macro-redesign.png
- /private/tmp/ecosystem-events-redesign.png
- /private/tmp/ecosystem-updates-redesign.png

## 남아 있는 데이터 사항

기존 조사에서 확인한 AvalancheGo 수집 누락 및 일부 저장 적용 시각의 충돌은 수집/정합성 후속 과제다. UI와 전체 수집 목록 검색 개선을 공식 데이터 수집 완전성으로 표현하지 않는다. 실제 제공되는 원문/메타데이터만 보존하며 확인되지 않은 값으로 채우지 않았다. 커밋·푸시·배포는 실행하지 않았다.
