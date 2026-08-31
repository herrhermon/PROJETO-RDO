import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Download, Sparkles, LayoutTemplate } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { useProjectContext } from './ProjectLayout';
import type { Rdo, RdoTemplate } from '../lib/types';
import { formatDateBR } from '../lib/dateUtils';
import { RdoStatusBadge } from '../components/rdo/RdoStatusBadge';
import { RdoWizardNav, type RdoTabKey } from '../components/rdo/RdoWizardNav';
import { ApprovalActionBar } from '../components/rdo/ApprovalActionBar';
import { CondicoesClimaticasTab } from '../components/rdo/tabs/CondicoesClimaticasTab';
import { EfetivoTab } from '../components/rdo/tabs/EfetivoTab';
import { EquipamentosTab } from '../components/rdo/tabs/EquipamentosTab';
import { ServicosTab } from '../components/rdo/tabs/ServicosTab';
import { ComentariosTab } from '../components/rdo/tabs/ComentariosTab';
import { FotosTab } from '../components/rdo/tabs/FotosTab';
import { DocumentosTab } from '../components/rdo/tabs/DocumentosTab';
import { AssinaturaTab } from '../components/rdo/tabs/AssinaturaTab';
import { RdoSidebar } from '../components/rdo/RdoSidebar';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { canEditRdo } from '../lib/permissions';

export function RdoEditorPage() {
  const { project, me } = useProjectContext();
  const { rdoId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [rdo, setRdo] = useState<Rdo | null>(null);
  const [tab, setTab] = useState<RdoTabKey>('clima');
  const [dataVersion, setDataVersion] = useState(0);
  const [templates, setTemplates] = useState<RdoTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  function load() {
    api.get<{ rdo: Rdo }>(`/projects/${project.id}/rdos/${rdoId}`).then((r) => setRdo(r.rdo));
  }

  useEffect(load, [project.id, rdoId]);
  useEffect(() => {
    api.get<{ templates: RdoTemplate[] }>(`/projects/${project.id}/templates`).then((r) => setTemplates(r.templates));
  }, [project.id]);

  if (!rdo) return <div className="text-gray-500">Carregando RDO...</div>;

  const editable = (rdo.status === 'em_edicao' || rdo.status === 'reprovado') && canEditRdo(me);

  async function withErrorHandling(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Ocorreu um erro.', 'error');
    }
  }

  const actions = {
    onSign: () =>
      withErrorHandling(async () => {
        const res = await api.post<{ rdo: Rdo }>(`/projects/${project.id}/rdos/${rdo.id}/sign`);
        setRdo(res.rdo);
        notify('RDO assinado.');
      }),
    onUnsign: () =>
      withErrorHandling(async () => {
        const res = await api.post<{ rdo: Rdo }>(`/projects/${project.id}/rdos/${rdo.id}/unsign`);
        setRdo(res.rdo);
        notify('Assinatura desfeita — RDO voltou para edição.');
      }),
    onSubmit: () =>
      withErrorHandling(async () => {
        const res = await api.post<{ rdo: Rdo }>(`/projects/${project.id}/rdos/${rdo.id}/submit`);
        setRdo(res.rdo);
        notify('RDO submetido para validação.');
      }),
    onApprove: () =>
      withErrorHandling(async () => {
        const res = await api.post<{ rdo: Rdo }>(`/projects/${project.id}/rdos/${rdo.id}/approve`);
        setRdo(res.rdo);
        notify('RDO aprovado.');
      }),
    onReject: (reason: string) =>
      withErrorHandling(async () => {
        const res = await api.post<{ rdo: Rdo }>(`/projects/${project.id}/rdos/${rdo.id}/reject`, { reason });
        setRdo(res.rdo);
        notify('RDO reprovado.');
      }),
    onDelete: () =>
      withErrorHandling(async () => {
        if (!confirm('Tem certeza que deseja excluir este RDO?')) return;
        await api.delete(`/projects/${project.id}/rdos/${rdo.id}`);
        notify('RDO excluído.');
        navigate('..');
      }),
  };

  const handleAutofill = async () => {
    await withErrorHandling(async () => {
      await api.post(`/projects/${project.id}/rdos/${rdo.id}/autofill`);
      setDataVersion((v) => v + 1);
      notify('Efetivo, equipamentos e serviços preenchidos com base no último diário.');
    });
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    await withErrorHandling(async () => {
      const res = await api.post<{ rdo: Rdo }>(`/projects/${project.id}/rdos/${rdo.id}/apply-template/${selectedTemplate}`);
      setRdo(res.rdo);
      setDataVersion((v) => v + 1);
      notify('Modelo aplicado ao RDO.');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => navigate('..')} className="mb-2 text-gray-500 text-sm flex items-center gap-1 hover:text-eqc-900">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800">RDO - {rdo.rdo_number}</h2>
            <RdoStatusBadge status={rdo.status} />
          </div>
          <p className="text-gray-500 mt-1">Data de referência: {formatDateBR(rdo.reference_date)}</p>
        </div>
        <a href={api.pdfUrl(`/projects/${project.id}/rdos/${rdo.id}/export/pdf`)} target="_blank" rel="noreferrer">
          <Button variant="secondary">
            <Download className="w-4 h-4" /> Exportar PDF
          </Button>
        </a>
      </div>

      <ApprovalActionBar rdo={rdo} {...actions} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {editable && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={handleAutofill}>
                <Sparkles className="w-4 h-4" /> Preencher com último diário
              </Button>
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-gray-500" />
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">Aplicar modelo...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={handleApplyTemplate} disabled={!selectedTemplate}>
                  Aplicar
                </Button>
              </div>
            </div>
          )}

          <RdoWizardNav active={tab} onChange={setTab} />

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            {tab === 'clima' && <CondicoesClimaticasTab projectId={project.id} rdo={rdo} editable={editable} onSaved={setRdo} />}
            {tab === 'efetivo' && <EfetivoTab key={`efetivo-${dataVersion}`} projectId={project.id} rdoId={rdo.id} editable={editable} />}
            {tab === 'equipamentos' && <EquipamentosTab key={`equipamentos-${dataVersion}`} projectId={project.id} rdoId={rdo.id} editable={editable} />}
            {tab === 'servicos' && <ServicosTab key={`servicos-${dataVersion}`} projectId={project.id} rdoId={rdo.id} editable={editable} />}
            {tab === 'comentarios' && <ComentariosTab projectId={project.id} rdoId={rdo.id} />}
            {tab === 'fotos' && <FotosTab projectId={project.id} rdoId={rdo.id} editable={editable} />}
            {tab === 'documentos' && <DocumentosTab projectId={project.id} rdoId={rdo.id} editable={editable} />}
            {tab === 'assinatura' && <AssinaturaTab projectId={project.id} rdo={rdo} editable={editable} onSign={actions.onSign} />}
          </div>
        </div>

        <RdoSidebar projectId={project.id} rdo={rdo} activeTab={tab} />
      </div>
    </div>
  );
}
