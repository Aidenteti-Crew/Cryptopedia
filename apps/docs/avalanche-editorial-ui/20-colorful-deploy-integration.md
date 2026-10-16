# 컬러풀 버전 deploy 통합 검증

- 작업 브랜치: `feature/ecosystem-colorful`.
- 푸시 대상: `https://github.com/Aidenteti-Crew/Cryptopedia.git`의 `deploy`.
- 확인한 원격 기준: `1cbc7e9b25fd81502597bdec34b3ee7f10e13955`. fetch 후 merge 결과 Already up to date, 충돌 없음.
- 포함: 네 화면의 검색/필터/전체 페이지 조회, 공통 컬러 카드와 히트맵 팔레트, 차분한 달력, 개발 목록/상세 읽기 구조 및 고정 높이 독립 스크롤과 상단 이동/복귀.
- 제외: 로컬 node_modules 심볼릭 링크, 환경 변수/설정 비밀, 생성된 빌드 출력.

## 푸시 전 검증

| 항목 | 결과 |
|---|---|
| 웹 관련 회귀 테스트 | 191개 통과 |
| API 관련 단위 테스트 | 21개 통과 |
| 웹 프로덕션 빌드 | next build 성공, 22개 정적 페이지 생성 |
| API 프로덕션 빌드 | nest build 성공 |
| 전체 웹 타입 검사 | 기존 KaaS 오류 8개, 이번 변경 신규 오류 없음 |
| 충돌/공백 검사 | 미해결 충돌 없음, git diff --check 통과 |

기존 브랜치/작업 폴더는 별도로 보존한다. 실제 Dokploy Redeploy는 사용자 수동 작업이다.
