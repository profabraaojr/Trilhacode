/**
 * Lê a lista de alunos de uma planilha (CSV ou XLSX).
 * Aceita cabeçalho com colunas "e-mail"/"email" e "nome" em qualquer ordem; sem
 * cabeçalho, a primeira coluna com "@" é o e-mail e a outra, o nome. As linhas
 * guardam o número da planilha, para o relatório de erros apontar onde corrigir.
 */
import type { StudentRow } from '@trilhacode/shared';

export interface ParsedStudents {
  students: StudentRow[];
  /** Linhas ignoradas (vazias ou sem e-mail). */
  skipped: number[];
}

const norm = (v: unknown) =>
  String(v ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function rowsToStudents(rows: unknown[][]): ParsedStudents {
  const nonEmpty = rows.findIndex((r) => r.some((c) => String(c ?? '').trim()));
  if (nonEmpty === -1) return { students: [], skipped: [] };
  const first = rows[nonEmpty]!.map(norm);
  let emailCol = first.findIndex((h) => /^e-?mail/.test(h) || h === 'correio eletronico');
  let nameCol = first.findIndex((h) => /^nome/.test(h) || h === 'aluno' || h === 'estudante');
  let start = nonEmpty + 1;
  if (emailCol === -1) {
    // sem cabeçalho: descobre as colunas pela primeira linha com dados
    start = nonEmpty;
    emailCol = rows[nonEmpty]!.findIndex((c) => String(c ?? '').includes('@'));
    if (emailCol === -1) emailCol = 0;
    nameCol = rows[nonEmpty]!.findIndex(
      (c, i) => i !== emailCol && String(c ?? '').trim() && !String(c).includes('@'),
    );
  }
  const students: StudentRow[] = [];
  const skipped: number[] = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i]!;
    const email = String(r[emailCol] ?? '').trim();
    const name = nameCol >= 0 ? String(r[nameCol] ?? '').trim() : '';
    if (!email) {
      if (r.some((c) => String(c ?? '').trim())) skipped.push(i + 1);
      continue;
    }
    students.push({ email, row: i + 1, ...(name ? { name } : {}) });
  }
  return { students, skipped };
}

/** Lê CSV com vírgula, ponto e vírgula (Excel em português) ou tabulação. */
export function parseCsvText(text: string, papa: typeof import('papaparse')): unknown[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = [';', ',', '\t'].map((d) => [d, first.split(d).length - 1] as const);
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0]![1] > 0 ? counts[0]![0] : ',';
  return papa.parse<string[]>(text, { delimiter, skipEmptyLines: false }).data;
}

export async function parseStudentFile(file: File): Promise<ParsedStudents> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    return rowsToStudents((await readSheet(file)) as unknown[][]);
  }
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const Papa = (await import('papaparse')).default;
    return rowsToStudents(parseCsvText(await file.text(), Papa));
  }
  throw new Error('Use uma planilha .xlsx ou .csv.');
}
