/**
 * Define o papel de um usuário já cadastrado.
 * Uso: pnpm admin:criar <email>            (torna administrador)
 *      pnpm admin:papel <email> <papel>    (aluno, professor ou admin)
 */
import { USER_ROLES, type UserRole } from '@trilhacode/shared';
import { eq } from 'drizzle-orm';
import { createDb } from '../db/client.js';
import { user } from '../db/schema.js';
import { loadEnv } from '../env.js';

const [email, roleArg = 'admin'] = process.argv.slice(2);
if (!email || !(USER_ROLES as readonly string[]).includes(roleArg)) {
  console.error(
    `Uso: pnpm admin:criar <email>  ou  pnpm admin:papel <email> <${USER_ROLES.join('|')}>`,
  );
  process.exit(2);
}

const { db, pool } = createDb(loadEnv().DATABASE_URL);
try {
  const updated = await db
    .update(user)
    .set({ role: roleArg as UserRole })
    .where(eq(user.email, email.trim().toLowerCase()))
    .returning({ name: user.name, emailVerified: user.emailVerified });
  if (!updated.length) {
    console.error(
      `Nenhuma conta com o e-mail ${email}. Cadastre-se primeiro pela plataforma e rode o comando de novo.`,
    );
    process.exitCode = 1;
  } else {
    const u = updated[0]!;
    console.log(`${u.name} (${email}) agora tem o papel "${roleArg}".`);
    if (!u.emailVerified)
      console.log(
        'Atenção: o e-mail desta conta ainda não foi confirmado; o login só funciona depois da confirmação.',
      );
  }
} finally {
  await pool.end();
}
