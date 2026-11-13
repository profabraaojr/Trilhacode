import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * Trilhas e unidades (Etapa 3). Exigem a API com o conteúdo sincronizado.
 * Cada teste usa um contexto novo do navegador, portanto progresso vazio.
 */

const solution = (unit: string, file: string) =>
  readFileSync(new URL(`./fixtures/solucoes/${unit}/${file}`, import.meta.url), 'utf8');

const contentPane = (page: Page) =>
  page.getByRole('complementary', { name: 'Conteúdo da unidade' });

async function replaceCode(page: Page, code: string) {
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.evaluate((c) => navigator.clipboard.writeText(c), code);
  await page.keyboard.press('ControlOrMeta+v');
}

async function openTrackMap(page: Page) {
  await page.goto('/');
  await page
    .getByRole('list', { name: 'Trilhas disponíveis' })
    .getByRole('button', { name: /HTML e CSS/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'HTML e CSS' })).toBeVisible();
}

test.describe('computador', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, 'fluxo completo no computador');

  test('o mapa mostra objetivos, pré-requisitos e o estado das unidades', async ({ page }) => {
    await openTrackMap(page);
    await page.getByText('Objetivos de aprendizagem e pré-requisitos').click();
    await expect(page.getByText('Vincular uma folha de estilo')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Estrutura de um documento HTML: Disponível/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Textos e links: Bloqueada/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Primeiros seletores CSS: Bloqueada/ }),
    ).toBeVisible();
  });

  test('percorre uma unidade inteira: etapas, experimento, desafio e avaliação', async ({
    page,
  }) => {
    await openTrackMap(page);
    await page.getByRole('button', { name: /Estrutura de um documento HTML: / }).click();
    const pane = contentPane(page);
    await expect(
      pane.getByRole('heading', { name: 'Estrutura de um documento HTML' }),
    ).toBeVisible();

    // Etapas 1 a 3: leitura
    for (const title of [
      'Apresentação do conceito',
      'Fundamentação teórica',
      'Demonstração prática',
    ]) {
      await expect(pane.getByRole('heading', { name: new RegExp(title) })).toBeVisible();
      await pane.getByRole('button', { name: 'Concluir etapa' }).click();
    }

    // Etapa 4: o experimento abre no editor e conta como concluído ao executar
    await expect(pane.getByRole('heading', { name: /Experimentação/ })).toBeVisible();
    await pane.getByRole('button', { name: 'Abrir experimento no editor' }).click();
    await expect(
      page.getByRole('complementary', { name: 'Trilhas' }).or(page.locator('.explorer')),
    ).toBeVisible();
    await expect(pane.getByText('Etapa concluída: você executou o experimento.')).toBeVisible({
      timeout: 10_000,
    });
    await pane.getByRole('button', { name: 'Próxima' }).click();

    // Etapa 5: vocabulário
    await expect(pane.getByText('Termos sugeridos para pesquisar')).toBeVisible();
    await expect(pane.getByText('Aninhamento', { exact: true })).toBeVisible();
    await pane.getByRole('button', { name: 'Concluir etapa' }).click();

    // Etapa 6: desafio. Os arquivos iniciais não passam; a solução passa.
    await pane.getByRole('button', { name: 'Verificar desafio' }).click();
    await expect(pane.getByText(/de 7 itens atendidos/)).toBeVisible({ timeout: 10_000 });
    await expect(
      pane.getByText('A primeira linha do arquivo deve ser <!doctype html>.'),
    ).toBeVisible();
    await replaceCode(page, solution('estrutura-documento', 'index.html'));
    await pane.getByRole('button', { name: 'Verificar desafio' }).click();
    await expect(
      pane.getByText('Todos os 7 itens foram atendidos. Desafio concluído!'),
    ).toBeVisible({ timeout: 10_000 });
    await pane.getByRole('button', { name: 'Próxima' }).click();

    // Etapa 7: avaliação. Primeiro uma resposta errada, com feedback; depois todas certas.
    const q1 = pane.getByRole('group', { name: /Questão 1/ });
    await expect(q1).toBeVisible();
    await pane.getByLabel(/Apenas `?<p class="aviso">`?\./).check();
    await pane.getByRole('button', { name: /Enviar respostas/ }).click();
    await expect(pane.getByText(/Nota: 0%/)).toBeVisible();
    await expect(
      pane.getByText('Essa é a tag de abertura, que é só uma parte do elemento.'),
    ).toBeVisible();
    await pane.getByRole('button', { name: 'Responder novamente' }).click();

    for (const correct of [
      /O conjunto inteiro/,
      /Reunir metadados/,
      /^Linha 3$/,
      /Informa o idioma do conteúdo/,
      /<title> dentro do head/,
    ]) {
      await pane.getByLabel(correct).check();
    }
    await pane.getByRole('button', { name: /Enviar respostas \(5\/5\)/ }).click();
    await expect(pane.getByText('Nota: 100% (5 de 5). Avaliação concluída.')).toBeVisible();
    await expect(pane.getByText('7 de 7 etapas')).toBeVisible();

    // A unidade seguinte fica disponível e o progresso sobrevive ao recarregar
    await page.getByRole('tab', { name: /Mapa/ }).click();
    await expect(
      page.getByRole('button', { name: /Estrutura de um documento HTML: Concluída/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Textos e links: Disponível/ })).toBeVisible();
    await page.reload();
    await page
      .getByRole('list', { name: 'Trilhas disponíveis' })
      .getByRole('button', { name: /HTML e CSS/ })
      .click();
    await expect(
      page.getByRole('button', { name: /Estrutura de um documento HTML: Concluída/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: /Progresso na trilha/ }).first(),
    ).toHaveAttribute('aria-valuenow', '25');
  });

  for (const [slug, title, files] of [
    ['textos-e-links', 'Textos e links', ['index.html']],
    ['listas-e-imagens', 'Listas e imagens', ['index.html']],
    ['seletores-css', 'Primeiros seletores CSS', ['index.html', 'style.css']],
  ] as const) {
    test(`o desafio "${title}" reprova os arquivos iniciais e aprova a solução de referência`, async ({
      page,
    }) => {
      await openTrackMap(page);
      await page.getByRole('button', { name: new RegExp(`${title}: `) }).click();
      const pane = contentPane(page);
      await expect(pane.getByRole('heading', { name: title })).toBeVisible();
      await pane.getByRole('button', { name: 'Etapa 6: Desafio prático' }).click();
      await pane.getByRole('button', { name: 'Verificar desafio' }).click();
      await expect(pane.getByText(/itens atendidos\. Corrija/)).toBeVisible({ timeout: 10_000 });

      await page.getByRole('button', { name: 'Explorador' }).click();
      for (const file of files) {
        await page
          .getByRole('list', { name: 'Arquivos do projeto' })
          .getByRole('button', { name: new RegExp(`^${file.replace('.', '\\.')}`) })
          .click();
        await replaceCode(page, solution(slug, file));
      }
      await pane.getByRole('button', { name: 'Verificar desafio' }).click();
      await expect(pane.getByText(/Todos os \d+ itens foram atendidos/)).toBeVisible({
        timeout: 10_000,
      });
    });
  }

  test('o projeto livre do aluno é preservado ao abrir arquivos de uma unidade', async ({
    page,
  }) => {
    await openTrackMap(page);
    await page.getByRole('button', { name: /Estrutura de um documento HTML: / }).click();
    const pane = contentPane(page);
    await pane.getByRole('button', { name: 'Etapa 4: Experimentação' }).click();
    await pane.getByRole('button', { name: 'Abrir experimento no editor' }).click();
    await page.getByRole('button', { name: 'Explorador' }).click();
    await expect(page.locator('.explorer-project')).toHaveText(/Experimento · Estrutura/);
    await page.getByRole('button', { name: 'Voltar ao meu projeto' }).click();
    await expect(page.locator('.explorer-project')).toHaveText('Meu projeto');
    await expect(page.getByRole('list', { name: 'Arquivos do projeto' })).toContainText(
      'script.js',
    );
  });
});

test.describe('celular', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, 'layout em abas');

  test('abre uma unidade pelo menu e mostra na aba Conteúdo', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page
      .getByRole('dialog', { name: 'Menu' })
      .getByRole('button', { name: /Trilhas/ })
      .click();
    await page
      .getByRole('list', { name: 'Trilhas disponíveis' })
      .getByRole('button', { name: /HTML e CSS/ })
      .click();
    // abrir a trilha leva ao mapa (aba Código); a unidade abre na aba Conteúdo
    await page.getByRole('button', { name: /Estrutura de um documento HTML: / }).click();
    await expect(
      contentPane(page).getByRole('heading', { name: 'Estrutura de um documento HTML' }),
    ).toBeVisible();
    const tabs = page.getByRole('navigation', { name: 'Áreas de trabalho' });
    await expect(tabs.getByRole('button', { name: 'Conteúdo' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
