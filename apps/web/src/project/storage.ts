/**
 * Registros guardados no IndexedDB do navegador (projetos e progresso).
 * Se o IndexedDB não estiver disponível (janela anônima em alguns navegadores,
 * armazenamento bloqueado), tudo funciona apenas em memória e a interface avisa.
 */
import type { ProjectFile } from './files';

export interface StoredProject {
  files: ProjectFile[];
  openTabs: string[];
  active: string | null;
  updatedAt: string;
}

export interface RecordStorage {
  readonly persistent: boolean;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

/** Mantido por compatibilidade de nome: projetos usam o mesmo armazenamento de registros. */
export type ProjectStorage = RecordStorage;

const DB_NAME = 'trilhacode';
const STORE = 'projects';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir o IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
}

function request<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = () => reject(tx.error ?? new Error('Falha no IndexedDB'));
    tx.onabort = () => reject(tx.error ?? new Error('Transação abortada'));
  });
}

export function isValidStoredProject(v: unknown): v is StoredProject {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as StoredProject;
  return (
    Array.isArray(p.files) &&
    p.files.every((f) => typeof f?.name === 'string' && typeof f?.content === 'string') &&
    Array.isArray(p.openTabs)
  );
}

export async function createIndexedDbStorage(): Promise<RecordStorage> {
  const db = await openDb();
  return {
    persistent: true,
    get: (key) => request<unknown>(db, 'readonly', (s) => s.get(key)),
    async set(key, value) {
      await request(db, 'readwrite', (s) => s.put(value, key));
    },
  };
}

export function createMemoryStorage(initial: Record<string, unknown> = {}): RecordStorage {
  const data = new Map<string, unknown>(Object.entries(initial));
  return {
    persistent: false,
    async get(key) {
      const v = data.get(key);
      return v === undefined ? undefined : structuredClone(v);
    },
    async set(key, value) {
      data.set(key, structuredClone(value));
    },
  };
}

export async function createBestStorage(): Promise<RecordStorage> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('sem IndexedDB');
    return await createIndexedDbStorage();
  } catch {
    return createMemoryStorage();
  }
}
