import { Download, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { config } from '../config';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';

/** LGPD: baixar os próprios dados e excluir a conta. */
export function YourData() {
  const { account, classroom, learning } = useStores();
  const role = useStore(account, (s) => s.profile?.role);
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showPrivacy = () => {
    classroom.open({ kind: 'privacidade', id: 'privacidade', title: 'Privacidade' });
    learning.requestFocus('codigo');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await account.deleteAccount(password);
    setBusy(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <section className="account-section">
      <h3 className="account-section-title">Seus dados</h3>
      <p className="form-hint">
        Veja o que a plataforma guarda e para quê na{' '}
        <button type="button" className="unit-link inline-link" onClick={showPrivacy}>
          página de privacidade
        </button>
        .
      </p>
      <a className="secondary-button" href={`${config.apiUrl}/api/me/dados`} download>
        <Download size={15} aria-hidden="true" /> Baixar meus dados
      </a>
      {!open ? (
        <button type="button" className="text-button danger-text" onClick={() => setOpen(true)}>
          <Trash2 size={14} aria-hidden="true" /> Excluir minha conta
        </button>
      ) : (
        <form
          className="account-form danger-zone"
          onSubmit={(e) => void submit(e)}
          aria-label="Excluir conta"
        >
          <p className="form-hint">
            A exclusão é definitiva: apaga a conta, o progresso, as notas, o glossário, os pontos e
            as matrículas.
            {role === 'professor' || role === 'admin'
              ? ' As turmas que você criou continuam existindo para os coprofessores e administradores.'
              : ''}
          </p>
          <div className="form-field">
            <label htmlFor={`${uid}-senha`}>Senha</label>
            <input
              id={`${uid}-senha`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Entendo que a exclusão não pode ser desfeita.
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="row-actions">
            <button type="submit" className="danger-button" disabled={!confirmed || busy}>
              {busy ? 'Excluindo…' : 'Excluir conta definitivamente'}
            </button>
            <button type="button" className="text-button" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
