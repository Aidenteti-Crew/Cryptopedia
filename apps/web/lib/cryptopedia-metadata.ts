import type { Metadata } from 'next'

import articles from '@/public/cryptopedia/articles.json'
import books from '@/public/cryptopedia/books.json'
import hub from '@/public/cryptopedia/hub.json'
import { CHAPTER_NAV } from './cryptopedia-taxonomy'

const hubEntries: { id: string; title: string; summary: string }[] = [
  ...hub.projects,
  ...hub.resources,
  ...hub.concepts,
  ...hub.skills,
  ...hub.cases,
]

export function getEditorialDetailMetadata(id: string): Metadata {
  const article = articles.find((item) => item.id === id)
  const hubEntry = hubEntries.find((item) => item.id === id)
  const chapterEntry = CHAPTER_NAV.flatMap((chapter) => chapter.children ?? []).find((item) => item.id === id)
  return {
    title: `${article?.title ?? hubEntry?.title ?? chapterEntry?.label ?? '자료'} | Cryptopedia`,
    description: article?.quickSummary ?? hubEntry?.summary ?? (chapterEntry ? `${chapterEntry.label} 자료를 살펴보세요.` : '체인 생태계 자료를 읽어보세요.'),
  }
}

export function getEditorialBookMetadata(id: string): Metadata {
  const book = books.find((item) => item.id === id)
  return {
    title: `${book?.name ?? '체인 컬렉션'} | Cryptopedia`,
    description: book?.readingGuide ?? '체인 컬렉션을 살펴보세요.',
  }
}
