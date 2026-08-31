import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line 
} from 'recharts';
import { 
  Home, FileText, PieChart, LogOut, Menu, X, CloudRain, Sun, 
  Calendar, CheckCircle, Clock, ChevronRight, ChevronLeft, User, 
  List as ListIcon, LayoutGrid, Eye, EyeOff, AlertTriangle, CloudLightning, Droplets,
  Building, MapPin, ArrowRight
} from 'lucide-react';

// --- MOCK DATA GLOBAL ---
const mockProjects = [
  { id: 'p1', name: 'Kronolog Extrema I', location: 'Extrema, MG', status: 'Em Andamento', progress: 65.4, img: 'https://images.unsplash.com/photo-1541888081621-fc5c9811ab6d?q=80&w=600&auto=format&fit=crop' },
  { id: 'p2', name: 'KSM Log Guarulhos', location: 'Guarulhos, SP', status: 'Em Andamento', progress: 32.1, img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop' },
  { id: 'p3', name: 'HGRE - Sercom Taboão', location: 'Taboão da Serra, SP', status: 'Concluído', progress: 100, img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=600&auto=format&fit=crop' }
];

const initialRdoList = [
  { id: 'RDO - 174', data: '10/07/2026', status: 'Em validação - Nível 1', clima: 'Chuvoso', condicaoTrabalho: 'Impraticável' },
  { id: 'RDO - 173', data: '09/07/2026', status: 'Concluído', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 172', data: '08/07/2026', status: 'Concluído', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 171', data: '07/07/2026', status: 'Em edição', clima: 'Nublado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 170', data: '06/07/2026', status: 'Concluído', clima: 'Chuvoso', condicaoTrabalho: 'Impraticável' },
  { id: 'RDO - 169', data: '05/07/2026', status: 'Em validação - Nível 2', clima: 'Nublado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 168', data: '04/07/2026', status: 'Em validação - Nível 1', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' }, 
  { id: 'RDO - 167', data: '03/07/2026', status: 'Concluído', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 166', data: '02/07/2026', status: 'Concluído', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 165', data: '01/07/2026', status: 'Concluído', clima: 'Nublado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 164', data: '30/06/2026', status: 'Concluído', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 163', data: '29/06/2026', status: 'Em validação - Nível 3', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' },
  { id: 'RDO - 162', data: '28/06/2026', status: 'Concluído', clima: 'Ensolarado', condicaoTrabalho: 'Praticável' },
];

const financeData = [
  { name: 'Visão de Contrato', incorrido: 15.5, restanteContrato: 25.6, restanteProjecao: 0 },
  { name: 'Visão de Projeção', incorrido: 15.5, restanteContrato: 0, restanteProjecao: 27.2 }
];

const pluvioData = [
  { dia: '01/07', medido: 0, cemaden: 2.1 },
  { dia: '02/07', medido: 0, cemaden: 2.1 },
  { dia: '03/07', medido: 12, cemaden: 2.5 },
  { dia: '04/07', medido: 45, cemaden: 5.0 },
  { dia: '05/07', medido: 15, cemaden: 3.0 },
  { dia: '06/07', medido: 5, cemaden: 2.0 },
  { dia: '07/07', medido: 0, cemaden: 1.5 },
];

// 1. Landing Page e Login
const LandingPage = ({ onLoginClick }) => (
  <div className="min-h-screen bg-[#001524] text-white font-sans flex flex-col">
    <header className="flex justify-between items-center p-6 bg-[#002b49] shadow-md border-b border-blue-900">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center font-bold text-[#002b49] text-xl">EQC</div>
        <span className="text-xl font-light tracking-widest">ENGENHARIA</span>
      </div>
      <button onClick={onLoginClick} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition-colors">
        Acesso Intranet
      </button>
    </header>
    <main className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-[#001524] to-[#002b49]">
      <h1 className="text-5xl md:text-6xl font-bold mb-6 max-w-4xl leading-tight">A Inteligência dos grandes empreendimentos.</h1>
      <p className="text-xl text-blue-200 mb-12 font-light">Engenharia do Proprietário.</p>
    </main>
  </div>
);

// 2. Tela de Seleção de Projetos
const ProjectSelection = ({ onSelectProject }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <header className="bg-[#002b49] text-white p-6 shadow-md flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-[#002b49] text-sm">EQC</div>
        <span className="text-lg font-light tracking-widest">PORTAL CORPORATIVO</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden md:block">
          <p className="text-sm font-bold">Hermon (EQC)</p>
          <p className="text-xs text-blue-300">Perfil: Validador / Admin</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center"><User className="w-5 h-5" /></div>
      </div>
    </header>

    <main className="flex-1 max-w-6xl mx-auto w-full p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Seus Projetos</h2>
        <p className="text-gray-500 mt-2">Selecione uma obra para acessar o painel de gestão.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map(project => (
          <div key={project.id} onClick={() => onSelectProject(project)} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
            <div className="h-40 bg-gray-200 relative overflow-hidden">
              <img src={project.img} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                {project.status}
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold text-[#002b49] mb-1">{project.name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-4"><MapPin className="w-4 h-4"/> {project.location}</p>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Avanço Físico</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${project.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-blue-50 text-[#002b49] font-medium py-2 rounded-lg border border-gray-200 transition-colors">
                Acessar Painel <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
);

// 3. Módulos Internos da Intranet
const Dashboard = ({ project }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-end flex-wrap gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Visão Geral do Projeto</h2>
        <p className="text-gray-500">{project.name} - Resumo Executivo</p>
      </div>
      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
        <Calendar className="w-4 h-4" /> Semana 24
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 mb-1">Avanço Físico Global</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-[#002b49]">{project.progress}%</span>
          <span className="text-sm text-green-500 mb-1">+1.2%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div className="bg-[#002b49] h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
        </div>
      </div>
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 mb-1">Prazo Decorrido</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-800">174<span className="text-lg text-gray-500">/268</span></span>
          <span className="text-sm text-gray-500 mb-1">dias</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div className="bg-blue-400 h-2 rounded-full" style={{ width: '64.9%' }}></div>
        </div>
      </div>
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 mb-1">Status RDO Atual (Hoje)</p>
        <div className="flex items-center gap-3 mt-1">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertTriangle className="text-red-600 w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-gray-800">Não Emitido</p>
            <p className="text-xs text-red-500">Construtora pendente</p>
          </div>
        </div>
      </div>
      <div className="bg-[#002b49] text-white p-5 rounded-xl shadow-sm flex flex-col justify-between">
        <p className="text-sm text-blue-200 mb-1">Previsão {project.location}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold">24°C</span>
            <p className="text-xs text-blue-300">Pancadas à tarde</p>
          </div>
          <CloudLightning className="w-10 h-10 text-yellow-400" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Saúde Financeira do Contrato</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={financeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(val) => `R$${val}M`} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#4b5563' }} />
              <RechartsTooltip formatter={(value) => `R$ ${value} Milhões`} />
              <Legend />
              <Bar dataKey="incorrido" name="Total Incorrido" stackId="a" fill="#002b49" />
              <Bar dataKey="restanteContrato" name="Saldo do Contrato" stackId="a" fill="#10b981" />
              <Bar dataKey="restanteProjecao" name="A Incorrer (Projeção)" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">* Integração API SIENGE atualizada há 2h</p>
      </div>
    </div>
  </div>
);

const RDOModule = () => {
  const [selectedRdo, setSelectedRdo] = useState(null);
  const [displayMode, setDisplayMode] = useState('calendario');
  const [showApproved, setShowApproved] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 11)); // Hoje: 11/07/2026
  const [groupBy, setgroupBy] = useState('status'); 

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const generateFullData = () => {
    const today = new Date(2026, 6, 11);
    const startDate = new Date(2026, 5, 20);
    let fullList = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const dateStr = `${dd}/${mm}/${yyyy}`;
      const existing = initialRdoList.find(r => r.data === dateStr);
      fullList.push(existing || {
        id: 'RDO - Não emitido',
        data: dateStr,
        status: 'RDO - Não emitido',
        clima: '-',
        condicaoTrabalho: '-'
      });
    }
    return fullList.reverse();
  };

  const allRdos = generateFullData();
  const filteredRdos = allRdos.filter(rdo => showApproved || rdo.status !== 'Concluído');

  const getStatusColor = (status) => {
    if (status === 'Concluído') return 'bg-green-100 text-green-800 border-green-300';
    if (status.includes('Em validação')) return 'bg-yellow-100 text-yellow-800 border-yellow-400';
    if (status === 'Em edição') return 'bg-gray-100 text-gray-700 border-gray-400';
    if (status === 'RDO - Não emitido') return 'bg-red-50 text-red-700 border-red-300 border-dashed';
    return 'bg-white border-gray-200';
  };

  const renderDetailView = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-in fade-in pb-8">
      <div className="bg-[#002b49] text-white p-6 rounded-t-xl flex justify-between items-center">
        <div>
          <button onClick={() => setSelectedRdo(null)} className="mb-2 text-blue-200 text-sm flex items-center gap-1 hover:text-white transition">
            <ChevronLeft className="w-4 h-4"/> Voltar
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">{selectedRdo.id}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              selectedRdo.status === 'Concluído' ? 'bg-green-500 text-white' : 
              selectedRdo.status.includes('Em validação') ? 'bg-yellow-400 text-[#002b49]' : 'bg-gray-400 text-white'
            }`}>
              {selectedRdo.status}
            </span>
          </div>
          <p className="text-blue-200 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4"/> Data de Referência: {selectedRdo.data}
          </p>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo</h3>
        <p className="text-gray-700">{selectedRdo.clima} / {selectedRdo.condicaoTrabalho}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Diário de Obras (RDO)</h2>
          <p className="text-gray-500">Gestão e Validação Diária</p>
        </div>
        <button onClick={() => setShowApproved(!showApproved)} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
          {showApproved ? <Eye className="w-4 h-4 text-blue-600"/> : <EyeOff className="w-4 h-4 text-gray-500"/>}
          {showApproved ? "Ocultar RDO's Concluídos" : "Ver RDO's Concluídos"}
        </button>
      </div>
      
      {!selectedRdo && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button onClick={() => setDisplayMode('calendario')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${displayMode === 'calendario' ? 'bg-white text-[#002b49] shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}><Calendar className="w-4 h-4" /> Calendário</button>
            <button onClick={() => setDisplayMode('lista')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${displayMode === 'lista' ? 'bg-white text-[#002b49] shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}><ListIcon className="w-4 h-4" /> Lista</button>
            <button onClick={() => setDisplayMode('grupo')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${displayMode === 'grupo' ? 'bg-white text-[#002b49] shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}><LayoutGrid className="w-4 h-4" /> Grupo</button>
          </div>

          {displayMode === 'grupo' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Agrupar por:</span>
              <select value={groupBy} onChange={(e) => setgroupBy(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#002b49]">
                <option value="status">Status</option>
                <option value="clima">Condição Climática</option>
                <option value="condicaoTrabalho">Condição de Trabalho</option>
              </select>
            </div>
          )}
        </div>
      )}

      {selectedRdo && selectedRdo.id !== 'RDO - Não emitido' ? (
        renderDetailView()
      ) : displayMode === 'calendario' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
           <div className="p-4 bg-gray-100 flex justify-between items-center border-b border-gray-300">
            <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))} className="p-2 hover:bg-gray-200 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
            <span className="font-bold text-gray-800 text-lg uppercase tracking-wide">{monthNames[currentMonth]} {currentYear}</span>
            <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))} className="p-2 hover:bg-gray-200 rounded-lg"><ChevronRight className="w-5 h-5"/></button>
           </div>
           <div className="grid grid-cols-7 border-b border-gray-300 bg-gray-50">
             {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="py-2 text-center text-sm font-bold text-gray-700 border-r border-gray-300 last:border-r-0">{d}</div>)}
           </div>
           <div className="grid grid-cols-7 bg-gray-300 gap-[1px]">
             {Array.from({length: 42}).map((_, i) => {
               const firstDay = new Date(currentYear, currentMonth, 1).getDay();
               const cellDate = new Date(currentYear, currentMonth, i - firstDay + 1);
               const isCurrentMonth = cellDate.getMonth() === currentMonth;
               
               const dd = String(cellDate.getDate()).padStart(2, '0');
               const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
               const formattedDate = `${dd}/${mm}/${cellDate.getFullYear()}`;
               
               const rdo = filteredRdos.find(r => r.data === formattedDate);

               return (
                 <div key={i} className={`min-h-[110px] p-2 flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                   <span className="text-sm font-bold text-gray-800">{dd}/{mm}</span>
                   {rdo && (
                     <div 
                       onClick={() => rdo.id !== 'RDO - Não emitido' && setSelectedRdo(rdo)}
                       className={`mt-1 flex-1 p-2 border rounded-md transition-all flex flex-col justify-center gap-1 ${getStatusColor(rdo.status)} ${rdo.id !== 'RDO - Não emitido' ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
                     >
                       <p className="text-xs font-bold truncate flex items-center justify-center gap-1">
                         {rdo.id === 'RDO - Não emitido' && <AlertTriangle className="w-3 h-3 text-red-600"/>} {rdo.id}
                       </p>
                       <span className="text-[10px] font-bold bg-white/70 px-1 py-0.5 rounded border border-black/10 w-full text-center text-black/80 truncate">
                         {rdo.status}
                       </span>
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
        </div>
      ) : displayMode === 'lista' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 uppercase text-xs">
              <tr><th className="px-6 py-4">Data Ref.</th><th className="px-6 py-4">RDO</th><th className="px-6 py-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRdos.map((rdo, i) => (
                <tr key={i} className={`transition-colors ${rdo.id === 'RDO - Não emitido' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 font-bold text-gray-800">{rdo.data}</td>
                  <td className="px-6 py-4 font-bold">
                    {rdo.id === 'RDO - Não emitido' ? (
                      <span className="text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> RDO - Não emitido</span>
                    ) : (
                      <button onClick={() => setSelectedRdo(rdo)} className="text-[#002b49] hover:underline">{rdo.id}</button>
                    )}
                  </td>
                  <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(rdo.status)}`}>{rdo.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 items-start h-full min-h-[500px]">
            {['Em edição', 'Em validação - Nível 1', 'Em validação - Nível 2', 'Em validação - Nível 3', 'Concluído', 'RDO - Não emitido'].map(statusKey => {
              const rdosInGroup = filteredRdos.filter(r => r.status === statusKey);
              if (rdosInGroup.length === 0 && !showApproved && statusKey === 'Concluído') return null;
              
              return (
                <div key={statusKey} className="w-72 shrink-0 bg-gray-100 rounded-xl flex flex-col max-h-[600px] border border-gray-300 shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-300 flex justify-between items-center bg-gray-200 rounded-t-xl">
                    <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">{statusKey}</h3>
                    <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-gray-600 border border-gray-300">{rdosInGroup.length}</span>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3">
                    {rdosInGroup.map((rdo, i) => (
                      <div key={i} onClick={() => rdo.id !== 'RDO - Não emitido' && setSelectedRdo(rdo)} className={`p-3 rounded-lg border transition-all ${getStatusColor(rdo.status)} ${rdo.id !== 'RDO - Não emitido' ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}>
                        <div className="flex justify-center items-center mb-2">
                          <span className="font-bold text-sm flex items-center gap-1">
                            {rdo.id === 'RDO - Não emitido' && <AlertTriangle className="w-4 h-4 text-red-600"/>}
                            {rdo.id}
                          </span>
                        </div>
                        <div className="text-center w-full">
                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-white/70 border border-black/10 inline-block text-black/80">{rdo.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const PluviometricPanel = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div><h2 className="text-2xl font-bold text-gray-800">Painel Pluviométrico IoT</h2><p className="text-gray-500">Monitoramento Integrado CEMADEN vs Realidade de Obra</p></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500"><h3 className="text-sm text-gray-500 font-medium">Acumulado do Mês (Real)</h3><p className="text-4xl font-bold text-gray-900 mt-2">77 <span className="text-xl text-gray-500 font-normal">mm</span></p></div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-gray-400"><h3 className="text-sm text-gray-500 font-medium">Média Histórica (CEMADEN)</h3><p className="text-4xl font-bold text-gray-900 mt-2">55 <span className="text-xl text-gray-500 font-normal">mm</span></p></div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-yellow-500"><h3 className="text-sm text-gray-500 font-medium">Dias Impeditivos (Mês)</h3><p className="text-4xl font-bold text-gray-900 mt-2">2 <span className="text-xl text-gray-500 font-normal">dias</span></p></div>
    </div>
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-6">Comparativo Histórico (Julho 2026)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pluvioData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="dia" scale="band" />
            <YAxis label={{ value: 'Milímetros (mm)', angle: -90, position: 'insideLeft' }} />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="medido" name="Medição Local (IoT)" barSize={40} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="cemaden" name="Média CEMADEN (10 anos)" stroke="#ff7300" strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const ReportsModule = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div><h2 className="text-2xl font-bold text-gray-800">Relatórios Gerenciais EQC</h2><p className="text-gray-500">Geração e publicação automatizada de relatórios</p></div>
    </div>
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-12 text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4"><Download className="w-10 h-10 text-[#002b49]" /></div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Módulo de Relatórios (Em Breve)</h3>
      <p className="text-gray-500 max-w-lg mb-6">A automação consolida dados do Diário de Obras, API Sienge (Financeiro) e Cronograma.</p>
    </div>
  </div>
);

// 4. Fluxo Principal da Aplicação
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onLoginClick={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-[#002b49] text-white rounded-lg flex items-center justify-center font-bold text-xl mx-auto mb-3">EQC</div>
                <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
                <p className="text-gray-500 text-sm">Intranet EQC Engenharia</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setIsAuthenticated(true); }} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">E-mail Corporativo</label><input type="email" defaultValue="hermon@eqc.com.br" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#002b49] outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Senha</label><input type="password" defaultValue="••••••••" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#002b49] outline-none" /></div>
                <button type="submit" className="w-full py-3 bg-[#002b49] text-white font-medium rounded-md hover:bg-blue-900 transition-colors mt-2">Entrar no Sistema</button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!selectedProject) {
    return <ProjectSelection onSelectProject={(proj) => { setSelectedProject(proj); setActiveTab('dashboard'); }} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: <Home className="w-5 h-5" /> },
    { id: 'rdo', label: 'Diário de Obras (RDO)', icon: <FileText className="w-5 h-5" /> },
    { id: 'pluvio', label: 'Painel Pluviométrico', icon: <Droplets className="w-5 h-5" /> },
    { id: 'reports', label: 'Relatórios Gerenciais', icon: <PieChart className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-gray-800 animate-in fade-in">
      <div className="md:hidden bg-[#002b49] text-white p-4 flex justify-between items-center">
        <div className="font-bold text-xl">Intranet EQC</div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X /> : <Menu />}</button>
      </div>

      <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-[#002b49] text-white flex-shrink-0 shadow-xl z-20 flex flex-col`}>
        <div className="p-6 border-b border-blue-900/50 hidden md:block">
          <h1 className="text-2xl font-bold tracking-wider cursor-pointer" onClick={() => setSelectedProject(null)} title="Voltar aos Projetos">EQC<span className="font-light">Tec</span></h1>
          <p className="text-blue-300 text-xs mt-1 uppercase tracking-widest">Portal Corporativo</p>
        </div>
        <nav className="p-4 space-y-2 mt-4 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:bg-[#003d66] hover:text-white'}`}
            >
              {item.icon} <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-900/50">
           <button onClick={() => setSelectedProject(null)} className="w-full flex items-center justify-center gap-2 text-blue-200 hover:text-white text-sm py-2 transition">
             <Building className="w-4 h-4"/> Trocar de Projeto
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center hidden md:flex sticky top-0 z-10">
          <div className="text-gray-500 text-sm font-medium">
            Projeto Selecionado: <span className="text-[#002b49] font-bold bg-blue-50 px-2 py-1 rounded ml-2">{selectedProject.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">Hermon (EQC)</p>
              <p className="text-xs text-gray-500">Perfil: Validador / Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#002b49]"><User className="w-5 h-5" /></div>
            <button onClick={() => setIsAuthenticated(false)} className="ml-4 text-gray-400 hover:text-red-500 transition-colors" title="Sair do Sistema"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard project={selectedProject} />}
          {activeTab === 'rdo' && <RDOModule />}
          {activeTab === 'pluvio' && <PluviometricPanel />}
          {activeTab === 'reports' && <ReportsModule />}
        </main>
      </div>
    </div>
  );
}