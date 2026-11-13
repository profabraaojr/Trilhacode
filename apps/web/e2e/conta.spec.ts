import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  accountSidebar,
  lastLink,
  openView,
  PASSWORD,
  signIn,
  signUp,
  uniqueEmail,
  verify,
} from './helpers';

/**
 * Cadastro, login e perfis (Etapa 4). A API roda com MAIL_CAPTURE=true: os e-mails
 * ficam em GET /api/dev/emails e os testes abrem os links como o aluno faria.
 */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'fluxos de conta no computador');

const sidebar = accountSidebar;

test('cadastro exige confirmação do e-mail e o link ativa a conta já logada', async ({ page }) => {
  const email = uniqueEmail('cadastro');
  await page.goto('/');
  await signUp(page, email);

  await signIn(page, email);
  await expect(sidebar(page).getByText(/Confirme seu e-mail antes de entrar/)).toBeVisible();
  await expect(
    sidebar(page).getByRole('button', { name: 'Reenviar e-mail de confirmação' }),
  ).toBeVisible();

  await verify(page, email);
  await expect(sidebar(page).getByText(email)).toBeVisible();
  await expect(sidebar(page).getByText('Aluno', { exact: true })).toBeVisible();
  await expect(page.getByRole('contentinfo', { name: 'Barra de status' })).toContainText(
    'Aluna Teste',
  );
});

test('o progresso feito sem login é levado para a conta e fica salvo no servidor', async ({
  page,
}) => {
  const email = uniqueEmail('progresso');
  await page.goto('/');
  await page
    .getByRole('list', { name: 'Trilhas disponíveis' })
    .getByRole('button', { name: /HTML e CSS/ })
    .click();
  await page.getByRole('button', { name: /Estrutura de um documento HTML: / }).click();
  const pane = page.getByRole('complementary', { name: 'Conteúdo da unidade' });
  await pane.getByRole('button', { name: 'Concluir etapa' }).click();
  await expect(pane.getByText('1 de 7 etapas')).toBeVisible();

  await signUp(page, email);
  await verify(page, email);
  await openView(page, 'Trilhas');
  await page
    .getByRole('list', { name: 'Trilhas disponíveis' })
    .getByRole('button', { name: /HTML e CSS/ })
    .click();
  await expect(
    page.getByRole('button', { name: /Estrutura de um documento HTML: Em andamento, 1 de 7/ }),
  ).toBeVisible();

  // Em outro navegador (contexto limpo), o progresso vem da conta
  const other = await page.context().browser()!.newContext();
  const p2 = await other.newPage();
  await p2.goto('/');
  await signIn(p2, email);
  await expect(sidebar(p2).getByText(email)).toBeVisible();
  await openView(p2, 'Trilhas');
  await p2
    .getByRole('list', { name: 'Trilhas disponíveis' })
    .getByRole('button', { name: /HTML e CSS/ })
    .click();
  await expect(
    p2.getByRole('button', { name: /Estrutura de um documento HTML: Em andamento, 1 de 7/ }),
  ).toBeVisible();
  await other.close();
});

test('edita os dados, troca a senha, sai e entra com a senha nova', async ({ page }) => {
  const email = uniqueEmail('perfil');
  await page.goto('/');
  await signUp(page, email);
  await verify(page, email);
  const s = sidebar(page);

  const dados = s.getByRole('form', { name: 'Dados pessoais' });
  await dados.getByLabel('Nome completo').fill('Aluna Renomeada');
  await dados.getByRole('button', { name: 'Salvar dados' }).click();
  await expect(dados.getByText('Dados atualizados.')).toBeVisible();

  const senha = s.getByRole('form', { name: 'Alterar senha' });
  await senha.getByLabel('Senha atual').fill('senha-errada-1');
  await senha.getByLabel('Nova senha').fill('nova-senha-segura');
  await senha.getByRole('button', { name: 'Alterar senha' }).click();
  await expect(senha.getByText('A senha atual está incorreta.')).toBeVisible();
  await senha.getByLabel('Senha atual').fill(PASSWORD);
  await senha.getByRole('button', { name: 'Alterar senha' }).click();
  await expect(senha.getByText(/Senha alterada/)).toBeVisible();

  await s.getByRole('button', { name: 'Sair' }).click();
  await expect(s.getByRole('tab', { name: 'Entrar' })).toBeVisible();
  await signIn(page, email, PASSWORD);
  await expect(s.getByText('E-mail ou senha incorretos.')).toBeVisible();
  await signIn(page, email, 'nova-senha-segura');
  await expect(s.getByText('Aluna Renomeada')).toBeVisible();
});

test('recupera a senha pelo link enviado por e-mail', async ({ page }) => {
  const email = uniqueEmail('recupera');
  await page.goto('/');
  await signUp(page, email);
  await verify(page, email);
  await sidebar(page).getByRole('button', { name: 'Sair' }).click();

  const s = sidebar(page);
  await s.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await s.getByLabel('E-mail').fill(email);
  await s.getByRole('button', { name: 'Enviar link' }).click();
  await expect(s.getByText(/você receberá um link para criar uma nova senha/)).toBeVisible();

  await page.goto(await lastLink(page, email, /Redefinição/));
  const form = sidebar(page).getByRole('form', { name: 'Criar nova senha' });
  await form.getByLabel('Nova senha', { exact: true }).fill('senha-recuperada-1');
  await form.getByLabel('Repita a nova senha').fill('senha-recuperada-1');
  await form.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(form.getByText('Senha alterada. Entre com a nova senha.')).toBeVisible();
  await form.getByRole('button', { name: 'Ir para entrar' }).click();
  await signIn(page, email, 'senha-recuperada-1');
  await expect(sidebar(page).getByText(email)).toBeVisible();
});

test('um administrador promove um aluno a professor', async ({ page }) => {
  const adminEmail = uniqueEmail('admin');
  const alunoEmail = uniqueEmail('futuro-prof');
  await page.goto('/');
  await signUp(page, alunoEmail, 'Futuro Professor');
  await verify(page, alunoEmail);
  await sidebar(page).getByRole('button', { name: 'Sair' }).click();
  await signUp(page, adminEmail, 'Pessoa Administradora');
  await verify(page, adminEmail);
  await expect(sidebar(page).getByText('Usuários (administração)')).toHaveCount(0);

  // O primeiro administrador é criado por comando no servidor
  execSync(`pnpm --dir ../api admin:criar ${adminEmail}`, { stdio: 'pipe' });
  await page.reload();
  await openView(page, 'Conta');
  const s = sidebar(page);
  await expect(s.getByText('Usuários (administração)')).toBeVisible();
  await s.getByLabel(`Papel de Futuro Professor (${alunoEmail})`).selectOption('professor');
  await expect(s.getByText('Futuro Professor agora é professor.')).toBeVisible();
  await expect(s.getByLabel(`Papel de Pessoa Administradora (${adminEmail})`)).toBeDisabled();
});
