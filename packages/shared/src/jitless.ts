import { config } from 'zod';

// No navegador, os validadores não são compilados com new Function: a
// Content-Security-Policy da interface não permite 'unsafe-eval'. Este módulo é o
// primeiro importado pelo pacote, antes de qualquer schema ser criado.
if (typeof (globalThis as { document?: unknown }).document !== 'undefined')
  config({ jitless: true });
