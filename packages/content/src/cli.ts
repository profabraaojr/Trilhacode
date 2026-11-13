/**
 * Uso:
 *   tsx src/cli.ts validate <pasta-content>   valida o conteúdo e mostra os erros
 *   tsx src/cli.ts links <pasta-content>      verifica se os links respondem
 */
import { resolve } from 'node:path';
import { collectLinks, compileContent } from './load.js';

const [command, dirArg] = process.argv.slice(2);
const dir = resolve(dirArg ?? 'content');
const { tracks, errors } = compileContent(dir);

if (errors.length > 0) {
  console.error(`Conteúdo inválido (${errors.length} problema${errors.length > 1 ? 's' : ''}):\n`);
  for (const e of errors) console.error(`  ${e.file}\n    ${e.message}\n`);
  process.exit(1);
}

const units = tracks.reduce(
  (n, t) => n + t.modulos.reduce((m, mod) => m + mod.unidades.length, 0),
  0,
);

if (command === 'validate') {
  console.log(`Conteúdo válido: ${tracks.length} trilha(s), ${units} unidade(s).`);
} else if (command === 'links') {
  const links = collectLinks(tracks);
  let failures = 0;
  for (const { unit, url } of links) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        failures++;
        console.error(`FALHOU ${res.status}  ${url}  (${unit})`);
      } else console.log(`ok   ${url}`);
    } catch (e) {
      failures++;
      console.error(`FALHOU ${(e as Error).message}  ${url}  (${unit})`);
    }
  }
  console.log(`\n${links.length - failures} de ${links.length} links responderam.`);
  if (failures) process.exit(1);
} else {
  console.error('Comandos: validate, links');
  process.exit(2);
}
