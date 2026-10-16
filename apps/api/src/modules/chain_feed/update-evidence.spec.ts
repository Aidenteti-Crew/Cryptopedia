import { extractUpdateEvidence, releaseIdentity } from './update-evidence';

describe('official update evidence', () => {
  const url = 'https://github.com/ava-labs/subnet-evm/releases/tag/v0.8.0';
  it('keeps mandatory action and its exact mainnet timestamp together', () => {
    const evidence = extractUpdateEvidence(
      url,
      '<p>All mainnet nodes <strong>MUST</strong> update prior to the upgrade activation time: November 19th, 2025 16:00 UTC.</p>',
    );
    expect(evidence.changeFlags).toContainEqual(
      expect.objectContaining({ kind: 'mandatory', sourceUrl: url }),
    );
    expect(evidence.activations).toEqual([
      expect.objectContaining({
        network: 'MAINNET',
        at: '2025-11-19T16:00:00.000Z',
        sourceUrl: url,
      }),
    ]);
  });
  it('does not turn AI importance or an arbitrary date into a confirmed schedule', () => {
    expect(
      extractUpdateEvidence(url, 'Published November 19th, 2025. Fixed lint.'),
    ).toEqual({ changeFlags: [], activations: [] });
    expect(
      extractUpdateEvidence(
        'https://example.com/blog',
        'All mainnet nodes MUST update.',
      ),
    ).toEqual({ changeFlags: [], activations: [] });
  });
  it('reads a mainnet UTC timestamp inside a markdown announcement without confusing local ET', () => {
    const data = extractUpdateEvidence(
      'https://build.avax.network/blog/helicon-upgrade',
      '**Mainnet activation:** completed September 22, 2026 at 11:00 AM ET (15:00 UTC). Mainnet validators must be running [AvalancheGo v1.15.0](https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0).',
    );
    expect(data.activations[0].at).toBe('2026-09-22T15:00:00.000Z');
    expect(data.changeFlags[0].evidence).not.toContain('**');
    expect(data.changeFlags[0].evidence).not.toContain('https://');
  });
  it('accepts only release URLs for the three supported official repositories', () => {
    expect(releaseIdentity(url)).toEqual({ repo: 'subnet-evm', tag: 'v0.8.0' });
    expect(
      releaseIdentity('https://github.com/other/subnet-evm/releases/tag/v1'),
    ).toBeNull();
    expect(
      releaseIdentity('https://github.com/ava-labs/coreth/pull/1'),
    ).toBeNull();
  });
  it('does not flag a statement saying there are no breaking or security changes', () => {
    expect(
      extractUpdateEvidence(
        url,
        '<p>No breaking changes.</p><p>This is not a mandatory upgrade.</p><p>No security fixes in this release.</p>',
      ).changeFlags,
    ).toEqual([]);
  });
});
