import { notFound } from 'next/navigation'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'
import { editorialViewFromPath } from '@/lib/cryptopedia-routes'
import { getEditorialDetailMetadata } from '@/lib/cryptopedia-metadata'

interface Params {
  section: string
  id: string
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { section, id } = await params
  const view = editorialViewFromPath(`/chapters/${section}/${id}`)
  if (!view || view.kind !== 'article') return {}
  return getEditorialDetailMetadata(view.id)
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { section, id } = await params
  const view = editorialViewFromPath(`/chapters/${section}/${id}`)
  if (!view || view.kind !== 'article') notFound()
  return <EditorialApp view={view} />
}
