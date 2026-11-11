import { createHash } from 'node:crypto'

import { z } from 'zod'

import type { CareerJob } from './careers'

/* 채용 공고 한국어 정리 — 수집한 영문 공고 본문을 AI 에게 주고, 한국어로 항목별 정리를 받는다.
   사이트의 다른 수집 콘텐츠(apps/pipeline 의 title_ko · summary_ko)와 같은 AI 설정(LLM_*)을 쓴다.
   여기는 지시문 · 응답 검사 · 캐시 키만 있는 순수 함수라 테스트로 고정한다. 네트워크는 scripts/translate-careers.ts */

export const careerDetailSchema = z.object({
  /** 목록에 보이는 한 줄 요약 */
  summary: z.string().min(1).max(200),
  /** 주요 업무 */
  responsibilities: z.array(z.string().min(1)).max(10),
  /** 자격 요건 */
  requirements: z.array(z.string().min(1)).max(10),
  /** 우대 사항 */
  preferred: z.array(z.string().min(1)).max(8),
  /** 근무 조건 · 복지 (위치 · 원격 · 연봉 · 혜택 등 본문에 적힌 것만) */
  conditions: z.array(z.string().min(1)).max(8),
  /** 본문의 거주 · 취업 자격 조건으로 본 한국 지원 가능 여부 */
  korea: z.enum(['yes', 'no', 'unclear']),
})
export type CareerDetail = z.infer<typeof careerDetailSchema>

/** 번역 결과 파일 — 공고 id 마다 한국어 정리와, 어떤 본문을 번역했는지(hash) */
export const careerDetailsSchema = z.record(
  z.string(),
  careerDetailSchema.extend({ hash: z.string(), model: z.string(), translatedAt: z.string() })
)
export type CareerDetails = z.infer<typeof careerDetailsSchema>

export const TRANSLATE_SYSTEM_PROMPT = `You turn a job posting from a Web3 / blockchain company into a short, structured Korean summary for a Korean job board.
Reply with ONE JSON object and nothing else: no markdown fences, no commentary.

Fields (all text in natural Korean; keep product names, technologies, chain names and company names in their original spelling, e.g. Solidity, Rust, Ethereum, Kubernetes):
- summary: one Korean sentence (at most 120 characters) saying what this person will do. Not about the company. No hype.
- responsibilities: up to 6 short Korean bullet points about the work itself.
- requirements: up to 6 short Korean bullet points: must-have experience and skills (keep years of experience as stated).
- preferred: up to 5 short Korean bullet points: nice-to-have items. Empty array if none are stated.
- conditions: up to 5 short Korean bullet points about location, remote rules, residency or time-zone limits, salary, equity/token, benefits. Only what the text states. Empty array if nothing is stated.
- korea: can someone living in South Korea apply and work in this role from Korea?
  "yes" when the role is in Korea, or remote and the text allows Korea, Asia, APAC or anywhere in the world;
  "no" when the text requires living, relocating or being authorized to work in other countries or regions (e.g. US only, EU time zones only, onsite in London);
  "unclear" when the text does not say.

Rules:
- Use only facts in the posting. Never invent salary, location, benefits or requirements.
- Leave out the company introduction, mission statements, equal-opportunity and legal notices, and application instructions.
- Each bullet is one line, at most 80 characters, written as a noun phrase or short sentence ending without a period (e.g. "Rust 로 노드 클라이언트 개발").
- If the posting is already in Korean, keep the meaning and just structure it.`

/** 본문이 너무 길면 앞부분만 (공고 본문은 대개 6천 자 안쪽, 넘는 건 법적 고지 · 복지 목록) */
const MAX_INPUT = 9000

export function translateUserPrompt(
  job: { title: string; company: string; location: string },
  text: string
) {
  return `Title: ${job.title}
Company: ${job.company}
Location: ${job.location}

Posting:
${text.slice(0, MAX_INPUT)}`
}

/** 본문이 바뀌었을 때만 다시 번역하도록 */
export const textHash = (text: string) =>
  createHash('sha256').update(text).digest('hex').slice(0, 16)

const tidyList = (items: unknown) =>
  Array.isArray(items)
    ? items
        .filter((item): item is string => typeof item === 'string')
        .map((item) =>
          item
            .replace(/^[-•·*\s]+/, '')
            .replace(/[.。]\s*$/, '')
            .trim()
        )
        .filter(Boolean)
    : []

/** AI 응답(JSON 문자열)을 검사해 정리본으로 — 형식이 틀리면 null (그 공고는 다음에 다시) */
export function parseCareerDetail(reply: string): CareerDetail | null {
  const json = /\{[\s\S]*\}/.exec(reply.replace(/```(?:json)?/g, ''))?.[0]
  if (!json) return null
  let value: any
  try {
    value = JSON.parse(json)
  } catch {
    return null
  }
  const result = careerDetailSchema.safeParse({
    summary: typeof value.summary === 'string' ? value.summary.trim() : '',
    responsibilities: tidyList(value.responsibilities).slice(0, 10),
    requirements: tidyList(value.requirements).slice(0, 10),
    preferred: tidyList(value.preferred).slice(0, 8),
    conditions: tidyList(value.conditions).slice(0, 8),
    korea: ['yes', 'no'].includes(value.korea) ? value.korea : 'unclear',
  })
  // 한국어가 하나도 없으면 번역이 안 된 것
  if (!result.success || !/[가-힣]/.test(result.data.summary)) return null
  return result.data
}

/** 한국어 정리를 목록 공고에 붙인다 — 한 줄 요약, 그리고 본문으로 본 한국 지원 여부.
    본문이 다른 나라 거주 · 취업 자격을 요구하면(no) 위치와 상관없이 지원 불가로 바꾸고,
    위치로 판단이 안 됐던(unclear) 공고만 본문 판단(yes)으로 올린다 */
export function applyDetails(items: CareerJob[], details: CareerDetails): CareerJob[] {
  return items.map((job) => {
    const detail = details[job.id]
    if (!detail) return job
    const koreaEligible =
      detail.korea === 'no'
        ? 'no'
        : detail.korea === 'yes' && job.koreaEligible === 'unclear'
          ? 'yes'
          : job.koreaEligible
    return { ...job, summaryKo: detail.summary, koreaEligible }
  })
}
