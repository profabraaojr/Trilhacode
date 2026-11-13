import type { ProjectFile } from '@trilhacode/runners';

export type { ProjectFile };

/** Arquivo de entrada: é o que o sandbox abre ao executar. */
export const ENTRY_FILE = 'index.html';
export const ALLOWED_EXTENSIONS = ['html', 'css', 'js'] as const;
export type FileLanguage = 'html' | 'css' | 'javascript';

export function languageFor(name: string): FileLanguage {
  if (name.endsWith('.css')) return 'css';
  if (name.endsWith('.js')) return 'javascript';
  return 'html';
}

export const LANGUAGE_LABEL: Record<FileLanguage, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
};

/** Devolve a mensagem de erro, ou null se o nome for válido. */
export function validateFileName(
  name: string,
  existing: readonly string[],
  current?: string,
): string | null {
  const n = name.trim();
  if (!n) return 'Digite um nome para o arquivo.';
  if (n.length > 60) return 'Use no máximo 60 caracteres.';
  if (/[\\/]/.test(n)) return 'Pastas ainda não são suportadas: use um nome sem "/".';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(n))
    return 'Use apenas letras sem acento, números, ponto, hífen e sublinhado, começando por letra ou número.';
  const ext = n.split('.').pop()?.toLowerCase();
  if (!n.includes('.') || !ext || !(ALLOWED_EXTENSIONS as readonly string[]).includes(ext))
    return 'O arquivo precisa terminar em .html, .css ou .js.';
  if (n !== current && existing.some((e) => e.toLowerCase() === n.toLowerCase()))
    return `Já existe um arquivo chamado ${n}.`;
  return null;
}

export const DEFAULT_FILES: ProjectFile[] = [
  {
    name: 'index.html',
    content: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu primeiro projeto</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Olá, TrilhaCode!</h1>
    <p>Edite os arquivos ao lado e veja o resultado aqui.</p>
    <button id="botao">Clique em mim</button>
    <p id="mensagem"></p>

    <script src="script.js"></script>
  </body>
</html>
`,
  },
  {
    name: 'style.css',
    content: `body {
  font-family: system-ui, sans-serif;
  margin: 2rem;
  line-height: 1.5;
}

h1 {
  color: #0f766e;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
`,
  },
  {
    name: 'script.js',
    content: `const botao = document.querySelector('#botao');
const mensagem = document.querySelector('#mensagem');
let cliques = 0;

botao.addEventListener('click', () => {
  cliques++;
  mensagem.textContent = \`Você clicou \${cliques} vez(es).\`;
  console.log('Cliques:', cliques);
});

console.log('O script foi carregado.');
`,
  },
];

export function templateFor(name: string): string {
  switch (languageFor(name)) {
    case 'css':
      return '/* Estilos */\n';
    case 'javascript':
      return '// JavaScript\n';
    default:
      return '<!doctype html>\n<html lang="pt-BR">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Página</title>\n  </head>\n  <body>\n\n  </body>\n</html>\n';
  }
}
