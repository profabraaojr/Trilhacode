import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('carrega sem rolagem horizontal da página', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Aprender programação/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('indica que o servidor está indisponível quando a API não roda', async ({ page }) => {
  await expect(
    page.getByRole('status').filter({ hasText: 'Servidor indisponível' }),
  ).toBeAttached();
});

test('o tema escolhido sobrevive ao recarregar a página', async ({ page }) => {
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  const label = before === 'dark' ? 'Usar tema claro' : 'Usar tema escuro';
  await page.getByRole('button', { name: label }).click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after);
});

test.describe('computador e tablet', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'layout em colunas');

  test('Ctrl+B e Ctrl+J recolhem e reabrem a barra lateral e o painel', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Explorador' });
    const panel = page.getByRole('region', { name: 'Console' });
    await expect(sidebar).toBeVisible();
    await expect(panel).toBeVisible();

    await page.keyboard.press('Control+b');
    await expect(sidebar).toBeHidden();
    await page.keyboard.press('Control+b');
    await expect(sidebar).toBeVisible();

    await page.keyboard.press('Control+j');
    await expect(panel).toBeHidden();
    await page.keyboard.press('Control+j');
    await expect(panel).toBeVisible();
  });

  test('a barra lateral pode ser redimensionada arrastando a divisória', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Explorador' });
    const before = (await sidebar.boundingBox())!.width;
    const handle = page.getByRole('separator').first();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const after = (await sidebar.boundingBox())!.width;
    expect(after).toBeGreaterThan(before + 60);
  });
});

test.describe('celular', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, 'layout em abas');

  test('alterna entre Conteúdo, Código e Resultado', async ({ page }) => {
    expect(isMobile(page)).toBe(true);
    const tabs = page.getByRole('navigation', { name: 'Áreas de trabalho' });
    await tabs.getByRole('button', { name: 'Conteúdo' }).click();
    await expect(page.getByRole('complementary', { name: 'Conteúdo da unidade' })).toBeVisible();
    await tabs.getByRole('button', { name: 'Resultado' }).click();
    await expect(page.getByRole('region', { name: 'Resultado' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Console' })).toBeVisible();
    await expect(page.getByText('O script foi carregado.')).toBeVisible();
    await tabs.getByRole('button', { name: 'Código' }).click();
    await expect(page.getByRole('tab', { name: 'Boas-vindas' })).toBeVisible();
  });
});
