/**
 * Lê a pasta content/, valida cada arquivo e produz o conteúdo compilado.
 * Os erros vêm com o caminho do arquivo e o campo, para o autor corrigir sem
 * precisar ler o código da plataforma.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';
import {
  assessmentFileSchema,
  challengeFileSchema,
  moduleFileSchema,
  trackFileSchema,
  UNIT_SECTIONS,
  unitFrontmatterSchema,
} from './schema.js';
import { extractFencedFiles, renderInline, renderMarkdown } from './markdown.js';
import type {
  AnswerKey,
  CompiledModule,
  CompiledTrack,
  CompiledUnit,
  ContentFile,
  PublicQuestion,
} from './types.js';

export interface ContentError {
  file: string;
  message: string;
}

export interface CompileResult {
  tracks: CompiledTrack[];
  errors: ContentError[];
}

const ORDERED_DIR = /^(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(html|css|js)$/;

class Collector {
  errors: ContentError[] = [];
  constructor(private root: string) {}
  add(path: string, message: string) {
    this.errors.push({ file: relative(this.root, path) || path, message });
  }
  zod<T>(path: string, schema: z.ZodType<T>, data: unknown): T | null {
    const r = schema.safeParse(data);
    if (r.success) return r.data;
    for (const issue of r.error.issues) {
      const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
      this.add(path, `${where}${issue.message}`);
    }
    return null;
  }
}

function readYaml(c: Collector, path: string): unknown {
  if (!existsSync(path)) {
    c.add(path, 'arquivo obrigatório não encontrado');
    return undefined;
  }
  try {
    return parseYaml(readFileSync(path, 'utf8'));
  } catch (e) {
    c.add(path, `YAML inválido: ${(e as Error).message}`);
    return undefined;
  }
}

function orderedDirs(
  c: Collector,
  dir: string,
): { path: string; position: number; slug: string }[] {
  const out: { path: string; position: number; slug: string }[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (['experimento', 'desafio'].includes(name)) continue;
    const m = ORDERED_DIR.exec(name);
    if (!m) {
      c.add(path, 'nome de pasta deve seguir o padrão "01-nome-em-minusculas"');
      continue;
    }
    out.push({ path, position: Number(m[1]), slug: m[2]! });
  }
  out.sort((a, b) => a.position - b.position);
  for (let i = 1; i < out.length; i++) {
    if (out[i]!.position === out[i - 1]!.position) c.add(out[i]!.path, 'número de ordem repetido');
  }
  return out;
}

function readFilesDir(c: Collector, dir: string, required: boolean): ContentFile[] {
  if (!existsSync(dir)) {
    if (required) c.add(dir, 'pasta obrigatória não encontrada (precisa ter ao menos index.html)');
    return [];
  }
  const files: ContentFile[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!FILE_NAME.test(name)) {
      c.add(join(dir, name), 'apenas arquivos .html, .css e .js, com nome sem acentos ou espaços');
      continue;
    }
    files.push({ name, content: readFileSync(join(dir, name), 'utf8') });
  }
  if (required && !files.some((f) => f.name === 'index.html'))
    c.add(dir, 'falta o arquivo index.html');
  // index.html primeiro, para abrir nesta ordem no editor
  return files.sort((a, b) => (a.name === 'index.html' ? -1 : b.name === 'index.html' ? 1 : 0));
}

function splitFrontmatter(
  c: Collector,
  path: string,
  raw: string,
): { data: unknown; body: string } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) {
    c.add(path, 'o arquivo deve começar com um cabeçalho YAML entre linhas "---"');
    return null;
  }
  try {
    return { data: parseYaml(m[1]!), body: raw.slice(m[0].length) };
  } catch (e) {
    c.add(path, `cabeçalho YAML inválido: ${(e as Error).message}`);
    return null;
  }
}

type SectionId = keyof typeof UNIT_SECTIONS;
const REQUIRED_SECTIONS: SectionId[] = [
  'apresentacao',
  'fundamentacao',
  'demonstracao',
  'experimentacao',
];

function splitSections(
  c: Collector,
  path: string,
  body: string,
): Partial<Record<SectionId, string>> | null {
  const byHeading = new Map<string, SectionId>(
    Object.entries(UNIT_SECTIONS).map(([id, label]) => [label.toLowerCase(), id as SectionId]),
  );
  const out: Partial<Record<SectionId, string>> = {};
  const parts = body.split(/^## +(.+?)\s*$/m);
  if (parts[0]!.trim()) c.add(path, 'há texto antes da primeira seção (## Apresentação)');
  let ok = true;
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i]!.trim();
    const id = byHeading.get(heading.toLowerCase());
    if (!id) {
      c.add(
        path,
        `seção desconhecida "## ${heading}". Use: ${Object.values(UNIT_SECTIONS).join(', ')}`,
      );
      ok = false;
      continue;
    }
    if (out[id] !== undefined) c.add(path, `seção "## ${heading}" repetida`);
    out[id] = parts[i + 1] ?? '';
  }
  for (const id of REQUIRED_SECTIONS) {
    if (!out[id]?.trim()) {
      c.add(path, `falta a seção "## ${UNIT_SECTIONS[id]}"`);
      ok = false;
    }
  }
  return ok ? out : null;
}

const letter = (i: number) => String.fromCharCode(97 + i);

/** Hash simples e estável (FNV-1a) para semear o embaralhamento. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Embaralha de forma determinística: a mesma questão sai sempre na mesma ordem
 * (o gabarito continua válido entre sincronizações), mas a posição da alternativa
 * correta deixa de seguir o padrão em que o autor escreveu.
 */
export function stableShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let state = hash(seed) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function compileUnit(
  c: Collector,
  dir: string,
  id: string,
  position: number,
): (Omit<CompiledUnit, 'requer'> & { requerRel?: string[] }) | null {
  const mdPath = join(dir, 'unidade.md');
  if (!existsSync(mdPath)) {
    c.add(mdPath, 'arquivo obrigatório não encontrado');
    return null;
  }
  const split = splitFrontmatter(c, mdPath, readFileSync(mdPath, 'utf8'));
  if (!split) return null;
  const meta = c.zod(mdPath, unitFrontmatterSchema, split.data);
  const sections = splitSections(c, mdPath, split.body);

  const challengePath = join(dir, 'desafio.yaml');
  const challenge = c.zod(challengePath, challengeFileSchema, readYaml(c, challengePath));
  const assessmentPath = join(dir, 'avaliacao.yaml');
  const assessment = c.zod(assessmentPath, assessmentFileSchema, readYaml(c, assessmentPath));
  const experimentFiles = readFilesDir(c, join(dir, 'experimento'), true);
  const challengeFiles = readFilesDir(c, join(dir, 'desafio'), true);

  if (!meta || !sections || !challenge || !assessment) return null;

  const questoes: PublicQuestion[] = [];
  const gabarito: AnswerKey = { notaMinima: assessment.notaMinima, questoes: {} };
  for (const q of assessment.questoes) {
    const ordered = q.manterOrdem ? q.alternativas : stableShuffle(q.alternativas, `${id}#${q.id}`);
    const alternativas = ordered.map((a, i) => ({
      id: letter(i),
      textoHtml: renderInline(a.texto),
    }));
    questoes.push({
      id: q.id,
      tipo: q.tipo,
      enunciadoHtml: renderMarkdown(q.enunciado),
      ...(q.codigo ? { codigo: q.codigo } : {}),
      alternativas,
    });
    gabarito.questoes[q.id] = {
      correta: letter(ordered.findIndex((a) => a.correta)),
      feedback: Object.fromEntries(ordered.map((a, i) => [letter(i), a.feedback])),
    };
  }

  return {
    id,
    titulo: meta.titulo,
    posicao: position,
    nivel: meta.nivel,
    duracaoMinutos: meta.duracaoMinutos,
    objetivos: meta.objetivos,
    requerRel: meta.requer,
    gabarito,
    conteudo: {
      etapas: {
        apresentacao: { html: renderMarkdown(sections.apresentacao!) },
        fundamentacao: { html: renderMarkdown(sections.fundamentacao!) },
        demonstracao: {
          html: renderMarkdown(sections.demonstracao!),
          arquivos: extractFencedFiles(sections.demonstracao!),
        },
        experimentacao: {
          html: renderMarkdown(sections.experimentacao!),
          arquivos: experimentFiles,
        },
        vocabulario: { html: renderMarkdown(sections.vocabulario ?? ''), termos: meta.termos },
        desafio: {
          html: renderMarkdown(challenge.enunciado),
          arquivos: challengeFiles,
          testes: challenge.testes,
        },
        avaliacao: { notaMinima: assessment.notaMinima, questoes },
      },
      leituraComplementar: meta.leituraComplementar,
    },
  };
}

function compileTrack(c: Collector, dir: string, trackId: string): CompiledTrack | null {
  const trackPath = join(dir, 'trilha.yaml');
  const meta = c.zod(trackPath, trackFileSchema, readYaml(c, trackPath));
  const modules: CompiledModule[] = [];
  const pending: { unit: Omit<CompiledUnit, 'requer'> & { requerRel?: string[] }; path: string }[] =
    [];

  for (const m of orderedDirs(c, dir)) {
    const modPath = join(m.path, 'modulo.yaml');
    const modMeta = c.zod(modPath, moduleFileSchema, readYaml(c, modPath));
    const moduleId = `${trackId}/${m.slug}`;
    const units: CompiledUnit[] = [];
    for (const u of orderedDirs(c, m.path)) {
      const unit = compileUnit(c, u.path, `${moduleId}/${u.slug}`, u.position);
      if (unit) {
        pending.push({ unit, path: join(u.path, 'unidade.md') });
        units.push(unit as CompiledUnit);
      }
    }
    if (units.length === 0) c.add(m.path, 'o módulo não tem nenhuma unidade válida');
    if (modMeta)
      modules.push({
        id: moduleId,
        titulo: modMeta.titulo,
        descricao: modMeta.descricao,
        posicao: m.position,
        unidades: units,
      });
  }

  // Pré-requisitos: por padrão, a unidade anterior na trilha.
  const allIds = new Set(pending.map((p) => p.unit.id));
  pending.forEach(({ unit, path }, i) => {
    const target = unit as CompiledUnit & { requerRel?: string[] };
    if (target.requerRel) {
      target.requer = target.requerRel.map((rel) => `${trackId}/${rel}`);
      for (const r of target.requer) {
        if (!allIds.has(r)) c.add(path, `requer: a unidade "${r}" não existe nesta trilha`);
        if (r === unit.id) c.add(path, 'requer: a unidade não pode depender de si mesma');
      }
    } else {
      target.requer = i > 0 ? [pending[i - 1]!.unit.id] : [];
    }
    delete target.requerRel;
  });

  if (!meta || modules.length === 0) {
    if (modules.length === 0) c.add(dir, 'a trilha não tem nenhum módulo válido');
    return null;
  }
  return {
    id: trackId,
    titulo: meta.titulo,
    descricao: meta.descricao,
    publico: meta.publico,
    nivel: meta.nivel,
    duracaoEstimada: meta.duracaoEstimada,
    objetivos: meta.objetivos,
    prerequisitos: meta.prerequisitos,
    requerTrilhas: meta.requerTrilhas,
    modulos: modules,
  };
}

export function compileContent(root: string): CompileResult {
  const c = new Collector(root);
  const tracksDir = join(root, 'trilhas');
  if (!existsSync(tracksDir)) {
    c.add(tracksDir, 'pasta "trilhas" não encontrada');
    return { tracks: [], errors: c.errors };
  }
  const tracks: CompiledTrack[] = [];
  for (const name of readdirSync(tracksDir).sort()) {
    const path = join(tracksDir, name);
    if (!statSync(path).isDirectory()) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      c.add(path, 'o nome da pasta da trilha deve ter só letras minúsculas, números e hífen');
      continue;
    }
    const t = compileTrack(c, path, name);
    if (t) tracks.push(t);
  }
  const trackIds = new Set(tracks.map((t) => t.id));
  for (const t of tracks) {
    for (const r of t.requerTrilhas) {
      if (!trackIds.has(r))
        c.add(join(tracksDir, t.id, 'trilha.yaml'), `requerTrilhas: a trilha "${r}" não existe`);
    }
  }
  return { tracks, errors: c.errors };
}

/** Todos os links de leitura complementar e dos textos, para verificação. */
export function collectLinks(tracks: CompiledTrack[]): { unit: string; url: string }[] {
  const out: { unit: string; url: string }[] = [];
  for (const t of tracks)
    for (const m of t.modulos)
      for (const u of m.unidades) {
        for (const r of u.conteudo.leituraComplementar) out.push({ unit: u.id, url: r.url });
        const html = Object.values(u.conteudo.etapas)
          .map((e) => ('html' in e ? e.html : ''))
          .join('\n');
        for (const m2 of html.matchAll(/href="(https?:[^"]+)"/g))
          out.push({ unit: u.id, url: m2[1]!.replace(/&amp;/g, '&') });
      }
  return out;
}
