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

/* LEARN 하위 메뉴 페이지의 탭 제목 — 페이지 제목(metadata.title)은 영어로 통일한다.
   CHAPTER_NAV 에 하위 항목을 추가하면 여기에도 넣는다 (cryptopedia-metadata.test.ts 가 확인) */
export const MENU_PAGE_TITLES: Record<string, string> = {
  'skill-graph': 'Learning Map',
  practice: 'Case Studies',
  'chain-overview': 'Chain Overview',
  'pcx-chains': 'Network & Chains',
  'validator-structure': 'Consensus & Validators',
  glossary: 'Glossary',
  'official-docs': 'Official Docs',
  'skill-library': 'Skill Library',
  'mcp-tools': 'MCP & Agent Tools',
  'code-reference': 'Code & Tool Reference',
}

export function getEditorialDetailMetadata(id: string): Metadata {
  const article = articles.find((item) => item.id === id)
  const hubEntry = hubEntries.find((item) => item.id === id)
  const chapterEntry = CHAPTER_NAV.flatMap((chapter) => chapter.children ?? []).find((item) => item.id === id)
  return {
    title: MENU_PAGE_TITLES[id] ?? article?.title ?? hubEntry?.title ?? chapterEntry?.label ?? '자료',
    description: article?.quickSummary ?? hubEntry?.summary ?? (chapterEntry ? `${chapterEntry.label} 자료를 살펴보세요.` : '체인 생태계 자료를 읽어보세요.'),
  }
}

export function getEditorialBookMetadata(id: string): Metadata {
  const book = books.find((item) => item.id === id)
  return {
    title: book?.name ?? '체인 컬렉션',
    description: book?.readingGuide ?? '체인 컬렉션을 살펴보세요.',
  }
}
