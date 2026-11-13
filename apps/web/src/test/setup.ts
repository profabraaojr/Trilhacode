import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

// jsdom não implementa matchMedia; simulamos uma tela de computador por padrão.
let viewportWidth = 1440;
export function setViewportWidth(w: number) {
  viewportWidth = w;
}

function matches(query: string): boolean {
  const max = /max-width:\s*(\d+)px/.exec(query);
  if (max) return viewportWidth <= Number(max[1]);
  if (query.includes('prefers-color-scheme: light')) return false;
  return false;
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// O react-resizable-panels mede o layout com ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
