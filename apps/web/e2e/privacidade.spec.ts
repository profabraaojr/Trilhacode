import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { accountSidebar, PASSWORD, signIn, signUp, uniqueEmail, verify } from './helpers';

/** LGPD (Etapa 7): página de privacidade, exportação dos dados e exclusão da conta. */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'fluxo de conta no computador');

test('o usuário baixa os próprios dados e exclui a conta com a senha', async ({ page }) => {
  const email = uniqueEmail('lgpd');
  await page.goto('/');
  await signUp(page, email, 'Aluna LGPD');
  await verify(page, email);
  const s = accountSidebar(page);

  // página de privacidade
  await s.getByRole('button', { name: 'página de privacidade' }).click();
  const privacy = page.getByRole('tabpanel', { name: 'Privacidade' });
  await expect(privacy.getByRole('heading', { name: 'Os seus direitos' })).toBeVisible();
  // abrir um arquivo traz o editor de volta para o primeiro plano
  await page.getByRole('button', { name: 'Explorador' }).click();
  await page
    .getByRole('list', { name: 'Arquivos do projeto' })
    .getByRole('button', { name: /^style\.css$/ })
    .click();
  await expect(page.getByRole('tab', { name: 'style.css' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tab', { name: /Privacidade/ })).toHaveAttribute(
    'aria-selected',
    'false',
  );
  await expect(page.locator('.monaco-editor .view-lines')).toBeVisible();
  await page.getByRole('button', { name: 'Conta' }).click();

  // exportação
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    s.getByRole('link', { name: 'Baixar meus dados' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('trilhacode-meus-dados.json');
  const data = JSON.parse(readFileSync((await download.path())!, 'utf8')) as {
    perfil: { email: string };
  };
  expect(data.perfil.email).toBe(email);

  // exclusão: exige confirmação e a senha correta
  await s.getByRole('button', { name: 'Excluir minha conta' }).click();
  const form = s.getByRole('form', { name: 'Excluir conta' });
  const submit = form.getByRole('button', { name: 'Excluir conta definitivamente' });
  await expect(submit).toBeDisabled();
  await form.getByLabel('Senha').fill('senha-errada-1');
  await form.getByLabel('Entendo que a exclusão não pode ser desfeita.').check();
  await submit.click();
  await expect(form.getByRole('alert')).toContainText('senha atual está incorreta');
  await form.getByLabel('Senha').fill(PASSWORD);
  await submit.click();
  await expect(s.getByRole('tab', { name: 'Entrar' })).toBeVisible();

  // a conta não existe mais
  await signIn(page, email);
  await expect(s.getByText('E-mail ou senha incorretos.')).toBeVisible();
});
