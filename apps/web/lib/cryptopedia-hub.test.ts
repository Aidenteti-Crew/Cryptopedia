import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { CHAPTER_NAV, resolveParentScreen } from './cryptopedia-taxonomy'
import { createStaticCryptopediaRepository } from './cryptopedia-data'
import {
  HUB_ENTRY_IDS,
  appliesToChain,
  asConceptPage,
  asWorkshopItem,
  buildCaseBundle,
  buildSkillMarkdown,
  filterHubForChain,
  findHubItem,
  hubSchema,
} from './cryptopedia-hub'

const raw = JSON.parse(
  readFileSync(new URL('../public/cryptopedia/hub.json', import.meta.url), 'utf8')
)
const data = hubSchema.parse(raw)

test('validates the complete connected demo and rejects missing references and duplicate identities', () => {
  assert.equal(data.cases.length, 3)
  assert.equal(data.demo, true)
  assert.equal(
    data.updates.every((update) => update.isDemo),
    true
  )
  const broken = structuredClone(raw)
  broken.cases[0].steps[0].conceptIds.push('concept-missing')
  assert.equal(hubSchema.safeParse(broken).success, false)
  const duplicate = structuredClone(raw)
  duplicate.skills[0].id = duplicate.projects[0].id
  assert.equal(hubSchema.safeParse(duplicate).success, false)
})

test('combines chain and common knowledge without treating official origin as chain applicability', () => {
  const avalanche = filterHubForChain(data, 'avalanche')
  assert.ok(avalanche.projects.some((project) => project.id === 'project-core'))
  assert.ok(avalanche.projects.some((project) => project.id === 'project-viem'))
  const different = filterHubForChain(data, 'midnight')
  assert.equal(different.projects.length, 0)
  assert.ok(different.resources.some((resource) => resource.scope.kind === 'BLOCKCHAIN'))
  assert.equal(
    different.resources.some((resource) => resource.scope.kind === 'EVM'),
    false
  )
  assert.equal(appliesToChain({ kind: 'BLOCKCHAIN', chainIds: ['avalanche'] }, 'midnight'), false)
  assert.equal(hubSchema.safeParse(different).success, true)
})

test('loads the selected chain through the repository and validates data before use', async () => {
  const requested: string[] = []
  const repository = createStaticCryptopediaRepository((async (url) => {
    requested.push(String(url))
    return new Response(JSON.stringify(raw))
  }) as typeof fetch)
  assert.equal((await repository.getHub('avalanche')).cases.length, 3)
  assert.deepEqual(requested, ['/cryptopedia/hub.json'])
})

test('all navigation targets and connected items resolve to their intended parent', () => {
  const ids = new Set(
    [
      ...data.projects,
      ...data.resources,
      ...data.concepts,
      ...data.cases,
      ...data.skills,
      ...data.updates,
    ].map((item) => item.id)
  )
  const articles = JSON.parse(
    readFileSync(new URL('../public/cryptopedia/articles.json', import.meta.url), 'utf8')
  ) as { id: string }[]
  articles.forEach((article) => ids.add(article.id))
  HUB_ENTRY_IDS.forEach((id) => ids.add(id))
  for (const chapter of CHAPTER_NAV)
    for (const child of chapter.children ?? []) assert.ok(ids.has(child.id), child.id)
  assert.equal(resolveParentScreen('case-first-contract'), 'academy')
  assert.equal(resolveParentScreen('project-viem'), 'projects')
  assert.equal(resolveParentScreen('skill-chain-reader'), 'builders')
  assert.equal(resolveParentScreen('change-network-guide'), 'updates')
})

test('downloads only selected skills belonging to the case, with sources and completion criteria', () => {
  const study = data.cases[0]
  const included = data.skills.find((skill) => skill.id === study.skillIds[0])!
  const excluded = data.skills.find((skill) => skill.id === study.skillIds[1])!
  const bundle = buildCaseBundle(study, [included.id, 'skill-ecosystem-research'], data)
  assert.ok(bundle.includes(included.content))
  assert.ok(!bundle.includes(excluded.content))
  assert.ok(!bundle.includes('name: skill-ecosystem-research'))
  assert.ok(bundle.includes(study.outcome))
  assert.ok(bundle.includes(study.checks[0]))
  assert.ok(bundle.includes('https://build.avax.network/'))
  assert.throws(() => buildCaseBundle(study, [], data), /스킬을 선택/)
  const skillFile = buildSkillMarkdown(included, data)
  assert.match(skillFile, /^---\nname: skill-/)
  assert.ok(skillFile.includes(included.inputs[0]))
  assert.ok(skillFile.includes(included.outputs[0]))
  assert.ok(skillFile.includes(included.environment))
})

test('adapts blockchain content to existing Workshop and ConceptRoadmap contracts', () => {
  assert.equal(asWorkshopItem(data.skills[0]).source, 'builtin')
  assert.equal(asWorkshopItem(data.skills[0]).content, data.skills[0].content)
  const concept = data.concepts.find((item) => item.id === 'concept-contract')!
  const doc = asConceptPage(concept, data)
  assert.ok(doc.childConcepts.some((item) => item.relation === 'PREREQUISITE'))
  assert.ok(doc.childConcepts.every((item) => findHubItem(data, item.node)))
})
