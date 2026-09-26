import { artifactSha256Hex } from '../crawler/extraction-spec.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface PublishedPullRequest {
  prNumber: number
  prUrl: string
  branch: string
  artifactPath: string
  artifactHash: string
}

export interface MergedArtifact {
  content: string
  artifactHash: string
  mergedAt: string
  mergeCommitSha: string
}

export class GitHubArtifactPublisher {
  constructor(
    private readonly config: {
      token: string
      owner: string
      repo: string
      baseBranch: string
    },
    private readonly fetchFn: FetchLike = fetch,
    private readonly apiBase = 'https://api.github.com'
  ) {}

  async createPullRequest(input: {
    sourceSlug: string
    generationId: string
    artifactContent: string
    title: string
    body: string
  }): Promise<PublishedPullRequest> {
    const safeSlug = input.sourceSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
    const safeGeneration = input.generationId.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    if (!safeSlug || !safeGeneration) throw new Error('Invalid source slug or generation ID')
    const branch = `feat/crawler/${safeSlug}/${safeGeneration}`
    const artifactPath = `packages/pipeline/config/generated/${safeSlug}/${safeGeneration}.json`

    const base = await this.json<{ commit: { sha: string } }>(
      await this.request(
        `/repos/${this.config.owner}/${this.config.repo}/branches/${encodeURIComponent(this.config.baseBranch)}`
      )
    )
    await this.request(`/repos/${this.config.owner}/${this.config.repo}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${branch}`, sha: base.commit.sha },
    })
    await this.request(`/repos/${this.config.owner}/${this.config.repo}/contents/${artifactPath}`, {
      method: 'PUT',
      body: {
        message: `feat(crawler): add ${safeSlug} extraction spec`,
        content: Buffer.from(input.artifactContent).toString('base64'),
        branch,
      },
    })
    const pr = await this.json<{ number: number; html_url: string }>(
      await this.request(`/repos/${this.config.owner}/${this.config.repo}/pulls`, {
        method: 'POST',
        body: {
          title: input.title,
          body: input.body,
          head: branch,
          base: this.config.baseBranch,
        },
      })
    )
    return {
      prNumber: pr.number,
      prUrl: pr.html_url,
      branch,
      artifactPath,
      artifactHash: artifactSha256Hex(input.artifactContent),
    }
  }

  async readMergedArtifact(
    prNumber: number,
    artifactPath: string
  ): Promise<MergedArtifact | undefined> {
    if (
      !artifactPath.startsWith('packages/pipeline/config/generated/') ||
      !artifactPath.endsWith('.json')
    ) {
      throw new Error(`Artifact path is outside the generated-spec allowlist: ${artifactPath}`)
    }
    const pr = await this.json<{
      merged_at: string | null
      merge_commit_sha: string | null
    }>(await this.request(`/repos/${this.config.owner}/${this.config.repo}/pulls/${prNumber}`))
    if (!pr.merged_at || !pr.merge_commit_sha) return undefined
    const response = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/contents/${artifactPath}?ref=${encodeURIComponent(pr.merge_commit_sha)}`,
      { accept: 'application/vnd.github.raw+json' }
    )
    const content = await response.text()
    return {
      content,
      artifactHash: artifactSha256Hex(content),
      mergedAt: pr.merged_at,
      mergeCommitSha: pr.merge_commit_sha,
    }
  }

  private async request(
    path: string,
    options: { method?: string; body?: unknown; accept?: string } = {}
  ): Promise<Response> {
    const response = await this.fetchFn(`${this.apiBase}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: options.accept ?? 'application/vnd.github+json',
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'cryptopedia-crawler',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status} ${response.statusText} (${path})`)
    }
    return response
  }

  private async json<T>(response: Response): Promise<T> {
    return (await response.json()) as T
  }
}
