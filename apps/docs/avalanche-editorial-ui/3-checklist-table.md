# Avalanche Editorial UI 검수표

범례: `-` 미착수 · `W` 진행 중 · `T` 테스트 통과 · `✅` 검수 완료

## Phase 1 — 데이터 계약과 정적 데이터

| 항목 | 상태 | 메모 |
|---|---|---|
| TypeScript 타입과 Zod 스키마가 같은 정의에서 생성됨 | ✅ | `cryptopedia-types.test.ts` 통과 |
| 잘못된 JSON이 validation 오류로 거절됨 | ✅ | repository 오류 테스트 통과 |
| Fundamentals·Builders·Academy 각 4개 항목 | ✅ | Figma 문구 대조 + 브라우저 확인 |
| Projects 5개 volume 순서 유지 | ✅ | repository 테스트 + 브라우저 확인 |
| Events upcoming/past 구분 | ✅ | 컴포넌트 테스트 + 브라우저 확인 |
| Events 목 JSON이 `EventFeedResponse` 구조를 사용 | ✅ | 실제 JSON schema 검증 통과 |
| crawler `published_at`을 행사 개최일로 사용하지 않음 | ✅ | 별도 `startsAt` 계약 적용 |
| Macro·Updates 예시 데이터가 JSON에만 존재 | ✅ | JSX에는 화면 문구만 존재 |
| 네트워크 오류와 데이터 오류를 구분함 | ✅ | `CryptopediaDataError.kind` 테스트 통과 |

## Phase 2 — 공통 셸과 디자인 시스템

| 항목 | 상태 | 메모 |
|---|---|---|
| Figma seal 전체 export PNG가 로컬 자산으로 존재하고 비어 있지 않음 | ✅ | 64×64 PNG · node `153:496` |
| 임시 Figma URL이 소스에 없음 | ✅ | 소스 검색 확인 |
| Cormorant·Noto Sans KR가 정확히 적용됨 | ✅ | Figma 레이어 폰트 대조 + 브라우저 확인 |
| Editorial 토큰이 `.editorial-root`에만 적용됨 | ✅ | 기반 테스트 통과 |
| 1440에서 Masthead 105px, index 244px | ✅ | `/private/tmp/cryptopedia-1440.png` |
| 834에서 Masthead 105px, index 200px | ✅ | `/private/tmp/cryptopedia-events-834.png` |
| 390에서 Masthead→index→본문 세로 배치 | ✅ | `/private/tmp/cryptopedia-fundamentals-390.png` |
| 현재 메뉴에 `aria-current="page"` 존재 | ✅ | 접근성 snapshot 확인 |

## Phase 3 — 주요 화면

| 항목 | 상태 | 메모 |
|---|---|---|
| `/` 첫 화면이 Figma Ecosystem이고 크롤링 대상 영역이 최상단 | ✅ | 브라우저 첫 진입 확인 |
| `Avalanche ↗`가 Chains 선택 화면으로 이동 | ✅ | 브라우저 확인 |
| 27개 화면 × 3개 node manifest 누락 0 | ✅ | `cryptopedia-figma-manifest.test.ts` |
| `/`만 Cryptopedia metadata를 사용하고 다른 라우트 metadata는 유지 | ✅ | page metadata + route build 확인 |
| Fundamentals 화면과 항목 4개 | ✅ | Figma `153:494` + 브라우저 확인 |
| Builders 화면과 항목 4개 | ✅ | Figma `153:2446` + 브라우저 확인 |
| Academy 화면과 항목 4개 | ✅ | Figma `154:638` + 브라우저 확인 |
| Projects 체인·프로젝트 그룹 | ✅ | Figma `190:1172` + 브라우저 확인 |
| Macro 목록과 메타데이터 | ✅ | Figma `190:2731` + 브라우저 확인 |
| Events 일정·주최·장소 | ✅ | Figma `190:4285` + 브라우저 확인 |
| Events 상태가 현재 날짜로 임의 재분류되지 않음 | ✅ | JSON status 유지 테스트 |
| 취소·연기 데이터가 있으면 일정 변경 그룹에 표시 | ✅ | 컴포넌트 테스트 통과 |
| Updates 목록과 메타데이터 | ✅ | Figma `190:5857` + 브라우저 확인 |
| 모든 화면에 loading·empty·error 상태 | ✅ | 상태 컴포넌트 테스트 통과 |

## Phase 4 — 상세 화면

| 항목 | 상태 | 메모 |
|---|---|---|
| Reader에 breadcrumb·제목·본문·관련 자료 | ✅ | Figma `154:7430` + 브라우저 확인 |
| Architecture 상세 | ✅ | Figma `154:8858` · 공통 reader 계약 |
| Validator 상세 | ✅ | Figma `154:10286` · 공통 reader 계약 |
| Glossary 목록 | ✅ | Figma `154:11750` · schema 검증 |
| Macro detail | ✅ | Figma `193:2999` · 공통 reader 계약 |
| Event archive | ✅ | 전체 보기→아카이브 브라우저 확인 |
| 책 5종이 공통 템플릿으로 렌더됨 | ✅ | 책 schema 5종 + Avalanche 브라우저 확인 |
| 목록→상세→뒤로가기 왕복 시 부모 화면 유지 | ✅ | reducer 테스트 + 브라우저 확인 |
| 빠르게 화면을 바꿔도 이전 요청이 새 화면을 덮어쓰지 않음 | ✅ | effect cancellation flag 코드 검토 |

## Phase 5 — 회귀와 최종 검증

| 항목 | 상태 | 메모 |
|---|---|---|
| 데이터 계약·taxonomy·repository 테스트 통과 | ✅ | 최종 전체 테스트 결과는 진행 로그 참조 |
| `npx tsc --noEmit` 신규 오류 0 | ✅ | 기존 KaaS 오류 8개만 재현 |
| `pnpm build` 성공 | ✅ | Next.js 16.2.0 production build |
| `/start` 정상 | ✅ | HTTP 200 + build route 확인 |
| `/login`과 `/start/login` 정상 | ✅ | HTTP 200 + build route 확인 |
| `/template/edit`와 `/demo-hanbit` 정상 | ✅ | HTTP 200 + build route 확인 |
| 1440·834·390 Figma 시각 비교 완료 | ✅ | `/private/tmp/cryptopedia-*.png` |
| 키보드만으로 주요 흐름 이동 가능 | ✅ | 모든 주요 이동 요소 button/a snapshot 확인 |
| Cherry 참고 저장소 변경 0 | ✅ | 참고 저장소 tracked diff 없음 |
| `apps/api`, SQL, DB 변경 0 | ✅ | 작업 저장소 diff 범위 확인 |
| 커밋·푸시·배포는 별도 사용자 승인 전 미실행 | ✅ | 현재 미실행 |

## 성과 목표 (완료 기준)

- `/`에 접속하면 Avalanche Cryptopedia가 즉시 표시된다.
- Figma의 Desktop 1440, Tablet 834, Mobile 390 구조가 재현된다.
- 모든 표시 콘텐츠가 검증된 JSON에서 온다.
- 정적 JSON을 API 구현으로 교체할 수 있는 repository 계약이 유지된다.
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`를 제외한 기존 Cherry 컴포넌트와 API·DB 코드는 삭제하거나 수정하지 않는다.
- `/start/*` 등 독립 라우트에 신규 회귀가 없다.
- 검수표 전 항목이 `✅`이고 증빙 경로가 기록된다.
