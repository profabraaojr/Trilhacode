import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { parseCsvText, rowsToStudents } from './parseStudents';

describe('rowsToStudents', () => {
  it('lê cabeçalho em qualquer ordem e guarda o número da linha', () => {
    const r = rowsToStudents([
      ['Nome completo', 'E-mail'],
      ['Ana Souza', 'ana@escola.br'],
      ['', ''],
      ['Bruno', 'bruno@escola.br'],
    ]);
    expect(r.students).toEqual([
      { email: 'ana@escola.br', name: 'Ana Souza', row: 2 },
      { email: 'bruno@escola.br', name: 'Bruno', row: 4 },
    ]);
  });

  it('aceita planilha sem cabeçalho, descobrindo a coluna do e-mail', () => {
    const r = rowsToStudents([
      ['Carla Dias', 'carla@escola.br'],
      ['Davi', 'davi@escola.br'],
    ]);
    expect(r.students.map((s) => [s.row, s.email, s.name])).toEqual([
      [1, 'carla@escola.br', 'Carla Dias'],
      [2, 'davi@escola.br', 'Davi'],
    ]);
  });

  it('aponta linhas com dados mas sem e-mail', () => {
    const r = rowsToStudents([
      ['email', 'nome'],
      ['', 'Sem Email'],
      ['eva@escola.br', 'Eva'],
    ]);
    expect(r.skipped).toEqual([2]);
    expect(r.students).toHaveLength(1);
  });

  it('funciona com CSV separado por ponto e vírgula (Excel em português)', () => {
    const csv = 'nome;email\r\nFábio;fabio@escola.br\r\n';
    expect(rowsToStudents(parseCsvText(csv, Papa)).students).toEqual([
      { email: 'fabio@escola.br', name: 'Fábio', row: 2 },
    ]);
  });

  it('funciona com CSV separado por vírgula e com aspas', () => {
    const csv = 'email,nome\n"gil@escola.br","Gil, o aluno"\n';
    expect(rowsToStudents(parseCsvText(csv, Papa)).students).toEqual([
      { email: 'gil@escola.br', name: 'Gil, o aluno', row: 2 },
    ]);
  });

  it('planilha vazia não gera alunos', () => {
    expect(rowsToStudents([['', ''], []]).students).toEqual([]);
  });
});
