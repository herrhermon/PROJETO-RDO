export type RdoStatus = 'em_edicao' | 'em_validacao' | 'reprovado' | 'concluido';

export const RDO_STATUS_LABELS: Record<RdoStatus, string> = {
  em_edicao: 'Em edição',
  em_validacao: 'Em validação',
  reprovado: 'Reprovado',
  concluido: 'Concluído',
};

export function statusColorClasses(status: string): string {
  if (status === 'concluido') return 'bg-green-100 text-green-800 border-green-300';
  if (status === 'em_validacao') return 'bg-yellow-100 text-yellow-800 border-yellow-400';
  if (status === 'em_edicao') return 'bg-gray-100 text-gray-700 border-gray-400';
  if (status === 'reprovado') return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-white border-gray-200';
}
