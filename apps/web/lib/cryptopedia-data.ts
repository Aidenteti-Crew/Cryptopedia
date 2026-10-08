import { z } from "zod"

import {
  articleDetailSchema,
  bookDetailSchema,
  chainCollectionPageSchema,
  collectionPageSchema,
  collectionVolumeSchema,
  contentEntrySchema,
  eventFeedResponseSchema,
  ecosystemPageSchema,
  type ArticleDetail,
  type BookDetail,
  type ChainCollectionPageData,
  type CollectionPageData,
  type CollectionVolume,
  type ContentEntry,
  type EventFeedResponse,
  type EcosystemPageData,
  type EventStatus,
} from "./cryptopedia-types"

export type CryptopediaDataErrorKind = "network" | "validation" | "not-found"

export class CryptopediaDataError extends Error {
  constructor(
    readonly kind: CryptopediaDataErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = "CryptopediaDataError"
  }
}

export interface CryptopediaRepository {
  getChains(): Promise<ChainCollectionPageData>
  getEcosystem(): Promise<EcosystemPageData>
  getCollection(id: string): Promise<CollectionPageData>
  getProjects(): Promise<CollectionVolume[]>
  getMacroArticles(): Promise<ContentEntry[]>
  getUpdates(): Promise<ContentEntry[]>
  getEvents(): Promise<EventFeedResponse>
  getArticle(id: string): Promise<ArticleDetail>
  getBook(id: string): Promise<BookDetail>
}

const collectionListSchema = z.array(collectionPageSchema)
const projectListSchema = z.array(collectionVolumeSchema)
const contentListSchema = z.array(contentEntrySchema)
const articleListSchema = z.array(articleDetailSchema)
const bookListSchema = z.array(bookDetailSchema)

const STATUS_ORDER: Record<EventStatus, number> = {
  UPCOMING: 0,
  ONGOING: 0,
  POSTPONED: 1,
  CANCELLED: 1,
  PAST: 2,
}

async function loadJson<T>(
  fetchImpl: typeof fetch,
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Response
  try {
    response = await fetchImpl(path)
  } catch (error) {
    throw new CryptopediaDataError("network", `Failed to load ${path}`, error)
  }

  if (!response.ok) {
    throw new CryptopediaDataError(
      "network",
      `Failed to load ${path} (${response.status})`,
    )
  }

  try {
    return schema.parse(await response.json())
  } catch (error) {
    throw new CryptopediaDataError("validation", `Invalid data in ${path}`, error)
  }
}

function sortEvents(feed: EventFeedResponse): EventFeedResponse {
  const items = feed.items.toSorted((left, right) => {
    const rank = STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
    if (rank !== 0) return rank

    const leftTime = new Date(left.startsAt).getTime()
    const rightTime = new Date(right.startsAt).getTime()
    return left.status === "PAST" ? rightTime - leftTime : leftTime - rightTime
  })

  return { ...feed, items }
}

export function createStaticCryptopediaRepository(
  fetchImpl: typeof fetch = fetch,
): CryptopediaRepository {
  return {
    getChains() {
      return loadJson(
        fetchImpl,
        "/cryptopedia/chains.json",
        chainCollectionPageSchema,
      )
    },

    getEcosystem() {
      return loadJson(
        fetchImpl,
        "/cryptopedia/ecosystem.json",
        ecosystemPageSchema,
      )
    },

    async getCollection(id) {
      const collections = await loadJson(
        fetchImpl,
        "/cryptopedia/collections.json",
        collectionListSchema,
      )
      const collection = collections.find((item) => item.id === id)
      if (!collection) {
        throw new CryptopediaDataError("not-found", `Unknown collection: ${id}`)
      }
      return collection
    },

    async getProjects() {
      const projects = await loadJson(
        fetchImpl,
        "/cryptopedia/projects.json",
        projectListSchema,
      )
      return projects.toSorted((left, right) => left.volume - right.volume)
    },

    getMacroArticles() {
      return loadJson(fetchImpl, "/cryptopedia/macro.json", contentListSchema)
    },

    getUpdates() {
      return loadJson(fetchImpl, "/cryptopedia/updates.json", contentListSchema)
    },

    async getEvents() {
      const feed = await loadJson(
        fetchImpl,
        "/cryptopedia/events.json",
        eventFeedResponseSchema,
      )
      return sortEvents(feed)
    },

    async getArticle(id) {
      const articles = await loadJson(
        fetchImpl,
        "/cryptopedia/articles.json",
        articleListSchema,
      )
      const article = articles.find((item) => item.id === id)
      if (!article) {
        throw new CryptopediaDataError("not-found", `Unknown article: ${id}`)
      }
      return article
    },

    async getBook(id) {
      const books = await loadJson(
        fetchImpl,
        "/cryptopedia/books.json",
        bookListSchema,
      )
      const book = books.find((item) => item.id === id)
      if (!book) {
        throw new CryptopediaDataError("not-found", `Unknown book: ${id}`)
      }
      return book
    },
  }
}
