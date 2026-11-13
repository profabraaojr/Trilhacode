import { execSync } from 'node:child_process';
import { expect, type Page } from '@playwright/test';

/** Utilitários comuns aos testes de conta e de turmas. A API roda com MAIL_CAPTURE=true. */
export const API = 'http://127.0.0.1:3000';
export const PASSWORD = 'senha-de-teste-1';
export const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.invalid`;

export async function lastLink(page: Page, email: string, subject: RegExp): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const res = await page.request.get(`${API}/api/dev/emails?para=${encodeURIComponent(email)}`);
      const mails = (await res.json()) as { subject: string; text: string }[];
      link = mails
        .reverse()
        .find((m) => subject.test(m.subject))
        ?.text.match(/https?:\/\/\S+/)?.[0];
      return link;
    })
    .toBeTruthy();
  return link!;
}

export const accountSidebar = (page: Page) => page.getByRole('complementary', { name: 'Conta' });

/** Abre uma visão pela barra de atividades (clicar na visão já aberta recolheria a barra lateral). */
export async function openView(
  page: Page,
  name: 'Conta' | 'Trilhas' | 'Turmas' | 'Meu Glossário' | 'Minha evolução',
) {
  const view = page.getByRole('complementary', { name });
  if (await view.isVisible()) return;
  await page
    .getByRole('navigation', { name: 'Barra de atividades' })
    .getByRole('button', { name })
    .click();
  await expect(view).toBeVisible();
}

export async function signUp(page: Page, email: string, name = 'Aluna Teste', prefilled = false) {
  await openView(page, 'Conta');
  const s = accountSidebar(page);
  if (!prefilled) await s.getByRole('tab', { name: 'Criar conta' }).click();
  await s.getByLabel('Nome completo').fill(name);
  if (prefilled) await expect(s.getByLabel('E-mail')).toHaveValue(email);
  else await s.getByLabel('E-mail').fill(email);
  await s.getByLabel('Senha').fill(PASSWORD);
  await s.getByRole('button', { name: 'Criar conta' }).last().click();
  await expect(s.getByText(/Conta criada\. Enviamos um link de confirmação/)).toBeVisible();
}

export async function verify(page: Page, email: string) {
  await page.goto(await lastLink(page, email, /Confirme/));
  await expect(
    accountSidebar(page).getByText('E-mail confirmado. Bem-vindo(a) à TrilhaCode!'),
  ).toBeVisible();
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await openView(page, 'Conta');
  const s = accountSidebar(page);
  await s.getByLabel('E-mail').fill(email);
  await s.getByLabel('Senha').fill(password);
  await s.getByRole('button', { name: 'Entrar' }).last().click();
}

export async function signOut(page: Page) {
  await openView(page, 'Conta');
  await accountSidebar(page).getByRole('button', { name: 'Sair' }).click();
  await expect(accountSidebar(page).getByRole('tab', { name: 'Entrar' })).toBeVisible();
}

/** Define o papel de uma conta pelo comando do servidor. */
export function setRole(email: string, role: 'aluno' | 'professor' | 'admin') {
  execSync(`pnpm --dir ../api admin:papel ${email} ${role}`, { stdio: 'pipe' });
}
