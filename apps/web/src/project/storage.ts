/**
 * Persistência do projeto no IndexedDB do navegador.
 * Se o IndexedDB não estiver disponível (janela anônima em alguns navegadores,
 * armazenamento bloqueado), o projeto funciona apenas em memória e a interface avisa.
 */
import type { ProjectFile } from './files';

export interface StoredProject {
  files: ProjectFile[];
  openTabs: string[];
  active: string | null;
  updatedAt: string;
}

export interface ProjectStorage {
  readonly persistent: boolean;
  load(): Promise<StoredProject | null>;
  save(project: StoredProject): Promise<void>;
}

const DB_NAME = 'trilhacode';
const STORE = 'projects';
const KEY = 'local:default';

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

export async function createIndexedDbStorage(): Promise<ProjectStorage> {
  const db = await openDb();
  return {
    persistent: true,
    async load() {
      const v = await request<unknown>(db, 'readonly', (s) => s.get(KEY));
      return isValidStoredProject(v) ? v : null;
    },
    async save(project) {
      await request(db, 'readwrite', (s) => s.put(project, KEY));
    },
  };
}

export function createMemoryStorage(initial: StoredProject | null = null): ProjectStorage {
  let data = initial;
  return {
    persistent: false,
    async load() {
      return data;
    },
    async save(project) {
      data = structuredClone(project);
    },
  };
}

export async function createBestStorage(): Promise<ProjectStorage> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('sem IndexedDB');
    return await createIndexedDbStorage();
  } catch {
    return createMemoryStorage();
  }
}
