// LIVE 화면(체인·프로젝트·매크로·개발 업데이트·행사)의 API 응답을 public/cryptopedia/live/ 에 굳힌다.
// NEXT_PUBLIC_API_URL 이 없는 배포(예: Vercel 데모)는 API 대신 이 파일들을 읽는다 (lib/cryptopedia-data.ts).
//
// 사용: node scripts/snapshot-live-feed.mjs [API 주소, 기본 http://localhost:4000] [체인, 기본 avalanche]
// 데이터가 바뀌면 다시 돌리고 커밋한다. 값은 굳힌 시점 기준이라 새 소식은 들어오지 않는다.
import { mkdir, writeFile } from 'node:fs/promises'

const apiUrl = (process.argv[2] ?? 'http://localhost:4000').replace(/\/$/, '')
const chain = process.argv[3] ?? 'avalanche'
const outDir = new URL('../public/cryptopedia/live/', import.meta.url)

async function getJson(path) {
  const response = await fetch(`${apiUrl}/api${path}`)
  if (!response.ok) throw new Error(`${response.status} ${path}`)
  return response.json()
}

// 커서를 끝까지 따라가 한 파일로 합친다 (앱은 nextCursor 가 null 이면 더 묻지 않는다)
async function collect(path, limit) {
  const join = path.includes('?') ? '&' : '?'
  const first = await getJson(`${path}${join}limit=${limit}`)
  const items = [...first.items]
  let cursor = first.nextCursor
  while (cursor) {
    const page = await getJson(`${path}${join}limit=${limit}&cursor=${encodeURIComponent(cursor)}`)
    items.push(...page.items)
    cursor = page.nextCursor
  }
  return { ...first, items, nextCursor: null }
}

const files = {
  'ecosystem-projects.json': () => collect(`/ecosystem/projects?chain=${chain}`, 500),
  'ecosystem-macro.json': () => collect(`/ecosystem/macro?chain=${chain}&sort=latest`, 100),
  'ecosystem-updates.json': () => collect(`/ecosystem/updates?chain=${chain}&sort=latest`, 100),
  ...Object.fromEntries(
    ['upcoming', 'ongoing', 'past', 'cancelled', 'postponed'].map((status) => [
      `events-${status}.json`,
      () => collect(`/events?chain=${chain}&status=${status}`, 100),
    ])
  ),
}

await mkdir(outDir, { recursive: true })
for (const [name, load] of Object.entries(files)) {
  const data = await load()
  await writeFile(new URL(name, outDir), `${JSON.stringify(data, null, 2)}\n`)
  console.log(`${name}: ${data.items.length}`)
}
