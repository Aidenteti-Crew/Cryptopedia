import { notFound } from 'next/navigation'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'
import { editorialViewFromPath } from '@/lib/cryptopedia-routes'
import { getEditorialBookMetadata } from '@/lib/cryptopedia-metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = editorialViewFromPath(`/ecosystem/projects/books/${id}`)
  if (!view || view.kind !== 'book') return {}
  return getEditorialBookMetadata(view.id)
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = editorialViewFromPath(`/ecosystem/projects/books/${id}`)
  if (!view || view.kind !== 'book') notFound()
  return <EditorialApp view={view} />
}
