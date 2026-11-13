---
titulo: Listas e imagens
nivel: Básico
duracaoMinutos: 60
objetivos:
  - Escolher entre lista não ordenada (ul) e ordenada (ol) conforme a ordem importe ou não.
  - Aninhar listas corretamente, com a sublista dentro de um li.
  - Inserir imagens com src, alt, width e height, escrevendo textos alternativos úteis.
termos:
  - termo: Lista não ordenada
    dica: Em que situação trocar a ordem dos itens não muda o sentido?
  - termo: Lista ordenada
    dica: Que atributos permitem começar de outro número ou contar de trás para frente?
  - termo: Texto alternativo
    dica: Quem lê o alt, e em que situações ele aparece no lugar da imagem?
  - termo: Imagem decorativa
    dica: O que fazer com o alt quando a imagem não acrescenta informação?
  - termo: Elemento vazio
    dica: Por que a tag img não tem fechamento? Cite outros elementos assim.
  - termo: Deslocamento de layout
    dica: O que acontece com o texto da página quando uma imagem sem tamanho definido termina de carregar?
leituraComplementar:
  - titulo: Listas
    url: https://developer.mozilla.org/pt-BR/docs/Learn/HTML/Introduction_to_HTML/HTML_text_fundamentals#listas
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
  - titulo: 'O elemento <img>'
    url: https://developer.mozilla.org/pt-BR/docs/Web/HTML/Element/img
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
---

## Apresentação

Uma lista de materiais para uma aula prática, os passos para configurar um roteador, os requisitos de uma vaga de estágio: boa parte da informação técnica que circula no dia a dia tem forma de lista. Às vezes a ordem importa (os passos), às vezes não (os materiais). O HTML tem um elemento para cada caso.

Imagens completam o conteúdo: um diagrama de ligação, a foto de um componente, um logotipo. Mas uma imagem que não carrega, ou que é acessada por alguém que não enxerga, só comunica se tiver um texto alternativo bem escrito.

Nesta unidade você vai estruturar listas e inserir imagens com atenção à acessibilidade.

## Fundamentação

### Listas não ordenadas e ordenadas

Use `<ul>` (_unordered list_) quando a ordem dos itens não altera o sentido, e `<ol>` (_ordered list_) quando altera. Em ambas, cada item é um `<li>` (_list item_):

```html
<h2>Materiais</h2>
<ul>
  <li>Alicate de crimpagem</li>
  <li>Conectores RJ-45</li>
  <li>Cabo par trançado</li>
</ul>

<h2>Montagem do cabo</h2>
<ol>
  <li>Desencape 2 cm do cabo.</li>
  <li>Organize os fios no padrão T568B.</li>
  <li>Insira os fios no conector e crimpe.</li>
</ol>
```

Trocar a ordem dos materiais não muda nada; trocar a ordem da montagem estraga o cabo. Essa é a pergunta para escolher entre `ul` e `ol`. A numeração e os marcadores (as "bolinhas") são gerados pelo navegador; não escreva "1." no texto do item.

O `<ol>` aceita atributos úteis: `start="4"` começa a contagem do 4, e `reversed` conta de trás para frente.

### Listas aninhadas

Uma sublista fica **dentro de um `<li>`**, nunca solta dentro do `<ul>` ou `<ol>`:

```html
<ul>
  <li>
    Hardware
    <ul>
      <li>Processador</li>
      <li>Memória</li>
    </ul>
  </li>
  <li>Software</li>
</ul>
```

Os filhos diretos de `<ul>` e `<ol>` só podem ser `<li>`. Um `<ul>` dentro de outro `<ul>`, sem o `<li>` em volta, é um erro de estrutura, mesmo que pareça certo na tela.

### Imagens com `<img>`

`<img>` é um elemento vazio: não tem conteúdo nem tag de fechamento. Toda a informação vem dos atributos:

```html
<img
  src="diagrama-rede.png"
  alt="Diagrama com três computadores ligados a um switch"
  width="600"
  height="400"
/>
```

- `src`: o caminho do arquivo da imagem, relativo ou absoluto, como no `href` dos links.
- `alt`: o **texto alternativo**. Leitores de tela leem esse texto, e o navegador o mostra quando a imagem não carrega.
- `width` e `height`: largura e altura em pixels. Com eles, o navegador reserva o espaço antes da imagem chegar, e o texto não "pula" quando ela termina de carregar.

### Como escrever um bom alt

O alt deve transmitir **a informação que a imagem transmite naquele contexto**:

- Descreva o conteúdo relevante: "Placa-mãe com os slots de memória destacados em vermelho" informa; "imagem1" ou "foto" não.
- Não comece com "Imagem de..." ou "Foto de...": o leitor de tela já anuncia que é uma imagem.
- Se a imagem for só decoração e não acrescentar informação, use `alt=""` (vazio). O leitor de tela a ignora, em vez de ler o nome do arquivo.
- Nunca omita o atributo `alt`. Sem ele, muitos leitores de tela leem o nome do arquivo.

### Formatos

Para fotos, use JPEG ou WebP. Para ícones, logotipos e diagramas com cores chapadas, PNG ou SVG. O SVG é vetorial: não perde qualidade ao ser ampliado.

## Demonstração

A página abaixo tem uma lista não ordenada com sublista, uma lista ordenada e uma imagem cujo arquivo **não existe no projeto**. Isso é proposital: no resultado, aparece o texto alternativo no lugar da imagem, e o console avisa que a imagem não carregou. É exatamente o que um visitante veria se a imagem falhasse.

```html arquivo=index.html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Montagem de cabo de rede</title>
  </head>
  <body>
    <h1>Montagem de cabo de rede</h1>

    <h2>Materiais</h2>
    <!-- A ordem não importa: lista não ordenada -->
    <ul>
      <li>Alicate de crimpagem</li>
      <li>
        Conectores RJ-45
        <!-- Sublista dentro do li -->
        <ul>
          <li>Categoria 6</li>
        </ul>
      </li>
      <li>Cabo par trançado</li>
    </ul>

    <h2>Passos</h2>
    <!-- A ordem importa: lista ordenada -->
    <ol>
      <li>Desencape 2 cm do cabo.</li>
      <li>Organize os fios no padrão T568B.</li>
      <li>Insira os fios no conector e crimpe.</li>
    </ol>

    <!-- Este arquivo não existe: veja o alt aparecer no resultado -->
    <img
      src="padrao-t568b.png"
      alt="Ordem das cores no padrão T568B: branco-laranja, laranja, branco-verde, azul, branco-azul, verde, branco-marrom, marrom"
      width="480"
      height="270"
    />
  </body>
</html>
```

## Experimentação

Abra o experimento no editor. Ele tem uma lista de requisitos de uma vaga de estágio escrita só com parágrafos.

1. Transforme os requisitos em uma `<ul>` e as etapas do processo seletivo em uma `<ol>`.
2. Use `start="2"` no `<ol>` e veja a numeração mudar. Depois retire o atributo.
3. Dentro do item "Conhecimentos em", crie uma sublista com duas linguagens. Garanta que ela fique dentro do `<li>`.
4. A imagem do logotipo não carrega porque o arquivo não existe. Leia o alt que aparece no resultado e reescreva-o para que faça sentido para quem não vê a imagem.
5. Apague o atributo `alt` inteiro e compare com o resultado anterior. Depois recoloque.

A etapa é concluída quando você executar o experimento.

## Vocabulário

Registre os termos que ainda não domina. Para "texto alternativo", escreva dois exemplos seus: um alt para uma imagem informativa e um caso em que o alt deve ficar vazio.
