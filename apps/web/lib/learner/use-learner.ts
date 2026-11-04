'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { createLocalLearnerStore, type LearnerState, type LearnerStore } from './store'

/* 화면들이 함께 쓰는 학습자 기록 — 홈 카드 · 설문 · 내 경로 · 개념 상세가 같은 상태를 본다.
   저장소는 지금은 localStorage, 로그인 후에는 같은 LearnerStore 인터페이스의 API 구현으로 바꾼다.
   서버 렌더와 첫 화면에서는 state 가 null(아직 안 읽음) — 기록에 따라 달라지는 부분은 그 뒤에 그린다. */

interface Snapshot {
  state: LearnerState | null
  /** 마지막 저장이 실패했으면 false — 이 브라우저에 저장할 수 없다는 안내를 보인다 */
  persisted: boolean
}

let backend: LearnerStore | null = null
let snapshot: Snapshot = { state: null, persisted: true }
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const SERVER_SNAPSHOT: Snapshot = { state: null, persisted: true }

function emit(next: Snapshot) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

function ensureLoaded() {
  if (loading) return
  backend ??= createLocalLearnerStore()
  loading = backend.load().then((state) => {
    // 읽는 사이 이미 바뀌었으면(빠른 클릭) 그 상태를 지킨다
    if (!snapshot.state) emit({ ...snapshot, state })
  })
}

export function updateLearner(change: (state: LearnerState) => LearnerState) {
  if (!snapshot.state) return
  const state = change(snapshot.state)
  if (state === snapshot.state) return
  emit({ ...snapshot, state })
  backend ??= createLocalLearnerStore()
  void backend.save(state).then((persisted) => {
    if (persisted !== snapshot.persisted) emit({ ...snapshot, persisted })
  })
}

export function useLearner(): Snapshot {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
    () => SERVER_SNAPSHOT
  )
  useEffect(ensureLoaded, [])
  return current
}

/* 같은 브라우저 안에서 겹치지 않는 경로 id */
export function newPathId() {
  return `path-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
