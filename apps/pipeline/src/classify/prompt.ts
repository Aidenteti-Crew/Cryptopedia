import { IMPORTANCE_RUBRIC } from './rubric.js'

const MAX_BODY_CHARS = 6000

export interface PromptArticle {
  title: string
  url: string
  author: string | null
  body: string | null
  publishedAt: Date
  sourceName: string
  contentKind: string
}

export const SYSTEM_PROMPT = `You classify and score posts collected from official Avalanche (AVAX) sources for a Korean-language ecosystem dashboard.
Reply with ONE JSON object and nothing else: no markdown fences, no commentary.

category (pick exactly one):
- TECH_UPDATE: protocol or software changes: node/client releases, network upgrades (Fuji or Mainnet), ACP proposals and status changes, developer-facing technical announcements.
- EVENT: an announcement, invitation, schedule or recap about one specific gathering: summit, conference, meetup, hackathon, trading competition, AMA, workshop.
- MACRO: ecosystem and market news: partnerships and collaborations, integrations going live, institutional adoption, volume/TVL/price statistics, funding, regulation.
- GENERAL: useful information that fits none of the above: explainers and educational posts, ecosystem overviews, analyses, guides, opinion pieces with concrete content.
- NOISE: no information worth keeping: greetings ("gm"), memes, engagement bait, slogans or hype, promotion with no concrete facts. Use NOISE only when a reader would learn nothing; when in doubt prefer GENERAL.

${IMPORTANCE_RUBRIC}

Fields:
- title_ko: short Korean headline, at most 80 characters.
- summary_ko: 1-2 Korean sentences with the concrete facts (what, who, numbers, versions). No hype, nothing that is not in the text.
- macro (only when category is MACRO, else null): {"kind": "COLLAB"|"VOLUME"|"OTHER", "related_project": string|null}
- tech (only when category is TECH_UPDATE, else null): {"network": "FUJI"|"MAINNET"|"BOTH"|"OTHER", "upgrade_name": string|null, "version": string|null, "activated_at": ISO 8601 string|null}
  network: where the text says the change is deployed or activated (Fuji testnet, Mainnet, both). Use OTHER when it is not stated. Do not guess.
  activated_at: only when the text states an activation date or time, otherwise null.
- event (only when category is EVENT, else null): {"name": string|null, "starts_at": ISO 8601 string|null, "ends_at": ISO 8601 string|null, "timezone": IANA name|null, "all_day": boolean, "organizer": string|null, "venue_name": string|null, "venue_address": string|null, "city": string|null, "country": ISO 3166-1 alpha-2|null, "is_online": boolean, "registration_url": string|null, "category": "COMMUNITY"|"CONFERENCE"|"HACKATHON"|"TRADING_CONTEST"|"OTHER", "tags": string[], "status": "CANCELLED"|"POSTPONED"|null, "confidence": number between 0 and 1}
  Dates use an ISO 8601 UTC offset, for example "2026-11-28T14:00:00+09:00". If only a date is known, give that date at 00:00 in the event's local time and set all_day to true.
  Never invent a date, city or country that the text does not support. The publication date is given so that a month and day without a year can be resolved; if the text does not give an explicit month and day, starts_at must be null.
  The publication date is when the post was written, not when the event happens.
  confidence: lower it when the date or place was inferred rather than stated.`

function toPlainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|li|h\d|div|ul|ol|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

export function buildUserMessage(article: PromptArticle): string {
  const body = toPlainText(article.body ?? '')
  const clipped =
    body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}\n[truncated]` : body
  return [
    `Source: ${article.sourceName} (${article.contentKind})`,
    `Published: ${article.publishedAt.toISOString()}`,
    `Author: ${article.author ?? 'unknown'}`,
    `Title: ${article.title}`,
    `URL: ${article.url}`,
    '---',
    clipped,
  ].join('\n')
}
