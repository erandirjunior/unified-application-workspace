import React, { useState } from 'react';

export default function ScenarioView({ collection, onRunScenario, onUpdateScenarios, onEditScenario }) {
  const [newScenarioName, setNewScenarioName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const scenarios = collection.scenarios || [];
  
  const getAllRequests = (items) => {
    let reqs = [];
    items.forEach(item => {
      if (item.type === 'folder') reqs = [...reqs, ...getAllRequests(item.requests || [])];
      else reqs.push(item);
    });
    return reqs;
  };

  const availableRequests = getAllRequests(collection.requests || []);

  const handleAddScenario = () => {
    if (!newScenarioName.trim()) return;
    const newScen = { id: Date.now().toString(), name: newScenarioName, description: '', steps: [] };
    onUpdateScenarios(collection.id, [...scenarios, newScen]);
    setNewScenarioName('');
    setIsCreating(false);
  };

  const handleRun = (scen) => {
    const reqsToRun = scen.steps || [];
    if (reqsToRun.length === 0) return alert('Adicione passos ao cenário antes de rodar.');
    
    const formattedReqs = reqsToRun.map(r => {
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
    onRunScenario(formattedReqs, scen.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cenários de Teste</h2>
        <button onClick={() => setIsCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all">+ Novo Cenário</button>
      </div>
      {isCreating && (
        <div className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <input autoFocus className="input-base flex-1" placeholder="Nome do cenário..." value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} />
          <button onClick={handleAddScenario} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs">Salvar</button>
          <button onClick={() => setIsCreating(false)} className="text-slate-500 font-bold px-2">Cancelar</button>
        </div>
      )}
      <div className="grid gap-4">
        {scenarios.map(scen => (
          <div key={scen.id} className="p-6 bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{scen.name}</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black">{scen.steps?.length || 0} Requisições</p>
                {scen.description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">{scen.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRun(scen)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg></button>
                <button onClick={() => onEditScenario(scen.id)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar Fluxo"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                <button onClick={() => onUpdateScenarios(collection.id, scenarios.filter(s => s.id !== scen.id))} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}