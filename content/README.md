# Conteúdo das trilhas

Cada trilha é uma pasta em `trilhas/`. O conteúdo é validado e carregado no banco sem recompilar a plataforma:

```bash
pnpm content:validate   # confere o formato e mostra erros com arquivo e campo
pnpm content:sync       # grava no banco (insere, atualiza e remove)
pnpm content:links      # confere se os links de leitura complementar respondem
```

## Estrutura

```
trilhas/<id-da-trilha>/
  trilha.yaml                      título, público, objetivos, pré-requisitos
  01-<modulo>/
    modulo.yaml                    título e descrição
    01-<unidade>/
      unidade.md                   cabeçalho YAML + seções da unidade
      experimento/index.html ...   arquivos que abrem no editor na Experimentação
      desafio.yaml                 enunciado e testes automáticos
      desafio/index.html ...       arquivos iniciais do desafio
      avaliacao.yaml               questões, alternativas e feedback
```

O número no início das pastas define a ordem. O id de cada item vem dos nomes das pastas, sem o número (ex.: `html-css/fundamentos-html/estrutura-documento`). Renomear uma pasta muda o id e faz o progresso dos alunos naquela unidade recomeçar; mudar só o número de ordem não.

## unidade.md

O cabeçalho (entre `---`) traz `titulo`, `nivel`, `duracaoMinutos`, `objetivos`, `termos` (sugestões para o Meu Glossário, com uma pista em vez da definição), `leituraComplementar` e, opcionalmente, `requer` (por padrão, a unidade anterior).

O corpo tem as seções, nesta ordem e com estes títulos: `## Apresentação`, `## Fundamentação`, `## Demonstração`, `## Experimentação` e, opcionalmente, `## Vocabulário`. O desafio e a avaliação ficam nos arquivos YAML.

Na Demonstração, blocos de código com `arquivo=nome.ext` (ex.: ` ```html arquivo=index.html `) viram arquivos que o aluno abre no editor.

HTML escrito diretamente no Markdown é exibido como texto, por segurança.

## Testes do desafio

Cada teste é um trecho de JavaScript executado na página do aluno depois que ela carrega. Estão disponíveis:

- `verificar(condicao, mensagem)`: falha o teste com a mensagem se a condição for falsa. Escreva a mensagem como orientação ao aluno.
- `estilo(elemento, 'propriedade')`: valor calculado de uma propriedade CSS.
- `arquivos['index.html']`: código-fonte de um arquivo do aluno.
- `document`: a página do aluno.

## Avaliação

Cada questão tem `tipo` (`conceitual`, `leitura-de-codigo` ou `resolucao-de-problema`), `enunciado`, opcionalmente `codigo`, e ao menos três alternativas, exatamente uma com `correta: true`. Todas as alternativas precisam de `feedback`, que explica por que estão certas ou erradas. O gabarito fica no servidor e não é enviado ao navegador.
