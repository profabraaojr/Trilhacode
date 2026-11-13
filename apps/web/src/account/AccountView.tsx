import { USER_ROLES, type UserRole } from '@trilhacode/shared';
import { LogOut, MailCheck } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { accountApi, type AdminUser } from '../api/client';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';

const ROLE_LABEL: Record<UserRole, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  admin: 'Administrador',
};

type Feedback = { kind: 'ok' | 'erro'; text: string } | null;

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={feedback.kind === 'ok' ? 'form-ok' : 'form-error'}
      role={feedback.kind === 'erro' ? 'alert' : 'status'}
    >
      {feedback.text}
    </p>
  );
}

function Field(props: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{props.label}</label>
      <input
        id={id}
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        minLength={props.minLength}
        aria-describedby={props.hint ? `${id}-hint` : undefined}
      />
      {props.hint && (
        <span id={`${id}-hint`} className="form-hint">
          {props.hint}
        </span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="account-section">
      <h3 className="account-section-title">{title}</h3>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------ Sem login */

type Mode = 'entrar' | 'cadastrar' | 'esqueci';

function SignedOut() {
  const { account } = useStores();
  const urlAction = useStore(account, (s) => s.urlAction);
  const [mode, setMode] = useState<Mode>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(
    urlAction?.kind === 'erro' ? { kind: 'erro', text: urlAction.message } : null,
  );
  const [unverified, setUnverified] = useState(false);

  if (urlAction?.kind === 'redefinir') return <ResetPassword token={urlAction.token} />;

  const switchMode = (m: Mode) => {
    setMode(m);
    setFeedback(null);
    setUnverified(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    setUnverified(false);
    if (mode === 'entrar') {
      const r = await account.signIn(email, password);
      if (!r.ok) {
        setFeedback({ kind: 'erro', text: r.error });
        setUnverified(r.code === 'EMAIL_NOT_VERIFIED');
      }
    } else if (mode === 'cadastrar') {
      const r = await account.signUp({ name, email, password, institution });
      if (r.ok) {
        setFeedback({
          kind: 'ok',
          text: `Conta criada. Enviamos um link de confirmação para ${email}. Abra-o para ativar a conta e depois entre.`,
        });
        setPassword('');
        setMode('entrar');
      } else setFeedback({ kind: 'erro', text: r.error });
    } else {
      const r = await account.requestPasswordReset(email);
      // A resposta é a mesma exista ou não a conta, para não revelar quem está cadastrado.
      setFeedback(
        r.ok
          ? {
              kind: 'ok',
              text: `Se houver uma conta com ${email}, você receberá um link para criar uma nova senha.`,
            }
          : { kind: 'erro', text: r.error },
      );
    }
    setBusy(false);
  };

  const resend = async () => {
    const r = await account.resendVerification(email);
    setFeedback(
      r.ok
        ? { kind: 'ok', text: `Enviamos um novo link de confirmação para ${email}.` }
        : { kind: 'erro', text: r.error },
    );
    setUnverified(false);
  };

  return (
    <div className="account">
      <p className="account-intro">
        Com uma conta, seu progresso nas trilhas fica salvo no servidor e acompanha você em qualquer
        computador.
      </p>
      {mode !== 'esqueci' && (
        <div className="segmented" role="tablist" aria-label="Acesso">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'entrar'}
            onClick={() => switchMode('entrar')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'cadastrar'}
            onClick={() => switchMode('cadastrar')}
          >
            Criar conta
          </button>
        </div>
      )}
      <form
        className="account-form"
        onSubmit={submit}
        aria-label={
          mode === 'entrar' ? 'Entrar' : mode === 'cadastrar' ? 'Criar conta' : 'Recuperar senha'
        }
      >
        {mode === 'esqueci' && <h3 className="account-section-title">Recuperar senha</h3>}
        {mode === 'cadastrar' && (
          <Field
            label="Nome completo"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
            minLength={2}
          />
        )}
        <Field
          label="E-mail"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        {mode !== 'esqueci' && (
          <Field
            label="Senha"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            hint={mode === 'cadastrar' ? 'Pelo menos 8 caracteres.' : undefined}
          />
        )}
        {mode === 'cadastrar' && (
          <Field
            label="Escola ou instituição (opcional)"
            value={institution}
            onChange={setInstitution}
            autoComplete="organization"
          />
        )}
        <Message feedback={feedback} />
        {unverified && (
          <button type="button" className="text-button" onClick={resend}>
            <MailCheck size={14} aria-hidden="true" /> Reenviar e-mail de confirmação
          </button>
        )}
        <button type="submit" className="primary-button" disabled={busy}>
          {busy
            ? 'Aguarde…'
            : mode === 'entrar'
              ? 'Entrar'
              : mode === 'cadastrar'
                ? 'Criar conta'
                : 'Enviar link'}
        </button>
      </form>
      {mode === 'entrar' && (
        <button type="button" className="text-button" onClick={() => switchMode('esqueci')}>
          Esqueci minha senha
        </button>
      )}
      {mode === 'esqueci' && (
        <button type="button" className="text-button" onClick={() => switchMode('entrar')}>
          Voltar para entrar
        </button>
      )}
      {mode === 'cadastrar' && (
        <p className="form-hint">
          Toda conta nova é de aluno. Contas de professor são liberadas por um administrador da
          plataforma.
        </p>
      )}
    </div>
  );
}

function ResetPassword({ token }: { token: string }) {
  const { account } = useStores();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setFeedback({ kind: 'erro', text: 'As duas senhas não são iguais.' });
      return;
    }
    setBusy(true);
    const r = await account.resetPassword(token, password);
    setBusy(false);
    if (r.ok) {
      setDone(true);
      setFeedback({ kind: 'ok', text: 'Senha alterada. Entre com a nova senha.' });
    } else setFeedback({ kind: 'erro', text: r.error });
  };

  return (
    <div className="account">
      <form className="account-form" onSubmit={submit} aria-label="Criar nova senha">
        <h3 className="account-section-title">Criar nova senha</h3>
        {!done && (
          <>
            <Field
              label="Nova senha"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={8}
              hint="Pelo menos 8 caracteres."
            />
            <Field
              label="Repita a nova senha"
              type="password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </>
        )}
        <Message feedback={feedback} />
        {done ? (
          <button type="button" className="primary-button" onClick={() => account.clearUrlAction()}>
            Ir para entrar
          </button>
        ) : (
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'Aguarde…' : 'Salvar nova senha'}
          </button>
        )}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------ Com login */

function Profile() {
  const { account } = useStores();
  const profile = useStore(account, (s) => s.profile)!;
  const [name, setName] = useState(profile.name);
  const [institution, setInstitution] = useState(profile.institution ?? '');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await account.updateProfile({ name, institution: institution.trim() || null });
    setFeedback(
      r.ok ? { kind: 'ok', text: 'Dados atualizados.' } : { kind: 'erro', text: r.error },
    );
  };

  return (
    <Section title="Dados pessoais">
      <form className="account-form" onSubmit={submit} aria-label="Dados pessoais">
        <Field
          label="Nome completo"
          value={name}
          onChange={setName}
          autoComplete="name"
          required
          minLength={2}
        />
        <Field
          label="Escola ou instituição"
          value={institution}
          onChange={setInstitution}
          autoComplete="organization"
        />
        <Message feedback={feedback} />
        <button type="submit" className="secondary-button">
          Salvar dados
        </button>
      </form>
    </Section>
  );
}

function ChangePassword() {
  const { account } = useStores();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await account.changePassword(current, next);
    if (r.ok) {
      setCurrent('');
      setNext('');
      setFeedback({
        kind: 'ok',
        text: 'Senha alterada. As sessões em outros aparelhos foram encerradas.',
      });
    } else setFeedback({ kind: 'erro', text: r.error });
  };

  return (
    <Section title="Alterar senha">
      <form className="account-form" onSubmit={submit} aria-label="Alterar senha">
        <Field
          label="Senha atual"
          type="password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          required
        />
        <Field
          label="Nova senha"
          type="password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          required
          minLength={8}
          hint="Pelo menos 8 caracteres."
        />
        <Message feedback={feedback} />
        <button type="submit" className="secondary-button">
          Alterar senha
        </button>
      </form>
    </Section>
  );
}

function AdminUsers() {
  const { account } = useStores();
  const me = useStore(account, (s) => s.profile)!;
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    accountApi
      .listUsers()
      .then(setUsers)
      .catch((e: Error) => setFeedback({ kind: 'erro', text: e.message }));
  }, []);

  const change = async (u: AdminUser, role: UserRole) => {
    try {
      await accountApi.setRole(u.id, role);
      setUsers((list) => list?.map((x) => (x.id === u.id ? { ...x, role } : x)) ?? null);
      setFeedback({ kind: 'ok', text: `${u.name} agora é ${ROLE_LABEL[role].toLowerCase()}.` });
    } catch (e) {
      setFeedback({ kind: 'erro', text: (e as Error).message });
    }
  };

  return (
    <Section title="Usuários (administração)">
      <Message feedback={feedback} />
      {!users && !feedback && <p className="form-hint">Carregando…</p>}
      {users && (
        <ul className="user-list" aria-label="Usuários">
          {users.map((u) => (
            <li key={u.id} className="user-row">
              <span className="user-info">
                <span className="user-name">{u.name}</span>
                <span className="form-hint">
                  {u.email}
                  {u.emailVerified ? '' : ' · e-mail não confirmado'}
                </span>
              </span>
              <select
                aria-label={`Papel de ${u.name} (${u.email})`}
                value={u.role}
                disabled={u.id === me.id}
                onChange={(e) => void change(u, e.target.value as UserRole)}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function SignedIn() {
  const { account } = useStores();
  const profile = useStore(account, (s) => s.profile)!;
  const urlAction = useStore(account, (s) => s.urlAction);

  return (
    <div className="account">
      {urlAction?.kind === 'verificado' && (
        <p className="form-ok" role="status">
          E-mail confirmado. Bem-vindo(a) à TrilhaCode!
        </p>
      )}
      <div className="account-card">
        <span className="account-name">{profile.name}</span>
        <span className="form-hint">{profile.email}</span>
        <span className="badge">{ROLE_LABEL[profile.role]}</span>
      </div>
      <p className="form-hint">Seu progresso nas trilhas está salvo nesta conta.</p>
      <Profile />
      <ChangePassword />
      {profile.role === 'admin' && <AdminUsers />}
      <button type="button" className="secondary-button" onClick={() => void account.signOut()}>
        <LogOut size={15} aria-hidden="true" /> Sair
      </button>
    </div>
  );
}

/** Visão "Conta" da barra lateral. */
export function AccountView() {
  const { account } = useStores();
  const status = useStore(account, (s) => s.status);
  if (status === 'loading') return <p className="view-message">Carregando…</p>;
  return status === 'signed-in' ? <SignedIn /> : <SignedOut />;
}
