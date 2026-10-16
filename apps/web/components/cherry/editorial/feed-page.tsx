'use client'

import type { ContentEntry } from '@/lib/cryptopedia-types'
import { DevelopmentUpdatesPage } from './development-updates-page'
import { MacroNewsPage } from './macro-news-page'

type FeedPageProps = {
  eyebrow?: string
  title: string
  introduction: string
  mode: 'macro' | 'updates'
  entries: ContentEntry[]
  stateKey?: string
  onOpenEntry?: (id: string) => void
}

export function FeedPage(props: FeedPageProps) {
  return props.mode === 'updates' ? (
    <DevelopmentUpdatesPage entries={props.entries} stateKey={props.stateKey} />
  ) : (
    <MacroNewsPage {...props} />
  )
}
