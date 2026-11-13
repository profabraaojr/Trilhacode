import { defaultClientConditions, defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Em desenvolvimento o Vite injeta o próprio cliente na página, que escreveria
 * "[vite] connected" no console do aluno. O sandbox não usa recarga automática.
 */
const withoutViteClient = (): Plugin => ({
  name: 'trilhacode:sem-cliente-vite',
  apply: 'serve',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html.replace(/<script type="module" src="\/@vite\/client"><\/script>\s*/, ''),
  },
});

export default defineConfig({
  plugins: [viteSingleFile(), withoutViteClient()],
  resolve: { conditions: ['source', ...defaultClientConditions] },
  server: {
    port: 5174,
    strictPort: true,
    // O iframe tem origem opaca ("null"); em desenvolvimento os módulos do Vite
    // precisam de CORS liberado para carregar. O build final é um HTML único, sem essa necessidade.
    cors: { origin: '*' },
    hmr: false,
  },
  preview: { port: 4174, strictPort: true },
});
