# Avalanche Editorial UI 작업 지침

> 기준 브랜치: `feature/avalanche-editorial-ui`
> 디자인 정본: Figma `Aidenteti Crew Cryptopedia · Responsive UI`, page `2026.09 · Full Service` (`152:494`)
> 구조 참고: `cherrypickersGuild/cherry-in-the-haystack` — 읽기 전용이며 수정하지 않는다.

## 1. 목표

`Aidenteti-Crew/Cryptopedia`의 `apps/web`에 Avalanche 지식 콘텐츠를 표시하는 에디토리얼 UI를 구현한다.

- 화면 구조와 시각 기준은 Figma 디자인을 따른다.
- 데이터 처리 방식은 Cherry의 타입·요청·상태 처리 구조를 참고한다.
- 실제 화면 콘텐츠는 Avalanche 데이터만 사용한다.
- 1차 구현은 타입이 지정된 정적 JSON을 사용한다.
- 이후 API나 크롤링 데이터가 준비되면 화면 컴포넌트 변경 없이 데이터 공급자만 교체한다.

## 2. 정본과 변경 경계

### 2-1. 정본

| 구분 | 정본 | 사용 방법 |
|---|---|---|
| 디자인 | Figma Full Service | 레이아웃, 색상, 폰트, 반응형, 문구 위치 |
| 구현 대상 | `Aidenteti-Crew/Cryptopedia` | 코드와 JSON을 실제로 추가·변경 |
| 구조 참고 | `cherrypickersGuild/cherry-in-the-haystack` | 읽기 전용으로 패턴만 참고 |
| 1차 콘텐츠 | Figma 예시 문구 | 정적 JSON 시드로 사용 |

### 2-2. 절대 변경하지 않는 범위

- `cherrypickersGuild/cherry-in-the-haystack` 저장소의 파일·브랜치·원격 설정
- `apps/api`와 DB 스키마
- SQL과 마이그레이션
- 인증 토큰 처리와 `BENCH_KEY_SECRET`
- 기존 KaaS·Learning 컴포넌트와 데이터 요청 코드
- `/start/*` 기능
- Dokploy 배포 설정

기존 KaaS와 Learning 컴포넌트 파일은 보존하지만 `/`의 기본 화면에서는 더 이상 렌더링하지 않는다. 따라서 기존 Cherry 개발자 화면에 대한 `/` 접근성은 의도적으로 종료된다. `/start/*`의 URL과 동작은 그대로 유지한다.

## 3. 1차 구현 범위

Figma Full Service page의 실제 최상위 프레임은 82개다. Design handoff 1개를 제외하면 27개 화면 유형을 Desktop 1440, Tablet 834, Mobile 390으로 반복한 81개 화면이다. `cryptopedia-figma-manifest.ts`가 27개 유형과 세 node ID를 정본으로 고정하며, 공통 레이아웃을 재사용하더라도 각 화면의 고유 구획은 생략하지 않는다.

### 3-1. 공통 셸

- Masthead
- Aidenteti seal과 브랜드 워드마크
- Chapter index
- Desktop·Tablet의 좌측 목차
- Mobile의 상단형 목차
- 공통 footer와 colophon

### 3-2. 컬렉션 목차 템플릿

다음 화면이 공유한다.

- Fundamentals
- Builders
- Academy

공통 필드:

- breadcrumb
- volume 번호와 영문 구분
- 제목
- 슬로건
- 소개
- 목차 개수
- 목차 항목 배열

### 3-3. 피드·아카이브 템플릿

- Projects
- Macro
- Events
- Updates
- Event archive

별도 탐색 화면으로 `Chains`와 `Ecosystem`을 구현한다. `Avalanche ↗`는 Chains로, `생태계 · 매크로`는 Ecosystem으로 이동한다.

Macro와 Updates는 일반 피드 목록을 공유한다. Events와 Event archive는 날짜·시간·장소가 있는 이벤트 목록을 공유한다. Projects는 체인과 프로젝트를 구분하는 서가형 목록을 사용한다.

### 3-4. 리더·상세 템플릿

- Reader
- Architecture
- Validator
- Glossary
- Docs
- Code
- Protocol
- Course
- Lesson
- Graph
- Article
- Macro detail

제목, 설명, 본문 구획, 관련 자료, 원문 링크, 다음 읽기 데이터를 조합해 표현한다.

### 3-5. 책 템플릿

- Avalanche
- Beam
- Dexalot
- All blue
- Pengolin

동일한 책 상세 컴포넌트에 표지·설명·챕터 목록만 데이터로 전달한다.

## 4. 정보 구조

```text
생태계 · 매크로
├── 체인·프로젝트
├── 매크로 소식
├── 행사·이벤트
└── 개발 업데이트

01 체인 기초
├── 체인 개요
├── P · C · X 체인
├── 밸리데이터 구조
└── 핵심 용어 사전

02 빌더 라이브러리
├── 공식 Docs
├── 코드 레퍼런스
├── 빌더 아티클
└── MCP · x402

03 아카데미
├── 입문 — 체인의 첫 개념
├── 구조 — 네트워크 읽기
├── 실습 — 첫 프로젝트
└── 스킬 그래프
```

크롤링 결과가 후속 실데이터 단계에서 연결되는 첫 진입 영역은 `생태계 · 매크로`다. 1차에서는 Figma 시드 JSON을 표시하고 API 준비 후 Macro, Events, Updates 순으로 교체한다.

## 5. 데이터 계약

### 5-1. 공통 목록 항목

```ts
export type ContentKind =
  | "OVERVIEW"
  | "ARCHITECTURE"
  | "NETWORK"
  | "GLOSSARY"
  | "DOCS"
  | "CODE"
  | "ARTICLE"
  | "PROTOCOL"
  | "FOUNDATION"
  | "STRUCTURE"
  | "PRACTICE"
  | "LEARNING_MAP"
  | "MACRO"
  | "UPDATE"

export interface ContentEntry {
  id: string
  order?: number
  title: string
  summary: string
  kind: ContentKind
  sourceName?: string
  sourceUrl?: string
  publishedAt?: string
  collectedAt?: string
}
```

### 5-2. 컬렉션 페이지

```ts
export interface CollectionPageData {
  id: string
  breadcrumb: string[]
  volume: number
  eyebrow: string
  title: string
  tagline: string
  introduction: string[]
  sectionTitle: string
  entries: ContentEntry[]
}
```

### 5-3. 이벤트

```ts
export type EventStatus =
  | "UPCOMING"
  | "ONGOING"
  | "PAST"
  | "CANCELLED"
  | "POSTPONED"

export interface EventEntry {
  id: string
  title: string
  summary: string
  startsAt: string
  endsAt: string | null
  timezone: string
  allDay: boolean
  status: EventStatus
  organizer: string | null
  venueName: string | null
  venueAddress: string | null
  city: string | null
  country: string | null
  isOnline: boolean
  sourceUrl: string | null
  registrationUrl: string | null
  imageUrl: string | null
  category: string | null
  tags: string[]
  chain: string | null
  project: string | null
  publishedAt: string | null
  fetchedAt: string
  confidence: number | null
}

export interface EventFeedResponse {
  items: EventEntry[]
  nextCursor: string | null
  generatedAt: string
}
```

현재 `deploy`의 수집 파이프라인과 미병합 `feature/browser-agent`는 `date_selector` 결과를 기사 `published_at`으로 저장한다. 이는 행사 개최일이 아니므로 `EventEntry.startsAt`에 연결하지 않는다. 1차의 `startsAt`과 `status`는 Figma 예시를 옮긴 수동 JSON 값이며, 실제 행사 데이터 연동은 `event_start_at`, `event_end_at`, `venue`, `timezone`을 별도로 추출하는 후속 수집 계약이 준비된 뒤 진행한다.

### 5-4. 체인·프로젝트 서가

```ts
export interface CollectionVolume {
  id: string
  name: string
  type: "CHAIN" | "PROJECT"
  volume: number
  networkType?: string
  description: string
  coverAsset?: string
  href: string
}
```

### 5-5. 상세 문서

```ts
export interface ArticleSection {
  id: string
  heading: string
  body: string
}

export interface ArticleDetail {
  id: string
  breadcrumb: string[]
  eyebrow: string
  title: string
  subtitle: string
  quickSummary?: string
  sections: ArticleSection[]
  relatedItems: ContentEntry[]
  officialUrl?: string
  nextItemId?: string
}
```

### 5-6. 책 상세

```ts
export interface BookDetail {
  id: string
  name: string
  type: "CHAIN" | "PROJECT"
  volume: number
  networkType?: string
  description: string
  readingGuide: string
  contentStatus: string
  coverAsset?: string
  chapters: ContentEntry[]
}
```

### 5-7. 데이터 공급자

```ts
export interface CryptopediaRepository {
  getCollection(id: string): Promise<CollectionPageData>
  getProjects(): Promise<CollectionVolume[]>
  getMacroArticles(): Promise<ContentEntry[]>
  getUpdates(): Promise<ContentEntry[]>
  getEvents(): Promise<EventFeedResponse>
  getArticle(id: string): Promise<ArticleDetail>
  getBook(id: string): Promise<BookDetail>
}
```

1차 구현은 `StaticCryptopediaRepository`가 `/cryptopedia/*.json`을 읽는다. 이후 `ApiCryptopediaRepository`가 같은 반환 타입을 제공한다.

## 6. 파일 구조

```text
apps/web/
├── app/
│   ├── page.tsx
│   └── globals.css
├── components/cherry/editorial/
│   ├── editorial-app.tsx
│   ├── editorial-shell.tsx
│   ├── editorial-masthead.tsx
│   ├── editorial-index.tsx
│   ├── editorial-mobile-index.tsx
│   ├── collection-page.tsx
│   ├── content-entry-list.tsx
│   ├── content-entry-row.tsx
│   ├── feed-page.tsx
│   ├── events-page.tsx
│   ├── projects-page.tsx
│   ├── article-reader.tsx
│   └── book-detail-page.tsx
├── lib/
│   ├── cryptopedia-types.ts
│   ├── cryptopedia-taxonomy.ts
│   └── cryptopedia-data.ts
└── public/cryptopedia/
    ├── collections.json
    ├── projects.json
    ├── macro.json
    ├── events.json
    ├── updates.json
    ├── articles.json
    └── books.json
```

기존 Cherry 파일을 이동하거나 대규모로 분리하지 않는다. 새 기능은 `editorial` 하위에 격리한다.

## 7. 화면 전환

`/`는 기존 Cherry 개발자 앱 대신 `EditorialApp`을 렌더링한다. `app/page.tsx`의 기존 Cherry 화면 코드는 새 파일로 복제하지 않고 Git 이력으로 보존한다. 작업 트리의 `page.tsx`는 `EditorialApp`을 불러오는 얇은 진입점으로 교체한다.

```tsx
import { EditorialApp } from "@/components/cherry/editorial/editorial-app"

export default function Page() {
  return <EditorialApp />
}
```

`EditorialApp`이 다음 상태만 관리한다.

- 현재 화면 ID
- 현재 상세 문서 ID
- 목록에서 상세로 이동하는 핸들러
- 상세에서 이전 목록으로 돌아가는 핸들러

목차 정의는 `cryptopedia-taxonomy.ts` 한 곳에서 관리한다. Desktop과 Mobile은 같은 목차 데이터를 사용한다. `/start/*`, `/login`, `/start/login`, `/template/edit`, `/demo-hanbit` 라우트는 수정하지 않는다.

## 8. 디자인 토큰

Figma의 의미 기반 변수명을 `globals.css`에 추가한다.

```css
--editorial-paper: #151a20;
--editorial-surface: #101419;
--editorial-ink: #e9edf2;
--editorial-muted: #a5afbb;
--editorial-accent: #cebd91;
--editorial-line: #323c48;
```

- 제목: Cormorant 계열
- 본문: Noto Sans KR
- 임의 대체 폰트는 사용하지 않는다.
- Figma node `153:496`의 전체 export PNG를 로컬 `public/cryptopedia/assets/aidenteti-seal.png`에 저장한다. 다섯 개 벡터 레이어를 임의로 재조립하지 않는다.
- Figma 임시 자산 URL은 코드에 남기지 않는다.

## 9. 반응형 규칙

| 기준 | 구조 |
|---|---|
| 1440 | 105px Masthead + 244px 좌측 index + reading column |
| 834 | 105px Masthead + 200px 좌측 index + reading column |
| 390 | Masthead → index → reading column 순으로 세로 배치 |

- Desktop·Tablet·Mobile 컴포넌트를 세 벌 만들지 않는다.
- 동일한 DOM과 데이터로 배치만 변경한다.
- 목록 요약은 삭제하지 않고 줄바꿈한다.
- 링크 화살표와 클릭 영역은 행 전체에 제공한다.

## 10. 상태 처리

모든 데이터 화면은 다음 네 상태를 가진다.

| 상태 | 화면 처리 |
|---|---|
| loading | Figma 행 높이를 유지하는 skeleton |
| success | 데이터 목록 또는 상세 표시 |
| empty | 해당 영역에 맞는 빈 상태 문구 |
| error | 오류 문구와 다시 시도 버튼 |

정적 JSON도 네트워크 요청이므로 실패할 수 있다고 가정한다.

## 11. 접근성과 동작

- 실제 이동 요소는 `button` 또는 `a`를 사용한다.
- 현재 목차 항목은 `aria-current="page"`로 표시한다.
- 모든 아이콘과 seal은 의미에 맞는 대체 텍스트를 갖는다.
- 키보드만으로 목차와 목록을 이동할 수 있어야 한다.
- 애니메이션은 `prefers-reduced-motion`을 따른다.
- 외부 링크는 시각적으로 구분한다.

## 12. 구현 단계

### Phase 1 — 기반

- Figma 토큰과 폰트
- 데이터 타입과 JSON 검증
- taxonomy
- Masthead와 responsive shell

### Phase 2 — 핵심 진입 화면

- Fundamentals
- Builders
- Academy
- Projects
- Macro
- Events
- Updates

### Phase 3 — 상세 화면

- Reader 계열
- Glossary
- Macro detail
- Event archive
- Book detail

### Phase 4 — 데이터 교체 준비

- 정적 repository 경계 확정
- API repository 계약 테스트
- loading·empty·error 상태 검증

### Phase 5 — 시각 검증

- 1440 × 1024
- 834 × Figma frame height
- 390 × Figma frame height
- Figma screenshot과 나란히 비교

## 13. 완료 기준

- Figma의 27개 화면 유형을 재사용 템플릿과 고유 variant로 모두 도달할 수 있다.
- `cryptopedia-figma-manifest.test.ts`에서 누락·partial 화면이 0개다.
- 1440·834·390에서 Figma의 레이아웃 구조가 일치한다.
- `/`에 접속하면 기존 Cherry 대시보드가 아니라 Avalanche Cryptopedia 홈이 바로 표시된다.
- 화면 문구와 목록은 JSX 하드코딩이 아니라 JSON에서 온다.
- JSON과 화면 사이의 타입 오류가 없다.
- 모든 내부·외부 링크가 동작한다.
- loading·empty·error 상태가 화면을 깨뜨리지 않는다.
- 진입점 `app/page.tsx`, 폰트 설정 `app/layout.tsx`, 디자인 토큰 `app/globals.css`를 제외한 기존 Cherry 컴포넌트·API·DB 코드를 삭제하거나 수정하지 않는다.
- `/start/*`, `/login`, `/start/login`, `/template/edit`, `/demo-hanbit`에 신규 회귀가 없다.
- Cherry 참고 저장소에는 어떤 변경도 없다.
- 구현 저장소에서 `npx tsc --noEmit`과 `pnpm build`의 신규 오류가 0개다.

## 14. 설계 3원칙 적용

1. **좁은 스코프** — `apps/web`의 Editorial UI와 정적 JSON만 작업한다. API, DB, 크롤러, 배포는 제외한다.
2. **단순·명확** — 여러 데이터 소스를 한 번에 구현하지 않고 `CryptopediaRepository` 계약 하나와 정적 구현 하나만 만든다.
3. **동작 가시성** — 각 Phase 종료 시 1440·834·390 화면을 브라우저에서 확인하고 Figma와 비교한다.

## 15. 미확정 사항

다음은 1차 구현 완료 후 별도 승인이 필요한 후속 작업이다.

- 실제 Avalanche API 주소와 인증 방식
- 크롤링 주기와 데이터 최신성 기준
- 행사 개최일·종료일·장소·시간대를 추출하는 이벤트 전용 크롤링 계약
- 크롤링 상태를 사용자에게 노출할지 여부
- 실데이터 전환 시 JSON을 유지할지 제거할지 여부
- Dokploy 배포
