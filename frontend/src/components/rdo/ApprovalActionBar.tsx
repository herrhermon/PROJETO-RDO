import { useState } from 'react';
import { AlertTriangle, CheckCircle, PenTool, Send, ShieldCheck, ThumbsDown, ThumbsUp, Trash2, Undo2 } from 'lucide-react';
import type { Rdo } from '../../lib/types';
import { useProjectContext } from '../../pages/ProjectLayout';
import { canEditRdo, validationLevelFor } from '../../lib/permissions';
import { Button } from '../ui/Button';
import { RejectModal } from './RejectModal';

interface Props {
  rdo: Rdo;
  onSign: () => void;
  onUnsign: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onDelete: () => void;
}

function Banner({
  gradient,
  icon,
  title,
  subtitle,
  children,
}: {
  gradient: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-white ${gradient}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm text-white/80">{subtitle}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function ApprovalActionBar({ rdo, onSign, onUnsign, onSubmit, onApprove, onReject, onDelete }: Props) {
  const { me } = useProjectContext();
  const [showReject, setShowReject] = useState(false);

  const editable = rdo.status === 'em_edicao' || rdo.status === 'reprovado';
  const canEdit = canEditRdo(me);
  const myLevel = validationLevelFor(me);
  const currentLevel = rdo.status === 'em_validacao' ? rdo.current_level : null;
  const canActOnValidation = me.isAdmin ? currentLevel != null : myLevel !== null && currentLevel !== null && myLevel === currentLevel;

  if (editable && canEdit && !rdo.signed_by) {
    const isRejected = rdo.status === 'reprovado';
    return (
      <Banner
        gradient={isRejected ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-amber-500 to-orange-500'}
        icon={<PenTool className="w-5 h-5" />}
        title="Assinatura Pendente"
        subtitle={
          isRejected && rdo.rejected_reason
            ? `Reprovado: ${rdo.rejected_reason} — revise e assine para reenviar.`
            : 'Revise as informações abaixo e assine o documento para submissão.'
        }
      >
        {rdo.status === 'em_edicao' && (
          <Button variant="secondary" onClick={onDelete} className="!bg-white/15 !text-white !border-white/30 hover:!bg-white/25">
            <Trash2 className="w-4 h-4" /> Excluir RDO
          </Button>
        )}
        <Button onClick={onSign} className={isRejected ? '!bg-white !text-red-600 hover:!bg-red-50' : '!bg-white !text-orange-600 hover:!bg-orange-50'}>
          <PenTool className="w-4 h-4" /> Assinar Documento
        </Button>
      </Banner>
    );
  }

  if (editable && canEdit && rdo.signed_by) {
    return (
      <Banner gradient="bg-gradient-to-r from-emerald-500 to-green-600" icon={<CheckCircle className="w-5 h-5" />} title="Pronto para Submissão" subtitle="Documento assinado — envie para validação.">
        <Button variant="secondary" onClick={onUnsign} className="!bg-white/15 !text-white !border-white/30 hover:!bg-white/25">
          <Undo2 className="w-4 h-4" /> Desfazer Assinatura
        </Button>
        <Button onClick={onSubmit} className="!bg-white !text-green-700 hover:!bg-green-50">
          <Send className="w-4 h-4" /> Submeter para Validação
        </Button>
      </Banner>
    );
  }

  if (!editable && rdo.status !== 'concluido' && canActOnValidation) {
    return (
      <>
        <Banner
          gradient="bg-gradient-to-r from-blue-600 to-sky-500"
          icon={<ShieldCheck className="w-5 h-5" />}
          title={`Aguardando sua validação (Nível ${currentLevel})`}
          subtitle="Revise as informações do RDO e aprove ou reprove."
        >
          <Button variant="danger" onClick={() => setShowReject(true)}>
            <ThumbsDown className="w-4 h-4" /> Reprovar
          </Button>
          <Button onClick={onApprove} className="!bg-white !text-blue-700 hover:!bg-blue-50">
            <ThumbsUp className="w-4 h-4" /> Aprovar
          </Button>
        </Banner>
        {showReject && (
          <RejectModal
            onClose={() => setShowReject(false)}
            onConfirm={(reason) => {
              setShowReject(false);
              onReject(reason);
            }}
          />
        )}
      </>
    );
  }

  if (rdo.status === 'reprovado') {
    return (
      <Banner
        gradient="bg-gradient-to-r from-red-500 to-rose-500"
        icon={<AlertTriangle className="w-5 h-5" />}
        title="RDO Reprovado"
        subtitle={rdo.rejected_reason ? `Motivo: ${rdo.rejected_reason}` : 'Aguardando correção pelo responsável.'}
      />
    );
  }

  if (rdo.status === 'concluido') {
    return (
      <Banner gradient="bg-gradient-to-r from-emerald-500 to-green-600" icon={<CheckCircle className="w-5 h-5" />} title="RDO Concluído" subtitle="Validação finalizada em todos os níveis." />
    );
  }

  return null;
}
