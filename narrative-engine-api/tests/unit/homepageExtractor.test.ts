import { describe, it, expect } from 'vitest';
import { computeMismatchFlags } from '../../src/website/mismatchFlags.js';
import { extractHomepage } from '../../src/website/HomepageExtractor.js';

describe('computeMismatchFlags', () => {
  it('flags audience mismatch when meta says everyone', () => {
    const flags = computeMismatchFlags(
      { title: 'Acme', meta_description: 'Tools for everyone', h1: 'Welcome', h2: [] },
      { audience: 'crypto wallet developers' },
    );
    expect(flags.audience_mismatch).toBeTruthy();
  });

  it('flags when audience tokens are absent from page copy', () => {
    const flags = computeMismatchFlags(
      {
        title: 'Acme Platform',
        meta_description: 'Enterprise workflows',
        h1: 'Scale your ops',
        h2: ['Analytics', 'Dashboards'],
      },
      { audience: 'solana validators' },
    );
    expect(flags.audience_not_reflected).toBeTruthy();
  });

  it('flags building vs title mismatch when no shared tokens', () => {
    const flags = computeMismatchFlags(
      { title: 'Global Payroll Suite', meta_description: '', h1: '', h2: [] },
      { building: 'zero knowledge identity protocol' },
    );
    expect(flags.building_title_mismatch).toBeTruthy();
  });

  it('returns empty flags when form and site align', () => {
    const flags = computeMismatchFlags(
      {
        title: 'Identity Protocol for Wallets',
        meta_description: 'On-chain identity for crypto wallets',
        h1: 'Identity for crypto wallets',
        h2: ['Wallets', 'Builders'],
      },
      { audience: 'crypto wallets', building: 'identity protocol' },
    );
    expect(flags.audience_mismatch).toBeUndefined();
    expect(flags.audience_not_reflected).toBeUndefined();
    expect(flags.building_title_mismatch).toBeUndefined();
  });

  it('detects elevated jargon density on the site', () => {
    const flags = computeMismatchFlags(
      {
        title: 'API SDK blockchain infrastructure orchestration middleware latency throughput',
        meta_description: 'GraphQL protobuf websocket microservice kubernetes',
        h1: 'Decentralized protocol embeddings inference',
        h2: ['Kubernetes scalability'],
      },
      { audience: 'founders', building: 'help teams grow' },
    );
    expect(flags.jargon_density).toBeTruthy();
  });
});

describe('extractHomepage SSRF guards', () => {
  it('blocks localhost', async () => {
    const result = await extractHomepage('http://localhost:3000');
    expect(result.fetch_status).toBe('blocked');
  });

  it('rejects non-http protocols', async () => {
    const result = await extractHomepage('file:///etc/passwd');
    expect(result.fetch_status).toBe('invalid');
  });

  it('blocks private IP hosts', async () => {
    const result = await extractHomepage('http://127.0.0.1/');
    expect(result.fetch_status).toBe('blocked');
  });
});
