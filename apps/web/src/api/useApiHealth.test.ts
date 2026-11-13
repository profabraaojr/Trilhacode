import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './useApiHealth';

const body = (status: 'ok' | 'degraded') => ({
  status,
  version: '0.1.0',
  database: status === 'ok' ? 'up' : 'down',
  time: new Date().toISOString(),
});

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchHealth', () => {
  it('retorna online quando a API e o banco respondem', async () => {
    mockFetch(async () => Response.json(body('ok')));
    expect((await fetchHealth()).state).toBe('online');
  });

  it('retorna degraded quando a API responde 503 sem banco', async () => {
    mockFetch(async () => Response.json(body('degraded'), { status: 503 }));
    expect((await fetchHealth()).state).toBe('degraded');
  });

  it('retorna offline quando a rede falha', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect((await fetchHealth()).state).toBe('offline');
  });

  it('retorna offline quando a resposta não segue o contrato', async () => {
    mockFetch(async () => Response.json({ ok: true }));
    expect((await fetchHealth()).state).toBe('offline');
  });
});
