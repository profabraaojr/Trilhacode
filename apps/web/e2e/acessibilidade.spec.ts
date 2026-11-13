import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openView, signUp, uniqueEmail, verify } from './helpers';

/**
 * Acessibilidade (Etapa 7): verificação automática com axe-core nas telas
 * principais, com as regras de WCAG 2.0, 2.1 e 2.2 nos níveis A e AA. A revisão
 * manual (teclado, leitor de tela, zoom) está em docs/05-acessibilidade-desempenho.md.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function audit(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(TAGS)
    // o editor Monaco e o resultado (código do aluno, em outra origem) ficam fora da regra
    .exclude('.monaco-editor')
    .exclude('iframe.sandbox-frame')
    .analyze();
  const summary = result.violations.map(
    (v) =>
      `${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 160)}`).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

test('tela inicial, trilha, unidade e conta', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await audit(page, 'inicial');

  const wide = (page.viewportSize()?.width ?? 0) >= 1200;
  if (!wide) return;

  await page
    .getByRole('list', { name: 'Trilhas disponíveis' })
    .getByRole('button', { name: /HTML e CSS/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'HTML e CSS' })).toBeVisible();
  await audit(page, 'mapa');

  await page.getByRole('button', { name: /Estrutura de um documento HTML / }).click();
  const pane = page.getByRole('complementary', { name: 'Conteúdo da unidade' });
  await expect(pane.getByRole('heading', { name: 'Estrutura de um documento HTML' })).toBeVisible();
  await audit(page, 'unidade');
  await pane.getByRole('button', { name: /Etapa 5: Vocabulário técnico/ }).click();
  await pane
    .getByRole('button', { name: /^Registrar .* no glossário$/ })
    .first()
    .click();
  await audit(page, 'vocabulário');
  await pane.getByRole('button', { name: /Etapa 7: Avaliação/ }).click();
  await audit(page, 'avaliação');

  await openView(page, 'Conta');
  await audit(page, 'conta');
});

test('glossário, evolução e privacidade com login', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1200, 'verificado no computador');
  const email = uniqueEmail('a11y');
  await page.goto('/');
  await signUp(page, email, 'Aluna Acessível');
  await verify(page, email);
  await audit(page, 'conta logada');
  await openView(page, 'Meu Glossário');
  await page.getByRole('button', { name: 'Novo termo' }).click();
  await audit(page, 'glossário');
  await openView(page, 'Minha evolução');
  const evo = page.getByRole('complementary', { name: 'Minha evolução' });
  await evo.getByRole('button', { name: 'Ver histórico completo' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Minha evolução' })).toBeVisible();
  await audit(page, 'evolução');
  await openView(page, 'Conta');
  await page.getByRole('button', { name: 'página de privacidade' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Privacidade' })).toBeVisible();
  await audit(page, 'privacidade');
});
