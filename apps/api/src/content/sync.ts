/**
 * Copia o conteúdo de content/ para o banco.
 * Uso: pnpm content:sync  (ou tsx src/content/sync.ts <pasta-content>)
 *
 * Insere ou atualiza trilhas, módulos e unidades pelo id estável e remove os que
 * deixaram de existir. Tudo acontece em uma transação: com erro, nada muda.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent, type CompiledTrack } from '@trilhacode/content';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { module, track, unit } from '../db/schema.js';

export interface SyncSummary {
  tracks: number;
  modules: number;
  units: number;
  removedUnits: number;
}

export interface SyncOptions {
  /**
   * Remove do banco as trilhas que não estão na lista (padrão: false).
   * O comando content:sync usa true, pois lê a pasta content/ inteira.
   * Módulos e unidades que saíram de uma trilha sincronizada são sempre removidos.
   */
  pruneTracks?: boolean;
}

export async function syncContent(
  db: Database,
  tracks: CompiledTrack[],
  options: SyncOptions = {},
): Promise<SyncSummary> {
  return db.transaction(async (tx) => {
    const trackIds = tracks.map((t) => t.id);
    const moduleIds = tracks.flatMap((t) => t.modulos.map((m) => m.id));
    const unitIds = tracks.flatMap((t) => t.modulos.flatMap((m) => m.unidades.map((u) => u.id)));

    for (const t of tracks) {
      const { id, titulo, descricao } = t;
      const metadata = {
        publico: t.publico,
        nivel: t.nivel,
        duracaoEstimada: t.duracaoEstimada,
        objetivos: t.objetivos,
        prerequisitos: t.prerequisitos,
        requerTrilhas: t.requerTrilhas,
      };
      await tx
        .insert(track)
        .values({ id, title: titulo, description: descricao, published: true, metadata })
        .onConflictDoUpdate({
          target: track.id,
          set: {
            title: titulo,
            description: descricao,
            published: true,
            metadata,
            updatedAt: sql`now()`,
          },
        });
      for (const m of t.modulos) {
        await tx
          .insert(module)
          .values({
            id: m.id,
            trackId: t.id,
            title: m.titulo,
            description: m.descricao,
            position: m.posicao,
          })
          .onConflictDoUpdate({
            target: module.id,
            set: {
              trackId: t.id,
              title: m.titulo,
              description: m.descricao,
              position: m.posicao,
              updatedAt: sql`now()`,
            },
          });
        for (const u of m.unidades) {
          const values = {
            moduleId: m.id,
            title: u.titulo,
            position: u.posicao,
            level: u.nivel,
            durationMinutes: u.duracaoMinutos,
            objectives: u.objetivos,
            requires: u.requer,
            content: u.conteudo,
            answerKey: u.gabarito,
          };
          await tx
            .insert(unit)
            .values({ id: u.id, ...values })
            .onConflictDoUpdate({ target: unit.id, set: { ...values, updatedAt: sql`now()` } });
        }
      }
    }

    let removedUnits = 0;
    if (trackIds.length) {
      const stale = await tx
        .select({ id: unit.id })
        .from(unit)
        .innerJoin(module, eq(unit.moduleId, module.id))
        .where(
          and(
            inArray(module.trackId, trackIds),
            unitIds.length ? notInArray(unit.id, unitIds) : undefined,
          ),
        );
      if (stale.length) {
        await tx.delete(unit).where(
          inArray(
            unit.id,
            stale.map((r) => r.id),
          ),
        );
        removedUnits = stale.length;
      }
      await tx
        .delete(module)
        .where(
          and(
            inArray(module.trackId, trackIds),
            moduleIds.length ? notInArray(module.id, moduleIds) : undefined,
          ),
        );
    }
    if (options.pruneTracks) {
      // unidades e módulos dessas trilhas saem em cascata
      await tx.delete(track).where(trackIds.length ? notInArray(track.id, trackIds) : undefined);
    }

    return {
      tracks: trackIds.length,
      modules: moduleIds.length,
      units: unitIds.length,
      removedUnits,
    };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadEnv } = await import('../env.js');
  const { createDb } = await import('../db/client.js');
  const dir = resolve(process.argv[2] ?? '../../content');
  const { tracks, errors } = compileContent(dir);
  if (errors.length) {
    console.error(
      `Conteúdo inválido (${errors.length} problema(s)); nada foi alterado no banco:\n`,
    );
    for (const e of errors) console.error(`  ${e.file}\n    ${e.message}\n`);
    process.exit(1);
  }
  const { db, pool } = createDb(loadEnv().DATABASE_URL);
  try {
    const s = await syncContent(db, tracks, { pruneTracks: true });
    console.log(
      `Conteúdo sincronizado: ${s.tracks} trilha(s), ${s.modules} módulo(s), ${s.units} unidade(s)` +
        (s.removedUnits ? `; ${s.removedUnits} unidade(s) removida(s).` : '.'),
    );
  } finally {
    await pool.end();
  }
}
