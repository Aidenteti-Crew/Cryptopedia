import type { ContentEntry } from "@/lib/cryptopedia-types"

import { ContentEntryRow } from "./content-entry-row"

interface ContentEntryListProps {
  entries: ContentEntry[]
  onOpen: (id: string) => void
}

export function ContentEntryList({ entries, onOpen }: ContentEntryListProps) {
  return (
    <div>
      {entries.map((entry) => (
        <ContentEntryRow key={entry.id} entry={entry} onOpen={onOpen} />
      ))}
    </div>
  )
}
