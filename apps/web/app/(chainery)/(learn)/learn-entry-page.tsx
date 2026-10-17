import { notFound, redirect } from 'next/navigation'
import { EditorialApp } from '@/components/cherry/editorial/editorial-app'
import { pathForEditorialView, editorialViewFromPath } from '@/lib/cryptopedia-routes'
import { getEditorialDetailMetadata } from '@/lib/cryptopedia-metadata'
import { resolveParentScreen, type ScreenId } from '@/lib/cryptopedia-taxonomy'

/* LEARN 세 메뉴(/academy · /concepts · /skills)의 상세 페이지가 함께 쓰는 본문 */
type Chapter = Extract<ScreenId, 'academy' | 'fundamentals' | 'builders'>
type Params = Promise<{ id: string }>

const CHAPTERS = new Set<ScreenId>(['academy', 'fundamentals', 'builders'])

const viewFor = (chapter: Chapter, id: string) =>
  editorialViewFromPath(`${pathForEditorialView({ kind: 'screen', id: chapter })}/${id}`)

export function learnEntryPage(chapter: Chapter) {
  async function generateMetadata({ params }: { params: Params }) {
    const { id } = await params
    const view = viewFor(chapter, id)
    if (!view || view.kind !== 'article') return {}
    return getEditorialDetailMetadata(view.id)
  }

  async function Page({ params }: { params: Params }) {
    const { id } = await params
    const view = viewFor(chapter, id)
    if (!view || view.kind !== 'article') notFound()
    // 자료가 다른 LEARN 메뉴 소속이면 그 주소로 보낸다 (예: 메뉴를 옮긴 공식 문서의 옛 링크)
    const owner = resolveParentScreen(view.id)
    if (owner && owner !== chapter && CHAPTERS.has(owner))
      redirect(pathForEditorialView({ kind: 'article', id: view.id, parent: owner }))
    return <EditorialApp view={view} />
  }

  return { generateMetadata, Page }
}
