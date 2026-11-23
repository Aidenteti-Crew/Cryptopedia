// 채용 공고 한국어 정리 — 수집한 공고 본문을 AI 로 한국어 요약 · 항목별 정리해
// public/cryptopedia/careers-detail.json 에 쌓고, 목록(careers.json)에 한국어 한 줄 요약을 붙인다.
//
// 사용: npx tsx scripts/translate-careers.ts [--limit N]
//   먼저 scripts/crawl-careers.ts 로 수집해야 한다 (본문을 .cache/careers-text.json 에 남긴다).
//   이미 정리한 공고는 본문이 바뀌지 않았으면 다시 하지 않는다 — 처음만 오래 걸리고 다음부터는 새 공고만.
//   하나 끝날 때마다 저장하므로 중간에 멈춰도 다시 돌리면 이어서 한다.
//
// AI 설정은 사이트의 다른 수집 콘텐츠(apps/pipeline 분류)와 같다: 저장소 루트 .env 의
// LLM_BASE_URL · LLM_API_KEY · LLM_MODEL. 키는 로그 · 파일 어디에도 남기지 않는다.
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  LlmFatalError,
  OpenAiCompatibleClient,
  llmConfigFromEnv,
} from '../../pipeline/src/classify/llm-client'
import { careersSchema, isListableJob } from '../lib/careers'
import {
  TRANSLATE_SYSTEM_PROMPT,
  applyDetails,
  careerDetailsSchema,
  parseCareerDetail,
  textHash,
  translateUserPrompt,
  type CareerDetails,
} from '../lib/careers-translate'

const ROOT_ENV = join(__dirname, '../../../.env')
const CAREERS = join(__dirname, '../public/cryptopedia/careers.json')
const DETAILS = join(__dirname, '../public/cryptopedia/careers-detail.json')
const TEXT_CACHE = join(__dirname, '../.cache/careers-text.json')
/** 동시에 몇 개씩 — 무료 등급은 분당 약 40회이고 한 건에 20~150초 걸려서, 24개면 한도 안쪽에서 가장 빠르다.
    429(한도 초과)는 llm-client 가 기다렸다 다시 한다. CAREERS_TRANSLATE_CONCURRENCY 로 바꿀 수 있다 */
const CONCURRENCY = Number(process.env.CAREERS_TRANSLATE_CONCURRENCY) || 24

async function main() {
  if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)
  const config = llmConfigFromEnv()
  const llm = new OpenAiCompatibleClient(config)
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity

  const careers = careersSchema.parse(JSON.parse(await readFile(CAREERS, 'utf8')))
  const texts: Record<string, string> = JSON.parse(
    await readFile(TEXT_CACHE, 'utf8').catch(() => {
      throw new Error('본문 캐시가 없어요 — 먼저 npx tsx scripts/crawl-careers.ts 를 돌려 주세요')
    })
  )
  const details: CareerDetails = careerDetailsSchema.parse(
    JSON.parse(await readFile(DETAILS, 'utf8').catch(() => '{}'))
  )

  const todo = careers.items
    .filter((job) => {
      const text = texts[job.id]
      return text && details[job.id]?.hash !== textHash(text)
    })
    .slice(0, limit)
  console.log(`공고 ${careers.items.length}개 중 정리할 것 ${todo.length}개 (모델 ${config.model})`)

  // 목록(careers.json)은 처음 읽은 공고에 지금까지의 한국어 정리를 붙여서 다시 쓴다 —
  // 다 끝날 때까지 기다리지 않고 정리되는 대로 목록이 한국어로 바뀌게
  // 목록(careers.json)은 매번 파일에서 다시 읽어 한국어 정리를 붙인다 — 번역 중에 다시 수집해도 새 목록을 덮어쓰지 않게,
  // 다 끝날 때까지 기다리지 않고 정리되는 대로 목록이 한국어로 바뀌게
  const writeCareers = async () => {
    const current = careersSchema.parse(JSON.parse(await readFile(CAREERS, 'utf8')))
    const items = applyDetails(current.items, details).filter(isListableJob)
    await writeFile(CAREERS, `${JSON.stringify({ ...current, items }, null, 2)}\n`)
    return { before: current.items.length, after: items.length }
  }
  let saving = Promise.resolve()
  let saves = 0
  const save = () =>
    (saving = saving.then(async () => {
      await writeFile(DETAILS, `${JSON.stringify(details, null, 1)}\n`)
      if (++saves % 10 === 0) await writeCareers()
    }))

  let done = 0
  let failed = 0
  let fatal = null as Error | null
  const started = Date.now()
  const queue = [...todo]
  const worker = async () => {
    for (let job = queue.shift(); job && !fatal; job = queue.shift()) {
      const text = texts[job.id]
      try {
        const reply = await llm.complete(TRANSLATE_SYSTEM_PROMPT, translateUserPrompt(job, text))
        const detail = parseCareerDetail(reply)
        if (!detail) throw new Error('응답 형식이 맞지 않음')
        details[job.id] = {
          ...detail,
          hash: textHash(text),
          model: config.model,
          translatedAt: new Date().toISOString(),
        }
        done++
        await save()
      } catch (error) {
        if (error instanceof LlmFatalError) fatal = error
        failed++
        console.warn(`  실패 ${job.id}: ${(error as Error).message.slice(0, 120)}`)
      }
      const minutes = ((Date.now() - started) / 60_000).toFixed(1)
      if ((done + failed) % 10 === 0 || !queue.length)
        console.log(`  ${done + failed}/${todo.length} (실패 ${failed}) · ${minutes}분`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await saving

  // 이번 수집에 없는 공고의 정리는 지운다. 본문상 지원 불가로 목록에서 뺀 공고의 정리는 남긴다
  // (다음 수집 때 다시 들어오면 그 정리로 다시 빼야 하므로)
  for (const id of Object.keys(details)) if (!(id in texts)) delete details[id]
  await writeFile(DETAILS, `${JSON.stringify(details, null, 1)}\n`)
  const listed = await writeCareers()
  console.log(
    `\n정리 ${done}개 · 실패 ${failed}개 · 본문상 한국 지원 불가로 이번에 빠진 공고 ${listed.before - listed.after}개`
  )
  if (fatal) {
    console.error(`멈춤: ${fatal.message}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error((error as Error).message)
  process.exit(1)
})
