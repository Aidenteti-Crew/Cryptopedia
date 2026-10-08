# Editorial Page Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에디토리얼 콘텐츠 영역에 절제된 페이지 전환 모션을 추가한다.

**Architecture:** `EditorialView`에서 안정적인 화면 키를 만들고, 전용 `EditorialPageTransition` 컴포넌트가 `AnimatePresence`와 `motion`을 캡슐화한다. 셸은 그대로 두고 콘텐츠 슬롯만 감싸며 축소 모션 설정을 존중한다.

**Tech Stack:** React 19, Next.js 16, Framer Motion 12, Node test runner

---

### Task 1: 전환 계약 고정

**Files:**
- Modify: `apps/web/components/cherry/editorial/editorial-app.test.ts`
- Create: `apps/web/components/cherry/editorial/editorial-page-transition.test.tsx`

- [ ] 화면·기사·책마다 안정적인 키가 생성되는 실패 테스트를 작성한다.
- [ ] 첫 렌더 제외, wait 모드, 축소 모션 처리를 요구하는 실패 테스트를 작성한다.
- [ ] 두 테스트를 실행해 기능 부재로 실패하는지 확인한다.

### Task 2: 전환 컴포넌트 구현

**Files:**
- Create: `apps/web/components/cherry/editorial/editorial-page-transition.tsx`
- Modify: `apps/web/components/cherry/editorial/editorial-app.tsx`

- [ ] `AnimatePresence initial={false} mode="wait"` 기반의 전환 컴포넌트를 구현한다.
- [ ] 진입 180ms·퇴장 120ms와 6px/4px 이하의 미세 이동을 적용한다.
- [ ] `useReducedMotion`에서 이동과 지속 시간을 제거한다.
- [ ] `EditorialShell`의 콘텐츠 슬롯만 전환 컴포넌트로 감싼다.
- [ ] 단위 테스트와 전체 테스트를 실행한다.

### Task 3: 실제 동작 검증

**Files:**
- Modify: `apps/docs/avalanche-editorial-ui/4-progress-log.md`

- [ ] 프로덕션 빌드를 실행한다.
- [ ] 브라우저에서 목록·상세·뒤로 가기·빠른 연속 이동을 확인한다.
- [ ] 콘솔 오류와 깨진 내부 링크가 없는지 확인한다.
- [ ] 검증 결과를 진행 기록에 추가한다.
