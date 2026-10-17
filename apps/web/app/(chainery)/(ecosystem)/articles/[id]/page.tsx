import { notFound } from 'next/navigation'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'
import { editorialViewFromPath } from '@/lib/cryptopedia-routes'
import { getEditorialDetailMetadata } from '@/lib/cryptopedia-metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = editorialViewFromPath(`/articles/${id}`)
  if (!view || view.kind !== 'article') return {}
  return getEditorialDetailMetadata(view.id)
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = editorialViewFromPath(`/articles/${id}`)
  if (!view || view.kind !== 'article') notFound()
  return <EditorialApp view={view} />
}
