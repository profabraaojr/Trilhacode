---
titulo: Estrutura de um documento HTML
nivel: Básico
duracaoMinutos: 50
objetivos:
  - Diferenciar tag, elemento e atributo.
  - Escrever a estrutura mínima de um documento HTML (doctype, html, head e body).
  - Aninhar elementos corretamente e reconhecer o erro de fechamento fora de ordem.
termos:
  - termo: Tag
    dica: Compare a tag de abertura, a de fechamento e o elemento inteiro. Uma coisa é parte da outra?
  - termo: Elemento
    dica: Procure o que forma um elemento além das tags.
  - termo: Atributo
    dica: Onde ele é escrito e que formato tem (nome e valor)?
  - termo: DOCTYPE
    dica: O que acontece com a página quando o navegador não encontra essa declaração? Pesquise "modo quirks".
  - termo: Metadados
    dica: Que informações sobre a página ficam no head e não aparecem no conteúdo?
  - termo: Aninhamento
    dica: Por que a ordem de fechamento importa quando um elemento está dentro de outro?
leituraComplementar:
  - titulo: Começando com o HTML
    url: https://developer.mozilla.org/pt-BR/docs/Learn/HTML/Introduction_to_HTML/Getting_started
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
  - titulo: Doctype (glossário)
    url: https://developer.mozilla.org/pt-BR/docs/Glossary/Doctype
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
---

## Apresentação

Toda página que você abre no navegador começa como um arquivo de texto. Esse texto não diz onde cada coisa aparece nem com que cor; ele diz **o que cada parte é**: isto é um título, isto é um parágrafo, isto é uma lista. Essa marcação é feita com HTML (_HyperText Markup Language_).

Saber estruturar esse documento é o primeiro passo de qualquer trabalho com páginas e sistemas web, do site de uma loja ao painel interno de uma empresa. Leitores de tela, mecanismos de busca e o próprio CSS dependem dessa estrutura para funcionar bem. Uma página mal estruturada pode até parecer correta na tela e, mesmo assim, ser difícil de manter, de acessar e de estilizar.

Nesta unidade você vai montar o esqueleto que toda página HTML precisa ter e entender as três peças com que o HTML é escrito: tags, elementos e atributos.

## Fundamentação

### Tags, elementos e atributos

Um **elemento** HTML costuma ter três partes:

```html
<p class="aviso">A aula começa às 19h.</p>
```

- `<p class="aviso">` é a **tag de abertura**. Ela traz o nome do elemento (`p`, de parágrafo) e pode trazer atributos.
- `A aula começa às 19h.` é o **conteúdo**.
- `</p>` é a **tag de fechamento**: o mesmo nome, precedido de barra.

O elemento é o conjunto inteiro. Por isso não é exato dizer "a tag p mostra um parágrafo": quem representa o parágrafo é o elemento; as tags só marcam onde ele começa e termina.

Um **atributo** acrescenta informação ao elemento. Ele fica na tag de abertura, no formato `nome="valor"`. No exemplo, `class="aviso"` dá um nome ao parágrafo que o CSS poderá usar depois.

Alguns elementos não têm conteúdo e, por isso, não têm tag de fechamento. São os **elementos vazios**, como `<br>` (quebra de linha), `<img>` (imagem) e `<meta>` (metadados).

### A estrutura mínima

Todo documento HTML segue este esqueleto:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Título da aba</title>
  </head>
  <body>
    Conteúdo visível
  </body>
</html>
```

- `<!doctype html>` não é um elemento: é uma declaração que avisa ao navegador que o documento segue o HTML atual. Sem ela, o navegador entra em um modo de compatibilidade com páginas antigas e pode exibir o layout de forma diferente.
- `<html>` é o elemento raiz: todos os outros ficam dentro dele. O atributo `lang="pt-BR"` informa o idioma, o que ajuda leitores de tela a pronunciar o texto corretamente e tradutores automáticos a funcionar.
- `<head>` reúne **metadados**: informações sobre a página que não aparecem no conteúdo. `<meta charset="UTF-8">` define a codificação dos caracteres (é o que garante acentos e cedilha corretos quando a página vem de um servidor), e `<title>` define o texto da aba e o título nos resultados de busca.
- `<body>` contém tudo o que aparece na página.

### Aninhamento

Colocar um elemento dentro de outro se chama **aninhar**. A regra é simples: o último elemento aberto é o primeiro a ser fechado.

```html
<p>Leia o <strong>regulamento</strong> antes da prova.</p>
```

Fechar fora de ordem, como em `<p><strong>texto</p></strong>`, é um erro. O navegador tenta corrigir sozinho, mas cada navegador pode corrigir de um jeito, e o resultado fica imprevisível. O editor da TrilhaCode aponta esse tipo de erro sublinhando a tag em vermelho.

A indentação (os espaços no início das linhas) não muda o resultado na tela. Ela serve para quem lê o código enxergar quem está dentro de quem, e é uma convenção seguida em qualquer equipe.

### Comentários

Tudo que está entre `<!--` e `-->` é um comentário: o navegador ignora. Comentários servem para deixar explicações para quem vai ler ou manter o código.

## Demonstração

O código abaixo é uma página completa, com comentários explicando cada parte. Abra-o no editor, execute e compare o código com o resultado.

```html arquivo=index.html
<!doctype html>
<!-- O atributo lang informa o idioma do conteúdo -->
<html lang="pt-BR">
  <head>
    <!-- Metadados: não aparecem na página -->
    <meta charset="UTF-8" />
    <title>Curso Técnico em Informática</title>
  </head>
  <body>
    <!-- Tudo a partir daqui aparece no resultado -->
    <h1>Curso Técnico em Informática</h1>
    <p>Formação voltada para desenvolvimento de sistemas e suporte.</p>
    <p>As inscrições vão até <strong>30 de novembro</strong>.</p>
  </body>
</html>
```

Repare em três detalhes:

1. O `<strong>` está **dentro** do segundo parágrafo e é fechado antes dele.
2. O texto do `<title>` não aparece no resultado: ele iria para a aba do navegador.
3. Os comentários também não aparecem.

## Experimentação

Abra o experimento no editor e faça as alterações abaixo, uma de cada vez, executando depois de cada uma:

1. Troque o texto do `<h1>` pelo nome de um curso que você conhece.
2. Acrescente um novo parágrafo depois do primeiro, com uma frase sobre o curso.
3. No parágrafo das inscrições, inverta de propósito a ordem de fechamento: `<strong>30 de novembro</p></strong>`. Observe o sublinhado vermelho no editor e o contador de erros na barra de status. Depois corrija.
4. Escreva um comentário dentro do `body` e confirme que ele não aparece no resultado.
5. Apague a linha do `<!doctype html>` e veja se algo muda nesta página simples. Recoloque a linha: em páginas com layout mais elaborado, a diferença aparece.

A etapa é concluída quando você executar o experimento.

## Vocabulário

Registre no seu glossário os termos desta unidade que ainda não domina. Escreva a definição com as suas palavras e um exemplo seu, diferente dos exemplos do texto.
