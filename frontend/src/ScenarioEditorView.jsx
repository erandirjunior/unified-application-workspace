import React, { useState } from 'react';

export default function ScenarioEditorView({ scenario, collection, onUpdateScenario, onBack, onEditStep, onRun }) {
  if (!scenario) return null;

  const [name, setName] = useState(scenario?.name || '');
  const [description, setDescription] = useState(scenario?.description || '');
  const [steps, setSteps] = useState(scenario?.steps || []);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySearch, setCopySearch] = useState('');

  const getAllRequests = (items) => {
    let reqs = [];
    items.forEach(item => {
      if (item.type === 'folder') reqs = [...reqs, ...getAllRequests(item.requests || [])];
      else reqs.push(item);
    });
    return reqs;
  };

  const handleSave = () => {
    onUpdateScenario({ ...scenario, name, description, steps });
    onBack();
  };

  const handleRun = () => {
    if (steps.length === 0) return alert('Adicione passos ao cenário antes de rodar.');
    
    const formattedReqs = steps.map(r => {
        const headerMap = {};
        (r.headers || []).forEach(h => { if (h.key) headerMap[h.key] = h.value; });
        return { 
          ...r, 
          headers: headerMap, 
          body: r.bodyRaw || '',
          totalRequests: parseInt(r.totalRequests || r.threads || 1),
          duration: parseInt(r.duration || 10),
          rampUp: parseInt(r.rampUp || 0)
        };
    });
    onRun(formattedReqs, scenario.id);
  };

  const addNewStep = () => {
    const newRequest = {
      id: Date.now().toString(),
      name: `Novo Passo ${steps.length + 1}`,
      url: 'https://api.example.com',
      method: 'GET',
      totalRequests: 1,
      duration: 10,
      rampUp: 0,
      headers: [],
      bodyType: 'none',
      bodyRaw: '',
      description: '',
      pathParams: [],
      bodyParams: [],
      authType: 'none'
    };
    setSteps(prev => [...prev, newRequest]);
  };

  const addWaitStep = () => {
    const waitStep = {
      id: Date.now().toString(),
      name: 'Pausa (5s)',
      method: 'WAIT',
      url: '5', // Usamos a URL para guardar o tempo em segundos
    };
    setSteps(prev => [...prev, waitStep]);
  };

  const copyRequestToScenario = (originalReq) => {
    const newStep = {
      ...originalReq,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      // Mantém os parâmetros de carga padrão do cenário se não existirem
      totalRequests: originalReq.totalRequests || 1,
      duration: originalReq.duration || 10,
      rampUp: originalReq.rampUp || 0,
    };

    setSteps(prev => [...prev, newStep]);
    setIsCopyModalOpen(false);
    setCopySearch('');
  };

  const removeRequest = (index) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const moveRequest = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newIds = [...steps];
    const [removed] = newIds.splice(index, 1);
    newIds.splice(newIndex, 0, removed);
    setSteps(newIds);
  };

  const handleEditStep = (index) => {
    const currentStep = steps[index];
    onUpdateScenario({ ...scenario, name, description, steps });
    onEditStep(currentStep, index);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Editor de Cenário: {name}</h2>
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">SALVAR</button>
          <button onClick={handleRun} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20">EXECUTAR</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="label-base">Nome do Cenário</label>
            <input className="input-base text-lg font-bold" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Fluxo de Checkout Completo" />
          </div>
          <div>
            <label className="label-base">Comentário / Descrição</label>
            <textarea className="input-base min-h-[120px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo deste fluxo..." />
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Adicionar Componentes</h3>
            <div className="grid gap-3">
              <button onClick={addNewStep} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 transition-all">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold dark:text-white">Nova Requisição</p>
                  <p className="text-[10px] text-slate-500">Adicionar passo manual</p>
                </div>
              </button>
              <button onClick={() => setIsCopyModalOpen(true)} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 transition-all">
                <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" strokeWidth="2"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold dark:text-white">Copiar da Coleção</p>
                  <p className="text-[10px] text-slate-500">Importar request salva</p>
                </div>
              </button>
              <button onClick={addWaitStep} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-amber-500 transition-all">
                <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold dark:text-white">Pausa (Wait)</p>
                  <p className="text-[10px] text-slate-500">Tempo de espera (Think Time)</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <label className="label-base !mb-0 text-blue-600 dark:text-blue-400">Sequência do Fluxo</label>
            <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">
              {steps.length} PASSOS
            </span>
          </div>
          
          <div className="space-y-3">
            {steps.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 italic">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth="1.5"/></svg>
                <p>Nenhuma requisição na sequência.</p>
              </div>
            ) : (
              steps.map((req, index) => (
                  <div key={req.id} className="flex items-center gap-3 group animate-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                      <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 group-last:hidden"></div>
                    </div>
                    <div className="flex-1 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm group-hover:border-blue-500/30 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${req.method === 'WAIT' ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' : req.method === 'GET' ? 'text-emerald-500 border-emerald-500/20' : 'text-blue-500 border-blue-500/20'}`}>
                          {req.method === 'WAIT' ? '⌛ WAIT' : req.method}
                        </span>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {req.method === 'WAIT' ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <span>Esperar</span>
                              <input 
                                type="number" 
                                min="1"
                                className="w-14 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 text-center font-black text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                value={req.url}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newSteps = [...steps];
                                  newSteps[index] = { ...newSteps[index], url: val, name: `Pausa (${val}s)` };
                                  setSteps(newSteps);
                                }}
                              />
                              <span>segundos</span>
                            </div>
                          ) : req.name}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {req.method !== 'WAIT' && (
                          <button 
                            onClick={() => handleEditStep(index)} 
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Editar Requisição"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                        )}
                        <button onClick={() => moveRequest(index, 'up')} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg transition-all" title="Mover para cima"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5"/></svg></button>
                        <button onClick={() => moveRequest(index, 'down')} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg transition-all" title="Mover para baixo"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg></button>
                        <button 
                          onClick={() => removeRequest(index)} 
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                          title="Remover Passo"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Seleção para Cópia */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Copiar para Cenário</h3>
                <p className="text-xs text-slate-500 mt-1">Selecione uma requisição existente para adicionar como passo.</p>
              </div>
              <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl">&times;</button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <input 
                autoFocus
                type="text" 
                placeholder="Pesquisar requisições na coleção..." 
                className="input-base text-sm"
                value={copySearch}
                onChange={(e) => setCopySearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {getAllRequests(collection?.requests || [])
                .filter(r => r.name.toLowerCase().includes(copySearch.toLowerCase()) || r.url.toLowerCase().includes(copySearch.toLowerCase()))
                .map(req => (
                  <div 
                    key={req.id} 
                    onClick={() => copyRequestToScenario(req)}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-500 uppercase">{req.method}</span>
                      <span className="text-sm font-bold dark:text-white truncate">{req.name}</span>
                    </div>
                    <span className="text-blue-500 opacity-0 group-hover:opacity-100 font-bold text-xs transition-opacity">Adicionar Passo →</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}