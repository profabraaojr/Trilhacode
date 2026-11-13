import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const API_BASE: string = import.meta.env.VITE_API_URL || window.location.origin;

/** Cliente do Better Auth. A API e a interface ficam na mesma origem (cookies de sessão). */
export const authClient = createAuthClient({
  baseURL: API_BASE,
  basePath: '/api/auth',
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: 'string', required: false, input: false },
        institution: { type: 'string', required: false },
      },
    }),
  ],
});

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  EMAIL_NOT_VERIFIED:
    'Confirme seu e-mail antes de entrar. Procure a mensagem da TrilhaCode na sua caixa de entrada.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail. Entre ou use "Esqueci minha senha".',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'Já existe uma conta com este e-mail. Entre ou use "Esqueci minha senha".',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'A senha pode ter no máximo 128 caracteres.',
  INVALID_PASSWORD: 'A senha atual está incorreta.',
  INVALID_TOKEN: 'O link expirou ou já foi usado. Peça um novo.',
  INVALID_EMAIL: 'Digite um e-mail válido.',
};

/** Traduz o erro devolvido pelo Better Auth para uma mensagem ao usuário. */
export function authErrorMessage(
  error: { code?: string; status?: number; message?: string } | null | undefined,
): string {
  if (!error) return 'Não foi possível concluir. Tente novamente.';
  if (error.status === 429) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]!;
  if (error.status === 0 || error.status === undefined)
    return 'Não foi possível falar com o servidor.';
  return 'Não foi possível concluir. Tente novamente.';
}
