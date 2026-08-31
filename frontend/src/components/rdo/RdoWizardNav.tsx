import { CloudSun, HardHat, Hammer, MessageSquare, Camera, FileText, PenTool, Wrench } from 'lucide-react';

export type RdoTabKey = 'clima' | 'efetivo' | 'equipamentos' | 'servicos' | 'comentarios' | 'fotos' | 'documentos' | 'assinatura';

const TABS: { key: RdoTabKey; label: string; icon: typeof CloudSun; color: string }[] = [
  { key: 'clima', label: 'Condições Climáticas', icon: CloudSun, color: 'text-sky-500' },
  { key: 'efetivo', label: 'Efetivo', icon: HardHat, color: 'text-emerald-500' },
  { key: 'equipamentos', label: 'Equipamentos', icon: Wrench, color: 'text-indigo-500' },
  { key: 'servicos', label: 'Serviços', icon: Hammer, color: 'text-orange-500' },
  { key: 'comentarios', label: 'Comentários', icon: MessageSquare, color: 'text-purple-500' },
  { key: 'fotos', label: 'Fotos', icon: Camera, color: 'text-cyan-500' },
  { key: 'documentos', label: 'Documentos', icon: FileText, color: 'text-slate-500' },
  { key: 'assinatura', label: 'Assinatura', icon: PenTool, color: 'text-blue-600' },
];

export function RdoWizardNav({ active, onChange }: { active: RdoTabKey; onChange: (tab: RdoTabKey) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200">
      {TABS.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition ${
            active === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
          }`}
        >
          <Icon className={`w-4 h-4 ${active === key ? 'text-blue-600' : color}`} /> {label}
        </button>
      ))}
    </div>
  );
}
