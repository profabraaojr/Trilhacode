import type {
  AssessmentResult,
  TrackDetail,
  TrackSummary,
  UnitPayload,
  UnitSummary,
} from '@trilhacode/content/types';
import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Database } from '../db/client.js';
import { module, track, unit } from '../db/schema.js';

const answersSchema = z.object({ respostas: z.record(z.string(), z.string()) });

type UnitRow = typeof unit.$inferSelect;

const toSummary = (u: UnitRow): UnitSummary => ({
  id: u.id,
  titulo: u.title,
  posicao: u.position,
  nivel: u.level,
  duracaoMinutos: u.durationMinutes,
  objetivos: u.objectives,
  requer: u.requires,
});

const notFound = { erro: 'não encontrado' };

/** Rotas públicas de leitura do conteúdo e de correção das avaliações. */
export async function contentRoutes(app: FastifyInstance, { db }: { db: Database }) {
  app.get('/api/trilhas', async (): Promise<TrackSummary[]> => {
    const tracks = await db
      .select()
      .from(track)
      .where(eq(track.published, true))
      .orderBy(asc(track.title));
    const units = await db
      .select({ id: unit.id, trackId: module.trackId })
      .from(unit)
      .innerJoin(module, eq(unit.moduleId, module.id));
    return tracks.map((t) => ({
      id: t.id,
      titulo: t.title,
      descricao: t.description,
      publico: t.metadata?.publico ?? '',
      nivel: t.metadata?.nivel ?? '',
      duracaoEstimada: t.metadata?.duracaoEstimada ?? '',
      totalUnidades: units.filter((u) => u.trackId === t.id).length,
    }));
  });

  app.get<{ Params: { id: string } }>(
    '/api/trilhas/:id',
    async (req, reply): Promise<TrackDetail | typeof notFound> => {
      const [t] = await db.select().from(track).where(eq(track.id, req.params.id));
      if (!t || !t.published || !t.metadata) return reply.code(404).send(notFound);
      const modules = await db
        .select()
        .from(module)
        .where(eq(module.trackId, t.id))
        .orderBy(asc(module.position));
      const units = await db
        .select({ u: unit })
        .from(unit)
        .innerJoin(module, eq(unit.moduleId, module.id))
        .where(eq(module.trackId, t.id))
        .orderBy(asc(unit.position));
      return {
        id: t.id,
        titulo: t.title,
        descricao: t.description,
        ...t.metadata,
        modulos: modules.map((m) => ({
          id: m.id,
          titulo: m.title,
          descricao: m.description,
          posicao: m.position,
          unidades: units.filter(({ u }) => u.moduleId === m.id).map(({ u }) => toSummary(u)),
        })),
      };
    },
  );

  // O id da unidade contém barras (trilha/modulo/unidade); por isso a rota usa curinga.
  app.get<{ Params: { '*': string } }>(
    '/api/unidades/*',
    async (req, reply): Promise<UnitPayload | typeof notFound> => {
      const [row] = await db
        .select({ u: unit, m: module, t: track })
        .from(unit)
        .innerJoin(module, eq(unit.moduleId, module.id))
        .innerJoin(track, eq(module.trackId, track.id))
        .where(eq(unit.id, req.params['*']));
      if (!row || !row.u.content || !row.t.published) return reply.code(404).send(notFound);
      return {
        ...toSummary(row.u),
        moduloId: row.m.id,
        moduloTitulo: row.m.title,
        trilhaId: row.t.id,
        trilhaTitulo: row.t.title,
        conteudo: row.u.content,
      };
    },
  );

  app.post<{ Params: { '*': string } }>(
    '/api/avaliacoes/*',
    async (req, reply): Promise<AssessmentResult | object> => {
      const parsed = answersSchema.safeParse(req.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ erro: 'Envie { "respostas": { "idDaQuestao": "idDaAlternativa" } }.' });
      const [row] = await db
        .select({ key: unit.answerKey })
        .from(unit)
        .where(eq(unit.id, req.params['*']));
      if (!row?.key) return reply.code(404).send(notFound);

      const { respostas } = parsed.data;
      const questoes = Object.entries(row.key.questoes).map(([id, q]) => {
        const escolhida = respostas[id];
        const respondida = escolhida !== undefined && escolhida in q.feedback;
        return {
          id,
          respondida,
          correta: respondida && escolhida === q.correta,
          feedback: respondida ? q.feedback[escolhida]! : 'Questão sem resposta.',
        };
      });
      const acertos = questoes.filter((q) => q.correta).length;
      const nota = questoes.length ? Math.round((acertos / questoes.length) * 100) : 0;
      return {
        nota,
        notaMinima: row.key.notaMinima,
        aprovado: nota >= row.key.notaMinima,
        acertos,
        total: questoes.length,
        questoes,
      };
    },
  );
}
