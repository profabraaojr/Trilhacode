import { describe, expect, it } from 'vitest';
import { isRunRequest, isSandboxMessage } from './protocol.js';

describe('isSandboxMessage', () => {
  it('aceita as mensagens do protocolo', () => {
    expect(isSandboxMessage({ type: 'tc:ready' })).toBe(true);
    expect(isSandboxMessage({ type: 'tc:loaded', runId: 'a' })).toBe(true);
    expect(
      isSandboxMessage({
        type: 'tc:console',
        runId: 'a',
        entries: [
          { level: 'log', origin: 'user', text: 'oi', location: { file: 'a.js', line: 1 } },
        ],
      }),
    ).toBe(true);
  });

  it('rejeita mensagens desconhecidas ou malformadas', () => {
    expect(isSandboxMessage(null)).toBe(false);
    expect(isSandboxMessage({ type: 'outra' })).toBe(false);
    expect(isSandboxMessage({ type: 'tc:loaded' })).toBe(false);
    expect(
      isSandboxMessage({ type: 'tc:console', runId: 'a', entry: { level: 'log', text: 'x' } }),
    ).toBe(false);
    expect(isSandboxMessage({ type: 'tc:console', runId: 'a', entries: [{ level: 'log' }] })).toBe(
      false,
    );
  });
});

describe('isRunRequest', () => {
  it('valida o pedido de execução', () => {
    const ok = {
      type: 'tc:run',
      runId: '1',
      entry: 'index.html',
      files: [{ name: 'index.html', content: '' }],
      options: { loopTimeoutMs: 1000 },
    };
    expect(isRunRequest(ok)).toBe(true);
    expect(isRunRequest({ ...ok, files: [{ name: 1 }] })).toBe(false);
  });
});
