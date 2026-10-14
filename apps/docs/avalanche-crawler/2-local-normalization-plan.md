# 로컬 DB·수집 정상화

2026-10-14 사용자 승인: 적합성 검토의 1번부터 진행한다. 현재 로컬 Docker `cherry-postgres`(pgvector/pg16)의 15432 포트와 `cherry_db`가 대상이다. 원격·운영 DB에는 적용하지 않는다.

1. 로컬 대상 확인 → content 스키마·데이터를 권한 0600의 임시 dump로 백업 → 기존 트랜잭션 마이그레이션 적용 → 새 테이블 7개 확인.
2. Pipeline 의존성·빌드 준비. 환경변수 값은 출력하지 않는다. API의 로컬 DB 설정에서 연결 주소를 만들고 기존 root DATABASE_URL로 원격 DB에 연결하지 않는다.
3. 프로젝트 디렉터리·릴리스·ACP·Builder Hub·활성 Luma 캘린더 등 무료 공식 소스부터 수집. 유료 키가 없는 Apify/X와 미활성 캘린더는 제외.
4. 조회 API 200·실제 레코드와 계약 확인. DB 통합 테스트는 로컬 테스트 데이터만 사용하며 테스트가 삽입한 자료는 테스트가 정리한다.
5. 현재 LLM_API_KEY·LLM_MODEL·APIFY_TOKEN 미설정. AI 분류·채점과 X 수집은 프로젝트용 키 설정 후 진행하며 회원 키를 사용하거나 결과를 조작하지 않는다.

| 검수 | 상태 |
|---|---|
| 로컬 Docker·포트·DB 확인 | ✅ |
| 백업·테이블 생성 | ✅ |
| 무료 공식 소스 수집 | ✅ |
| 조회 API·통합 테스트 | ✅ |
| AI 분류·채점 | ✅ |

웹 데이터 연결·운영 배포·원격 DB 변경은 이번 단계에 포함하지 않는다. Codex의 승인 설정은 사용자가 변경하며 에이전트가 샌드박스 정책을 우회하지 않는다.

## 실행 결과

- 백업: `/var/folders/rr/42mr9g3n3p52l1k9q2bkvskc0000gn/T/cryptopedia-chain-feed-backup-570beN/content-before.dump` (폴더 0700, 파일 0600).
- 기존 Avalanche 분류 마이그레이션을 로컬 DB에 적용해 새 테이블 7개 생성. `/api/ecosystem?chain=avalanche`가 HTTP 500 → 200으로 변경됨.
- 공식 소스 7종 수집 성공. 프로젝트 235개, 행사 16개, 원문 기사 87개. AvalancheGo는 설정된 7일 범위에 맞지 않는 항목 10개를 제외했으며 Coreth·Subnet-EVM 각 10개, ACP 36개, Builder Hub 글 31개를 저장.
- GitHub 수집은 기존 GitHub 로그인 인증을 읽기 요청에만 사용하며 토큰은 파일이나 로그에 출력하지 않음. 유료 Apify·X와 LLM 호출은 수행하지 않음.
- 실제 로컬 DB 통합 테스트 포함 pipeline 181개, API 57개 전부 통과. Pipeline 빌드와 세 로컬 관리 스크립트 문법 검사 통과.
- 재실행 도구: `scripts/db/prepare-chain-feed.cjs --apply`, `scripts/db/collect-local-chain-feed.cjs`, `scripts/db/verify-local-chain-feed.cjs`. 세 도구 모두 원격 연결을 거절하며 로컬 Docker 대상 확인 후 실행.
- 남은 작업: 프로젝트용 LLM_API_KEY·LLM_MODEL 설정 후 원문 분류·채점. 현재 매크로·기술 업데이트 표는 분류 전이라 비어 있다. 자동 주기 실행과 웹 연결은 후속.

## 키 설정 후 AI 분류·채점 완료

- 사용자가 루트 `.env`에 LLM·Apify 설정을 추가. 키 값을 출력하거나 다른 파일에 저장하지 않고 설정 여부만 확인.
- NVIDIA 호환 API에서 기사 2건 dry-run 분류 성공 후 실제 분류 실행. 원문 145건 전부 SUCCESS, 실패 0.
- 등록된 X 계정 3개를 설정된 제한으로 수집: Avalanche X 22건, Team1 Korea X 21건, Avalanche Team1 X 15건. 무료 소스 원문 87건과 합쳐 총 145건.
- 분류 결과: MACRO 26, TECH_UPDATE 72, GENERAL 18, EVENT 12, NOISE 17. 날짜가 확인되지 않은 EVENT 9건은 행사 저장에서 제외. EVENT 2건 신규 저장, 1건은 기존 행사와 연결.
- 실제 제공 데이터: 프로젝트 235, 행사 18, 매크로 26, 기술 업데이트 72, 일반 글 18. 프로젝트와 행사 모두 중요도 점수 존재. 프로젝트 235개와 기존 캘린더 행사 16개는 별도 채점, 추가 행사 2개는 기사 분류에서 받은 점수를 유지한다.
- 실제 DB 통합 테스트 포함 pipeline 181개·API 57개 통과. 조회 API 전부 HTTP 200, 매크로·기술 업데이트·일반 글·행사 응답이 웹 Zod 계약을 통과.
- 재실행 도구 추가: `scripts/db/run-local-chain-feed-ai.cjs`의 `probe`, `collect-x`, `classify`, `score`, `status`와 읽기 전용 `scripts/db/check-local-chain-feed-api.cjs`. 로컬 Docker DB만 허용하며 정상 분류·채점 자료는 다시 처리하지 않는다.
- 최종 확인: 분류 실패 0, 점수 없는 프로젝트·행사 0. 증빙 `/private/tmp/cryptopedia-local-feed-ai-result.json`.
- 이번 단계는 로컬 DB·수집·분류·채점·조회 정상화까지 완료. 웹 API 연결·주간 통계·자동 실행 주기·배포는 후속이다.
