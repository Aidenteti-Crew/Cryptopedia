import { protocolStageView, type ProtocolStageColumns } from './protocol-stage';

const row = (overrides: Partial<ProtocolStageColumns>): ProtocolStageColumns => ({
  lifecycle_stage: 'PROPOSED',
  stage_evidence: 'Status: Proposed',
  stage_source_url: 'https://github.com/avalanche-foundation/ACPs/blob/abc/ACPs/267-x/README.md',
  proposal_created_at: new Date('2026-02-10T18:03:33Z'),
  proposal_updated_at: new Date('2026-07-30T00:00:00Z'),
  included_in_release: null,
  included_release_url: null,
  ...overrides,
});

describe('protocolStageView', () => {
  it('is null for updates that are not proposals', () => {
    expect(protocolStageView(row({ lifecycle_stage: null }))).toBeNull();
  });

  it('carries the stage, its evidence and the document dates', () => {
    expect(protocolStageView(row({}))).toEqual({
      stage: 'PROPOSED',
      needsCheck: false,
      evidence: 'Status: Proposed',
      sourceUrl: 'https://github.com/avalanche-foundation/ACPs/blob/abc/ACPs/267-x/README.md',
      proposalCreatedAt: '2026-02-10T18:03:33.000Z',
      proposalUpdatedAt: '2026-07-30T00:00:00.000Z',
      includedIn: null,
    });
  });

  it('flags a proposal already shipped in a release as needing a check', () => {
    const release = { included_in_release: 'v1.15.0', included_release_url: 'https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0' };
    expect(protocolStageView(row(release))).toMatchObject({
      needsCheck: true,
      includedIn: { name: 'v1.15.0', url: 'https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0' },
    });
    expect(protocolStageView(row({ ...release, lifecycle_stage: 'ACTIVATED' }))?.needsCheck).toBe(false);
  });
});
