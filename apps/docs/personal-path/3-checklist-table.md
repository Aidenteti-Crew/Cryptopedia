# 플랫폼 구조 개편 + 맞춤 학습 경로 — 검수표

범례: `-` 미착수 · `W` 진행 중 · `T` 테스트 통과 · `✅` 검수 완료
기준선(2026-11-04, 착수 전): `npx tsx --test lib/*.test.ts components/cherry/editorial/*.test.ts*` → 198 통과 / 0 실패 (Node 23)

## Phase 1 — 플랫폼 구조 (Part A)
| 항목 | 상태 | 메모 |
|---|---|---|
| 1-1 `/` 가 플랫폼 입구(랜딩)를 그린다 | T | AI · 브라우저 · curl 200 · 캡처 root.png |
| 1-2 `/about` → `/` 로 redirect (308) | T | AI · curl 상태코드·Location · curl 308 → / |
| 1-3 `/knowledge` 가 지식 홈(생태계 홈)을 그린다 | T | AI · 브라우저 · curl 200 · 캡처 knowledge.png |
| 1-4 `pathForEditorialView(ecosystem)` = `/knowledge`, 사이드바·브레드크럼 "생태계 홈"이 `/knowledge` 로 간다 | T | AI · 라우트 테스트 · 라우트 테스트 (cryptopedia-routes.test.ts) |
| 1-5 하위 주소(`/academy` `/concepts` `/skills` `/projects` `/macro` `/updates` `/chains` `/builder-test` + 상세) 그대로 200 | T | AI · curl · curl 전부 200 |
| 1-6 지식 쪽 행사: `/knowledge/events` · `/knowledge/events/archive` · `/knowledge/events/:id` 동작, 사이드바 "행사·이벤트"가 새 주소로 | T | AI · 라우트 테스트 + 브라우저 · 라우트 테스트 + curl 200 (상세 id 화면은 실데이터 미확인) |
| 1-7 옛 `/events/archive` · `/events/:id` → `/knowledge/events/...` redirect | T | AI · curl · curl 308 → /knowledge/events/... |
| 1-8 `/events` · `/careers` 빈 페이지("준비 중") | T | AI · 브라우저 · 캡처 careers.png · mobile.png |
| 1-9 입구 상단 nav = 채용 · 행사/이벤트 · 블록체인 지식, 블록체인 지식 hover 시 하위 띠, 컬렉션 버튼 없음 | W | AI · 브라우저(데스크톱·모바일) · 메뉴 3개·컬렉션 없음 캡처 확인 / hover 띠·모바일 패널은 사용자 브라우저 확인 필요 |
| 1-10 지식 섹션 로고 → `/`, 지식 섹션 체인 선택 후 → `/knowledge` | W | AI · 브라우저 · 코드 반영(로고 → /, 체인 선택 → selectScreen) / 클릭 확인은 사용자 |
| 1-11 지식 홈에서 빌더 유형 테스트 배너가 사라짐, `/builder-test` 는 그대로 | T | AI · 브라우저 · 홈 테스트 갱신 · 캡처 knowledge.png (캐러셀 전체 폭) |
| 1-12 기존 테스트 전부 통과(라우트 테스트는 새 주소로 갱신) + `tsc --noEmit` 새 에러 없음 | T | AI · 197/197 통과(빌더 설문 테스트 1개 삭제) · tsc 새 에러 0 |

## Phase 2 — 경로 계산 로직
| 항목 | 상태 | 메모 |
|---|---|---|
| 2-1 트랙·해본 것·목표의 모든 id 가 hub.json 에 실재 | T | AI · 테스트 · learner.test.ts |
| 2-2 선행 개념 자동 포함(예: C-Chain → Primary Network), 선행이 항상 먼저 | T | AI · 테스트 · learner.test.ts |
| 2-3 해본 것 → known, known/done 은 시작점에서 건너뜀, 시작점 = 처음 남은 단계 | T | AI · 테스트 · learner.test.ts |
| 2-4 hub 에 없는 id 는 빠지고 에러 없음 | T | AI · 테스트 · learner.test.ts |
| 2-5 저장소: 빈 저장소·깨진 JSON·버전 불일치 → 빈 상태, 저장 실패해도 메모리로 동작 | T | AI · 테스트 · learner.test.ts |
| 2-6 케이스 완료 = 기존 `cryptopedia-study:<케이스>` 체크 전부 완료 | T | AI · 테스트 · learner.test.ts |

## Phase 3 — 설문 · 전체 화면 시작
| 항목 | 상태 | 메모 |
|---|---|---|
| 3-1 경로 없음 + 나가기 안 함 → `/knowledge` 진입 시 전체 화면 설문 | T | AI · 브라우저 · CDP 흐름 · d1-onboarding-mode.png |
| 3-2 나가기 → 지식 홈, 새로고침·재방문 시 안 뜸 | T | AI · 브라우저 · CDP: 나가기 후 / 새로고침 후 안 뜸 |
| 3-3 하위 주소 직접 진입 시 안 뜸 | T | AI · 브라우저 · CDP: /concepts/concept-evm 직접 진입 시 안 뜸 |
| 3-4 처음부터 쌓기 4단계 / 목표 5단계, 이전·수정으로 돌아가기 | W | AI · 브라우저 · 목표 5단계·쌓기 4단계 진행 확인 / 이전·수정 버튼은 사용자 확인 |
| 3-5 경로 만들기 → 저장값(localStorage) 이 스키마대로 | T | AI · 브라우저 콘솔 · CDP: 저장값 스키마대로 (profile·paths·activePathId·onboardingDismissed) |
| 3-6 모바일 폭(390px)에서 가로 스크롤 없음, 하단 버튼 고정 | T | AI · 브라우저 · CDP 390px: 가로 스크롤 없음 · m1·m3 캡처 |

## Phase 4 — 내 경로 · 지도 개인화
| 항목 | 상태 | 메모 |
|---|---|---|
| 4-1 `/academy/my-path`: 다음 할 것 · 진행률 · 지도 · 순서 목록 | T | AI · 브라우저 · d5-my-path.png |
| 4-2 지도 ✓·▶·번호가 계산 결과와 일치 (입문자·주니어·시니어 3조건) | T | AI · 브라우저 · 주니어(목표)·입문자(쌓기) 확인 · 시니어는 테스트로만 |
| 4-3 기존 학습 지도 페이지(`/academy/skill-graph`) 모양·동작 그대로 | T | AI · 브라우저 + 기존 테스트 · d7-skill-graph.png · 기존 테스트 통과 |
| 4-5 지식 홈 캐러셀 반 폭 + "내 경로" 카드(없으면 만들기 · 있으면 이어서 하기 → 첫 단계 열기) | T | AI · d6-home-card.png · 시작하기 → /concepts/concept-evm |
| 4-4 사이드바 아카데미 첫 메뉴 "내 학습 경로" | T | AI · 브라우저 · d5 사이드바 |

## Phase 5 — 개념 상세 · 여러 경로
| 항목 | 상태 | 메모 |
|---|---|---|
| 5-1 경로 안 개념: 위 띠(n/전체·다음) + 완료 박스, 경로 밖 개념: 기존 그대로 | T | AI · 브라우저 · concept-article.tsx · CDP c-validator.png (경로 안: 태그·완료 박스 / 경로 밖: 기존처럼) |
| 5-2 다 읽었어요/이미 알아요 → ✓, 다음 단계로, 새로고침 후 유지, 완료 취소 | T | AI · 브라우저 · CDP: 다 읽었어요 → done 저장 · 배너·다음 버튼이 다음 개념으로 |
| 5-3 경로 추가(하는 일·해본 것 불러옴) · 전환 · 삭제, 완료 기록 공유 | T | AI · 브라우저 · my-path-page 전환·추가·삭제 · 완료 기록 공유 |

> Phase 1 증빙: `/private/tmp/claude-501/-Users-damin-Documents-Aidenteti-Cryptopedia/0fa3459c-4c28-4577-b505-dc49c5e550f5/scratchpad/p1/` (root·careers·knowledge·mobile 캡처)

> Phase 2~4 증빙: `/private/tmp/claude-501/-Users-damin-Documents-Aidenteti-Cryptopedia/0fa3459c-4c28-4577-b505-dc49c5e550f5/scratchpad/p3b/` (CDP 흐름 캡처), 흐름 스크립트 `/private/tmp/claude-501/-Users-damin-Documents-Aidenteti-Cryptopedia/0fa3459c-4c28-4577-b505-dc49c5e550f5/scratchpad/cdp/flow.mjs` · 테스트 205/205

## Phase 6 — 2026-11-04 추가 요청
| 항목 | 상태 | 메모 |
|---|---|---|
| 6-1 설문 첫 단계 체인 선택 (준비 중 체인 비활성, Ethereum 포함) · 경로에 chainId | T | AI · learner.test · CDP |
| 6-2 미들 빌더(3~5년차) 역할·트랙, "에이전트로 스킬 바로 써보기" 목표 | T | AI · learner.test |
| 6-3 하단 고정 '내 학습 경로' 띠 (지식 섹션 전체 · 내 경로 페이지에서는 숨김 · 이번 방문 닫기) | T | AI · CDP b-*.png |
| 6-4 지식 섹션 밝은 테마 (라벤더·포도 포인트) · 입구/채용/행사는 어두운 포도색 유지 | T | AI · CDP l-*.png |
| 6-5 개념 상세 구조 개편 (리드 · 먼저 읽으면 좋아요 · 핵심 포인트+근거 · 지금 상태 · 누구에게) | T | AI · hub-pages.test · CDP c-*.png |
| 6-6 개념 16개 초안 내용 사람 검토 → contentStatus REVIEWED | - | **사용자/팀** · hub.json concepts[].points·audience·relations[].reason |

## 성과 목표 (완료 기준)
- 위 전 항목 `T` 이상, 사용자 브라우저 확인 후 `✅`.
- 테스트: 기준선 198개 + 새 테스트 전부 통과, `tsc --noEmit` 에 이번 작업으로 생긴 에러 0.
- 실동작: 새 브라우저(저장소 비움)로 `/` → 블록체인 지식 → 전체 화면 설문 → 경로 만들기 → 첫 개념 완료 → 지도 ✓ 까지 한 번 끝까지 진행해 캡처를 남긴다.
