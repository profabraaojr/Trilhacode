/**
 * Testes de integração com PostgreSQL real.
 * Rodam quando DATABASE_URL está definida (CI e ambiente local com o banco ativo);
 * caso contrário são pulados e o motivo aparece no relatório.
 */
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, pingDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { module, track, unit, unitProgress, user } from '../src/db/schema.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('banco de dados (integração)', () => {
  const { db, pool } = createDb(url ?? '');

  beforeAll(async () => {
    await runMigrations(url!);
    // aplicar duas vezes não deve falhar
    await runMigrations(url!);
  });

  afterAll(async () => {
    await db.delete(track).where(eq(track.id, 'teste-trilha'));
    await db.delete(user).where(eq(user.id, 'teste-aluno'));
    await pool.end();
  });

  it('responde ao ping', async () => {
    expect(await pingDatabase(pool)).toBe(true);
  });

  it('cria as tabelas previstas', async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = rows.rows.map((r) => r.table_name);
    for (const t of [
      'user',
      'session',
      'account',
      'verification',
      'track',
      'track_prerequisite',
      'module',
      'unit',
      'unit_progress',
    ]) {
      expect(names).toContain(t);
    }
  });

  it('registra progresso de um aluno em uma etapa e remove em cascata', async () => {
    await db
      .insert(user)
      .values({ id: 'teste-aluno', name: 'Aluno Teste', email: 'aluno@teste.invalid' });
    await db.insert(track).values({ id: 'teste-trilha', title: 'Trilha de teste' });
    await db
      .insert(module)
      .values({ id: 'teste-trilha/m1', trackId: 'teste-trilha', title: 'M1', position: 1 });
    await db
      .insert(unit)
      .values({ id: 'teste-trilha/m1/u1', moduleId: 'teste-trilha/m1', title: 'U1', position: 1 });
    await db
      .insert(unitProgress)
      .values({ userId: 'teste-aluno', unitId: 'teste-trilha/m1/u1', step: 'apresentacao' });

    const [saved] = await db
      .select()
      .from(unitProgress)
      .where(eq(unitProgress.userId, 'teste-aluno'));
    expect(saved).toMatchObject({ step: 'apresentacao', status: 'in_progress', completedAt: null });
    const [created] = await db.select().from(user).where(eq(user.id, 'teste-aluno'));
    expect(created?.role).toBe('aluno');

    await db.delete(track).where(eq(track.id, 'teste-trilha'));
    const left = await db.select().from(unitProgress).where(eq(unitProgress.userId, 'teste-aluno'));
    expect(left).toHaveLength(0);
  });

  it('rejeita etapa pedagógica inexistente', async () => {
    await expect(db.execute(sql`select 'inventada'::unit_step`)).rejects.toThrow();
  });
});
