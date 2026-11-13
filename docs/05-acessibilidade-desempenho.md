# Acessibilidade e desempenho

Medições da Etapa 7. A meta de acessibilidade é a WCAG 2.2 nível AA.

## Verificação automática (axe-core)

O teste `apps/web/e2e/acessibilidade.spec.ts` roda o axe-core com as regras de WCAG 2.0, 2.1 e 2.2, níveis A e AA, nas telas principais, nos três tamanhos de tela (computador, tablet e celular):

- tela inicial;
- mapa da trilha;
- unidade (apresentação, vocabulário com o formulário do glossário aberto, avaliação);
- Conta (sem login e com login);
- Meu Glossário com o formulário de novo termo;
- Minha evolução e o histórico completo;
- página de privacidade.

Ficam fora da verificação o editor Monaco (componente de terceiros, com acessibilidade própria) e o resultado no sandbox (código do aluno, em outra origem). O teste roda na CI e falha com qualquer violação.

### Problemas encontrados e corrigidos

| Problema                                                                    | Critério     | Correção                                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Botões de fechar dentro da lista de abas (um `tablist` só pode conter abas) | 1.3.1, 4.1.2 | O botão de fechar ficou fora da árvore de acessibilidade, e a aba fecha pela tecla Delete, anunciada com `aria-keyshortcuts`. O clique continua funcionando. |
| Itens do console sem lista (o `role="log"` substituía a semântica do `ol`)  | 1.3.1        | A região `log` passou a envolver a lista.                                                                                                                    |
| Botões de fechar com 22 × 22 px                                             | 2.5.8        | Alvo de 24 × 24 px.                                                                                                                                          |
| Nome dos cartões do mapa diferente do texto visível                         | 2.5.3        | O nome lido passou a ser o próprio texto visível, com o título primeiro.                                                                                     |
| Termos sugeridos com `dt` fora da estrutura da lista de definições          | 1.3.1        | Estrutura `dl > div > dt + dd` corrigida.                                                                                                                    |

## Revisão manual

O axe encontra parte dos problemas; outros só aparecem com uso real. Já verificado nos testes automatizados ou durante o desenvolvimento:

- Todas as ações da interface funcionam por teclado (os testes no navegador usam papéis e nomes acessíveis, não seletores visuais), incluindo fechar abas com Delete.
- Foco visível em todos os controles (`:focus-visible` com contorno de 2 px).
- Formulários com rótulos associados; erros anunciados com `role="alert"`; avisos do glossário ligados ao campo por `aria-describedby`.
- Contraste mínimo AA nos temas claro e escuro (tokens em `packages/ui/src/tokens.css`).
- Layout para celular com abas Conteúdo, Código e Resultado, testado com a largura de 412 px (perfil Pixel 7 dos testes). Larguras menores, até 320 px, ainda não foram verificadas.

Ainda **não** foi feita uma sessão com leitor de tela (NVDA no Windows, VoiceOver no macOS ou TalkBack no Android) por pessoas que usam essas tecnologias no dia a dia. Recomendamos fazê-la antes de usar a plataforma com estudantes com deficiência visual, seguindo este roteiro:

1. Criar a conta e confirmar o e-mail.
2. Abrir uma trilha, navegar pelo mapa e abrir uma unidade.
3. Percorrer as sete etapas, registrar um termo no glossário e responder à avaliação.
4. Abrir, editar e executar um arquivo e ler as mensagens do console.
5. Como professor: criar uma turma, importar alunos e consultar o painel.

Relatos podem ser enviados como issue no repositório.

## Desempenho (Lighthouse 12)

Medido em 13/11/2026 na página inicial, com as imagens Docker de produção (Caddy com compressão zstd/gzip), num servidor local:

| Perfil                                   | Desempenho | Acessibilidade | Boas práticas | SEO |
| ---------------------------------------- | ---------- | -------------- | ------------- | --- |
| Celular (4G simulado, CPU 4× mais lenta) | 90         | 100            | 100           | 100 |
| Computador                               | 100        | 100            | 100           | 100 |

No celular: primeiro conteúdo em 2,8 s, maior conteúdo em 2,9 s, bloqueio total de 20 ms e deslocamento de layout de 0,021. No computador: 0,6 s, 0,7 s, 0 ms e 0,001.

Antes das correções desta etapa, o desempenho no celular era 46. O principal ganho veio de carregar o editor Monaco (cerca de 2,7 MB, mais os workers de linguagem) só quando um arquivo é aberto pela primeira vez, e não na abertura da página. Também deixou de aparecer um erro 401 no console para visitantes sem login (`GET /api/sessao`).

Para repetir a medição:

```bash
npx lighthouse@12 https://seu-endereco/ --view
```
