import { z } from 'zod';

const releaseSchema = z.object({
  tag_name: z.string(),
  html_url: z.string().url(),
  published_at: z.string().datetime().nullable(),
  prerelease: z.boolean(),
  draft: z.boolean(),
  body: z.string().nullable(),
});
export type OfficialRelease = z.infer<typeof releaseSchema>;
const cache = new Map<
  string,
  { expires: number; promise: Promise<OfficialRelease[]> }
>();

// Fixed allowlist, bounded timeout and shared cache: GitHub being unavailable must
// not prevent reading already collected updates. No token or crawler writes.
export function officialReleases(repo: string): Promise<OfficialRelease[]> {
  if (!['avalanchego', 'coreth', 'subnet-evm'].includes(repo))
    return Promise.resolve([]);
  const cached = cache.get(repo);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = (async () => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/ava-labs/${repo}/releases?per_page=100`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Proof-of-Cherry',
          },
          signal: AbortSignal.timeout(2500),
        },
      );
      if (!response.ok) return [];
      const parsed = z.array(releaseSchema).safeParse(await response.json());
      return parsed.success ? parsed.data.filter((r) => !r.draft) : [];
    } catch {
      return [];
    }
  })();
  cache.set(repo, { expires: Date.now() + 15 * 60_000, promise });
  return promise;
}

export function officialCompareUrl(release: OfficialRelease): string | null {
  const match = release.body?.match(
    /https:\/\/github\.com\/ava-labs\/(?:avalanchego|coreth|subnet-evm)\/compare\/[^\s)<>"\]]+/,
  );
  if (!match) return null;
  const releaseRepo = new URL(release.html_url).pathname
    .split('/')
    .slice(0, 3)
    .join('/');
  return new URL(match[0]).pathname.startsWith(`${releaseRepo}/compare/`)
    ? match[0]
    : null;
}
