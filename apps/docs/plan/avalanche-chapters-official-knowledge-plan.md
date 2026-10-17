# Avalanche 공식 자료를 활용한 Chapters 기획

작성일: 2026-10-16  
상태: 데모 범위 진행

## 목표

Chapters에서 Avalanche 공식 문서와 Academy 자료를 찾아 읽고, 체인별 설명·실습·에이전트 스킬로 이어지게 한다. 사람은 목적과 수준에 맞는 학습 경로를 따라가고, 에이전트는 작업에 필요한 지식과 스킬을 구조화된 형태로 받을 수 있어야 한다.

## 현재 구조와 판단

- 내비게이션은 `체인 기초`, `빌더 라이브러리`, `아카데미` 세 챕터로 구성되어 있다.
- `빌더 라이브러리 > 공식 문서` 항목은 이미 있지만, 현재 목업 자료를 나열하는 수준이다.
- `HubData`에는 출처, 자료, 개념, 실습, 스킬과 이들 사이의 참조가 있어 그래프를 만들 출발점은 있다. 다만 출처에는 URL과 출처 유형 정도만 있고, 원문 버전·수집 시점·콘텐츠 해시·라이선스·특정 문단의 근거 위치가 없다. 데모 데이터라는 제약도 있어 현재 스키마를 운영용 지식 그래프로 바로 사용할 수는 없다.
- `articles.json`은 읽기 페이지와 공식 URL, 관련 자료를 지원하지만 공식 원문 조각과 편집 요약의 계보를 표현하지 않는다.

## 공식 자료에서 확인한 구조

Avalanche Builder Hub는 문서, Academy 과정, 통합 도구 목록과 개발자 도구를 함께 제공한다. 공식 문서에는 Primary Network, 노드·밸리데이터, Avalanche L1, 합의, SDK·API 등 서로 다른 학습 목적의 자료가 있다. 공식 Academy는 Foundations/Core/Advanced 단계와 과정별 선수 지식을 제공하므로, 이를 복사해 자체 강의로 재포장하기보다 공식 경로를 출처로 연결하고 우리만의 목적별 학습 경로를 덧붙일 수 있다.

확인한 공식 자료:

- [Avalanche Builder Hub 저장소](https://github.com/ava-labs/builders-hub) — 공개 저장소 README는 저장소를 BSD-3-Clause 라이선스로 표시하고 문서와 Academy 과정의 원본 경로를 안내한다. 개별 페이지·이미지의 재사용 조건은 항목별로 별도 확인한다.
- [Avalanche Builder Hub 문서](https://build.avax.network/docs)
- [Avalanche Academy 과정 목록](https://build.avax.network/academy)
- [Avalanche Fundamentals 과정](https://build.avax.network/academy/avalanche-l1/avalanche-fundamentals)
- [Primary Network](https://build.avax.network/docs/primary-network)
- [Avalanche L1s](https://build.avax.network/docs/avalanche-l1s)
- [AvalancheGo Architecture](https://build.avax.network/docs/nodes/architecture)
- [Avalanche SDK for TypeScript](https://build.avax.network/docs/tooling/avalanche-sdk)

## 원문을 가져와 가공하는 방식

원문은 **근거 데이터로 보존하고, 사용자에게는 출처가 분명한 학습 자료를 제공**하는 방식을 제안한다. 모든 공식 페이지를 통째로 복제해 Cryptopedia 콘텐츠처럼 노출하는 방식은 피한다.

1. **출처 목록:** 공식 URL, 문서 유형, 주제, 대상 사용자, 적용 범위, 공식 업데이트 시각을 등록한다. 원문 열기는 항상 공식 URL로 제공한다.
2. **원문 스냅샷:** 검색·변경 감지·근거 확인이 필요한 자료만 허용된 형식으로 보관한다. 정본 URL과 저장소 경로, 버전/커밋, 수집 시각, 해시, 언어, 라이선스/표기 조건을 기록한다. 라이선스가 확인되지 않은 콘텐츠나 이미지의 재배포는 하지 않는다.
3. **학습 단위:** 원문을 짧은 개념 설명, 작업 절차, 코드 예제, 사례, 체크리스트로 가공한다. 각 단위는 원문의 문서·제목·앵커 또는 저장소 경로로 역추적 가능해야 하며, 자체 요약과 공식 원문 인용을 명확히 구분한다.
4. **갱신 검토:** 원문 해시나 공식 버전이 바뀌면 변경 감지 상태로 올린다. 영향받는 개념·실습·스킬을 표시하고, 검토 전까지 확인이 필요한 자료임을 드러낸다. 자동 수집·LLM 추출만으로 학습 경로나 스킬을 자동 승인하지 않는다.

즉, 원문을 읽어 구조화하고 요약하는 과정은 필요하지만, 원문을 편집 콘텐츠로 덮어쓰는 것이 아니라 **불변의 출처 기록과 검토된 파생 지식이 서로 연결되는 구조**가 맞다. 화면에서 원문 전문을 보여줄 필요가 있는지는 자료별 라이선스와 공식 사이트의 삽입 허용 여부를 확인한 뒤 결정한다. 기본 UX는 우리 요약·핵심 발췌·출처 앵커와 공식 페이지 열기다.

## 파일럿 자료 인벤토리 — Primary Network와 Avalanche L1

우선순위는 학습 개념의 중심성, 구현에 필요한 구체성, 최신성 위험을 함께 고려한다.

| 우선 | 공식 자료 | 형식·역할 | 연결할 학습 단위 | 최신성·처리 메모 |
|---|---|---|---|---|
| P0 | [Primary Network](https://build.avax.network/docs/primary-network) | 공식 Docs · 정본 개요 | Primary Network, P/C/X 체인의 역할 | 학습 경로의 기준 설명. 체인별 역할과 변경 시점을 확인해 스냅샷 기록 |
| P0 | [Avalanche L1s](https://build.avax.network/docs/avalanche-l1s) | 공식 Docs · 개념 및 현재 구조 | Avalanche L1, 독립성, 검증자 집합, Primary Network 연결 | Etna/ACP-77 이후 설명을 현재 기준으로 삼고 검토 일자를 표시 |
| P0 | [ACP-77: Reinventing Subnets](https://github.com/avalanche-foundation/ACPs/blob/main/ACPs/77-reinventing-subnets/README.md) | 공식 ACP · 설계 근거 | L1 검증자 분리, P-Chain 연동, 연속 수수료 | 표준/프로토콜 근거. 현재 구현·활성화 내용은 공식 Docs와 함께 대조 |
| P1 | [AvalancheGo Architecture](https://build.avax.network/docs/nodes/architecture) | 공식 Docs · 노드 내부 구조 | 체인 매니저, VM, 합의 엔진, 노드에서 체인 구동 | 개념 설명 보강에 사용. Primary Network 입문 경로에서는 선택 자료 |
| P1 | [Avalanche Fundamentals 과정](https://build.avax.network/academy/avalanche-l1/avalanche-fundamentals) | 공식 Academy · 학습 경로 | 공식 과정의 모듈·선수 조건·학습 시간 | 과정 전체를 복제하지 않고 모듈 및 원문 수업 링크로 안내 |
| P1 | [Avalanche L1s — Multi-Chain Architecture 수업](https://build.avax.network/academy/avalanche-l1/avalanche-fundamentals/03-multi-chain-architecture-intro/03-L1) | 공식 Academy · 개념 강의 | Avalanche L1 정의와 독립성 | 이해를 돕는 보조 설명. 최신 Docs와 차이가 있으면 차이를 표기 |
| P1 | [Network Architecture 수업](https://build.avax.network/academy/avalanche-l1/avalanche-fundamentals/04-creating-an-l1/03-network-architecture) | 공식 Academy · 구조 설명 및 실습 맥락 | P-Chain의 역할, L1과 검증자의 관계 | 페이지가 `CreateSubnet`·`CreateChain`·`ConvertSubnetToL1` 절차를 설명한다. 현행 작업 절차로 재사용하기 전 Etna 이후 문서와 대조하고, 역사/개념 설명과 실행 절차를 분리 |
| P2 | [ACP-99: Validator Manager Solidity Standard](https://github.com/avalanche-foundation/ACPs/blob/main/ACPs/99-validatorsetmanager-contract/README.md) | 공식 ACP · 계약 표준 | L1 검증자 관리 계약과 보안 모듈 | 빌더 심화 경로에서 사용. ACP-77 선행 연결 및 현재 상태 확인 |
| P2 | [Validator Manager Contracts](https://build.avax.network/docs/avalanche-l1s/validator-manager/contract) | 공식 Docs · 구현 참조 | ACP-77/99에 따른 Validator Manager 구성 | 코드 참조로 연결. 계약·SDK 릴리스 버전 함께 기록 |
| P2 | [Add a Validator to an L1](https://build.avax.network/docs/avalanche-l1s/validator-manager/registration-flow) | 공식 Docs · 절차·코드 예제 | 등록 절차, Warp 서명, P-Chain 업데이트, SDK 호출 | 구현 및 패키지 버전이 바뀔 수 있으므로 날짜·SDK 버전·앵커가 필수 |
| P2 | [Deploy on Production Infra](https://build.avax.network/docs/tooling/avalanche-cli/create-deploy-avalanche-l1s/deploy-on-production-infra) | 공식 Docs · 운영 절차 | L1 운영과 Primary Network 부분 동기화 | 운영용 체크리스트에만 사용. 비용·인프라 사양은 별도 최신성 표시 |

### 파일럿에서 보일 경로

1. **체인 기초:** `Primary Network → P/C/X → Avalanche L1 → P-Chain이 Primary Network와 L1 사이에서 맡는 역할`. 각 개념 설명에 P0 출처와 필요한 Academy 수업을 붙인다.
2. **빌더 라이브러리:** 공식 자료를 `개념`, `구조`, `만들기`, `운영`, `규격/코드` 작업으로 분류한다. 자료 카드에는 자료 유형, 적용 범위, 버전/검토일, 공식 원문 링크를 표시한다.
3. **아카데미:** `네트워크 구분하기 → L1 구성 요소 이해 → 테스트 환경에서 생성·검증`처럼 목표를 중심으로 자체 경로를 만든다. 공식 Academy의 강의는 경로의 근거 자료로 연결하고, 현행 절차와 다른 부분은 실습 지침으로 복사하지 않는다.

이 인벤토리는 화면에 수집할 자료를 확정한 목록이 아니라, 콘텐츠 모델을 검증할 파일럿 후보군이다. 단계 1에서 공식 페이지와 저장소의 현재 경로, 상태, 라이선스 및 개정 정보를 다시 확인한 뒤 채택 여부를 확정한다.

## 정보 구조 제안

현재 세 챕터를 유지하고 각각의 역할을 분명히 한다.

| 챕터 | 목적 | 담을 자료 |
|---|---|---|
| 01 체인 기초 | 체인과 블록체인 구조를 이해한다 | 블록체인 공통 기초, EVM 공통 개념, Avalanche Primary Network·P/C/X 체인·합의·밸리데이터·L1 개념. 공식 자료를 그대로 나열하기보다 개념 페이지에서 여러 근거를 비교해 설명한다. |
| 02 빌더 라이브러리 | 지금 만들 작업에 필요한 공식 자료와 개발 도구를 찾는다 | 공식 Docs·Academy 원문 카탈로그, SDK/API·RPC·도구 레퍼런스, 체인별 적용 범위, 관련 코드와 작업 스킬. 공식 자료의 깊은 링크와 버전 정보를 우선 노출한다. |
| 03 아카데미 | 목적에 따라 학습하고 실제 결과를 만든다 | 사람을 위한 Foundation → Structure → Practice 경로, 공식 과정 연결, 케이스별 실습, 검증 기준, 해당 작업을 수행하는 에이전트 스킬과 학습 그래프. |

공통 지식과 체인 지식은 별도 복제하지 않고 적용 범위로 구분한다. 현재 `BLOCKCHAIN`, `EVM`, `CHAIN` 범위는 출발점으로 쓸 수 있다. 여러 체인에 적용되는 개념은 한 번 정의하고, Avalanche에서 달라지는 적용·용어·제약은 체인별 보충 설명으로 연결한다.

## 그래프를 고려한 콘텐츠 구조

원문 페이지를 곧바로 그래프 노드로 삼지 않는다. 원문은 출처 노드로 두고, 검토한 지식과 실행 단위를 별도 노드로 연결한다.

- **노드 유형:** 출처 문서/강의, 개념, 작업·목표, 도구/API, 실습 케이스, 에이전트 스킬.
- **관계 유형 초안:** `PREREQUISITE`(선행), `EXPLAINS`(설명 근거), `APPLIES_TO`(적용 대상), `USES`(사용 도구/개념), `VALIDATED_BY`(검증 방법), `DERIVED_FROM`(파생 근거), `SUPERSEDES`(대체/구버전).
- **출처 근거:** 각 요약·절차·주장의 원문 URL과 문서 섹션/앵커를 연결한다. 그래프의 관계도 누가, 어떤 근거와 검토 상태로 추가했는지 추적 가능해야 한다.
- **사람과 에이전트:** 같은 개념·출처를 공유하되, 사람 경로는 학습 순서·설명·퀴즈를, 에이전트 경로는 입력·절차·도구·출력·검증 조건을 연결한다.

기존 `SUBTOPIC`, `PREREQUISITE`, `EXTENDS`, `RELATED`, `CONTRADICTS`는 개념 간 관계에 재사용할 수 있다. 출처 근거와 실행 관계는 그 의미를 `RELATED`에 섞지 말고 별도 관계로 추가해야 한다. 운영 스키마를 정할 때 현재 `HubData`의 데모 제약과 출처 필드를 분리하는 것이 필요하다.

## 단계별 진행안

### 1단계 — 공식 자료 인벤토리와 정책

- 공식 Builder Hub의 Docs·Academy에서 Avalanche 관련 문서 구조와 깊은 링크, 문서 유형, 선수 과정, 업데이트 정보를 목록화한다.
- 저장소 라이선스, 개별 자산 표기, 페이지 삽입 여부를 점검해 원문 스냅샷·발췌·이미지 재사용 범위를 정한다.
- 각 후보를 블록체인 공통 / EVM 공통 / Avalanche 전용으로 분류하고 중복 문서와 오래된 경로를 표시한다.

### 2단계 — 콘텐츠 스키마와 대표 토픽 파일럿

- 출처 레코드와 버전/근거 위치, 편집된 학습 단위를 별도 모델로 정의한다.
- Primary Network와 Avalanche L1 등 서로 연결되면서도 구분이 필요한 토픽을 골라, 공식 문서와 공통 개념을 함께 연결한다.
- 요약, 출처 앵커, 변경 검토 상태, 사람 경로와 에이전트용 작업 단위까지 한 흐름으로 검증한다.

### 3단계 — Chapters 자료 탐색·읽기 UX

- 빌더 라이브러리에서 공식 Docs·Academy 자료를 목표 작업, 분야, 난이도, 적용 범위로 찾게 한다.
- 자료 상세에서 우리 요약과 공식 원문 링크를 제공하고, 출처·업데이트 정보·선행 개념·관련 실습을 함께 보여준다.
- 체인 기초의 개념 설명과 아카데미의 학습 경로에서 같은 지식 단위를 재사용한다.

### 4단계 — 검토된 그래프와 에이전트 전달

- 선행 개념, 작업, 도구, 실습, 스킬의 관계를 추가하고 출처 근거를 검토한다.
- 그래프가 생성하는 사람용 학습 경로와 에이전트용 스킬 묶음을 별도로 제공한다.
- 원문 변경 시 영향받는 노드와 스킬을 검토 큐에 올려 최신성을 유지한다.

## 이번 기획의 완료 기준

- 공식 원문과 자체 편집 설명을 구별하고 모든 파생 자료를 원문 근거까지 추적할 수 있다.
- 공통 블록체인/EVM 지식과 Avalanche 전용 지식을 중복 문서 복사 없이 함께 제공할 수 있다.
- 하나의 검토된 지식 단위를 사람의 학습 경로와 에이전트 스킬에서 재사용할 수 있다.
- 공식 자료 갱신으로 영향을 받는 지식·실습·스킬을 찾아 검토할 수 있다.

## 운영형으로 확장하기 전 결정할 사항

- 저장소 라이선스가 표시되어 있어도 개별 문서·이미지의 재사용 권한과 표기 조건을 확인한 뒤 원문 스냅샷 범위를 정한다.
- 정적 데모를 팀 공유 자료로 키울 때 원문 버전, 앵커, 해시, 검토 기록을 어느 저장소/API에서 관리할지 결정한다.
- 공식 자료 변경 감지와 지식·Skill 영향 검토를 자동화할 때 콘텐츠 검토자를 포함한 승인 흐름을 정한다.

## 2026-10-17 — 데모 범위 적용

사용자는 먼저 데모에서 가능한 수준으로 Chapters를 구성하기로 했다. 이 범위에서는 현재 정적 JSON을 사용하고 데이터베이스, 크롤러, MCP 연결은 추가하지 않는다.

- Primary Network·P/C/X·Avalanche L1·L1 Validator·Validator Manager를 독립 개념 파츠로 추가하고, 기존 개념 그래프의 첫 화면에서 Primary Network를 기본 선택한다.
- Official Docs 목록에 문서·ACP·Academy 강의 후보를 넣는다. 자료 상세에는 Cryptopedia 요약과 원문 출처를 표시하고, 전체 원문은 공식 페이지에서 읽도록 링크한다.
- 출처마다 자료 유형과 확인 날짜를 기록한다. 서로 다른 공식 자료의 절차를 대조해야 하는 경우 화면에 그 상태와 주의점을 표시한다.
- 사람이 수행할 수 있는 구조 지도 학습 케이스와 이를 에이전트에 전달할 수 있는 Markdown Skill을 데모 JSON에 넣는다.
- 이 데이터는 수집/검토 파이프라인이나 운영용 최신성 관리 시스템이 아니다. 원문 변경 감지는 후속 API/운영 데이터 단계의 범위로 남긴다.

## 참고

- [Avalanche Builder Hub](https://build.avax.network/)
- [Avalanche Builder Hub GitHub 저장소](https://github.com/ava-labs/builders-hub)
- [Avalanche Academy](https://build.avax.network/academy)
- [Avalanche Fundamentals 과정](https://build.avax.network/academy/avalanche-l1/avalanche-fundamentals)
- [Primary Network 문서](https://build.avax.network/docs/primary-network)
- [Avalanche L1s 문서](https://build.avax.network/docs/avalanche-l1s)
- [AvalancheGo Architecture 문서](https://build.avax.network/docs/nodes/architecture)
- [Avalanche SDK for TypeScript 문서](https://build.avax.network/docs/tooling/avalanche-sdk)
- [ACP-77: Reinventing Subnets](https://github.com/avalanche-foundation/ACPs/blob/main/ACPs/77-reinventing-subnets/README.md)
- [ACP-99: Validator Manager Solidity Standard](https://github.com/avalanche-foundation/ACPs/blob/main/ACPs/99-validatorsetmanager-contract/README.md)
