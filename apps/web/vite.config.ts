/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defaultClientConditions, defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/**
 * Content-Security-Policy da interface. Também vale no `vite preview`, onde rodam os
 * testes no navegador, para que eles quebrem se algo depender de script inline ou de
 * recursos externos. O Caddyfile de produção usa a mesma política (docker/Caddyfile).
 */
export function contentSecurityPolicy(sandboxUrl: string) {
  const sandbox = new URL(sandboxUrl).origin;
  return [
    "default-src 'self'",
    "script-src 'self'",
    // o Monaco aplica estilos inline
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    `frame-src ${sandbox}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // "source" lê os pacotes do monorepo direto do TypeScript, sem build prévio.
  resolve: { conditions: ['source', ...defaultClientConditions] },
  server: {
    port: 5173,
    strictPort: true,
    // Em desenvolvimento, /api é encaminhado para a API local.
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      'content-security-policy': contentSecurityPolicy(
        process.env.VITE_SANDBOX_URL ?? 'http://localhost:5174/',
      ),
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
