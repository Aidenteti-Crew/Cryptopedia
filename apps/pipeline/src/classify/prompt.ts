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
- title_ko: a plain Korean headline, at most 40 characters, saying what changes for the network or its users, with the key number when there is one.
  No proposal or version number, no product prefix, and no status words (제안, 확정, 활성화, 적용, Proposed, Activated): the page shows the number, version and status separately.
- summary_ko: exactly 2 short Korean sentences in 해요체 (~해요, ~예요), for a reader who knows what a blockchain is but not this protocol.
  Sentence 1: the background the reader needs (what exists today and why it matters).
  Sentence 2: what this changes, with the concrete number or name.
  At most 60 characters per sentence. No EIP/ACP numbers, opcode or parameter names; keep a technical term only when the reader needs it, and explain it in the same sentence.
  No hype, nothing that is not in the text. Do not say whether it is proposed or activated: the page shows that.
  Examples (the style to follow; the facts always come from the post):
    ACP-267 (validator uptime requirement)
      title_ko: "검증자 가동률 기준을 80%에서 90%로"
      summary_ko: "Avalanche 검증자는 스테이킹 기간 동안 일정 가동률을 채워야 보상을 받아요. 이 기준을 80%에서 90%로 올려요."
    ACP-131 (Cancun EIPs on C-Chain)
      title_ko: "C-Chain에 이더리움 Cancun 기능 적용"
      summary_ko: "C-Chain은 이더리움과 같은 방식으로 스마트 컨트랙트를 실행해요. 이더리움 Cancun 업그레이드의 새 기능을 켜되, 대용량 데이터 거래(블롭)는 빼요."
    avalanchego v1.15.0 release
      title_ko: "Helicon 업그레이드를 담은 노드 소프트웨어"
      summary_ko: "노드 운영자는 네트워크 업그레이드 전에 노드 소프트웨어를 새 버전으로 올려야 해요. 이번 버전에는 Helicon 업그레이드에 들어가는 제안 6개가 담겼어요."
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
