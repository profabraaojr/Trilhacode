// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formatArgs, formatValue } from './format.js';

describe('formatValue', () => {
  it('formata primitivos', () => {
    expect(formatValue('texto')).toBe('texto');
    expect(formatValue(42)).toBe('42');
    expect(formatValue(undefined)).toBe('undefined');
    expect(formatValue(null)).toBe('null');
    expect(formatValue(10n)).toBe('10n');
  });

  it('formata objetos, listas e aninhamento', () => {
    expect(formatValue({ nome: 'Ana', notas: [8, 9.5] })).toBe('{nome: "Ana", notas: [8, 9.5]}');
    expect(formatValue({ a: { b: { c: { d: 1 } } } })).toBe('{a: {b: {c: {…}}}}');
  });

  it('não entra em loop com referência circular', () => {
    const o: Record<string, unknown> = { x: 1 };
    o.self = o;
    expect(formatValue(o)).toBe('{x: 1, self: [Circular]}');
  });

  it('formata funções, erros, Map, Set e elementos HTML', () => {
    expect(formatValue(function soma() {})).toBe('ƒ soma()');
    expect(formatValue(new TypeError('falhou'))).toBe('TypeError: falhou');
    expect(formatValue(new Map([['a', 1]]))).toBe('Map(1) {"a" => 1}');
    expect(formatValue(new Set([1, 2]))).toBe('Set(2) {1, 2}');
    const el = document.createElement('div');
    el.id = 'caixa';
    el.className = 'card';
    expect(formatValue(el)).toBe('<div id="caixa" class="card">');
  });
});

describe('formatArgs', () => {
  it('junta argumentos com espaço', () => {
    expect(formatArgs(['Total:', 3, true])).toBe('Total: 3 true');
  });

  it('aplica substituições %s, %d e %c', () => {
    expect(formatArgs(['%s tem %d anos', 'Ana', 17.8])).toBe('Ana tem 17 anos');
    expect(formatArgs(['%cdestaque', 'color: red'])).toBe('destaque');
  });
});
