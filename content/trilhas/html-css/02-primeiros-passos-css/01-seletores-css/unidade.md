---
titulo: Primeiros seletores CSS
nivel: Básico
duracaoMinutos: 70
requer:
  - fundamentos-html/listas-e-imagens
objetivos:
  - Vincular uma folha de estilo externa ao documento HTML.
  - Ler e escrever regras CSS (seletor, propriedade e valor).
  - Escolher entre seletores de tipo, classe e id, e prever qual regra vence quando duas se aplicam ao mesmo elemento.
termos:
  - termo: Folha de estilo
    dica: Por que separar o CSS em outro arquivo em vez de escrever estilos dentro do HTML?
  - termo: Seletor
    dica: É a parte da regra que responde a qual pergunta?
  - termo: Declaração
    dica: Quais são as duas partes de uma declaração e o que as separa?
  - termo: Classe
    dica: Quantos elementos podem ter a mesma classe? E um mesmo elemento pode ter várias?
  - termo: Cascata
    dica: Quando duas regras de mesmo peso se aplicam ao mesmo elemento, qual vence?
  - termo: Especificidade
    dica: Compare o "peso" de um seletor de id, de classe e de tipo.
leituraComplementar:
  - titulo: O que é CSS?
    url: https://developer.mozilla.org/pt-BR/docs/Learn/CSS/First_steps/What_is_CSS
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
  - titulo: Seletores de classe
    url: https://developer.mozilla.org/pt-BR/docs/Web/CSS/Class_selectors
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
---

## Apresentação

Até aqui o HTML disse **o que** cada parte da página é. Agora entra o CSS (_Cascading Style Sheets_), que diz **como** cada parte deve aparecer: cores, fontes, tamanhos, espaçamentos.

Separar as duas coisas tem consequências práticas. Um site com cinquenta páginas pode mudar toda a identidade visual editando um único arquivo CSS. A mesma estrutura HTML pode ganhar uma aparência para tela e outra para impressão. E quem mantém o código encontra mais rápido o que procura: conteúdo em um lugar, apresentação em outro.

O ponto central desta unidade é o **seletor**: a parte da regra que escolhe quais elementos recebem o estilo. Escolher bem o seletor é o que separa um CSS fácil de manter de um CSS em que cada mudança quebra outra coisa.

## Fundamentação

### Vinculando o CSS

A forma recomendada é um arquivo separado, ligado no `<head>` pelo elemento `<link>`:

```html
<head>
  <meta charset="UTF-8" />
  <title>Minha página</title>
  <link rel="stylesheet" href="style.css" />
</head>
```

`rel="stylesheet"` diz que o arquivo é uma folha de estilo, e `href` traz o caminho, como nos links. Se o caminho estiver errado, a página aparece sem estilo e a TrilhaCode avisa no console.

Também é possível escrever CSS no atributo `style` de um elemento (`<p style="color: red">`), mas isso mistura de novo conteúdo e apresentação e dificulta a manutenção. Use só em casos pontuais.

### Anatomia de uma regra

```css
h1 {
  color: #0f766e;
  font-size: 32px;
}
```

- `h1` é o **seletor**: escolhe os elementos.
- Entre as chaves ficam as **declarações**. Cada uma tem uma **propriedade** (`color`), dois-pontos, um **valor** (`#0f766e`) e ponto e vírgula.

Esquecer o ponto e vírgula ou a chave de fechamento é o erro mais comum: a regra seguinte deixa de funcionar. O editor sublinha esse tipo de erro.

### Três seletores básicos

| Seletor | Exemplo     | Escolhe                                   | Quando usar                               |
| ------- | ----------- | ----------------------------------------- | ----------------------------------------- |
| Tipo    | `p`         | Todos os elementos `<p>`                  | Estilo geral de um tipo de elemento       |
| Classe  | `.destaque` | Todos os elementos com `class="destaque"` | Estilo reaproveitável em vários elementos |
| Id      | `#aviso`    | O único elemento com `id="aviso"`         | Raramente; um id é único na página        |

Um elemento pode ter várias classes, separadas por espaço: `<p class="destaque grande">`. No dia a dia, a **classe** é o seletor mais usado, porque pode ser reaproveitada e tem peso moderado.

Para aplicar o mesmo estilo a vários seletores, separe-os por vírgula: `h1, h2 { font-family: sans-serif; }`.

### Cascata e especificidade

O que acontece quando duas regras se aplicam ao mesmo elemento?

1. Se os seletores têm o **mesmo peso**, vence a regra que aparece **por último** no arquivo. É a "cascata" do nome.
2. Se os pesos são diferentes, vence o mais **específico**: id vence classe, que vence tipo.

```css
p {
  color: black;
}
.destaque {
  color: darkorange;
}
p {
  color: gray;
}
```

Um `<p>` comum fica cinza (a segunda regra de `p` vem por último). Um `<p class="destaque">` fica laranja, porque a classe é mais específica que o tipo, não importa a ordem.

### Algumas propriedades para começar

- `color`: cor do texto.
- `background-color`: cor de fundo.
- `font-size`: tamanho da fonte (por exemplo, `18px`).
- `font-family`: família da fonte (por exemplo, `sans-serif`).
- `font-weight`: espessura (`bold` para negrito).
- `text-align`: alinhamento (`left`, `center`, `right`).

Cores podem ser escritas por nome (`teal`), em hexadecimal (`#0f766e`) ou em RGB (`rgb(15, 118, 110)`). As três formas acima representam cores parecidas; `#0f766e` e `rgb(15, 118, 110)` são exatamente a mesma.

## Demonstração

Os dois arquivos abaixo mostram os três tipos de seletor e a especificidade em ação. Abra no editor e observe: o parágrafo com a classe `destaque` fica com fundo amarelo, mesmo existindo uma regra para todos os parágrafos.

```html arquivo=index.html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Seletores CSS</title>
    <!-- Liga a folha de estilo -->
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Semana de tecnologia</h1>
    <p>Palestras, oficinas e mostra de projetos dos cursos técnicos.</p>
    <p class="destaque">Inscrições gratuitas até sexta-feira.</p>
    <p id="aviso">Vagas limitadas por oficina.</p>
  </body>
</html>
```

```css arquivo=style.css
/* Seletor de tipo: todos os h1 */
h1 {
  color: #0f766e;
}

/* Seletor de tipo: todos os parágrafos */
p {
  font-size: 18px;
  color: #333333;
}

/* Seletor de classe: elementos com class="destaque" */
.destaque {
  background-color: #fef3c7;
}

/* Seletor de id: o elemento com id="aviso" */
#aviso {
  font-weight: bold;
}
```

## Experimentação

Abra o experimento no editor. O `index.html` já está ligado ao `style.css`, que está quase vazio.

1. No `style.css`, escreva uma regra que deixe todos os `<h2>` com a cor `teal`.
2. Crie a classe `.preco` com `font-weight: bold` e aplique-a aos dois preços do HTML. Veja que a mesma regra estiliza os dois.
3. Escreva `p { color: gray; }` e, logo abaixo, `p { color: navy; }`. Qual cor venceu? Inverta a ordem e execute de novo.
4. Agora escreva `.preco { color: darkred; }` **antes** das regras de `p`. Os preços ficam vermelhos mesmo assim? Explique com a palavra "especificidade".
5. Apague o ponto e vírgula de uma declaração no meio de uma regra e observe o que deixa de funcionar e o aviso do editor. Depois corrija.

A etapa é concluída quando você executar o experimento.

## Vocabulário

Registre os termos que ainda não domina. Para "especificidade", escreva um exemplo seu com duas regras que se aplicam ao mesmo elemento e diga qual vence.
