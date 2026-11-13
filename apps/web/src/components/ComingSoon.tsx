import { Clock } from 'lucide-react';

interface Props {
  title: string;
  stage: number;
  description: string;
}

/**
 * Marca explicitamente uma área que ainda não funciona.
 * Regra do projeto: nenhum recurso aparece como se funcionasse sem funcionar.
 */
export function ComingSoon({ title, stage, description }: Props) {
  return (
    <section className="coming-soon" aria-label={`${title}: em breve`}>
      <span className="badge badge-soon">
        <Clock size={12} aria-hidden="true" /> Em breve · Etapa {stage}
      </span>
      <h2 className="coming-soon-title">{title}</h2>
      <p className="coming-soon-text">{description}</p>
    </section>
  );
}
