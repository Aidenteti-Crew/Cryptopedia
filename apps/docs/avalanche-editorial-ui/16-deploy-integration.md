# deploy 최신 변경 통합

- 대상: `feature/ecosystem-readability`에 `Aidenteti-Crew/Cryptopedia`의 `deploy` 반영.
- 기준 커밋: `51c04b7` → `1cbc7e9b25fd81502597bdec34b3ee7f10e13955` (7개 커밋, fast-forward).
- 기본 origin은 기존 저장소를 가리켜 변경하지 않고 올바른 저장소 URL에서 직접 fetch했다.
- 병합 전 54개 변경 파일은 stash `c6288b29d113fc8bde665928bd9f97712a431695`에 원본 보존. 임시 보관함을 삭제하지 않는다.

## 충돌 해결

- globals.css: 원격 플럼 테마/스크롤바/서체와 공통 컬러 카드를 함께 유지. 카드 바탕과 hover는 원격의 surface/hover 변수를 따른다.
- editorial-app.tsx: 원격 URL router.push와 신규 홈/빌더 테스트를 유지하면서 네 화면의 검색 상태 키와 이동 전 스크롤 저장 연결.
- project-directory-page.tsx: 검색/분야 복수 선택/보기 전환 유지. 원격 홈의 category URL 진입을 복수 선택에 연결하고 초기화 시 URL 조건도 제거.
- events-page.tsx: 날짜·원문 정보와 달력/목록 양방향 연결 유지.
- feed-page.tsx: 매크로/개발 전용 화면 연결 유지. 원격에서 제거한 필수 eyebrow prop은 선택형으로 호환.
- content-entry-row.tsx: 일반 문서의 원격 간격/행간과 피드의 공개일/출처/요약 구분을 함께 유지.
- 원격 footer는 seal.svg를 쓰는데 테스트가 seal.png를 기대하던 불일치를 실제 자산에 맞게 수정.

## 검증

- 웹 관련 회귀 테스트 185개 통과, API 단위 테스트 21개 통과.
- 충돌 해결 파일 ESLint 통과. 전체 웹 타입 검사에는 기존 KaaS 오류 8개만 남음.
- 브라우저: `/` 새 홈 로드 오류 없음, `/ecosystem/macro` 10개, `/ecosystem/events` 16개, `/ecosystem/updates` Coreth 4개 및 타임라인 확인.
- `/ecosystem/projects?category=DeFi`: 분야 선택 DeFi, 결과 12개 확인.
- 화면: `/private/tmp/deploy-merge-home.png`, `/private/tmp/deploy-merge-updates.png`.
- 로컬 작업 미커밋 상태 유지. 원격 push/배포 없음.
