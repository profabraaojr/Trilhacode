import type { AccountProfile, ProfileUpdate } from '@trilhacode/shared';
import { accountApi } from '../api/client';
import { Store } from '../lib/store';
import { authClient, authErrorMessage } from './authClient';

export type Result = { ok: true } | { ok: false; error: string; code?: string };

/** Ação vinda de um link de e-mail (confirmação ou redefinição de senha). */
export type UrlAction =
  | { kind: 'verificado' }
  | { kind: 'redefinir'; token: string }
  | { kind: 'cadastro'; email: string }
  | { kind: 'erro'; message: string };

export interface AccountState {
  status: 'loading' | 'anonymous' | 'signed-in';
  profile: AccountProfile | null;
  urlAction: UrlAction | null;
}

/** Lê ?conta=... da URL (links dos e-mails) e limpa a barra de endereço. */
function takeUrlAction(): UrlAction | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const acao = params.get('conta');
  if (!acao) return null;
  const error = params.get('error');
  const token = params.get('token');
  window.history.replaceState(null, '', window.location.pathname);
  if (error) {
    return {
      kind: 'erro',
      message:
        error === 'INVALID_TOKEN' || error === 'invalid_token' || error === 'TOKEN_EXPIRED'
          ? 'O link expirou ou já foi usado. Peça um novo.'
          : 'Não foi possível concluir a ação do link. Tente de novo.',
    };
  }
  if (acao === 'redefinir' && token) return { kind: 'redefinir', token };
  if (acao === 'verificado') return { kind: 'verificado' };
  // Link do convite de turma: abre o cadastro com o e-mail convidado.
  if (acao === 'cadastro') return { kind: 'cadastro', email: params.get('email') ?? '' };
  return null;
}

const callback = (acao: string) =>
  `${window.location.origin}${window.location.pathname}?conta=${acao}`;

/** Sessão do usuário: entrar, cadastrar, sair, perfil e senha. */
export class AccountStore extends Store<AccountState> {
  constructor() {
    super({ status: 'loading', profile: null, urlAction: takeUrlAction() });
  }

  clearUrlAction() {
    this.setState({ urlAction: null });
  }

  async refresh(): Promise<void> {
    try {
      const profile = await accountApi.me();
      this.setState(
        profile ? { status: 'signed-in', profile } : { status: 'anonymous', profile: null },
      );
    } catch {
      this.setState({ status: 'anonymous', profile: null });
    }
  }

  async signIn(email: string, password: string): Promise<Result> {
    // Sem callbackURL: com ele, o cliente do Better Auth recarrega a página após o login.
    const { error } = await authClient.signIn.email({ email, password });
    if (error) return { ok: false, error: authErrorMessage(error), code: error.code };
    await this.refresh();
    return { ok: true };
  }

  async signUp(input: {
    name: string;
    email: string;
    password: string;
    institution: string;
  }): Promise<Result> {
    const { error } = await authClient.signUp.email({
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      institution: input.institution.trim() || undefined,
      callbackURL: callback('verificado'),
    });
    return error ? { ok: false, error: authErrorMessage(error), code: error.code } : { ok: true };
  }

  async resendVerification(email: string): Promise<Result> {
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: callback('verificado'),
    });
    return error ? { ok: false, error: authErrorMessage(error) } : { ok: true };
  }

  async requestPasswordReset(email: string): Promise<Result> {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: callback('redefinir'),
    });
    return error ? { ok: false, error: authErrorMessage(error) } : { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<Result> {
    const { error } = await authClient.resetPassword({ token, newPassword });
    return error ? { ok: false, error: authErrorMessage(error) } : { ok: true };
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<Result> {
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    return error ? { ok: false, error: authErrorMessage(error) } : { ok: true };
  }

  async updateProfile(update: ProfileUpdate): Promise<Result> {
    try {
      const profile = await accountApi.updateMe(update);
      this.setState({ profile });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /** LGPD: exclui a conta e todos os dados (confirmada com a senha). */
  async deleteAccount(password: string): Promise<Result> {
    const { error } = await authClient.deleteUser({ password });
    if (error) {
      // mensagens do servidor já em português (único administrador, senha ausente)
      const own = error.message && /administrador|senha/i.test(error.message);
      return { ok: false, error: own ? error.message! : authErrorMessage(error) };
    }
    this.setState({ status: 'anonymous', profile: null, urlAction: null });
    return { ok: true };
  }

  async signOut(): Promise<void> {
    await authClient.signOut();
    this.setState({ status: 'anonymous', profile: null, urlAction: null });
  }
}
