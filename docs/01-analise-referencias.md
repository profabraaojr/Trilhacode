# Análise das referências: LiveCodes e Roadmap.sh

Data da verificação: 13/11/2026. As licenças foram lidas diretamente dos repositórios oficiais; os demais dados vêm da documentação publicada em cada projeto.

## Síntese

|                       | LiveCodes                                            | Roadmap.sh                                                   |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Repositório           | `live-codes/livecodes`                               | `kamranahmedse/developer-roadmap`                            |
| Licença               | MIT                                                  | Licença própria, restritiva (todos os direitos reservados)   |
| Pode ser reutilizado? | Sim: código, build e SDK, com aviso de copyright     | Não: nem textos, nem imagens, nem arquivos do projeto        |
| O que aproveitamos    | Componente técnico (execução de código no navegador) | Apenas a ideia de organização (mapa de nós com dependências) |

A diferença de licença define a estratégia: o LiveCodes pode entrar na plataforma como dependência; o Roadmap.sh só pode servir de inspiração conceitual.

## 1. LiveCodes

### O que é

Um playground de código que roda inteiramente no navegador. Editores, compiladores, formatadores e execução acontecem no cliente; não há execução de código no servidor. A documentação lista suporte a dezenas de linguagens, compiladas no navegador (por exemplo, Python via Pyodide e C via WebAssembly).

### Recursos relevantes para o projeto

- **SDK `livecodes` (npm, MIT, v0.14.1):** cria playgrounds embutidos e expõe métodos como `setConfig`, `getCode`, `runTests`, `format` e leitura do console.
- **Modo headless:** o SDK funciona sem interface visível, o que permite usar a engine do LiveCodes com uma interface própria.
- **`runTests`:** executa testes sobre o código do aluno. Serve de base para a correção automática de desafios.
- **Auto-hospedagem:** o build é estático e pode ser servido por qualquer servidor de arquivos ou CDN. Há uma configuração Docker para recursos de servidor, incluindo uma origem separada para o sandbox.
- **Segurança:** o código do usuário roda em iframes com `sandbox`, em origem diferente da aplicação principal, e a comunicação usa `postMessage` com verificação de origem.

### Limites e cuidados

- O app hospedado em livecodes.io é um serviço de terceiros. Para uso escolar, com dados de menores, a plataforma deve usar uma **instância própria**, sem depender da disponibilidade ou das políticas de livecodes.io.
- A interface do LiveCodes tem identidade própria. Embutida diretamente, ela não teria o visual de VS Code nem o explorador de arquivos e o painel de trilhas integrados que o projeto pede.
- O SDK ainda está na série 0.x; a API pode mudar entre versões. Precisamos isolar o uso atrás de um adaptador.

### Conclusão

Vale aproveitar o LiveCodes como **motor de execução para linguagens além de HTML, CSS e JavaScript**, auto-hospedado e acessado por um adaptador. Para HTML, CSS e JavaScript, um executor próprio em iframe isolado é simples, sem dependência externa, e nos dá controle total do console e dos testes. A obrigação legal é manter o aviso de copyright e o texto da licença MIT no repositório (arquivo `THIRD_PARTY_NOTICES.md`).

## 2. Roadmap.sh

### O que é

Um conjunto de roteiros de estudo para carreiras e tecnologias, apresentados como mapas interativos: cada nó é um tópico, clicável, com explicação e links, e o usuário marca o que já estudou.

### O que a licença diz

O arquivo `license` do repositório afirma que todo o conteúdo, incluindo textos e imagens, é protegido por direitos autorais. O uso permitido é pessoal; é vedado publicar as imagens, os arquivos do projeto ou o conteúdo dos mapas em qualquer formato, digital ou não, sem consentimento prévio do autor. A única exceção são forks feitos pelo botão do GitHub com a finalidade de contribuir com o próprio projeto.

### Consequências práticas

- **Não podemos** importar os arquivos JSON dos mapas, copiar a sequência de tópicos de um roadmap, traduzir seus textos ou reproduzir o desenho dos mapas.
- **Podemos** adotar a ideia geral, que não é protegida por direito autoral: trilhas representadas como grafo de tópicos com pré-requisitos, marcação de progresso e níveis. Essa forma de organizar currículos é anterior ao Roadmap.sh e comum em design instrucional.
- **Podemos** colocar link para roadmap.sh como leitura complementar, já que a licença permite compartilhar links.
- Todo o conteúdo das trilhas será **autoral**, escrito pela equipe do projeto, ou derivado de fontes com licença aberta compatível (por exemplo, MDN Web Docs, cujo conteúdo textual está sob CC-BY-SA 2.5), com atribuição.

Se houver interesse em usar conteúdo do Roadmap.sh, o caminho é pedir autorização formal ao autor. Este plano não depende disso.

## 3. O que cada referência inspira

| Necessidade do projeto          | Origem da solução                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Editor com visual de VS Code    | Monaco Editor (MIT), o mesmo editor usado no VS Code. O LiveCodes também usa Monaco, mas usá-lo diretamente nos dá a interface completa.                           |
| Execução segura no navegador    | Padrão do LiveCodes: iframe `sandbox` em origem separada + `postMessage`. Implementação própria para HTML/CSS/JS; LiveCodes auto-hospedado para outras linguagens. |
| Correção automática de desafios | Testes executados no sandbox (próprios) e `runTests` do SDK (para linguagens via LiveCodes).                                                                       |
| Mapa visual da jornada          | Ideia de grafo de tópicos; renderização própria com React Flow (`@xyflow/react`, MIT). Conteúdo autoral.                                                           |
| Marcação de progresso           | Ideia geral do Roadmap.sh, com modelo pedagógico próprio (etapas, glossário, avaliação).                                                                           |
