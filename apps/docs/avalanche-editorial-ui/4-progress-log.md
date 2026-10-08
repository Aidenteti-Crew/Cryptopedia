# Avalanche Editorial UI 진행 로그

## 2026-10-08 — 1차 정적 데이터 구현

### 구현 범위

- `/`를 Avalanche Cryptopedia 진입점으로 교체
- Figma Ecosystem을 `/` 첫 화면으로 구현
- Chains 선택 화면과 Avalanche·Injective·Midnight 상태 구현
- Figma 1440·834·390 공통 responsive shell
- Projects, Macro, Events, Updates
- Fundamentals, Builders, Academy
- Article reader, Event archive, Book detail
- 타입이 지정된 정적 JSON repository
- 이벤트 실데이터 전환용 `EventFeedResponse`

### 데이터

```text
collections.json  Fundamentals·Builders·Academy 각 4개
projects.json     Chain 3개 + Project 2개
macro.json        Figma 예시 2개
events.json       Figma 예시 4개
updates.json      Figma 예시 2개
articles.json     목록·상세·관련 링크 데이터
books.json        Avalanche·Beam·Dexalot·All blue·Pengolin
```

### 테스트

실행 명령:

```bash
cd apps/web
pnpm exec tsx --test lib/cryptopedia-*.test.ts components/cherry/editorial/*.test.ts components/cherry/editorial/*.test.tsx
```

결과: 전체 테스트 46개 통과, 실패 0개.

### 페이지 전환 모션

- 헤더와 목차는 고정하고 읽기 콘텐츠만 전환하도록 구성했다.
- 첫 진입은 애니메이션을 생략하고, 이후 이동은 180ms 진입·120ms 퇴장으로 처리했다.
- `prefers-reduced-motion`에서는 이동과 지속 시간을 제거한다.
- 목록 → 책 → 문서 상세와 빠른 연속 메뉴 이동을 실제 브라우저에서 확인했다.
- 앱은 기존 요구대로 `/` 내부 상태 전환을 유지한다. 외부 원문·등록 URL은 목데이터에서 아직 `null` 또는 등록 예정 상태다.

`npx tsc --noEmit` 결과는 기존부터 기록된 오류 8개만 재현됐다.

```text
kaas-admin-page.tsx                 1개
kaas-dashboard-page.tsx            7개
Avalanche Editorial UI 신규 오류   0개
```

`pnpm build` 결과: Next.js production build 성공, 정적 route 10개 생성.

기존 `next.config.mjs`의 더 이상 지원되지 않는 `eslint` 옵션 경고와 Node `module.register()` deprecation 경고는 이번 범위에서 수정하지 않았다.

### 브라우저 실동작

확인한 흐름:

- `/` 첫 진입 → Ecosystem
- `Avalanche ↗` → Chains → Avalanche 열기 → Ecosystem
- Projects → Avalanche book → Projects
- Fundamentals → Chain overview → Fundamentals
- Macro 목록
- Events → Event archive
- Updates 목록
- Builders 4개 항목
- Academy 4개 항목
- 독립 route 5개 HTTP 200

증빙:

```text
/private/tmp/cryptopedia-1440.png
/private/tmp/cryptopedia-events-1440.png
/private/tmp/cryptopedia-events-834.png
/private/tmp/cryptopedia-events-390.png
/private/tmp/cryptopedia-fundamentals-390.png
```

### 변경하지 않은 범위

- `apps/api`
- SQL·DB·마이그레이션
- 기존 Cherry API와 인증
- `cherrypickersGuild/cherry-in-the-haystack` tracked files
- 커밋·푸시·배포

### 후속 연동

- 현재 데이터 공급자: `createStaticCryptopediaRepository`
- 후속 데이터 공급자: API 응답을 같은 타입으로 반환하는 구현
- 이벤트 API 요청 계약: `event-crawler-data-request.md`
- 자동 API fallback은 사용하지 않는다. 데이터 공급자는 명시적으로 전환한다.
