export const RDO_STATUS = ['em_edicao', 'em_validacao', 'reprovado', 'concluido'] as const;
export type RdoStatus = (typeof RDO_STATUS)[number];

export const RDO_STATUS_LABELS: Record<RdoStatus, string> = {
  em_edicao: 'Em edição',
  em_validacao: 'Em validação',
  reprovado: 'Reprovado',
  concluido: 'Concluído',
};
