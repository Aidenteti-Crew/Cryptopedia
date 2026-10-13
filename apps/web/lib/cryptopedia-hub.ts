import { z } from 'zod'

import type { ConceptPage } from './api'
import type { InventoryItem } from './workshop-mock'

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const ids = z.array(id).default([])
export const scopeSchema = z
  .object({
    kind: z.enum(['BLOCKCHAIN', 'EVM', 'CHAIN']),
    chainIds: ids,
  })
  .superRefine((scope, context) => {
    if (scope.kind === 'CHAIN' && scope.chainIds.length === 0) {
      context.addIssue({ code: 'custom', message: 'Chain-specific content needs a chain' })
    }
  })

const base = {
  id,
  title: z.string().min(1),
  summary: z.string().min(1),
  scope: scopeSchema,
  sourceIds: z.array(id).min(1),
}
const relations = z.object({
  id,
  type: z.enum(['SUBTOPIC', 'PREREQUISITE', 'EXTENDS', 'RELATED', 'CONTRADICTS']),
})
export const hubSchema = z
  .object({
    version: z.literal(1),
    demo: z.literal(true),
    sources: z.array(
      z.object({
        id,
        name: z.string().min(1),
        url: z.string().url(),
        origin: z.enum(['OFFICIAL', 'STANDARD', 'COMMUNITY', 'CURATED']),
      })
    ),
    categories: z.array(z.object({ id, title: z.string().min(1), summary: z.string() })),
    projects: z.array(
      z.object({
        ...base,
        categoryId: id,
        detail: z.string(),
        website: z.string().url(),
        conceptIds: ids,
        caseIds: ids,
        skillIds: ids,
        resourceIds: ids,
      })
    ),
    resources: z.array(
      z.object({
        ...base,
        kind: z.enum(['DOCS', 'CODE', 'ARTICLE', 'TOOL']),
        body: z.string(),
        conceptIds: ids,
        caseIds: ids,
        skillIds: ids,
        projectIds: ids,
      })
    ),
    concepts: z.array(
      z.object({
        ...base,
        body: z.string(),
        relations: z.array(relations),
        resourceIds: ids,
        caseIds: ids,
        skillIds: ids,
      })
    ),
    skills: z.array(
      z.object({
        ...base,
        type: z.enum(['prompt', 'mcp', 'skill']),
        environment: z.string().min(1),
        content: z.string().min(1),
        inputs: z.array(z.string()).min(1),
        outputs: z.array(z.string()).min(1),
        checks: z.array(z.string()).min(1),
        resourceIds: ids,
        conceptIds: ids,
      })
    ),
    cases: z.array(
      z.object({
        ...base,
        level: z.enum(['BEGINNER', 'INTERMEDIATE']),
        minutes: z.number().int().positive(),
        outcome: z.string().min(1),
        steps: z
          .array(
            z.object({
              title: z.string().min(1),
              body: z.string(),
              conceptIds: ids,
              resourceIds: ids,
            })
          )
          .min(1),
        skillIds: z.array(id).min(1),
        projectIds: ids,
        checks: z.array(z.string()).min(1),
      })
    ),
    updates: z.array(
      z.object({
        ...base,
        date: z.string().datetime(),
        category: z.enum(['NETWORK', 'TOOL', 'KNOWLEDGE']),
        change: z.string(),
        action: z.string(),
        isDemo: z.literal(true),
        impacts: z.array(z.object({ id, reason: z.string().min(1) })).min(1),
      })
    ),
  })
  .superRefine((data, context) => {
    const groups = ['projects', 'resources', 'concepts', 'skills', 'cases', 'updates'] as const
    const all = [
      ...data.projects,
      ...data.resources,
      ...data.concepts,
      ...data.skills,
      ...data.cases,
      ...data.updates,
    ]
    const unique = new Set<string>()
    for (const item of [...data.sources, ...data.categories, ...all]) {
      if (unique.has(item.id))
        context.addIssue({ code: 'custom', message: `Duplicate id: ${item.id}` })
      unique.add(item.id)
    }
    const sets = Object.fromEntries(
      groups.map((group) => [group, new Set(data[group].map((item) => item.id))])
    )
    const sourceIds = new Set(data.sources.map((source) => source.id))
    const categoryIds = new Set(data.categories.map((category) => category.id))
    const contentIds = new Set(all.map((item) => item.id))
    const check = (owner: string, refs: string[], target: Set<string>) => {
      for (const ref of refs)
        if (!target.has(ref)) {
          context.addIssue({ code: 'custom', message: `${owner}: unknown reference ${ref}` })
        }
    }
    for (const item of all) {
      check(item.id, item.sourceIds, sourceIds)
      for (const [key, target] of Object.entries({
        conceptIds: sets.concepts,
        resourceIds: sets.resources,
        caseIds: sets.cases,
        skillIds: sets.skills,
        projectIds: sets.projects,
      })) {
        if (key in item) check(item.id, (item as unknown as Record<string, string[]>)[key], target)
      }
    }
    for (const project of data.projects) check(project.id, [project.categoryId], categoryIds)
    for (const concept of data.concepts)
      check(
        concept.id,
        concept.relations.map((relation) => relation.id),
        sets.concepts
      )
    for (const study of data.cases)
      for (const step of study.steps) {
        check(study.id, step.conceptIds, sets.concepts)
        check(study.id, step.resourceIds, sets.resources)
      }
    for (const update of data.updates)
      check(
        update.id,
        update.impacts.map((impact) => impact.id),
        contentIds
      )
  })

export type HubData = z.infer<typeof hubSchema>
export type ContentScope = z.infer<typeof scopeSchema>
export type HubItem =
  | HubData['projects'][number]
  | HubData['resources'][number]
  | HubData['concepts'][number]
  | HubData['skills'][number]
  | HubData['cases'][number]
  | HubData['updates'][number]
export type HubSkill = HubData['skills'][number]
export type HubCase = HubData['cases'][number]

// EVM support is explicit; a shared tool is never assumed to work on every chain.
const EVM_CHAINS = new Set(['avalanche'])
export function appliesToChain(scope: ContentScope, chainId: string): boolean {
  if (scope.kind === 'CHAIN') return scope.chainIds.includes(chainId)
  if (scope.chainIds.length > 0 && !scope.chainIds.includes(chainId)) return false
  return scope.kind === 'BLOCKCHAIN' || EVM_CHAINS.has(chainId)
}

export function filterHubForChain(data: HubData, chainId: string): HubData {
  const available = <T extends { scope: ContentScope }>(items: T[]) =>
    items.filter((item) => appliesToChain(item.scope, chainId))
  const filtered = {
    ...data,
    projects: available(data.projects),
    resources: available(data.resources),
    concepts: available(data.concepts),
    skills: available(data.skills),
    cases: available(data.cases),
    updates: available(data.updates),
  }
  const ids = new Set(
    [
      ...filtered.projects,
      ...filtered.resources,
      ...filtered.concepts,
      ...filtered.skills,
      ...filtered.cases,
      ...filtered.updates,
    ].map((item) => item.id)
  )
  const refs = (values: string[]) => values.filter((value) => ids.has(value))
  return {
    ...filtered,
    projects: filtered.projects.map((item) => ({
      ...item,
      conceptIds: refs(item.conceptIds),
      resourceIds: refs(item.resourceIds),
      caseIds: refs(item.caseIds),
      skillIds: refs(item.skillIds),
    })),
    resources: filtered.resources.map((item) => ({
      ...item,
      conceptIds: refs(item.conceptIds),
      projectIds: refs(item.projectIds),
      caseIds: refs(item.caseIds),
      skillIds: refs(item.skillIds),
    })),
    concepts: filtered.concepts.map((item) => ({
      ...item,
      relations: item.relations.filter((relation) => ids.has(relation.id)),
      resourceIds: refs(item.resourceIds),
      caseIds: refs(item.caseIds),
      skillIds: refs(item.skillIds),
    })),
    skills: filtered.skills.map((item) => ({
      ...item,
      conceptIds: refs(item.conceptIds),
      resourceIds: refs(item.resourceIds),
    })),
    cases: filtered.cases.map((item) => ({
      ...item,
      skillIds: refs(item.skillIds),
      projectIds: refs(item.projectIds),
      steps: item.steps.map((step) => ({
        ...step,
        conceptIds: refs(step.conceptIds),
        resourceIds: refs(step.resourceIds),
      })),
    })),
    updates: filtered.updates
      .map((item) => ({ ...item, impacts: item.impacts.filter((impact) => ids.has(impact.id)) }))
      .filter((item) => item.impacts.length > 0),
  }
}

export function findHubItem(data: HubData, id: string): HubItem | undefined {
  return [
    ...data.projects,
    ...data.resources,
    ...data.concepts,
    ...data.skills,
    ...data.cases,
    ...data.updates,
  ].find((item) => item.id === id)
}

export function scopeLabel(scope: ContentScope) {
  return scope.kind === 'BLOCKCHAIN'
    ? '블록체인 공통'
    : scope.kind === 'EVM'
      ? 'EVM 공통'
      : scope.chainIds.map((chain) => (chain === 'avalanche' ? 'Avalanche' : chain)).join(' · ')
}

export function asWorkshopItem(skill: HubSkill): InventoryItem {
  return {
    id: skill.id,
    title: skill.title,
    type: skill.type,
    category: scopeLabel(skill.scope),
    source: 'builtin',
    updatedAt: '2026-10-10',
    summary: skill.summary,
    content: skill.content,
  }
}

export function asConceptPage(concept: HubData['concepts'][number], data: HubData): ConceptPage {
  return {
    slug: concept.id,
    node: concept.title,
    title: concept.title,
    section: 'BASICS',
    menuLabel: concept.title,
    aliases: [],
    meta: { updated: null, verified: false, source: 'Cryptopedia', contributors: [] },
    overview: { definition: concept.summary, body: concept.body },
    cherries: [],
    references: [],
    childConcepts: concept.relations.flatMap((relation) => {
      const related = data.concepts.find((item) => item.id === relation.id)
      return related
        ? [
            {
              label: related.title,
              node: related.id,
              relation: relation.type,
              why: null,
              hasPage: true,
            },
          ]
        : []
    }),
  }
}

export function buildSkillMarkdown(skill: HubSkill, data: HubData): string {
  const sources = skill.sourceIds.map((id) => data.sources.find((source) => source.id === id)!)
  return [
    '---',
    `name: ${skill.id}`,
    `description: ${JSON.stringify(skill.summary)}`,
    '---',
    '',
    `# ${skill.title}`,
    '',
    '> Cryptopedia · 검토용 작업 지침. 다운로드는 원격 설치나 실행을 수행하지 않습니다.',
    '',
    `적용 범위: ${scopeLabel(skill.scope)}`,
    `환경: ${skill.environment}`,
    '',
    '## 입력',
    ...skill.inputs.map((input) => `- ${input}`),
    '',
    '## 수행 지침',
    skill.content,
    '',
    '## 결과물',
    ...skill.outputs.map((output) => `- ${output}`),
    '',
    '## 완료 확인',
    ...skill.checks.map((check) => `- [ ] ${check}`),
    '',
    '## 출처',
    ...sources.map((source) => `- [${source.name}](${source.url})`),
    '',
  ].join('\n')
}

export function buildCaseBundle(study: HubCase, selectedIds: string[], data: HubData): string {
  const selected = data.skills.filter(
    (skill) => selectedIds.includes(skill.id) && study.skillIds.includes(skill.id)
  )
  if (selected.length === 0) throw new Error('다운로드할 스킬을 선택하세요.')
  return [
    `# ${study.title}`,
    '',
    '> Cryptopedia · 에이전트용 지식·스킬 묶음',
    '',
    study.outcome,
    '',
    '## 학습 순서',
    ...study.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.body}`),
    '',
    '## 케이스 완료 확인',
    ...study.checks.map((check) => `- [ ] ${check}`),
    '',
    ...selected.map((skill) => buildSkillMarkdown(skill, data)),
  ].join('\n')
}

export const HUB_ENTRY_IDS = new Set([
  'practice',
  'skill-graph',
  'skill-library',
  'official-docs',
  'code-reference',
  'builder-articles',
  'mcp-tools',
  'glossary',
])
export function isHubEntry(id: string) {
  return HUB_ENTRY_IDS.has(id) || /^(project|resource|concept|skill|case|change)-/.test(id)
}
