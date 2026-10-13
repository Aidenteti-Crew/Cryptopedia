# Cryptopedia 현재 목차 ↔ 포크 이전 웹 매칭표

> 기준일: 2026-10-10
> 포크 이전 웹 기준: `2070ed6`의 `apps/web/app/page.tsx`
> 현재 목차 정본: `apps/web/lib/cryptopedia-taxonomy.ts`
> 전체 작업 상태: `CRYPTOPEDIA-WORKPLAN.md`

## 읽는 방법

**기능이 대응하는 것과 실제 코드를 재사용한 것은 다르다.** 아래 표는 기존 웹의 어떤 기능이 현재 페이지에 대응하는지와 현재 구현 방식을 함께 기록한다.

현재 직접 재사용한 핵심은 다음 컴포넌트다.

| 기존 컴포넌트 | 현재 사용하는 곳 | 재사용 내용 |
|---|---|---|
| `HeroCarousel` — `apps/web/components/cherry/nd-overview-page.tsx` | 생태계 홈 최상단 소식 | 기존 순환·자동재생·스냅·인디케이터와 그라디언트 재사용. 내부 페이지 이동·모바일 표시·일시정지 추가 |
| `CategoryTreemap` — `apps/web/components/cherry/buzz-treemap.tsx` | 생태계 홈 Buzz Distribution | 기존 면적 비중 차트 재사용. 블록체인 분야명·클릭 이동 추가, 현재 홈 예시 소식 건수로 계산 |
| `LandscapeGrid` — `apps/web/components/cherry/nd-landscape.tsx` | 체인·프로젝트 | 분야별 그리드와 선택 상태. 현재 디자인에 맞는 카드·상세 렌더링을 전달 |
| `ConceptRoadmap` — `apps/web/components/cherry/concept-reader-page.tsx` | 개념 상세 · 학습·스킬 그래프 | 개념 관계의 자동 배치와 글자 맞춤. 현재 색상과 개념 이동 기능 추가 |
| `InventoryCard` — `apps/web/components/cherry/kaas-workshop-panel.tsx` | 케이스 상세의 에이전트용 묶음 | 카드 표시와 지침 확인. 현재 디자인과 체크박스 선택 방식 추가 |
| `PatchNoteTimelineItem` — `apps/web/components/cherry/patch-notes-page.tsx` | 개발 업데이트 | 타임라인 항목 표시. 현재 색상과 변경 상세 이동 연결 |

기존 컴포넌트의 기본 사용 방식은 유지하며, 에디토리얼 표시를 선택적으로 확장했다. 새로운 정적 데이터는 `apps/web/public/cryptopedia/hub.json`, 계약과 연결 검증은 `apps/web/lib/cryptopedia-hub.ts`, 공급자는 `apps/web/lib/cryptopedia-data.ts`에 있다.

## ECOSYSTEM

breadcrumb 계층: `ECOSYSTEM → 생태계 홈 → 해당 메뉴 → 상세`.
생태계 홈 자체는 `ECOSYSTEM → 생태계 홈`이다.

| 현재 페이지 | 기존 웹의 대응 목차 | 현재 구현 방식 |
|---|---|---|
| 생태계 홈 | Newly Discovered › Overview | **기존 HeroCarousel·CategoryTreemap 재사용**, 두 스포트라이트 카드 구성을 사람 학습·에이전트 전달 카드로 응용 |
| 체인·프로젝트 | Cases › Domain Applications · Product Discovery | **기존 LandscapeGrid 재사용** |
| 매크로 소식 | Discourse › Market & Investment · Regulations · Big Tech Trends | 분류 역할을 대응시킨 새 기사 목록 |
| 행사·이벤트 | Discourse › Community | 주제만 대응. 행사 일정 화면은 신규 |
| 행사 아카이브 | 직접 대응 없음 | 신규 |
| 개발 업데이트 | Digest › Patch Notes + Research & Models › Model Updates | **기존 Patch Notes 타임라인 항목 재사용**, 변경 영향 연결 추가 |

## CHAPTERS

breadcrumb 계층: `CHAPTERS → 체인 기초 / 빌더 라이브러리 / 아카데미 → 해당 목록 → 상세`.
CHAPTERS는 생태계 홈의 하위로 표시하지 않는다.

| 현재 페이지 | 기존 웹의 대응 목차 | 현재 구현 방식 |
|---|---|---|
| 체인 기초 — 목차 | Learning › Basics | 블록체인용 목차 화면 신규 |
| 체인 개요 | Learning › Basics · Concept Reader | 개념 소개 역할 대응. 현재는 에디토리얼 문서 화면 |
| 네트워크·체인 구조 | Learning › Basics › Model Architecture · Model Components | 기술 구조 설명 역할 대응. 콘텐츠·화면은 블록체인용 |
| 합의·밸리데이터 | Learning › Basics · Advanced | 개념·심화 설명 역할 대응. 직접 대응하는 기존 토픽은 없음 |
| 핵심 용어 사전 | Learning › Concept Reader | 목록은 신규, **개념 상세의 관계 지도는 재사용** |
| 빌더 라이브러리 — 목차 | Newly Discovered › Engineering Blocks | 자료실 역할 대응. 목차 화면 신규 |
| 공식 문서 | Engineering Blocks › Frameworks · Prompting의 참고 자료 | 출처별 자료 탐색을 응용한 신규 목록 |
| 코드·도구 레퍼런스 | Engineering Blocks › Frameworks · Building Blocks | 개발 도구 탐색 역할 대응. 신규 목록 |
| 빌더 아티클 | Research & Models › Papers + Discourse › Technical Deep Dives · Insights & Opinions | 기술 자료 분류 역할 대응. 신규 목록 |
| MCP·에이전트 도구 | Engineering Blocks › Building Blocks + `/start` › Workshop의 MCP 카드 | 도구 소개·연결 안내 화면 신규 |
| 스킬 라이브러리 | Agent Shop › Knowledge Market + `/start` › Workshop의 스킬 카드 | 카탈로그 역할 응용. **기존 마켓 화면·구매 기능은 미사용** |
| 아카데미 — 목차 | Learning › Basics · Advanced | 학습 경로 역할 대응. 목차 화면 신규 |
| 입문 | Learning › Basics | 블록체인 입문 문서와 자료 연결 |
| 구조 이해 | Learning › Basics · Advanced | 개념을 연결하는 학습 흐름 응용 |
| 케이스별 실습 | Cases › Case Studies + `/start` › Workshop | 단계별 학습 화면 추가, **스킬 선택에 기존 InventoryCard 재사용** |
| 학습·스킬 그래프 | Learning › Concept Reader의 Learning Roadmap | **기존 ConceptRoadmap 재사용**, 실습·스킬 연결 추가 |

## 목차에서 열리는 상세 페이지

| 현재 상세 페이지 | 기존 웹의 대응 기능 | 현재 구현 방식 |
|---|---|---|
| 프로젝트·도구 상세 | Cases·Frameworks의 항목 상세 | 신규 상세 화면에 개념·실습·스킬 연결 |
| 개념 상세 | Learning › Concept Reader | **관계 지도 재사용**, 본문과 연결 자료는 새 데이터로 구성 |
| 참고 자료 상세 | Research·Discourse·Engineering Blocks의 자료 탐색 | 공통 에디토리얼 상세 화면 신규 |
| 케이스 상세 | Case Studies + Workshop | 학습 단계·체크리스트 신규, **스킬 카드 재사용** |
| 스킬 상세 | Workshop의 카드 원문 확인 | 지침·입력·결과물·다운로드 화면 신규 |
| 에이전트용 묶음 받기 | `/start` › Workshop · Connect | 묶음 구성 흐름 응용, 실제 Markdown 다운로드 구현 |
| 개발 변경 상세 | Patch Notes | 영향받는 개념·자료·실습·스킬 연결은 신규 |

## 현재 구현의 경계

- 현재는 **기존 웹 전체 페이지를 옮긴 형태보다, 핵심 공용 컴포넌트 여섯 개를 현재 목차와 디자인 안에 재사용한 형태**다.
- 기존 Connect의 원격 설치 기능과 InstallResultPanel은 현재 에디토리얼 앱에 연결하지 않았다. 스킬 파일·묶음을 실제 다운로드하고 연결 방법을 안내하는 단계다.
- 공식 출처와 블록체인 공통 / EVM 공통 / 체인 전용 적용 범위를 구분한다. 자료·프로젝트·개념·케이스·스킬·변경은 ID로 연결한다.
- 개발 업데이트는 수동 작성한 변경 영향 데모이며 실시간 수집이나 자동 영향 분석 결과가 아니다.
- 생태계 홈의 최신 소식 슬라이드는 현재 정적 예시다. Buzz Distribution은 조회수·시장 인기도가 아니라 소식 분야별 건수 비중이며, 현재는 홈 예시 소식만 집계한다. 실제 최근 7일 집계는 수집 연동 후 제공한다.
- **결제·마켓·Arena는 이번 범위에서 제외**한다. 기존 파일과 독립 `/start/*` 라우트는 보존한다.

## 후속 작업 때 확인할 것

- 새 페이지를 추가하거나 재사용 범위가 바뀌면 이 표의 대응 목차와 구현 방식을 함께 갱신한다.
- 실제 컴포넌트 import를 확인하기 전에는 기능상 대응만 있는 항목을 코드 재사용으로 기록하지 않는다.
- 상세 구현·검수는 `apps/docs/avalanche-editorial-ui/7-ecosystem-learning-skills-plan.md`, breadcrumb 계층은 `apps/docs/avalanche-editorial-ui/8-breadcrumb-plan.md`를 참고한다.
