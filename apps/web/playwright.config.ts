import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta da interface, em três tamanhos de tela.
 * Rodam contra os builds de produção da interface e do sandbox (em portas, portanto
 * origens, diferentes) e contra a API com o conteúdo de content/ sincronizado.
 * A API precisa de um PostgreSQL acessível em DATABASE_URL (no CI, um serviço;
 * localmente, `docker compose up -d`).
 */
const SANDBOX_URL = 'http://localhost:4174/';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    // os testes colam código no editor pela área de transferência
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'computador',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 }, hasTouch: true },
    },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command:
        // "@trilhacode/api..." compila a API e os pacotes de que ela depende
        'pnpm --dir ../api db:migrate && pnpm --dir ../api content:sync && pnpm --filter "@trilhacode/api..." build && pnpm --dir ../api start',
      url: 'http://127.0.0.1:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'pnpm --dir ../sandbox build && pnpm --dir ../sandbox preview',
      url: SANDBOX_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm build && pnpm preview',
      url: 'http://localhost:4173',
      env: { VITE_SANDBOX_URL: SANDBOX_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
