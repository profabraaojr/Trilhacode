/**
 * Converte valores do JavaScript em texto para o console da TrilhaCode,
 * de forma parecida com o console do navegador.
 */

const MAX_DEPTH = 2;
const MAX_ITEMS = 50;
const MAX_STRING = 10_000;

function truncate(s: string): string {
  return s.length > MAX_STRING
    ? `${s.slice(0, MAX_STRING)}… (${s.length - MAX_STRING} caracteres omitidos)`
    : s;
}

function isElement(v: object): v is Element {
  return (
    typeof (v as Element).nodeType === 'number' && (v as Element).nodeType === 1 && 'tagName' in v
  );
}

function describeElement(el: Element): string {
  let s = `<${el.tagName.toLowerCase()}`;
  if (el.id) s += ` id="${el.id}"`;
  const cls = el.getAttribute('class');
  if (cls) s += ` class="${cls}"`;
  return `${s}>`;
}

export function formatValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): string {
  switch (typeof value) {
    case 'string':
      return depth === 0 ? truncate(value) : JSON.stringify(truncate(value));
    case 'number':
      return Object.is(value, -0) ? '-0' : String(value);
    case 'bigint':
      return `${value}n`;
    case 'boolean':
    case 'undefined':
      return String(value);
    case 'symbol':
      return value.toString();
    case 'function':
      return `ƒ ${value.name || '(anônima)'}()`;
  }
  if (value === null) return 'null';
  const obj = value as object;
  if (seen.has(obj)) return '[Circular]';

  if (obj instanceof Error) return `${obj.name}: ${obj.message}`;
  if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString();
  if (obj instanceof RegExp) return obj.toString();
  if (isElement(obj)) return describeElement(obj);
  if (depth > MAX_DEPTH) return Array.isArray(obj) ? '[…]' : '{…}';

  seen.add(obj);
  try {
    if (Array.isArray(obj)) {
      const items = obj.slice(0, MAX_ITEMS).map((v) => formatValue(v, depth + 1, seen));
      if (obj.length > MAX_ITEMS) items.push(`… mais ${obj.length - MAX_ITEMS}`);
      return `[${items.join(', ')}]`;
    }
    if (obj instanceof Map) {
      const items = [...obj]
        .slice(0, MAX_ITEMS)
        .map(
          ([k, v]) => `${formatValue(k, depth + 1, seen)} => ${formatValue(v, depth + 1, seen)}`,
        );
      return `Map(${obj.size}) {${items.join(', ')}}`;
    }
    if (obj instanceof Set) {
      const items = [...obj].slice(0, MAX_ITEMS).map((v) => formatValue(v, depth + 1, seen));
      return `Set(${obj.size}) {${items.join(', ')}}`;
    }
    const keys = Object.keys(obj);
    const items = keys
      .slice(0, MAX_ITEMS)
      .map(
        (k) =>
          `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${formatValue((obj as Record<string, unknown>)[k], depth + 1, seen)}`,
      );
    if (keys.length > MAX_ITEMS) items.push(`… mais ${keys.length - MAX_ITEMS}`);
    const ctor = Object.getPrototypeOf(obj)?.constructor?.name;
    const prefix = ctor && ctor !== 'Object' ? `${ctor} ` : '';
    return `${prefix}{${items.join(', ')}}`;
  } finally {
    seen.delete(obj);
  }
}

/** Formata os argumentos de console.log, com suporte a %s, %d, %i, %f, %o, %O e %c. */
export function formatArgs(args: readonly unknown[]): string {
  if (args.length === 0) return '';
  const [first, ...rest] = args;
  const parts: string[] = [];
  if (typeof first === 'string' && /%[sdifoOc%]/.test(first)) {
    let i = 0;
    const text = first.replace(/%([sdifoOc%])/g, (m, f: string) => {
      if (f === '%') return '%';
      if (i >= rest.length) return m;
      const arg = rest[i++];
      switch (f) {
        case 's':
          return typeof arg === 'string' ? arg : formatValue(arg, 1);
        case 'd':
        case 'i':
          return String(Number.parseInt(String(arg), 10));
        case 'f':
          return String(Number.parseFloat(String(arg)));
        case 'c':
          return '';
        default:
          return formatValue(arg, 1);
      }
    });
    parts.push(text, ...rest.slice(i).map((a) => formatValue(a)));
  } else {
    parts.push(...args.map((a) => formatValue(a)));
  }
  return parts.join(' ');
}
