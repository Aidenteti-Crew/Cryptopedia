// These annotations cite the collected official text, never classifier importance.
export interface UpdateEvidence {
  changeFlags: {
    kind: 'mandatory' | 'breaking' | 'security' | 'protocol';
    evidence: string;
    sourceUrl: string;
  }[];
  activations: {
    network: 'MAINNET' | 'FUJI';
    at: string;
    evidence: string;
    sourceUrl: string;
  }[];
}

export function releaseIdentity(
  value: string,
): { repo: string; tag: string } | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(
      /^\/ava-labs\/(avalanchego|coreth|subnet-evm)\/releases\/tag\/([^/]+)$/i,
    );
    return url.protocol === 'https:' && url.hostname === 'github.com' && match
      ? { repo: match[1].toLowerCase(), tag: decodeURIComponent(match[2]) }
      : null;
  } catch {
    return null;
  }
}

export function extractUpdateEvidence(
  url: string,
  raw: string,
): UpdateEvidence {
  const result: UpdateEvidence = { changeFlags: [], activations: [] };
  let official = !!releaseIdentity(url);
  try {
    const u = new URL(url);
    official ||=
      u.protocol === 'https:' &&
      ['build.avax.network', 'builders.avax.network'].includes(u.hostname);
  } catch {
    /* Untrusted/missing source. */
  }
  if (!official) return result;
  const paragraphs = raw
    .replace(/<\/(?:p|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .split(/\n+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const patterns = {
    mandatory:
      /\b(?:all (?:mainnet|fuji|testnet) nodes? MUST|mainnet validators must be running|mandatory (?:upgrade|update)|required (?:upgrade|update))\b/i,
    breaking: /\bbreaking changes?\b/i,
    security:
      /\b(?:security (?:fix|patch|advisory)|fix(?:es|ed)? .{0,45}vulnerabilit(?:y|ies))\b/i,
    protocol:
      /\b(?:compatible with the Avalanche \w+ upgrade|upgrade activation time|mainnet activation)\b/i,
  } as const;
  for (const [kind, pattern] of Object.entries(patterns)) {
    const evidence = paragraphs.find(
      (p) =>
        pattern.test(p) &&
        !/\b(?:no|not|without)\b.{0,36}\b(?:mandatory|breaking|security|vulnerabilit|mainnet activation|upgrade activation)/i.test(
          p,
        ),
    );
    if (evidence)
      result.changeFlags.push({
        kind: kind as UpdateEvidence['changeFlags'][number]['kind'],
        evidence: evidence.slice(0, 900),
        sourceUrl: url,
      });
  }
  // Restrict extraction to explicit network + activation + full UTC time in one
  // paragraph; incomplete dates, publication dates and relative times stay unknown.
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  for (const p of paragraphs) {
    if (!/\bactivat(?:ion|e|es|ed)\b/i.test(p)) continue;
    const networks = [...p.matchAll(/\b(mainnet|fuji)\b/gi)].map((m) =>
      m[1].toLowerCase(),
    );
    if (new Set(networks).size !== 1) continue;
    const dates = [
      ...p.matchAll(
        /\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})\b/gi,
      ),
    ];
    const times = [...p.matchAll(/\b(\d{1,2}):(\d{2}) UTC\b/gi)];
    if (dates.length !== 1 || times.length !== 1) continue;
    const [, month, day, year] = dates[0];
    const [, hour, minute] = times[0];
    const iso = `${year}-${String(months.findIndex((m) => m.toLowerCase() === month.toLowerCase()) + 1).padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00.000Z`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || date.toISOString() !== iso) continue;
    const network = networks[0] === 'mainnet' ? 'MAINNET' : 'FUJI';
    if (!result.activations.some((a) => a.network === network && a.at === iso))
      result.activations.push({
        network,
        at: iso,
        evidence: p.slice(0, 900),
        sourceUrl: url,
      });
  }
  return result;
}
