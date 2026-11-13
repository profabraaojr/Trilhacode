---
titulo: Textos e links
nivel: Básico
duracaoMinutos: 60
objetivos:
  - Organizar um texto com níveis de título (h1 a h6) sem pular níveis.
  - Escolher entre strong, em, b e i pelo significado, não pela aparência.
  - Criar links absolutos, relativos e para seções da mesma página, com texto descritivo.
termos:
  - termo: Hierarquia de títulos
    dica: Pense no sumário de um livro. Como um leitor de tela usa os títulos para navegar?
  - termo: Semântica
    dica: Qual a diferença entre o significado de um elemento e a aparência padrão dele?
  - termo: Hiperlink
    dica: De onde vem o "Hyper" de HyperText Markup Language?
  - termo: URL absoluta
    dica: Que partes ela tem que uma URL relativa não tem?
  - termo: URL relativa
    dica: Relativa a quê? Teste mentalmente o que muda se a página for movida de pasta.
  - termo: Âncora
    dica: Como um link leva a um ponto específico da mesma página? Que atributo o destino precisa ter?
leituraComplementar:
  - titulo: Criando hiperlinks
    url: https://developer.mozilla.org/pt-BR/docs/Learn/HTML/Introduction_to_HTML/Creating_hyperlinks
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
  - titulo: 'O elemento <a>'
    url: https://developer.mozilla.org/pt-BR/docs/Web/HTML/Element/a
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
  - titulo: 'Elementos de título <h1> a <h6>'
    url: https://developer.mozilla.org/pt-BR/docs/Web/HTML/Element/Heading_Elements
    fonte: MDN Web Docs (conteúdo sob licença CC-BY-SA 2.5)
---

## Apresentação

Pense em um manual técnico de um equipamento. Ele tem um título geral, seções, subseções, avisos destacados e referências para outras partes do manual. Quem procura uma informação não lê tudo: corre os olhos pelos títulos até achar a seção certa.

Páginas web funcionam do mesmo jeito, com uma diferença: além de pessoas, programas leem a estrutura. Um leitor de tela permite que uma pessoa cega pule de título em título; um buscador usa os títulos para entender do que a página trata. E os links são o que transforma páginas isoladas em uma rede.

Nesta unidade você vai organizar um texto com títulos, parágrafos e ênfases e ligar páginas e seções com links.

## Fundamentação

### Títulos de h1 a h6

O HTML tem seis níveis de título, de `<h1>` (o mais importante) a `<h6>`. Eles formam uma hierarquia, como o sumário de um documento:

```html
<h1>Manual da impressora 3D</h1>
<h2>Instalação</h2>
<h3>Conteúdo da caixa</h3>
<h3>Montagem da mesa</h3>
<h2>Manutenção</h2>
```

Três regras práticas:

- Use **um `<h1>`** por página, com o assunto principal.
- **Não pule níveis**: depois de um `<h2>`, o próximo subnível é `<h3>`, não `<h4>`. Quem navega por títulos com leitor de tela percebe o salto como uma seção faltando.
- Não escolha o nível pelo tamanho da letra. O tamanho se ajusta com CSS; o nível diz a posição do título na hierarquia.

### Parágrafos e quebras

Cada bloco de texto vai em um `<p>`. O navegador ignora quebras de linha e espaços repetidos no código: para separar blocos, use parágrafos diferentes. O `<br>` força uma quebra de linha dentro do mesmo bloco e só faz sentido onde a quebra faz parte do conteúdo, como em um endereço ou em versos.

### Ênfase: o significado vem antes da aparência

| Elemento   | Significado                              | Exemplo de uso                         |
| ---------- | ---------------------------------------- | -------------------------------------- |
| `<strong>` | Importância, seriedade, urgência         | **Desligue da tomada** antes de abrir. |
| `<em>`     | Ênfase que muda o sentido da frase       | Eu _disse_ terça, não quarta.          |
| `<b>`      | Destaque visual sem importância extra    | Palavras-chave de um resumo            |
| `<i>`      | Voz ou termo diferente do texto ao redor | Termos estrangeiros, como _firmware_   |

Por padrão, `<strong>` e `<b>` aparecem em negrito, e `<em>` e `<i>` em itálico. A aparência é igual, o significado não: um leitor de tela pode mudar o tom de voz para `<strong>` e `<em>`. Se você quer só negrito por estética, isso é trabalho do CSS.

### Links com `<a>`

O elemento `<a>` (de _anchor_, âncora) cria um link. O destino vai no atributo `href`:

```html
<a href="https://www.exemplo.org/edital.pdf">Edital do processo seletivo</a>
```

O `href` aceita diferentes tipos de endereço:

- **URL absoluta**: o endereço completo, com protocolo e domínio (`https://www.exemplo.org/cursos`). Use para outros sites.
- **URL relativa**: o caminho a partir da página atual (`contato.html`, `cursos/redes.html`, `../index.html`). Use para páginas do mesmo site; ela continua funcionando se o site mudar de domínio.
- **Âncora na mesma página**: `#` seguido do `id` do destino. O link `<a href="#manutencao">` leva ao elemento que tem `id="manutencao"`.
- **E-mail**: `mailto:secretaria@exemplo.org` abre o programa de e-mail.

Para abrir em outra aba, use `target="_blank"` junto com `rel="noopener noreferrer"`. O `rel` impede que a página aberta tenha acesso à página de origem, uma proteção que você deve manter sempre que usar `_blank`.

### O texto do link

O texto entre `<a>` e `</a>` deve dizer para onde o link leva. Quem usa leitor de tela costuma ouvir a lista de links da página fora do contexto; "clique aqui" repetido cinco vezes não informa nada. Compare:

```html
<!-- Ruim: fora do contexto, o link só diz "clique aqui" -->
<p>Para ver o edital, <a href="edital.html">clique aqui</a>.</p>

<!-- Bom: o texto do link diz para onde ele leva -->
<p>Leia o <a href="edital.html">edital do processo seletivo</a>.</p>
```

## Demonstração

A página abaixo usa títulos em três níveis, ênfases com significados diferentes e os quatro tipos de link. O link do sumário leva à seção com o `id` correspondente.

```html arquivo=index.html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Manual da impressora 3D</title>
  </head>
  <body>
    <h1>Manual da impressora 3D</h1>

    <!-- Sumário com âncoras para as seções desta página -->
    <p>Ir para: <a href="#instalacao">Instalação</a> | <a href="#manutencao">Manutenção</a></p>

    <h2 id="instalacao">Instalação</h2>
    <p><strong>Desligue o equipamento da tomada</strong> antes de qualquer montagem.</p>

    <h3>Conteúdo da caixa</h3>
    <p>Mesa aquecida, bico de 0,4 mm e o carretel de <i>filament</i> de teste.</p>

    <h2 id="manutencao">Manutenção</h2>
    <p>Limpe a mesa <em>depois</em> que ela esfriar, nunca durante a impressão.</p>

    <!-- Link absoluto, aberto em outra aba com a proteção do rel -->
    <p>
      Consulte o
      <a href="https://www.exemplo.org/manual.pdf" target="_blank" rel="noopener noreferrer"
        >manual completo do fabricante</a
      >
      ou escreva para <a href="mailto:suporte@exemplo.org">suporte@exemplo.org</a>.
    </p>
  </body>
</html>
```

No resultado, os links do sumário levam às seções. O domínio `exemplo.org` é reservado para documentação; ele não leva a um site real.

## Experimentação

Abra o experimento no editor. Ele tem um texto sobre normas de segurança de um laboratório, sem nenhuma marcação de títulos ou ênfases.

1. Transforme a primeira linha em `<h1>` e as linhas "Antes de entrar" e "Durante a aula" em `<h2>`.
2. Na frase sobre bebidas, marque com `<strong>` a parte que é uma proibição.
3. Dê o atributo `id="durante"` ao título "Durante a aula" e crie, logo abaixo do `<h1>`, um link com `href="#durante"`. Execute e clique nele.
4. Troque um dos `<h2>` por `<h4>` e pense: o que um leitor de tela anunciaria? Desfaça a troca.
5. Reescreva o link "clique aqui" do final com um texto que diga para onde ele leva.

A etapa é concluída quando você executar o experimento.

## Vocabulário

Registre os termos que ainda não domina. Para "URL relativa" e "URL absoluta", invente um exemplo com páginas de um site que você conheça.
