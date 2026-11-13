# Criação de conteúdo

Guia para professores e colaboradores que querem escrever unidades e trilhas. O conteúdo fica em arquivos de texto (YAML e Markdown) na pasta `content/`, é validado por um comando e carregado no banco sem recompilar a plataforma. A referência curta do formato está em [content/README.md](../content/README.md); aqui está o passo a passo.

## Como uma unidade é organizada

Toda unidade segue as sete etapas pedagógicas da plataforma:

| Etapa                       | Onde se escreve                            | O que o aluno faz                                     |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| 1. Apresentação do conceito | `## Apresentação` em `unidade.md`          | Lê o problema que o conceito resolve.                 |
| 2. Fundamentação teórica    | `## Fundamentação` e `leituraComplementar` | Estuda o conceito, com links para fontes.             |
| 3. Demonstração prática     | `## Demonstração`, com blocos `arquivo=`   | Lê um exemplo comentado e o abre no editor.           |
| 4. Experimentação           | `## Experimentação` e pasta `experimento/` | Modifica e executa o código.                          |
| 5. Vocabulário técnico      | `termos` e `## Vocabulário`                | Pesquisa os termos e registra no Meu Glossário.       |
| 6. Desafio prático          | `desafio.yaml` e pasta `desafio/`          | Resolve uma tarefa, corrigida por testes automáticos. |
| 7. Avaliação                | `avaliacao.yaml`                           | Responde a questões com feedback por alternativa.     |

## Passo a passo: uma unidade nova

Use como modelo `content/trilhas/html-css/01-fundamentos-html/01-estrutura-documento/`.

1. **Crie a pasta** dentro do módulo, com o número de ordem: `04-formularios/`. O id da unidade vem do nome sem o número (`html-css/fundamentos-html/formularios`). Depois de publicada, não renomeie a pasta: isso muda o id e zera o progresso dos alunos naquela unidade.

2. **Escreva o `unidade.md`.** No cabeçalho entre `---`, informe `titulo`, `nivel`, `duracaoMinutos`, `objetivos`, `termos` e `leituraComplementar`. No corpo, as seções `## Apresentação`, `## Fundamentação`, `## Demonstração`, `## Experimentação` e, se quiser, `## Vocabulário`, nesta ordem.

3. **Proponha termos com pistas, não com definições.** O objetivo é o aluno pesquisar e explicar com as próprias palavras; a plataforma avisa quando a explicação copia o significado pesquisado. Uma pista orienta a pesquisa ("Onde ele é escrito e que formato tem?") sem entregar a resposta. São pelo menos três termos.

4. **Monte a demonstração e o experimento.** Na Demonstração, um bloco de código com `arquivo=index.html` vira um arquivo que o aluno abre no editor. A pasta `experimento/` traz os arquivos da Experimentação, que é concluída quando o aluno executa o código.

5. **Escreva o desafio** em `desafio.yaml`: o `enunciado` e uma lista de `testes`. Cada teste tem uma `descricao` (o que o aluno vê na lista) e um `codigo` em JavaScript que roda na página do aluno. Escreva a mensagem do `verificar` como orientação, por exemplo: "Coloque o atributo lang="pt-BR" na tag de abertura `<html>`." Os arquivos iniciais ficam em `desafio/`.

6. **Escreva a avaliação** em `avaliacao.yaml`, com `notaMinima` e as `questoes`. Misture os três tipos (`conceitual`, `leitura-de-codigo`, `resolucao-de-problema`). Cada alternativa tem um `feedback` que explica por que está certa ou errada, e não só "correto" ou "incorreto". As alternativas são embaralhadas na compilação; não é preciso variar a posição da correta.

7. **Valide e carregue:**

   ```bash
   pnpm content:validate
   ```

   ```bash
   pnpm content:sync
   ```

   O primeiro comando aponta cada problema com o arquivo e o campo. O segundo grava no banco; numa instalação Docker, basta reiniciar a API (ver [docs/06-implantacao.md](06-implantacao.md)).

8. **Teste a solução.** Inclua uma solução de referência em `apps/web/e2e/fixtures/solucoes/<unidade>/` e acrescente a unidade à lista de desafios em `apps/web/e2e/trilhas.spec.ts`. O teste confere que os arquivos iniciais reprovam e a solução aprova.

## Fontes e direitos autorais

- Escreva o texto com as suas palavras. Não copie trechos de livros, cursos ou sites, nem de plataformas como o Roadmap.sh, cujo conteúdo não pode ser reutilizado.
- Em `leituraComplementar`, indique a fonte e a licença (por exemplo, "MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)"). O job "Links de leitura complementar" da CI confere se os endereços respondem.
- Exemplos de código devem ser autorais ou de fontes com licença compatível com a AGPL-3.0.

## Revisão pedagógica

Antes de enviar a unidade, confira:

- Os objetivos são observáveis ("Escrever a estrutura mínima de um documento HTML") e o desafio e a avaliação verificam exatamente esses objetivos.
- O desafio tem um contexto plausível para o público da trilha e pode ser resolvido só com o que a unidade ensinou.
- Cada feedback da avaliação ajuda o aluno a entender o erro.
- A duração estimada considera ler, experimentar, resolver o desafio e fazer a avaliação.

## Trilha nova

Crie `content/trilhas/<id>/trilha.yaml` com `titulo`, `descricao`, `publico`, `nivel`, `duracaoEstimada`, `objetivos` e `prerequisitos`, e uma pasta numerada por módulo, cada uma com `modulo.yaml` (`titulo` e `descricao`). Hoje a execução de código cobre HTML, CSS e JavaScript; trilhas de outras linguagens dependem do executor previsto para versões futuras.
