# Avalanche Editorial UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This repository's `AGENTS.md` requires direct work on the approved feature branch, so do not create a separate worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` Cherry dashboard in `Aidenteti-Crew/Cryptopedia` with the responsive Avalanche Cryptopedia editorial UI from Figma while reading all visible content from validated local JSON.

**Architecture:** `app/page.tsx` becomes a thin entry that renders `EditorialApp`. The app reads typed JSON through one `CryptopediaRepository`, renders four reusable screen families, and keeps Figma navigation state inside the editorial feature. Existing API, database, Cherry components, and `/start/*` routes remain untouched.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS 4, Zod 3, Node test runner through `tsx`, Figma MCP assets.

---

## 0. Execution rules

- Work only in `/Users/sooondae/projects/Aidenteti-Cryptopedia`.
- Stay on `feature/avalanche-editorial-ui`.
- Treat `/Users/sooondae/projects/Cryptopedia-main` and `cherrypickersGuild/cherry-in-the-haystack` as read-only references.
- Do not run SQL, migrations, API write requests, deployment, push, or Dokploy actions.
- Do not edit `apps/api`, `apps/web/lib/api.ts`, `apps/web/lib/auth.ts`, or existing `apps/web/components/cherry/*.tsx` files outside the new `editorial/` directory.
- A commit step in this plan is a checkpoint only. Execute it only after the user explicitly authorizes a commit.

## 1. Final file map

### Create

```text
apps/web/components/cherry/editorial/
  editorial-app.tsx              screen state and screen selection
  editorial-shell.tsx            responsive masthead/index/content layout
  editorial-masthead.tsx         seal, wordmark, edition copy
  editorial-index.tsx            desktop/tablet navigation
  editorial-mobile-index.tsx     mobile navigation presentation
  collection-page.tsx            Fundamentals, Builders, Academy
  content-entry-list.tsx         numbered editorial list
  feed-page.tsx                  Macro and Updates
  events-page.tsx                upcoming/past event groups
  projects-page.tsx              chain/project bookshelf
  article-reader.tsx             Reader/detail family
  book-detail-page.tsx           five volume pages
  editorial-states.tsx           loading, empty, error

apps/web/lib/
  cryptopedia-types.ts           Zod schemas and inferred TypeScript types
  cryptopedia-taxonomy.ts        single navigation source
  cryptopedia-data.ts            repository and JSON loader
  cryptopedia-types.test.ts      contract tests
  cryptopedia-taxonomy.test.ts   navigation tests
  cryptopedia-data.test.ts       repository tests

apps/web/public/cryptopedia/
  collections.json
  projects.json
  macro.json
  events.json
  updates.json
  articles.json
  books.json
  assets/aidenteti-seal.png
```

### Modify

```text
apps/web/app/page.tsx             render only EditorialApp at `/`
apps/web/app/layout.tsx           load Cormorant and Noto Sans KR
apps/web/app/globals.css          add editorial tokens and font variables
apps/docs/base-data/frontend-status-2026-08-25.md
apps/docs/avalanche-editorial-ui/3-checklist-table.md
```

## Task 1: Lock the JSON contracts

**Files:**
- Create: `apps/web/lib/cryptopedia-types.test.ts`
- Create: `apps/web/lib/cryptopedia-types.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  articleDetailSchema,
  collectionPageSchema,
  collectionVolumeSchema,
  eventEntrySchema,
  eventFeedResponseSchema,
} from "./cryptopedia-types"

test("accepts the Figma collection data contract", () => {
  const value = collectionPageSchema.parse({
    id: "fundamentals",
    breadcrumb: ["COLLECTION", "AVALANCHE", "FUNDAMENTALS"],
    volume: 1,
    eyebrow: "THE FUNDAMENTALS",
    title: "Avalanche",
    tagline: "하나의 체인, 깊이 있는 이해.",
    introduction: ["첫 개념부터 네트워크의 구조까지."],
    sectionTitle: "이 권의 목차",
    entries: [{ id: "overview", order: 1, title: "체인 개요", summary: "Avalanche의 시작과 네트워크의 핵심 개념", kind: "OVERVIEW" }],
  })
  assert.equal(value.entries[0].kind, "OVERVIEW")
})

test("rejects an event without a stable id", () => {
  assert.throws(() => eventEntrySchema.parse({ title: "Crypto House Seoul '26", startsAt: "2026-09-28T14:00:00+09:00", status: "UPCOMING" }))
})

test("accepts the mock event feed contract", () => {
  const feed = eventFeedResponseSchema.parse({
    items: [{
      id: "crypto-house-seoul-2026",
      title: "Crypto House Seoul '26",
      summary: "Avalanche 생태계 커뮤니티 행사",
      startsAt: "2026-09-28T14:00:00+09:00",
      endsAt: null,
      timezone: "Asia/Seoul",
      allDay: false,
      status: "UPCOMING",
      organizer: "Team1 Korea",
      venueName: "위워크 선릉 2호점",
      venueAddress: null,
      city: "Seoul",
      country: "KR",
      isOnline: false,
      sourceUrl: null,
      registrationUrl: null,
      imageUrl: null,
      category: "COMMUNITY",
      tags: ["Avalanche", "Community"],
      chain: "Avalanche",
      project: null,
      publishedAt: null,
      fetchedAt: "2026-09-01T00:00:00+09:00",
      confidence: null,
    }],
    nextCursor: null,
    generatedAt: "2026-09-01T00:00:00+09:00",
  })
  assert.equal(feed.items.length, 1)
})

test("accepts chain and project volumes", () => {
  assert.equal(collectionVolumeSchema.parse({ id: "avalanche", name: "Avalanche", type: "CHAIN", volume: 1, description: "C-Chain", href: "book-avalanche" }).type, "CHAIN")
})

test("requires article sections and related items arrays", () => {
  const article = articleDetailSchema.parse({ id: "chain-overview", breadcrumb: ["체인 기초", "입문"], eyebrow: "개념 문서", title: "체인 개요", subtitle: "Avalanche를 이해하기 위한 첫 번째 문서.", sections: [], relatedItems: [] })
  assert.deepEqual(article.sections, [])
})
```

- [ ] **Step 2: Run the test and verify failure**

Run from repository root:

```bash
pnpm exec tsx --test apps/web/lib/cryptopedia-types.test.ts
```

Expected: FAIL because `cryptopedia-types.ts` does not exist.

- [ ] **Step 3: Implement the schemas**

Create Zod schemas for these exact exported names:

```ts
contentKindSchema
contentEntrySchema
collectionPageSchema
eventEntrySchema
collectionVolumeSchema
articleSectionSchema
articleDetailSchema
bookDetailSchema

ContentKind
ContentEntry
CollectionPageData
EventEntry
EventFeedResponse
CollectionVolume
ArticleSection
ArticleDetail
BookDetail
```

Use `z.infer` so runtime validation and TypeScript types cannot diverge. URLs use `z.string().url()`. IDs use `z.string().min(1)`. Date strings remain strings because rendering is locale-specific.

- [ ] **Step 4: Run the test and verify pass**

```bash
pnpm exec tsx --test apps/web/lib/cryptopedia-types.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit checkpoint — user approval required**

```bash
git add apps/web/lib/cryptopedia-types.ts apps/web/lib/cryptopedia-types.test.ts
git commit -m "feature: define cryptopedia data contracts"
```

## Task 2: Define one navigation source

**Files:**
- Create: `apps/web/lib/cryptopedia-taxonomy.test.ts`
- Create: `apps/web/lib/cryptopedia-taxonomy.ts`

- [ ] **Step 1: Write failing navigation tests**

The tests assert:

```ts
assert.equal(DEFAULT_SCREEN_ID, "projects")
assert.deepEqual(PRIMARY_NAV.map((item) => item.id), ["projects", "macro", "events", "updates"])
assert.deepEqual(CHAPTER_NAV.map((item) => item.id), ["fundamentals", "builders", "academy"])
assert.equal(resolveParentScreen("chain-overview"), "fundamentals")
assert.equal(resolveParentScreen("fuji-update"), "updates")
```

- [ ] **Step 2: Verify failure**

```bash
pnpm exec tsx --test apps/web/lib/cryptopedia-taxonomy.test.ts
```

Expected: FAIL because taxonomy exports do not exist.

- [ ] **Step 3: Implement taxonomy**

Export:

```ts
export type ScreenId =
  | "projects" | "macro" | "events" | "updates"
  | "fundamentals" | "builders" | "academy"
  | "event-archive" | "article" | "book"

export interface NavItem {
  id: ScreenId
  label: string
  children?: { id: string; label: string }[]
}
```

The default screen is `ecosystem`, matching the Figma home. `Avalanche ↗` opens `chains`; the ecosystem heading opens `ecosystem`. `PRIMARY_NAV` and `CHAPTER_NAV` contain the exact labels approved in the Figma document.

- [ ] **Step 4: Verify pass**

```bash
pnpm exec tsx --test apps/web/lib/cryptopedia-taxonomy.test.ts
```

Expected: all taxonomy tests pass.

- [ ] **Step 5: Commit checkpoint — user approval required**

```bash
git add apps/web/lib/cryptopedia-taxonomy.ts apps/web/lib/cryptopedia-taxonomy.test.ts
git commit -m "feature: add cryptopedia navigation taxonomy"
```

## Task 3: Seed and validate the Figma content JSON

**Files:**
- Create: `apps/web/public/cryptopedia/collections.json`
- Create: `apps/web/public/cryptopedia/projects.json`
- Create: `apps/web/public/cryptopedia/macro.json`
- Create: `apps/web/public/cryptopedia/events.json`
- Create: `apps/web/public/cryptopedia/updates.json`
- Create: `apps/web/public/cryptopedia/articles.json`
- Create: `apps/web/public/cryptopedia/books.json`
- Create: `apps/web/lib/cryptopedia-data.test.ts`
- Create: `apps/web/lib/cryptopedia-data.ts`

- [ ] **Step 1: Write failing repository tests**

Inject a fake `fetch` into `createStaticCryptopediaRepository`. Assert that:

- `getCollection("fundamentals")` validates and returns four entries.
- `getProjects()` returns Avalanche, Beam, Dexalot, All blue, Pengolin in volume order.
- `getEvents()` returns `EventFeedResponse` and preserves `nextCursor` and `generatedAt`.
- upcoming events are ordered by `startsAt` ascending and past events descending.
- an HTTP 500 throws `CryptopediaDataError` with `kind === "network"`.
- malformed JSON throws `CryptopediaDataError` with `kind === "validation"`.
- every real file under `public/cryptopedia/*.json` parses with its matching Task 1 schema.

- [ ] **Step 2: Verify failure**

```bash
pnpm exec tsx --test apps/web/lib/cryptopedia-data.test.ts
```

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the repository**

Export this stable interface:

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

`createStaticCryptopediaRepository(fetchImpl = fetch)` loads only `/cryptopedia/*.json`, checks `response.ok`, parses with the Task 1 schemas, and never imports Cherry API clients.

- [ ] **Step 4: Add exact Figma seed content**

Required collection counts:

```text
fundamentals: 4 — chain-overview, pcx-chains, validator-structure, glossary
builders: 4 — official-docs, code-reference, builder-articles, mcp-x402
academy: 4 — foundation, structure, practice, skill-graph
projects: 5 — avalanche, beam, dexalot, allblue, pengolin
macro: 2 sample entries
updates: 2 sample entries
events: 4 September 2026 sample entries
```

Use the Figma text verbatim for visible sample copy. Do not invent facts beyond the prototype. Use `sourceUrl: null` when Figma provides no real URL and `confidence: null` for prototype-only records.

Do not map crawler `published_at` into `EventEntry.startsAt`. The existing crawler date is the publication date of an article. Phase-1 event dates and statuses are explicit prototype JSON fields.

- [ ] **Step 5: Verify pass**

```bash
pnpm exec tsx --test apps/web/lib/cryptopedia-data.test.ts
```

Expected: repository tests pass.

- [ ] **Step 6: Commit checkpoint — user approval required**

```bash
git add apps/web/lib/cryptopedia-data.ts apps/web/lib/cryptopedia-data.test.ts apps/web/public/cryptopedia
git commit -m "feature: seed avalanche editorial content"
```

## Task 4: Install Figma typography, assets, and tokens without new packages

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`
- Create: `apps/web/public/cryptopedia/assets/aidenteti-seal.png`

- [ ] **Step 1: Capture baseline**

Record the existing `layout.tsx` font imports and the `:root` token block in the progress log. This is the rollback oracle.

- [ ] **Step 2: Download the exact seal asset**

Use Figma node `153:496` through the Figma asset tool. Save the complete node export returned by Figma as `aidenteti-seal.png`; do not reconstruct the five child vector layers. Confirm the file is a non-empty PNG. Never leave a temporary Figma URL in source.

- [ ] **Step 3: Load the exact font families**

Use `Cormorant` for display text and `Noto_Sans_KR` for body text through `next/font/google`. Expose `--font-editorial-display` and `--font-editorial-body` on `<html>`. Keep existing font variables so `/start/*` retains its current fonts. Do not change root metadata because `layout.tsx` is shared by nine routes.

- [ ] **Step 4: Add scoped tokens**

Add the six approved variables and scope editorial defaults under `.editorial-root`. Do not replace Cherry's existing `:root` tokens globally.

```css
.editorial-root {
  --editorial-paper: #151a20;
  --editorial-surface: #101419;
  --editorial-ink: #e9edf2;
  --editorial-muted: #a5afbb;
  --editorial-accent: #cebd91;
  --editorial-line: #323c48;
  background: var(--editorial-paper);
  color: var(--editorial-ink);
  font-family: var(--font-editorial-body), sans-serif;
}
```

- [ ] **Step 5: Verify types**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no new errors compared with the documented baseline.

- [ ] **Step 6: Commit checkpoint — user approval required**

```bash
git add apps/web/app/layout.tsx apps/web/app/globals.css apps/web/public/cryptopedia/assets/aidenteti-seal.png
git commit -m "feature: add cryptopedia editorial foundations"
```

## Task 5: Build the responsive shell

**Files:**
- Create: `apps/web/components/cherry/editorial/editorial-masthead.tsx`
- Create: `apps/web/components/cherry/editorial/editorial-index.tsx`
- Create: `apps/web/components/cherry/editorial/editorial-mobile-index.tsx`
- Create: `apps/web/components/cherry/editorial/editorial-shell.tsx`

- [ ] **Step 1: Implement Masthead from Figma node `153:495`**

Props:

```ts
interface EditorialMastheadProps {
  onHome: () => void
}
```

Use the local seal, `AIDENTETI CREW`, `Cryptopedia`, and `THE BLOCKCHAIN ENCYCLOPEDIA / KNOWLEDGE, CONNECTED.`. The wordmark is a real button or link, not a decorative `div`.

- [ ] **Step 2: Implement the shared index data rendering**

Both navigation variants accept:

```ts
interface EditorialIndexProps {
  activeScreen: ScreenId
  onSelect: (screen: ScreenId) => void
}
```

Use `aria-current="page"` on the active item. Render the ecosystem heading and primary navigation before chapter navigation.

- [ ] **Step 3: Implement the shell**

```ts
interface EditorialShellProps extends EditorialIndexProps {
  children: React.ReactNode
}
```

Match:

- 1440: masthead 105px, index 244px, remaining reading column.
- 834: masthead 105px, index 200px, remaining reading column.
- 390: masthead, index, reading column vertically.

- [ ] **Step 4: Verify keyboard navigation and responsive structure**

Run TypeScript and inspect 1440, 834, and 390 in the browser. Expected: no horizontal page overflow and every navigation item is reachable with Tab.

- [ ] **Step 5: Commit checkpoint — user approval required**

```bash
git add apps/web/components/cherry/editorial/editorial-*.tsx
git commit -m "feature: build responsive cryptopedia shell"
```

## Task 6: Build the collection template

**Files:**
- Create: `apps/web/components/cherry/editorial/editorial-states.tsx`
- Create: `apps/web/components/cherry/editorial/content-entry-row.tsx`
- Create: `apps/web/components/cherry/editorial/content-entry-list.tsx`
- Create: `apps/web/components/cherry/editorial/collection-page.tsx`

- [ ] **Step 1: Implement explicit state components**

Create `EditorialLoading`, `EditorialEmpty`, and `EditorialError`. `EditorialError` accepts `onRetry`. Keep the Figma row geometry to prevent layout shifts.

- [ ] **Step 2: Implement the reusable entry row**

```ts
interface ContentEntryRowProps {
  entry: ContentEntry
  onOpen: (id: string) => void
}
```

Render order, title, summary, kind, and arrow. The whole row is one button. Preserve summary wrapping on mobile.

- [ ] **Step 3: Implement `CollectionPage`**

```ts
interface CollectionPageProps {
  data: CollectionPageData
  onOpenEntry: (id: string) => void
}
```

Match Figma nodes `153:970`, `153:2922`, and `154:1114` using the same component.

- [ ] **Step 4: Verify all three collections**

Expected counts: Fundamentals 4, Builders 4, Academy 4. Verify each title, summary, and kind comes from JSON rather than JSX constants.

- [ ] **Step 5: Commit checkpoint — user approval required**

```bash
git add apps/web/components/cherry/editorial/editorial-states.tsx apps/web/components/cherry/editorial/content-entry-*.tsx apps/web/components/cherry/editorial/collection-page.tsx
git commit -m "feature: add editorial collection pages"
```

## Task 7: Build Projects, Macro, Events, and Updates

**Files:**
- Create: `apps/web/components/cherry/editorial/projects-page.tsx`
- Create: `apps/web/components/cherry/editorial/feed-page.tsx`
- Create: `apps/web/components/cherry/editorial/events-page.tsx`

- [ ] **Step 1: Implement Projects from Figma node `190:1172`**

Group `CollectionVolume[]` into `CHAIN` and `PROJECT`. Render `volume`, `name`, `networkType`, description, and local cover asset when present. Missing covers use the same typographic cover treatment, not a placeholder image.

- [ ] **Step 2: Implement shared feed page**

Use `FeedPage` for Macro (`190:2731`) and Updates (`190:5857`). Props include title, introduction, filter labels, entries, and retry callback. Do not implement client-side filtering until more than one real category exists; show the Figma labels as non-interactive descriptive text in phase 1.

- [ ] **Step 3: Implement Events from Figma node `190:4285`**

Read `EventFeedResponse.items`, format `startsAt` through `Intl.DateTimeFormat("ko-KR")`, and render title, organizer, and `venueName`. Group `UPCOMING` and `ONGOING` under 예정된 이벤트, `PAST` under 지난 이벤트, and render a conditional 일정 변경 group for `CANCELLED` and `POSTPONED`. Do not recalculate prototype status from the current date. A missing venue displays `장소 정보 없음`.

- [ ] **Step 4: Verify empty and error states**

Temporarily inject empty arrays and a rejecting repository in development, confirm the correct state, then remove the temporary injection before proceeding.

- [ ] **Step 5: Commit checkpoint — user approval required**

```bash
git add apps/web/components/cherry/editorial/projects-page.tsx apps/web/components/cherry/editorial/feed-page.tsx apps/web/components/cherry/editorial/events-page.tsx
git commit -m "feature: add cryptopedia ecosystem feeds"
```

## Task 8: Build reader and book detail templates

**Files:**
- Create: `apps/web/components/cherry/editorial/article-reader.tsx`
- Create: `apps/web/components/cherry/editorial/book-detail-page.tsx`

- [ ] **Step 1: Implement article reader**

Props:

```ts
interface ArticleReaderProps {
  article: ArticleDetail
  onBack: () => void
  onOpenRelated: (id: string) => void
}
```

Support the exact sections visible in nodes `154:7430`, `154:8858`, `154:10286`, and `154:11750`: breadcrumb, title, subtitle, summary/body blocks, related list, official source, and next reading action.

- [ ] **Step 2: Implement book detail**

Props:

```ts
interface BookDetailPageProps {
  book: BookDetail
  onBack: () => void
  onOpenChapter: (id: string) => void
}
```

One component renders all five book frames. Cover labels and chapter titles come from `books.json`.

- [ ] **Step 3: Verify navigation round trips**

Test `Projects → Avalanche book → chapter → back → Projects` and `Fundamentals → chain overview → related architecture → back` manually.

- [ ] **Step 4: Commit checkpoint — user approval required**

```bash
git add apps/web/components/cherry/editorial/article-reader.tsx apps/web/components/cherry/editorial/book-detail-page.tsx
git commit -m "feature: add cryptopedia readers"
```

## Task 9: Compose `EditorialApp`

**Files:**
- Create: `apps/web/components/cherry/editorial/editorial-app.tsx`

- [ ] **Step 1: Implement one state machine**

Use a discriminated union:

```ts
type EditorialView =
  | { kind: "screen"; id: ScreenId }
  | { kind: "article"; id: string; parent: ScreenId }
  | { kind: "book"; id: string; parent: "projects" }
```

Do not maintain independent booleans for every screen.

- [ ] **Step 2: Load data through `CryptopediaRepository` only**

Components receive parsed data as props. They do not call `fetch` directly. Each loading effect uses a cancellation flag so an older request cannot overwrite a newer screen. On screen changes, reset scroll to the top and preserve the correct parent for Back.

- [ ] **Step 3: Render every taxonomy destination**

Every `PRIMARY_NAV` and `CHAPTER_NAV` item must map to a visible page. Unknown content IDs show `EditorialError` rather than silently returning the home screen.

- [ ] **Step 4: Verify type coverage**

Use a `never` exhaustiveness helper in the screen switch. Run:

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 5: Commit checkpoint — user approval required**

```bash
git add apps/web/components/cherry/editorial/editorial-app.tsx
git commit -m "feature: compose avalanche cryptopedia app"
```

## Task 10: Replace only the `/` entry

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Capture the pre-change reference**

Record the current commit `2070ed6` and `git show 2070ed6:apps/web/app/page.tsx` as the rollback source. Do not create a duplicate legacy component.

- [ ] **Step 2: Replace the root entry**

The complete new file is:

```tsx
import type { Metadata } from "next"
import { EditorialApp } from "@/components/cherry/editorial/editorial-app"

export const metadata: Metadata = {
  title: "Cryptopedia — The Blockchain Encyclopedia",
  description: "Avalanche knowledge, connected.",
}

export default function Page() {
  return <EditorialApp />
}
```

- [ ] **Step 3: Verify unaffected routes compile**

```bash
cd apps/web && npx tsc --noEmit
```

Open `/start`, `/login`, `/start/login`, `/template/edit`, and `/demo-hanbit`. Expected: routes render without a new runtime exception.

External source links render only when `sourceUrl` exists and use `target="_blank" rel="noopener noreferrer"`.

- [ ] **Step 4: Commit checkpoint — user approval required**

```bash
git add apps/web/app/page.tsx
git commit -m "feature: make cryptopedia the root experience"
```

## Task 11: Visual verification against Figma

**Files:**
- Update: `apps/docs/avalanche-editorial-ui/3-checklist-table.md`

- [ ] **Step 1: Run contract tests**

```bash
pnpm exec tsx --test apps/web/lib/cryptopedia-types.test.ts apps/web/lib/cryptopedia-taxonomy.test.ts apps/web/lib/cryptopedia-data.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript and production build**

```bash
cd apps/web && npx tsc --noEmit
cd apps/web && pnpm build
```

Expected: no new TypeScript error and successful Next.js build. Document pre-existing unrelated errors separately instead of changing their files.

- [ ] **Step 3: Compare reference frames**

Capture these exact viewports:

```text
1440 × 1024
834 × 984 or the frame's natural height
390 × each frame's natural height
```

Compare all 27 families listed in `cryptopedia-figma-manifest.ts` at their desktop, tablet, and mobile nodes. Check spacing, line wraps, typography, borders, colors, active navigation, unique modules, and every visible asset.

- [ ] **Step 4: Verify accessibility**

Tab through masthead, index, entry rows, related links, and Back. Verify visible focus, `aria-current`, descriptive link text, and reduced-motion behavior.

- [ ] **Step 5: Record evidence paths**

Save screenshots under a temporary verification directory outside Git. Record their absolute paths and the commands/results in the checklist without committing screenshot binaries.

## Task 12: Update handoff documentation

**Files:**
- Modify: `apps/docs/base-data/frontend-status-2026-08-25.md`
- Create: `apps/docs/avalanche-editorial-ui/4-progress-log.md`

- [ ] **Step 1: Record the new root behavior**

Document that `/` renders Avalanche Cryptopedia and the previous Cherry developer components remain in source but are not reachable from `/`.

- [ ] **Step 2: Record data ownership**

Document `public/cryptopedia/*.json` as the phase-1 source of truth and `CryptopediaRepository` as the API replacement boundary.

- [ ] **Step 3: Record verification evidence**

Include test counts, TypeScript/build results, inspected viewport sizes, remaining risks, and no DB/API changes.

- [ ] **Step 4: Final commit checkpoint — user approval required**

```bash
git add apps/docs/base-data/frontend-status-2026-08-25.md apps/docs/avalanche-editorial-ui
git commit -m "docs: document avalanche editorial ui"
```

## Execution handoff

Implement tasks in order with a review checkpoint after each numbered task. Because this repository requires explicit permission for commits, leave changes uncommitted unless the user separately says to commit. Do not push or deploy without a separate explicit request.
