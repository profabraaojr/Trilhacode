import { expect, test, type Page } from '@playwright/test';
import {
  lastLink,
  openView,
  setRole,
  signIn,
  signOut,
  signUp,
  uniqueEmail,
  verify,
} from './helpers';

/** Gestão pedagógica (Etapa 5): turma, convites, planilha, trilha, painel e avaliação complementar. */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'gestão de turmas no computador');

const classroomPage = (page: Page) => page.getByRole('tabpanel', { name: /Turma de Teste/ });

test('do convite à nota: professor monta a turma e o aluno convidado responde à avaliação', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const profEmail = uniqueEmail('prof');
  const existingEmail = uniqueEmail('aluno-antigo');
  const invitedEmail = uniqueEmail('convidado');
  const turma = `Turma de Teste ${Date.now()}`;

  // contas: um aluno que já existe e um professor
  await page.goto('/');
  await signUp(page, existingEmail, 'Aluno Antigo');
  await verify(page, existingEmail);
  await signOut(page);
  await signUp(page, profEmail, 'Professora Teste');
  await verify(page, profEmail);
  setRole(profEmail, 'professor');
  await page.reload();

  // cria a turma
  await openView(page, 'Turmas');
  const side = page.getByRole('complementary', { name: 'Turmas' });
  await side.getByRole('button', { name: 'Nova turma' }).click();
  await side.getByLabel('Nome da turma').fill(turma);
  await side.getByRole('button', { name: 'Criar turma' }).click();
  const tp = classroomPage(page);
  await expect(tp.getByRole('heading', { level: 1, name: turma })).toBeVisible();

  // alunos: um por e-mail e uma planilha CSV (com uma linha inválida)
  await tp.getByRole('tab', { name: 'Alunos' }).click();
  await tp.getByLabel('E-mail do aluno').fill(existingEmail);
  await tp.getByRole('button', { name: 'Adicionar' }).click();
  await expect(tp.getByRole('table', { name: 'Resultado da importação' })).toContainText(
    'Matriculado',
  );
  await tp.getByLabel(/Importar planilha/).setInputFiles({
    name: 'alunos.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `nome;e-mail\r\nConvidada Nova;${invitedEmail}\r\nSem Email Valido;nao-e-email\r\n`,
    ),
  });
  const result = tp.getByRole('table', { name: 'Resultado da importação' });
  await expect(
    result.getByRole('row', { name: new RegExp(`2 ${invitedEmail} Convite enviado`) }),
  ).toBeVisible();
  await expect(
    result.getByRole('row', { name: /3 nao-e-email Não importado: E-mail inválido/ }),
  ).toBeVisible();
  await expect(tp.getByText('Convites pendentes (1)')).toBeVisible();

  // trilha com prazo e avaliação complementar
  await tp.getByRole('tab', { name: 'Trilhas' }).click();
  await tp.getByLabel('Trilha', { exact: true }).selectOption({ label: 'HTML e CSS' });
  await tp.getByLabel('Prazo (opcional)').fill('2031-06-30');
  await tp.getByRole('button', { name: 'Atribuir' }).click();
  await expect(tp.getByText('prazo 30/06/2031')).toBeVisible();

  await tp.getByRole('tab', { name: 'Avaliações' }).click();
  await tp.getByRole('button', { name: 'Nova avaliação' }).click();
  const editor = tp.getByRole('form', { name: 'Nova avaliação' });
  await editor.getByLabel('Título').fill('Revisão rápida');
  await editor.getByLabel('Enunciado').fill('Qual elemento cria um link?');
  await editor.getByLabel('Alternativa A', { exact: true }).fill('<a>');
  await editor.getByLabel('Feedback da alternativa A').fill('Isso: o elemento a cria links.');
  await editor.getByLabel('Alternativa B', { exact: true }).fill('<link>');
  await editor.getByLabel('Feedback da alternativa B').fill('O link liga arquivos, como o CSS.');
  await editor.getByLabel('Alternativa C', { exact: true }).fill('<href>');
  await editor.getByLabel('Feedback da alternativa C').fill('href é um atributo, não um elemento.');
  await editor.getByRole('button', { name: 'Salvar avaliação' }).click();
  await expect(tp.getByText('Revisão rápida')).toBeVisible();
  await signOut(page);

  // o convidado abre o link do convite, se cadastra com o e-mail preenchido e entra na turma
  await page.goto(await lastLink(page, invitedEmail, /Convite para a turma/));
  await expect(page.getByText(/Você foi convidado para uma turma/)).toBeVisible();
  await signUp(page, invitedEmail, 'Convidada Nova', true);
  await verify(page, invitedEmail);
  await openView(page, 'Turmas');
  const mine = page.getByRole('complementary', { name: 'Turmas' });
  await expect(mine.getByText(turma)).toBeVisible();
  await expect(mine.getByText('até 30/06/2031')).toBeVisible();
  await mine.getByRole('button', { name: 'Revisão rápida' }).click();
  const av = page.getByRole('tabpanel', { name: 'Revisão rápida' });
  await av.getByLabel('<link>').check();
  await av.getByRole('button', { name: /Enviar respostas/ }).click();
  await expect(av.getByText('O link liga arquivos, como o CSS.')).toBeVisible();
  await av.getByRole('button', { name: 'Responder novamente' }).click();
  await av.getByLabel('<a>').check();
  await av.getByRole('button', { name: /Enviar respostas/ }).click();
  await expect(av.getByText(/Nota: 100%\. Você atingiu a nota mínima/)).toBeVisible();
  await signOut(page);

  // o professor vê os dois alunos, a nota e baixa o relatório
  await signIn(page, profEmail);
  await openView(page, 'Turmas');
  await page
    .getByRole('complementary', { name: 'Turmas' })
    .getByRole('button', { name: new RegExp(turma) })
    .click();
  const painel = classroomPage(page);
  const table = painel.getByRole('table').first();
  await expect(table).toContainText('Aluno Antigo');
  await expect(table.getByRole('row', { name: /Convidada Nova/ })).toContainText('100%');
  const href = await painel
    .getByRole('link', { name: 'Exportar relatório (CSV)' })
    .getAttribute('href');
  const csv = await page.request.get(href!);
  expect(csv.headers()['content-type']).toContain('text/csv');
  const body = await csv.text();
  expect(body).toContain('Avaliação: Revisão rápida');
  expect(body).toContain(`Convidada Nova;${invitedEmail}`);
});

test('um aluno não vê a gestão de turmas nem consegue criar turma', async ({ page }) => {
  const email = uniqueEmail('so-aluno');
  await page.goto('/');
  await signUp(page, email, 'Só Aluno');
  await verify(page, email);
  await openView(page, 'Turmas');
  const side = page.getByRole('complementary', { name: 'Turmas' });
  await expect(side.getByText('Minhas turmas')).toBeVisible();
  await expect(side.getByRole('button', { name: 'Nova turma' })).toHaveCount(0);
  const res = await page.request.post('/api/turmas', { data: { name: 'Tentativa' } });
  expect(res.status()).toBe(403);
});
