import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// "source" faz os pacotes do monorepo serem lidos direto do TypeScript, sem build prévio.
export default defineConfig({
  ssr: { resolve: { conditions: ['source', ...defaultServerConditions] } },
  test: { environment: 'node', fileParallelism: false },
});
