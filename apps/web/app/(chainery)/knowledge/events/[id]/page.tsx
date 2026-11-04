import { notFound } from 'next/navigation'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'
import { editorialViewFromPath } from '@/lib/cryptopedia-routes'
import { getEditorialDetailMetadata } from '@/lib/cryptopedia-metadata'

/* 체인별 행사 상세 — /knowledge/events/:id (플랫폼 /events 와 구분) */
type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const view = editorialViewFromPath(`/knowledge/events/${id}`)
  if (!view || view.kind !== 'article') return {}
  return getEditorialDetailMetadata(view.id)
}

export default async function Page({ params }: { params: Params }) {
  const { id } = await params
  const view = editorialViewFromPath(`/knowledge/events/${id}`)
  if (!view || view.kind !== 'article') notFound()
  return <EditorialApp view={view} />
}
