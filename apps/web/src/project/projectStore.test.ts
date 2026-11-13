import { describe, expect, it } from 'vitest';
import { validateFileName } from './files';
import { ProjectStore, WELCOME_TAB } from './projectStore';
import { createMemoryStorage } from './storage';

async function setup() {
  const storage = createMemoryStorage();
  const store = new ProjectStore();
  await store.init(storage);
  return { store, storage };
}

describe('validateFileName', () => {
  const existing = ['index.html', 'style.css'];
  it('aceita nomes válidos', () => {
    expect(validateFileName('app.js', existing)).toBeNull();
    expect(validateFileName('pagina-2.html', existing)).toBeNull();
  });
  it('rejeita extensão não suportada, pastas, acentos e duplicados', () => {
    expect(validateFileName('notas.txt', existing)).toMatch(/\.html, \.css ou \.js/);
    expect(validateFileName('css/a.css', existing)).toMatch(/Pastas/);
    expect(validateFileName('página.html', existing)).toMatch(/sem acento/);
    expect(validateFileName('STYLE.css', existing)).toMatch(/Já existe/);
    expect(validateFileName('', existing)).toMatch(/Digite/);
  });
});

describe('ProjectStore', () => {
  it('começa com o exemplo e a aba de boas-vindas', async () => {
    const { store } = await setup();
    const s = store.getState();
    expect(s.files.map((f) => f.name)).toEqual(['index.html', 'style.css', 'script.js']);
    expect(s.active).toBe(WELCOME_TAB);
    expect(s.saveState).toBe('memory');
  });

  it('cria, renomeia e exclui arquivos, mantendo as abas coerentes', async () => {
    const { store } = await setup();
    expect(store.createFile('extra.js')).toEqual({ ok: true });
    expect(store.getState().active).toBe('extra.js');
    expect(store.renameFile('extra.js', 'main.js')).toEqual({ ok: true });
    expect(store.getState().openTabs).toContain('main.js');
    expect(store.getState().active).toBe('main.js');
    expect(store.deleteFile('main.js')).toEqual({ ok: true });
    expect(store.getFile('main.js')).toBeUndefined();
    expect(store.getState().openTabs).not.toContain('main.js');
    expect(store.getState().active).not.toBe('main.js');
  });

  it('protege o index.html', async () => {
    const { store } = await setup();
    expect(store.deleteFile('index.html').ok).toBe(false);
    expect(store.renameFile('index.html', 'home.html').ok).toBe(false);
  });

  it('recusa criar arquivo com nome inválido', async () => {
    const { store } = await setup();
    const r = store.createFile('style.css');
    expect(r.ok).toBe(false);
  });

  it('salva e restaura o projeto do armazenamento', async () => {
    const { store, storage } = await setup();
    store.updateContent('style.css', 'h1 { color: red; }');
    store.openTab('style.css');
    await store.flush();
    const again = new ProjectStore();
    await again.init(storage);
    expect(again.getFile('style.css')?.content).toBe('h1 { color: red; }');
    expect(again.getState().active).toBe('style.css');
  });

  it('troca de projeto preservando o anterior e restaura os arquivos iniciais', async () => {
    const { store } = await setup();
    store.updateContent('style.css', 'body { color: red; }');
    await store.switchProject('unidade:x:experimento', 'Experimento X', [
      { name: 'index.html', content: '<p>experimento</p>' },
    ]);
    expect(store.getState().projectLabel).toBe('Experimento X');
    expect(store.getState().files.map((f) => f.name)).toEqual(['index.html']);
    store.updateContent('index.html', '<p>alterado</p>');
    store.resetToInitial();
    expect(store.getFile('index.html')?.content).toBe('<p>experimento</p>');
    await store.switchProject('local:default', 'Meu projeto');
    expect(store.getFile('style.css')?.content).toBe('body { color: red; }');
  });

  it('fecha abas escolhendo a vizinha como ativa', async () => {
    const { store } = await setup();
    store.openTab('style.css');
    store.openTab('script.js');
    store.setActive('style.css');
    store.closeTab('style.css');
    expect(store.getState().active).toBe('script.js');
  });
});
