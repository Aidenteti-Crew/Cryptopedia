import type { ContentEntry } from '@/lib/cryptopedia-types'
import { releaseStage } from '@/lib/development-discovery'

export type ContentColor = 'violet' | 'blue' | 'mint' | 'orange' | 'rose' | 'neutral'

export function updateContentColor(entry: ContentEntry): ContentColor {
  if (entry.subKind === 'RELEASE') return releaseStage(entry) === 'prerelease' ? 'orange' : 'mint'
  return entry.subKind === 'BLOG' ? 'violet' : 'blue'
}
