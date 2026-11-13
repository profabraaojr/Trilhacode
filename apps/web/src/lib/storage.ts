/**
 * Acesso seguro ao localStorage. Em janela anônima, com cookies bloqueados ou em
 * alguns navegadores embutidos, o acesso pode lançar exceção; nesses casos a
 * interface continua funcionando, apenas sem lembrar as preferências.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* preferência não persistida */
    }
  },
};
