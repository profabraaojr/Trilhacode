import { expect, test, type Page } from '@playwright/test';

/**
 * Editor e execução (Etapa 2). Rodam no tamanho "computador"; o celular tem um teste
 * próprio em workbench.spec.ts.
 */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'testes do editor rodam no computador');

const consoleLog = (page: Page) => page.getByRole('log', { name: 'Mensagens do console' });

async function openFile(page: Page, name: string) {
  // o index.html tem a etiqueta "entrada" no nome acessível
  const label = new RegExp(`^${name.replace('.', '\\.')}( entrada)?$`);
  await page
    .getByRole('list', { name: 'Arquivos do projeto' })
    .getByRole('button', { name: label })
    .click();
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
}

/** Substitui o conteúdo do arquivo aberto colando o texto (evita o fechamento automático de aspas). */
async function replaceCode(page: Page, code: string) {
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.evaluate((c) => navigator.clipboard.writeText(c), code);
  await page.keyboard.press('ControlOrMeta+v');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(consoleLog(page)).toContainText('O script foi carregado.');
  // a barra lateral abre em Trilhas; os testes do editor usam o Explorador
  await page.getByRole('button', { name: 'Explorador' }).click();
});

test('executa o projeto de exemplo e recebe eventos do resultado', async ({ page }) => {
  await expect(consoleLog(page).getByRole('button', { name: 'script.js:11' })).toBeVisible();
  const frame = page.frameLocator('iframe.sandbox-frame');
  await expect(frame.getByRole('heading', { name: 'Olá, TrilhaCode!' })).toBeVisible();
  await frame.getByRole('button', { name: 'Clique em mim' }).click();
  await expect(consoleLog(page)).toContainText('Cliques: 1');
  await expect(frame.getByText('Você clicou 1 vez(es).')).toBeVisible();
});

test('atualiza o resultado automaticamente ao editar', async ({ page }) => {
  await openFile(page, 'index.html');
  await replaceCode(page, '<h1>Página editada</h1>\n<p>Teste</p>\n');
  const frame = page.frameLocator('iframe.sandbox-frame');
  await expect(frame.getByRole('heading', { name: 'Página editada' })).toBeVisible({
    timeout: 10_000,
  });
});

test('interrompe um laço infinito sem travar a página', async ({ page }) => {
  await openFile(page, 'script.js');
  await replaceCode(page, "console.log('antes');\nlet i = 0;\nwhile (true) {\n  i++;\n}\n");
  await expect(consoleLog(page)).toContainText('Laço interrompido na linha 3', { timeout: 10_000 });
  await expect(consoleLog(page).getByRole('button', { name: 'script.js:3' })).toBeVisible();
  // a interface continua respondendo
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('complementary', { name: 'Configurações' })).toBeVisible();
});

test('o código do aluno não alcança cookies, localStorage nem a página da plataforma', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.cookie = 'segredo=123';
    localStorage.setItem('segredo', 'abc');
  });
  await openFile(page, 'script.js');
  await replaceCode(
    page,
    [
      "try { console.log('cookie:' + document.cookie) } catch (e) { console.log('cookie bloqueado', e.name) }",
      "try { console.log('ls:' + localStorage.getItem('segredo')) } catch (e) { console.log('localStorage bloqueado', e.name) }",
      "try { console.log('pai:' + window.parent.document.title) } catch (e) { console.log('pai bloqueado', e.name) }",
      "console.log('origem:' + self.origin)",
    ].join('\n'),
  );
  const log = consoleLog(page);
  await expect(log).toContainText('origem:null', { timeout: 10_000 });
  await expect(log).toContainText('cookie bloqueado SecurityError');
  await expect(log).toContainText('localStorage bloqueado SecurityError');
  await expect(log).toContainText('pai bloqueado SecurityError');
  await expect(log).not.toContainText('123');
  await expect(log).not.toContainText('abc');
});

test('um laço infinito com console.log não trava a interface', async ({ page }) => {
  await openFile(page, 'script.js');
  await replaceCode(page, "let i = 0;\nwhile (i < 3) {\n  console.log('volta', i);\n}\n");
  await expect(consoleLog(page)).toContainText('Limite de 1000 mensagens', { timeout: 10_000 });
  await expect(consoleLog(page)).toContainText('Laço interrompido na linha 2');
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('complementary', { name: 'Configurações' })).toBeVisible();
});

test('mostra erros com a linha e leva o editor até ela', async ({ page }) => {
  await openFile(page, 'script.js');
  await replaceCode(page, 'const a = 1;\n\nfuncaoQueNaoExiste();\n');
  await consoleLog(page).getByRole('button', { name: 'script.js:3' }).click();
  await expect(page.getByRole('contentinfo', { name: 'Barra de status' })).toContainText(
    'Ln 3, Col 1',
  );
});

test('aponta tags HTML não fechadas no editor', async ({ page }) => {
  await openFile(page, 'index.html');
  await replaceCode(page, '<main>\n  <section>\n    <h1>Oi</h1>\n</main>\n');
  const status = page.getByRole('contentinfo', { name: 'Barra de status' });
  await expect(status.getByLabel(/1 erros e 0 avisos/)).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.monaco-editor .squiggly-error').first()).toBeVisible();
});

test('cria, salva e restaura arquivos depois de recarregar a página', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Novo arquivo' }).click();
  await page.getByRole('textbox', { name: 'Nome do novo arquivo' }).fill('extra.js');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'extra.js' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await replaceCode(page, '// arquivo salvo');
  await expect(page.getByRole('contentinfo', { name: 'Barra de status' })).toContainText(
    'Salvo no navegador',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Explorador' }).click();
  await expect(page.getByRole('list', { name: 'Arquivos do projeto' })).toContainText('extra.js');
  await openFile(page, 'extra.js');
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('// arquivo salvo');
  // o aviso de arquivo não vinculado aparece no console
  await expect(consoleLog(page)).toContainText('extra.js não está vinculado ao index.html');

  await page.getByRole('button', { name: 'Excluir extra.js' }).click();
  await expect(page.getByRole('list', { name: 'Arquivos do projeto' })).not.toContainText(
    'extra.js',
  );
});
