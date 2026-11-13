import { CircleCheck, CircleDashed, CircleDot, Lock } from 'lucide-react';
import { UNIT_STATUS_LABEL, type UnitStatus } from './progress';

export function StatusIcon({ status, size = 16 }: { status: UnitStatus; size?: number }) {
  const label = UNIT_STATUS_LABEL[status];
  const props = {
    size,
    'aria-label': label,
    role: 'img' as const,
    className: `status-icon status-${status}`,
  };
  if (status === 'concluida') return <CircleCheck {...props} />;
  if (status === 'em-andamento') return <CircleDot {...props} />;
  if (status === 'bloqueada') return <Lock {...props} />;
  return <CircleDashed {...props} />;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress">
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="progress-value">{value}%</span>
    </div>
  );
}
