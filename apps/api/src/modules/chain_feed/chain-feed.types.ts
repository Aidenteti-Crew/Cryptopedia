import type { EventStatus } from './event-query';

// Response shapes. EventEntry/EventFeedResponse mirror apps/web/lib/cryptopedia-types.ts;
// the ecosystem items extend the frontend ContentEntry with the extra fields the crawler knows.
export interface EventEntry {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  allDay: boolean;
  status: EventStatus;
  organizer: string | null;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  country: string | null;
  isOnline: boolean;
  sourceUrl: string | null;
  registrationUrl: string | null;
  imageUrl: string | null;
  category: string | null;
  tags: string[];
  chain: string | null;
  project: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  confidence: number | null;
}

export interface EventFeedResponse {
  items: EventEntry[];
  nextCursor: string | null;
  generatedAt: string;
}

export interface ContentFeedItem {
  id: string;
  title: string;
  summary: string;
  // MACRO, UPDATE and ARTICLE are values of the frontend ContentEntry kind enum.
  kind: 'MACRO' | 'UPDATE' | 'ARTICLE';
  subKind: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  collectedAt: string;
  importance: number | null;
  relatedProject?: string | null;
  network?: string;
  upgradeName?: string | null;
  version?: string | null;
  activatedAt?: string | null;
}

export interface ContentFeedResponse {
  items: ContentFeedItem[];
  generatedAt: string;
}

export interface ProjectItem {
  id: string;
  key: string;
  name: string;
  category: string | null;
  developer: string | null;
  websiteUrl: string | null;
  documentationUrl: string | null;
  description: string | null;
  chains: string[];
  sourceUrl: string | null;
}

export interface ProjectCategoryCount {
  name: string;
  count: number;
}

export interface ProjectsResponse {
  items: ProjectItem[];
  categories: ProjectCategoryCount[];
  total: number;
  generatedAt: string;
}

export interface EcosystemHubResponse {
  projects: { total: number; categories: ProjectCategoryCount[] };
  macro: ContentFeedItem[];
  events: EventEntry[];
  updates: ContentFeedItem[];
  general: ContentFeedItem[];
  generatedAt: string;
}
