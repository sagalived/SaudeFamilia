import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Calendar, Activity, Syringe, ClipboardList, 
  Plus, Ruler, Scale, Trash2, ExternalLink,
  ChevronRight, Baby, UserCircle, AlertCircle, Clock
} from 'lucide-react';
import { doc, getDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addRecord, getRecordsByDependent } from '../lib/db';
import { Dependent, GrowthMetric, Vaccination, MedicalRecord, UserRole } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface DependentDetailProps {
  dependentId: string;
  onBack: () => void;
  role?: UserRole;
}

type TabType = 'info' | 'growth' | 'vaccines' | 'medical';

export default function DependentDetail({ dependentId, onBack, role }: DependentDetailProps) {
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetric[]>([]);
  const [vaccines, setVaccines] = useState<Vaccination[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState<TabType | null>(null);

  useEffect(() => {
    const fetchDependent = async () => {
      const snap = await getDoc(doc(db, 'dependents', dependentId));
      if (snap.exists()) setDependent({ id: snap.id, ...snap.data() } as Dependent);
    };
    fetchDependent();

    const unsubGrowth = getRecordsByDependent('growthMetrics', dependentId, (data) => {
      setGrowthMetrics(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });
    const unsubVaccines = getRecordsByDependent('vaccinations', dependentId, (data) => {
      setVaccines(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    const unsubRecords = getRecordsByDependent('medicalRecords', dependentId, (data) => {
      setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    return () => {
      unsubGrowth();
      unsubVaccines();
      unsubRecords();
    };
  }, [dependentId]);

  if (!dependent) return null;

  const tabs = [
    { id: 'info', label: 'Geral', icon: AlertCircle },
    { id: 'growth', label: 'Crescimento', icon: Activity },
    { id: 'vaccines', label: 'Vacinas', icon: Syringe },
    { id: 'medical', label: 'Consultas', icon: ClipboardList },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-20"
    >
      {/* Header with Back button */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={onBack}
          className="text-[#9a9a96] hover:text-[#1a1a18] transition-all p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[15px] font-bold text-[#1a1a18]">
          {dependent.name} — Prontuário Completo
        </h2>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-[#e0dfd8] mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-5 py-3 text-[13px] transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab.id 
              ? 'text-[#0F6E56] border-[#0F6E56] font-bold' 
              : 'text-[#6b6b67] border-transparent hover:text-[#1a1a18]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Critical Banner */}
      <div className="bg-[#FAECE7] border border-[#F0997B] rounded-xl p-4 flex gap-4 items-start shadow-sm mb-8">
        <AlertCircle className="w-5 h-5 text-[#D85A30] shrink-0 mt-0.5" />
        <div>
          <div className="text-[13px] font-bold text-[#4A1B0C]">Dados críticos de acesso rápido</div>
          <div className="text-[11px] text-[#993C1D] mt-0.5">Visível em emergências para decisões médicas imediatas.</div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="bg-[#F7C1C1] text-[#501313] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Tipo {dependent.bloodType || 'N/I'}</span>
            <span className="bg-[#F7C1C1] text-[#501313] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Alergia: {dependent.allergies || 'Nenhuma'}</span>
            <span className="bg-[#9FE1CB] text-[#04342C] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{dependent.chronicConditions ? 'Condição Crônica' : 'Sem Condições Crônicas'}</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'info' && (
          <motion.div 
            key="info"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Profile Card */}
            <div className="bg-white rounded-xl p-6 border border-[#e0dfd8] shadow-sm">
              <div className="flex gap-4 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-[18px] shrink-0 ${
                  dependent.sex === 'M' ? 'bg-[#B5D4F4] text-[#042C53]' : 'bg-[#F4C0D1] text-[#4B1528]'
                }`}>
                  {dependent.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1a1a18]">{dependent.name}</h3>
                  <div className="text-[12px] text-[#6b6b67] mt-1 space-y-0.5">
                    <p>Nasc: {format(new Date(dependent.dob), 'dd/MM/yyyy')}</p>
                    <p>Idade: {Math.floor((Date.now() - new Date(dependent.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} anos</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-[#f5f5f3] pt-4">
                <FieldRow label="Sexo biológico" value={dependent.sex === 'M' ? 'Masculino' : 'Feminino'} />
                <FieldRow label="Tipo Sanguíneo" value={dependent.bloodType || 'Não informado'} />
                <FieldRow label="Alergias registradas" value={dependent.allergies || 'Nenhuma'} />
                <FieldRow label="Condições crônicas" value={dependent.chronicConditions || 'Nenhuma'} />
              </div>
            </div>

            {/* Growth Overview Card */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-xl p-6 border border-[#e0dfd8] shadow-sm flex-1">
                <div className="text-[10px] font-bold text-[#9a9a96] uppercase tracking-widest mb-6">Medições Recentes</div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <span className="text-[11px] text-[#6b6b67] block mb-1 uppercase tracking-tight font-medium">Altura</span>
                    <p className="text-2xl font-bold text-[#1a1a18]">
                      {growthMetrics.length > 0 ? growthMetrics[growthMetrics.length - 1].height : '--'}
                      <span className="text-[13px] font-normal text-[#9a9a96] ml-1">cm</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6b6b67] block mb-1 uppercase tracking-tight font-medium">Peso</span>
                    <p className="text-2xl font-bold text-[#1a1a18]">
                      {growthMetrics.length > 0 ? growthMetrics[growthMetrics.length - 1].weight : '--'}
                      <span className="text-[13px] font-normal text-[#9a9a96] ml-1">kg</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('growth')}
                  className="mt-8 text-[#0F6E56] text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 hover:underline"
                >
                  Ver gráfico completo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white rounded-xl p-6 border border-[#e0dfd8] shadow-sm">
                 <div className="text-[10px] font-bold text-[#9a9a96] uppercase tracking-widest mb-4">Medicação contínua</div>
                 <div className="space-y-3">
                   <MedItem name="Multivitamínico" dose="5ml" freq="Manhã" color="#5DCAA5" />
                   <MedItem name="Vitamina D" dose="2 gotas" freq="Almoço" color="#85B7EB" />
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'growth' && (
          <motion.div 
            key="growth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-[#e0dfd8] shadow-sm">
              <div>
                <h3 className="text-[15px] font-bold text-[#1a1a18]">Evolução de Crescimento</h3>
                <p className="text-[11px] text-[#6b6b67] uppercase tracking-wider font-bold">Histórico 5 anos</p>
              </div>
              <button 
                onClick={() => setShowAddModal('growth')}
                className="bg-[#1a1a18] text-white p-2 rounded-lg hover:bg-[#2c2c2a] transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#e0dfd8] shadow-sm h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthMetrics}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), 'MMM yy')}
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="height" stroke="#0F6E56" fill="#E1F5EE" strokeWidth={2} />
                  <Area type="monotone" dataKey="weight" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-4 justify-center">
                <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b67]"><div className="w-2 h-2 rounded-full bg-[#0F6E56]" /> Altura</span>
                <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b67]"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Peso</span>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'vaccines' && (
          <motion.div key="vaccines" className="space-y-4">
             <div className="flex justify-between items-center mb-4">
                 <div className="text-[10px] font-bold text-[#9a9a96] uppercase tracking-widest px-1">Carteira Digital de Vacinação</div>
                 <button onClick={() => setShowAddModal('vaccines')} className="text-[#0F6E56] hover:bg-[#E1F5EE] p-1 rounded-md transition-all">
                    <Plus className="w-4 h-4" />
                 </button>
             </div>
             {vaccines.map(v => (
               <div key={v.id} className="bg-white p-4 rounded-xl border border-[#e0dfd8] flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-full ${v.status === 'applied' ? 'bg-[#9FE1CB] text-[#04342C]' : 'bg-[#FAC775] text-[#412402]'}`}>
                      {v.status === 'applied' ? <ClipboardList className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                   </div>
                   <div>
                     <p className="text-[13px] font-bold text-[#1a1a18]">{v.vaccineName}</p>
                     <p className="text-[11px] text-[#6b6b67]">{v.dose} · {format(new Date(v.date), 'MM/yyyy')}</p>
                   </div>
                 </div>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                   v.status === 'applied' ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#fef3c7] text-[#92400e]'
                 }`}>
                   {v.status === 'applied' ? 'Completa' : 'Pendente'}
                 </span>
               </div>
             ))}
             {vaccines.length === 0 && <EmptyState label="Nenhuma vacina registrada" />}
          </motion.div>
        )}

        {activeTab === 'medical' && (
          <motion.div key="medical" className="space-y-6">
             <div className="flex justify-between items-center px-1">
                <div className="text-[10px] font-bold text-[#9a9a96] uppercase tracking-widest">Atendimentos Recentes</div>
                <button onClick={() => setShowAddModal('medical')} className="text-[12px] font-bold text-[#0F6E56] hover:underline">+ Novo</button>
             </div>
             {records.map(r => (
               <div key={r.id} className="flex gap-4 relative pb-8 last:pb-0">
                  <div className="w-px bg-[#e0dfd8] absolute left-[19px] top-6 bottom-0" />
                  <div className="w-10 h-10 rounded-full bg-[#f5f5f3] flex items-center justify-center border border-[#e0dfd8] shrink-0 z-10">
                    <Ruler className="w-4 h-4 text-[#9a9a96]" />
                  </div>
                  <div className="bg-white rounded-xl border border-[#e0dfd8] p-5 shadow-sm flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <p className="text-[13px] font-bold text-[#1a1a18]">{r.specialty}</p>
                         <p className="text-[11px] text-[#6b6b67]">Dr(a). {r.doctorName}</p>
                       </div>
                       <p className="text-[11px] text-[#9a9a96] font-medium">{format(new Date(r.date), 'dd MMM yyyy', { locale: ptBR })}</p>
                    </div>
                    <p className="text-[12px] text-[#6b6b67] leading-relaxed mt-4 bg-[#f5f5f3] p-3 rounded-lg border border-[#eeede8]">
                      {r.symptoms}
                    </p>
                    {r.diagnosis && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="bg-[#E1F5EE] text-[#0F6E56] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{r.diagnosis}</span>
                      </div>
                    )}
                  </div>
               </div>
             ))}
             {records.length === 0 && <EmptyState label="Nenhum atendimento registrado" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modals Container */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-0">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setShowAddModal(null)}
               className="absolute inset-0 bg-[#1a1a18]/20 backdrop-blur-[2px]" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[#e0dfd8]"
             >
                <AddRecordForm 
                  type={showAddModal} 
                  dependentId={dependentId} 
                  onClose={() => setShowAddModal(null)} 
                />
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MedItem({ name, dose, freq, color }: { name: string, dose: string, freq: string, color: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1">
        <div className="text-[12px] font-bold text-[#1a1a18]">{name}</div>
        <div className="text-[10px] text-[#6b6b67]">{dose}</div>
      </div>
      <span className="text-[10px] bg-[#f5f5f3] px-2 py-0.5 rounded-full text-[#6b6b67] font-medium">{freq}</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#f5f5f3] last:border-none">
       <span className="text-[11px] text-[#6b6b67] font-medium">{label}</span>
       <span className="text-[12px] text-[#1a1a18] font-bold text-right">{value}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 border-2 border-dashed border-[#e0dfd8] rounded-xl flex flex-col items-center justify-center text-[#9a9a96]">
      <Clock className="w-10 h-10 mb-3 opacity-20" />
      <span className="font-bold text-[13px] uppercase tracking-widest">{label}</span>
    </div>
  );
}

function AddRecordForm({ type, dependentId, onClose }: { type: TabType, dependentId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = { 
      dependentId, 
      createdAt: new Date().toISOString() 
    };
    
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Numeric conversions
    if (type === 'growth') {
      data.height = Number(data.height);
      data.weight = Number(data.weight);
    }

    const collectionName = type === 'growth' ? 'growthMetrics' : type === 'vaccines' ? 'vaccinations' : 'medicalRecords';
    
    try {
      await addRecord(collectionName, data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="mb-6">
        <h3 className="text-[16px] font-bold text-[#1a1a18]">
          Adicionar {type === 'growth' ? 'Medição' : type === 'vaccines' ? 'Vacina' : 'Atendimento'}
        </h3>
        <p className="text-[11px] text-[#6b6b67] font-bold uppercase tracking-widest mt-0.5">Preencha os campos abaixo</p>
      </div>

      <div className="space-y-4">
        {type === 'growth' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Altura (cm)</label>
                <input name="height" type="number" step="0.1" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Peso (kg)</label>
                <input name="weight" type="number" step="0.1" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Data da Medição</label>
              <input name="date" type="date" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" defaultValue={new Date().toISOString().split('T')[0]} required />
            </div>
          </>
        )}

        {type === 'vaccines' && (
          <>
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Nome da Vacina</label>
              <input name="vaccineName" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="Ex: Pentavalente" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Dose</label>
                <input name="dose" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="Ex: 1ª Dose" required />
              </div>
              <div>
                 <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Data</label>
                 <input name="date" type="date" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Status</label>
              <select name="status" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]">
                <option value="applied">Aplicada</option>
                <option value="pending">Pendente / Agendada</option>
              </select>
            </div>
          </>
        )}

        {type === 'medical' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Data</label>
                <input name="date" type="date" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Especialidade</label>
                <input name="specialty" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="Ex: Pediatria" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Médico</label>
                <input name="doctorName" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="Nome" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">CRM</label>
                <input name="doctorCrm" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="Opcional" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Sintomas Relatados</label>
              <textarea name="symptoms" rows={3} className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Diagnóstico / Prescrição</label>
              <textarea name="diagnosis" rows={2} className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" />
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-[#9a9a96] uppercase tracking-widest text-[10px]">Cancelar</button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-[2] bg-[#1a1a18] text-white font-bold py-3 rounded-lg hover:bg-[#2c2c2a] disabled:opacity-50 transition-all shadow-md active:scale-95 text-[12px] uppercase tracking-widest"
        >
          {loading ? 'Salvando...' : 'Salvar Registro'}
        </button>
      </div>
    </form>
  );
}
