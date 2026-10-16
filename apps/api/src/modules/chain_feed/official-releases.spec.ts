import {
  officialCompareUrl,
  officialReleases,
  type OfficialRelease,
} from './official-releases';

describe('official release verification', () => {
  const release: OfficialRelease = {
    tag_name: 'v1',
    html_url: 'https://github.com/ava-labs/coreth/releases/tag/v1',
    published_at: '2026-10-01T00:00:00Z',
    prerelease: false,
    draft: false,
    body: 'Full Changelog: https://github.com/ava-labs/coreth/compare/v0...v1',
  };
  it('preserves the supplied compare link and rejects a link to another repository', () => {
    expect(officialCompareUrl(release)).toBe(
      'https://github.com/ava-labs/coreth/compare/v0...v1',
    );
    expect(
      officialCompareUrl({
        ...release,
        body: 'https://github.com/ava-labs/subnet-evm/compare/v0...v1',
      }),
    ).toBeNull();
  });
  it('does not fetch user-controlled repository URLs', async () => {
    const fetcher = jest.spyOn(global, 'fetch');
    expect(await officialReleases('other/../../secret')).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRestore();
  });
  it('degrades to collected data when the official API is unavailable and caches the attempt', async () => {
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('unavailable'));
    expect(await officialReleases('subnet-evm')).toEqual([]);
    expect(await officialReleases('subnet-evm')).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockRestore();
  });
});
