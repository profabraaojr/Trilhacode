import { Map as MapIcon, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { percent, unitStatus } from './progress';
import { ProgressBar, StatusIcon } from './StatusIcon';

/** Barra lateral "Trilhas": trilhas disponíveis e as unidades da trilha aberta. */
export function TracksView() {
  const { learning } = useStores();
  const tracks = useStore(learning, (s) => s.tracks);
  const track = useStore(learning, (s) => s.track);
  const progress = useStore(learning, (s) => s.progress);
  const currentUnit = useStore(learning, (s) => s.unit.data?.id);

  useEffect(() => {
    if (learning.getState().tracks.status === 'idle') void learning.loadTracks();
  }, [learning]);

  if (tracks.status === 'loading' && !tracks.data)
    return <p className="view-message">Carregando trilhas…</p>;
  if (tracks.status === 'error')
    return (
      <div className="view-message" role="alert">
        <p>{tracks.error}</p>
        <button type="button" className="text-button" onClick={() => void learning.loadTracks()}>
          <RefreshCw size={14} aria-hidden="true" /> Tentar de novo
        </button>
      </div>
    );
  if (!tracks.data?.length)
    return (
      <p className="view-message">
        Nenhuma trilha publicada. Rode <code>pnpm content:sync</code> para carregar o conteúdo.
      </p>
    );

  return (
    <div className="tracks">
      <ul className="track-list" aria-label="Trilhas disponíveis">
        {tracks.data.map((t) => {
          const open = track.data?.id === t.id;
          const unitIds = open
            ? track.data!.modulos.flatMap((m) => m.unidades.map((u) => u.id))
            : [];
          return (
            <li key={t.id} className="track-item" data-open={open || undefined}>
              <button
                type="button"
                className="track-open"
                onClick={() => void learning.openTrack(t.id)}
              >
                <span className="track-title">{t.titulo}</span>
                <span className="track-meta">
                  {t.totalUnidades} unidades · {t.nivel} · {t.publico}
                </span>
              </button>
              {open && (
                <ProgressBar
                  value={percent(unitIds, progress)}
                  label={`Progresso na trilha ${t.titulo}`}
                />
              )}
              {open && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void learning.openTrack(t.id)}
                >
                  <MapIcon size={14} aria-hidden="true" /> Ver mapa da trilha
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {track.data && (
        <nav aria-label={`Unidades da trilha ${track.data.titulo}`} className="unit-nav">
          {track.data.modulos.map((m) => (
            <section key={m.id} className="unit-group">
              <h3 className="unit-group-title">{m.titulo}</h3>
              <ol className="unit-list">
                {m.unidades.map((u) => {
                  const status = unitStatus(u.id, u.requer, progress);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="unit-link"
                        aria-current={currentUnit === u.id ? 'page' : undefined}
                        onClick={() => void learning.openUnit(u.id)}
                      >
                        <StatusIcon status={status} />
                        <span>{u.titulo}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </nav>
      )}
    </div>
  );
}
