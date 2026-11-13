import { expect, test, type Page } from '@playwright/test';
import { openView, setRole, signOut, signUp, uniqueEmail, verify } from './helpers';

/** Avaliação e evolução (Etapa 6): Meu Glossário, pontos, evolução e leitura pelo professor. */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'fluxo completo no computador');

const contentPane = (page: Page) =>
  page.getByRole('complementary', { name: 'Conteúdo da unidade' });

const SIGNIFICADO =
  'Colocar um elemento dentro de outro, formando uma hierarquia de elementos pais e filhos.';
const PROPRIA = 'É quando uma tag fica dentro de outra, como caixas guardadas em caixas maiores.';

test('glossário na unidade, importação no login, pontos e leitura pelo professor', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const alunoEmail = uniqueEmail('glossario');
  const profEmail = uniqueEmail('prof-glossario');

  // sem login: conclui uma etapa e registra um termo sugerido na etapa de vocabulário
  await page.goto('/');
  await page
    .getByRole('list', { name: 'Trilhas disponíveis' })
    .getByRole('button', { name: /HTML e CSS/ })
    .click();
  await page.getByRole('button', { name: /Estrutura de um documento HTML: / }).click();
  const pane = contentPane(page);
  await pane.getByRole('button', { name: 'Concluir etapa' }).click();
  await pane.getByRole('button', { name: /Etapa 5: Vocabulário técnico/ }).click();
  await pane.getByRole('button', { name: 'Registrar Aninhamento no glossário' }).click();
  const form = pane.getByRole('form', { name: 'Novo termo' });
  await expect(form.getByLabel('Palavra ou expressão')).toHaveValue('Aninhamento');
  await form.getByLabel('Significado pesquisado').fill(SIGNIFICADO);
  await form.getByLabel('Explicação com as suas palavras').fill(SIGNIFICADO);
  await expect(form.getByText(/muito parecida com o significado pesquisado/)).toBeVisible();
  await form.getByLabel('Exemplo de utilização').fill('<ul><li>item</li></ul>');
  await form.getByRole('button', { name: 'Salvar termo' }).click();
  await expect(pane.getByText('falta a explicação própria')).toBeVisible();

  // reescreve com as próprias palavras
  await pane.getByRole('button', { name: 'Editar Aninhamento no glossário' }).click();
  const edit = pane.getByRole('form', { name: 'Editar Aninhamento' });
  await edit.getByLabel('Explicação com as suas palavras').fill(PROPRIA);
  await expect(edit.getByText('Explicação com as suas palavras.')).toBeVisible();
  await edit.getByRole('button', { name: 'Salvar termo' }).click();
  await expect(pane.getByText('registrado')).toBeVisible();

  // cria a conta: o termo e a etapa vão para a conta e geram pontos
  await signUp(page, alunoEmail, 'Aluna Glossário');
  await verify(page, alunoEmail);
  await openView(page, 'Meu Glossário');
  const glossary = page.getByRole('complementary', { name: 'Meu Glossário' });
  await expect(glossary.getByText(/professores das suas turmas podem ler/)).toBeVisible();
  const list = glossary.getByRole('list', { name: 'Termos do glossário' });
  await expect(list.getByText('Aninhamento')).toBeVisible();
  await glossary.getByLabel('Buscar no glossário').fill('caixas');
  await expect(glossary.getByText('1 de 1 termos')).toBeVisible();

  await openView(page, 'Minha evolução');
  const evo = page.getByRole('complementary', { name: 'Minha evolução' });
  // 5 (etapa concluída) + 5 (termo com explicação própria ligado à unidade)
  await expect(evo.getByRole('region', { name: 'Pontuação' })).toContainText('10 pontos');
  await expect(evo.getByText('Glossário: 1 termos · 1 com explicação própria')).toBeVisible();
  await evo.getByRole('button', { name: 'Ver histórico completo' }).click();
  const history = page.getByRole('tabpanel', { name: 'Minha evolução' });
  await expect(
    history.getByRole('table', { name: 'Pontos recebidos' }).getByText(/^Glossário · /),
  ).toBeVisible();
  await signOut(page);

  // professor: matricula a aluna e lê o glossário dela
  await signUp(page, profEmail, 'Professor Glossário');
  await verify(page, profEmail);
  setRole(profEmail, 'professor');
  await page.reload();
  await openView(page, 'Turmas');
  const side = page.getByRole('complementary', { name: 'Turmas' });
  const turma = `Turma Glossário ${Date.now()}`;
  await side.getByRole('button', { name: 'Nova turma' }).click();
  await side.getByLabel('Nome da turma').fill(turma);
  await side.getByRole('button', { name: 'Criar turma' }).click();
  const tp = page.getByRole('tabpanel', { name: new RegExp(turma) });
  await tp.getByRole('tab', { name: 'Alunos' }).click();
  await tp.getByLabel('E-mail do aluno').fill(alunoEmail);
  await tp.getByRole('button', { name: 'Adicionar' }).click();
  await expect(tp.getByRole('table', { name: 'Resultado da importação' })).toContainText(
    'Matriculado',
  );

  await tp.getByRole('tab', { name: 'Glossários' }).click();
  const read = tp.getByRole('list', { name: 'Glossário de Aluna Glossário' });
  await expect(read.getByRole('heading', { name: /Aninhamento/ })).toBeVisible();
  await expect(read.getByText(PROPRIA)).toBeVisible();
  await expect(tp.getByRole('button', { name: /Editar/ })).toHaveCount(0);

  await tp.getByRole('tab', { name: 'Painel' }).click();
  await expect(tp.getByRole('row', { name: /Aluna Glossário/ })).toContainText('10');
  await expect(tp.getByRole('row', { name: /Aluna Glossário/ })).toContainText('1 termo(s)');
});
