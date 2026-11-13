import { createDb, pingDatabase } from './db/client.js';
import { loadEnv } from './env.js';
import { buildServer } from './server.js';

const env = loadEnv();
const { pool } = createDb(env.DATABASE_URL);

const app = await buildServer({
  checkDatabase: () => pingDatabase(pool),
  webOrigin: env.WEB_ORIGIN,
  logger: { level: 'info' },
});

async function shutdown(signal: string) {
  app.log.info(`Recebido ${signal}, encerrando.`);
  await app.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await app.listen({ port: env.API_PORT, host: env.API_HOST });
