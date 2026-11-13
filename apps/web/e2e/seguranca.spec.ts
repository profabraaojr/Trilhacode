import { expect, test } from '@playwright/test';

/**
 * Content-Security-Policy (Etapa 7): a interface roda inteira sob a política de
 * produção, sem violações, com editor, sandbox e conteúdo das trilhas.
 */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'verificado no computador');

test('a interface funciona sob a CSP de produção, sem violações', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`,
      );
    });
  });
  const res = await page.goto('/');
  const csp = res!.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");

  // editor (Monaco e workers) e resultado no sandbox
  const log = page.getByRole('log', { name: 'Mensagens do console' });
  await expect(log).toContainText('O script foi carregado.');
  await page.getByRole('button', { name: 'Explorador' }).click();
  await page
    .getByRole('list', { name: 'Arquivos do projeto' })
    .getByRole('button', { name: /^script\.js$/ })
    .click();
  await expect(page.locator('.monaco-editor .view-lines')).toBeVisible();

  // conteúdo de uma unidade
  await page.getByRole('button', { name: 'Trilhas' }).click();
  await page
    .getByRole('list', { name: 'Trilhas disponíveis' })
    .getByRole('button', { name: /HTML e CSS/ })
    .click();
  await page.getByRole('button', { name: /Estrutura de um documento HTML / }).click();
  await expect(
    page.getByRole('complementary', { name: 'Conteúdo da unidade' }).getByRole('heading', {
      name: 'Estrutura de um documento HTML',
    }),
  ).toBeVisible();

  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
});
