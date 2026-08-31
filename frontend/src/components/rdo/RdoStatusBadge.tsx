import { RDO_STATUS_LABELS, statusColorClasses } from '../../lib/constants/rdoStatus';

export function RdoStatusBadge({ status }: { status: string }) {
  const label = RDO_STATUS_LABELS[status as keyof typeof RDO_STATUS_LABELS] ?? status;
  return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColorClasses(status)}`}>{label}</span>;
}
