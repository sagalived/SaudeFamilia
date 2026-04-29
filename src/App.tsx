import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { auth } from './lib/firebase';
import { getDependentsByFamily, createDependent, getUserProfile, createUserProfile, addRecord } from './lib/db';
import { UserProfile, UserRole, Dependent } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShieldCheck, LogOut, Activity, Calendar, Syringe, ClipboardList } from 'lucide-react';
import DependentDetail from './components/DependentDetail';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDependentId, setActiveDependentId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [showAddDependentModal, setShowAddDependentModal] = useState(false);
  const [showAddAtendimentoModal, setShowAddAtendimentoModal] = useState(false);
  const [showCredentialsLogin, setShowCredentialsLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const [newDependent, setNewDependent] = useState({
    name: '',
    dob: '',
    sex: 'M' as 'M' | 'F',
    bloodType: '',
  });

  useEffect(() => {
    // Check for mock admin session on load
    const savedAdmin = localStorage.getItem('saude_plus_f_admin');
    if (savedAdmin) {
      const parsed = JSON.parse(savedAdmin);
      // Re-hydrate the timestamp as it was serialized as a plain object or map
      parsed.createdAt = Timestamp.fromDate(new Date()); 
      setProfile(parsed);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const existingProfile = await getUserProfile(firebaseUser.uid);
        if (existingProfile) {
          setProfile(existingProfile as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuário',
            email: firebaseUser.email || '',
            role: UserRole.PARENT,
            familyId: firebaseUser.uid,
            createdAt: Timestamp.now()
          };
          await createUserProfile(firebaseUser.uid, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoginError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      setLoginError('Falha na autenticação.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.username === 'admin' && credentials.password === 'admin') {
      const mockProfile: UserProfile = {
        uid: 'admin-dev',
        name: 'Administrador (Fase de Teste)',
        email: 'admin@dev.local',
        role: UserRole.PARENT,
        familyId: 'admin-dev-family',
        createdAt: Timestamp.now()
      };
      setProfile(mockProfile);
      localStorage.setItem('saude_plus_f_admin', JSON.stringify(mockProfile));
    } else {
      setLoginError('Credenciais inválidas.');
      setTimeout(() => setLoginError(''), 3000);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    localStorage.removeItem('saude_plus_f_admin');
    setProfile(null);
    setUser(null);
    setActiveDependentId(null);
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDependent.name || !newDependent.dob || !profile?.familyId) return;

    await createDependent({
      ...newDependent,
      familyId: profile.familyId,
    });
    setShowAddDependentModal(false);
    setNewDependent({ name: '', dob: '', sex: 'M', bloodType: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eeede8] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Activity className="w-10 h-10 text-[#0F6E56]" />
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#eeede8] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl p-10 shadow-xl border border-[#e0dfd8] text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-[#E1F5EE] p-5 rounded-[24px]">
              <Heart className="w-12 h-12 text-[#0F6E56]" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[#1a1a18] mb-2 uppercase">Saude+F</h1>
          <p className="text-[#6b6b67] mb-10 text-sm font-medium">
            Prontuário Digital Familiar.<br/>Segurança rápida em emergências.
          </p>

          <AnimatePresence mode="wait">
            {!showCredentialsLogin ? (
              <motion.div
                key="google"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <button
                  onClick={handleLogin}
                  className="w-full bg-[#1a1a18] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#2c2c2a] transition-all shadow-md active:scale-95 uppercase tracking-widest text-xs"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 bg-white rounded-full p-0.5" alt="Google" />
                  Entrar com Google
                </button>
                <button 
                  onClick={() => setShowCredentialsLogin(true)}
                  className="text-[10px] font-bold text-[#9a9a96] uppercase tracking-widest hover:text-[#1a1a18] transition-colors"
                >
                  Usar Credenciais (Dev)
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="credentials"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleAdminLogin}
                className="space-y-3"
              >
                <input 
                  type="text" 
                  placeholder="Usuário"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  className="w-full bg-[#f5f5f3] border-none rounded-xl px-4 py-3 text-sm"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Senha"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full bg-[#f5f5f3] border-none rounded-xl px-4 py-3 text-sm"
                  required
                />
                {loginError && <p className="text-red-500 text-[10px] font-bold uppercase">{loginError}</p>}
                <button
                  type="submit"
                  className="w-full bg-[#1a1a18] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-widest text-xs"
                >
                  Acessar
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCredentialsLogin(false)}
                  className="text-[10px] font-bold text-[#9a9a96] uppercase tracking-widest hover:text-[#1a1a18] transition-colors mt-2"
                >
                  Voltar
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-bold text-[#9a9a96] uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Dados Protegidos</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eeede8] text-[#1a1a18] font-sans flex items-stretch selection:bg-[#E1F5EE]">
      <aside className="w-[240px] bg-white border-r border-[#e0dfd8] flex flex-col sticky top-0 h-screen shrink-0 overflow-y-auto hidden md:flex">
        <div className="p-5 border-b border-[#e0dfd8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
              <Heart className="w-4 h-4 text-[#0F6E56]" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#1a1a18]">Saude+F</div>
              <div className="text-[10px] text-[#6b6b67] font-medium uppercase tracking-tight">Prontuário Familiar</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3">
          <div className="text-[10px] font-bold text-[#9a9a96] px-3 py-4 uppercase tracking-widest">Geral</div>
          <button 
            onClick={() => setActiveDependentId(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${!activeDependentId ? 'bg-[#E1F5EE] text-[#0F6E56] font-bold' : 'text-[#6b6b67] hover:bg-[#f5f5f3]'}`}
          >
            <Activity className="w-4 h-4" />
            Visão Geral
          </button>

          <div className="text-[10px] font-bold text-[#9a9a96] px-3 py-5 uppercase tracking-widest">Clínico</div>
          <NavItem icon={Calendar} label="Atendimentos" onClick={() => {}} />
          <NavItem icon={ClipboardList} label="Prescrições" onClick={() => {}} />
          <NavItem icon={Syringe} label="Vacinas" onClick={() => {}} />
          <NavItem icon={Activity} label="Crescimento" onClick={() => {}} />
        </nav>

        <div className="p-3 border-t border-[#e0dfd8]">
          <div className="text-[10px] font-bold text-[#9a9a96] px-3 py-3 uppercase tracking-widest">Núcleo Familiar</div>
          <FamilyMembers familyId={profile?.familyId} onSelect={setActiveDependentId} activeId={activeDependentId} />
          
          <div className="mt-4 pt-4 border-t border-[#f5f5f3] flex items-center gap-3 p-2 group cursor-pointer hover:bg-[#f5f5f3] rounded-lg transition-all">
            <div className="w-8 h-8 rounded-full bg-[#fde2e4] flex items-center justify-center text-[11px] font-bold text-[#4B1528]">
              {profile?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-[12px] font-bold truncate">{profile?.name}</div>
              <div className="text-[10px] text-[#6b6b67] truncate uppercase tracking-tighter">Responsável</div>
            </div>
            <button onClick={handleLogout} className="text-[#9a9a96] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#e0dfd8] flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <button className="md:hidden text-[#6b6b67]"><Activity className="w-5 h-5" /></button>
             <h2 className="text-[14px] font-bold text-[#1a1a18]">
               {activeDependentId ? 'Prontuário Completo' : profile?.role === 'doctor' ? 'Portal do Médico' : 'Visão Geral'}
             </h2>
          </div>
          <div className="flex items-center gap-2">
             <button className="text-[11px] font-bold px-3 py-1.5 border border-[#c8c7c0] rounded-md hover:bg-[#f5f5f3] transition-all">Exportar PDF</button>
             {profile?.role === 'doctor' && activeDependentId && (
               <button 
                onClick={() => setShowAddAtendimentoModal(true)}
                className="text-[11px] font-bold px-3 py-1.5 bg-[#0F6E56] text-white rounded-md hover:bg-[#0d5e49] shadow-sm"
               >
                 + Atendimento
               </button>
             )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {!activeDependentId ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <div className="w-20 h-20 bg-[#E1F5EE] rounded-[32px] flex items-center justify-center mb-6">
                  <Heart className="w-10 h-10 text-[#0F6E56]" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black text-[#1a1a18] uppercase tracking-tighter">BEM-VINDO AO SAUDE+F</h2>
                <p className="text-[#6b6b67] mt-3 max-w-sm text-sm font-medium leading-relaxed">
                  Selecione um membro da família ou cadastre um novo dependente para gerenciar o histórico médico compartilhado.
                </p>
                {profile?.role === 'parent' && (
                  <button 
                    onClick={() => setShowAddDependentModal(true)}
                    className="mt-10 bg-[#1a1a18] text-white font-bold py-3 px-8 rounded-xl text-[12px] uppercase tracking-widest hover:bg-[#2c2c2a] shadow-lg active:scale-95 transition-all"
                  >
                    + Novo Dependente
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-5xl mx-auto"
              >
                <DependentDetail 
                  dependentId={activeDependentId} 
                  onBack={() => setActiveDependentId(null)} 
                  role={profile?.role as UserRole}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddDependentModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddDependentModal(false)}
              className="absolute inset-0 bg-[#1a1a18]/20 backdrop-blur-[2px]" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[#e0dfd8]"
            >
              <div className="p-6 border-b border-[#f5f5f3]">
                <h3 className="text-[16px] font-bold text-[#1a1a18]">Cadastrar Dependente</h3>
              </div>
              <form onSubmit={handleAddDependent} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1 px-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newDependent.name} 
                    onChange={(e) => setNewDependent({...newDependent, name: e.target.value})}
                    className="w-full bg-[#f5f5f3] border-none rounded-lg px-4 py-3 text-[13px]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1 px-1">Nascimento</label>
                    <input type="date" value={newDependent.dob} onChange={(e) => setNewDependent({...newDependent, dob: e.target.value})} className="w-full bg-[#f5f5f3] border-none rounded-lg px-4 py-3 text-[13px]" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1 px-1">Sangue</label>
                    <select value={newDependent.bloodType} onChange={(e) => setNewDependent({...newDependent, bloodType: e.target.value})} className="w-full bg-[#f5f5f3] border-none rounded-lg px-4 py-3 text-[13px]">
                      <option value="">Opcional</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1 px-1">Sexo Biológico</label>
                  <div className="flex gap-2">
                    {['M', 'F'].map(s => (
                      <button key={s} type="button" onClick={() => setNewDependent({...newDependent, sex: s as any})} className={`flex-1 py-3 rounded-lg text-[12px] font-bold ${newDependent.sex === s ? 'bg-[#0F6E56] text-white font-bold' : 'bg-[#f5f5f3] text-[#6b6b67]'}`}>
                        {s === 'M' ? 'Masculino' : 'Feminino'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={() => setShowAddDependentModal(false)} className="flex-1 py-3 text-[#9a9a96] font-bold text-[10px] uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-[2] bg-[#1a1a18] text-white font-bold py-3 rounded-lg text-[11px] uppercase tracking-widest">Confirmar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddAtendimentoModal && activeDependentId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddAtendimentoModal(false)} className="absolute inset-0 bg-[#1a1a18]/20 backdrop-blur-[2px]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[#e0dfd8]">
              <AddRecordForm type="medical" dependentId={activeDependentId} onClose={() => setShowAddAtendimentoModal(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[#6b6b67] hover:bg-[#f5f5f3] hover:text-[#1a1a18] transition-all cursor-pointer">
      <Icon className="w-4 h-4" />
      {label}
    </div>
  );
}

function FamilyMembers({ familyId, onSelect, activeId }: { familyId?: string, onSelect: (id: string) => void, activeId: string | null }) {
  const [members, setMembers] = useState<Dependent[]>([]);
  useEffect(() => {
    if (familyId) {
      return getDependentsByFamily(familyId, setMembers);
    }
  }, [familyId]);

  return (
    <div className="space-y-1">
      {members.map(member => (
        <div 
          key={member.id} 
          onClick={() => onSelect(member.id)}
          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${activeId === member.id ? 'bg-[#f5f5f3] border border-[#e0dfd8]' : 'hover:bg-[#f5f5f3]'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${member.sex === 'M' ? 'bg-[#B5D4F4] text-[#042C53]' : 'bg-[#F4C0D1] text-[#4B1528]'}`}>
            {member.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className={`text-[12px] truncate ${activeId === member.id ? 'font-bold' : 'font-medium'}`}>{member.name}</div>
            <div className="text-[10px] text-[#9a9a96] truncate">{Math.floor((Date.now() - new Date(member.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} anos</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddRecordForm({ type, dependentId, onClose }: { type: 'growth' | 'vaccines' | 'medical', dependentId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = { dependentId, createdAt: new Date().toISOString() };
    formData.forEach((value, key) => data[key] = value);
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
      <div className="mb-6"><h3 className="text-[16px] font-bold text-[#1a1a18]">Novo Atendimento Clínico</h3><p className="text-[11px] text-[#6b6b67] font-bold uppercase tracking-widest mt-0.5">Visão do Profissional de Saúde</p></div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Data</label><input name="date" type="date" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" defaultValue={new Date().toISOString().split('T')[0]} required /></div>
          <div><label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Especialidade</label><input name="specialty" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="Ex: Pediatria" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Médico</label><input name="doctorName" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="Nome Completo" required /></div>
          <div><label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">CRM</label><input name="doctorCrm" type="text" className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" placeholder="CRM/UF" /></div>
        </div>
        <div><label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Sintomas</label><textarea name="symptoms" rows={3} className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" required /></div>
        <div><label className="block text-[10px] font-bold uppercase text-[#9a9a96] mb-1.5 px-1">Conduta</label><textarea name="diagnosis" rows={3} className="w-full bg-[#f5f5f3] border-none rounded-lg p-3 text-[13px]" /></div>
      </div>
      <div className="mt-8 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-[#9a9a96] uppercase text-[10px]">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-[2] bg-[#0F6E56] text-white font-bold py-3 rounded-lg text-[12px] uppercase">{loading ? 'Salvando...' : 'Finalizar'}</button>
      </div>
    </form>
  );
}
