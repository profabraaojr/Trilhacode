/**
 * Configuração da interface. Em produção vem de /config.js, gerado quando o
 * contêiner inicia (as imagens prontas servem qualquer instalação sem recompilar);
 * em desenvolvimento e nos testes, das variáveis VITE_* do build.
 */
interface RuntimeConfig {
  apiUrl?: string;
  sandboxUrl?: string;
  institution?: string;
  privacyContact?: string;
}

declare global {
  /** Versão da interface (package.json), definida pelo Vite. */
  const __APP_VERSION__: string;
  interface Window {
    __TRILHACODE__?: RuntimeConfig;
  }
}

const runtime: RuntimeConfig = (typeof window !== 'undefined' && window.__TRILHACODE__) || {};
const env = import.meta.env;

export const config = {
  /** Origem da API; vazio = mesma origem da interface. */
  apiUrl: runtime.apiUrl || env.VITE_API_URL || '',
  /** Endereço do sandbox, em outra origem. */
  sandboxUrl: runtime.sandboxUrl || env.VITE_SANDBOX_URL || 'http://localhost:5174/',
  /** Instituição responsável pela instalação (página de privacidade). */
  institution: runtime.institution || env.VITE_INSTITUTION || '',
  /** Contato do encarregado de dados (página de privacidade). */
  privacyContact: runtime.privacyContact || env.VITE_PRIVACY_CONTACT || '',
};
