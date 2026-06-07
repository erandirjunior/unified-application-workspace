import React, { useState } from 'react';

export default function WorkflowEditorView({ workflow, onUpdateWorkflow, onBack, onRun, onEditStep, collection, t }) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [steps, setSteps] = useState(workflow.steps || []);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySearch, setCopySearch] = useState('');
  const [targetGroupId, setTargetGroupId] = useState(null);

  const handleSave = () => {
    onUpdateWorkflow({ ...workflow, name, description, steps });
    onBack();
  };

  const addRequestStep = (groupId = null) => {
    const newReq = {
      id: Date.now().toString(),
      type: 'request',
      name: 'Nova Action',
      method: 'GET',
      url: 'https://api.example.com',
      totalRequests: 1, // Workflows sempre executam 1 vez
      duration: 0,
      headers: [],
      bodyType: 'none'
    };

    if (groupId) {
      setSteps(steps.map(s => s.id === groupId ? { ...s, requests: [...s.requests, newReq] } : s));
    } else {
      setSteps([...steps, newReq]);
    }
  };

  const getAllRequests = (items) => {
    let reqs = [];
    if (!items) return reqs;
    items.forEach(item => {
      if (item.type === 'folder') reqs = [...reqs, ...getAllRequests(item.requests || [])];
      else reqs.push(item);
    });
    return reqs;
  };

  const copyRequestToWorkflow = (originalReq) => {
    const newStep = {
      ...originalReq,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: 'request',
      totalRequests: 1,
      duration: 0,
    };

    if (targetGroupId) {
      setSteps(steps.map(s => s.id === targetGroupId ? { ...s, requests: [...s.requests, newStep] } : s));
    } else {
      setSteps([...steps, newStep]);
    }
    
    setIsCopyModalOpen(false);
    setTargetGroupId(null);
    setCopySearch('');
  };

  const addParallelGroup = () => {
    const newGroup = {
      id: Date.now().toString(),
      type: 'parallel',
      requests: []
    };
    setSteps([...steps, newGroup]);
  };

  const addWaitStep = () => {
    const waitStep = {
      id: Date.now().toString(),
      type: 'wait',
      name: 'Pausa (5s)',
      url: '5', // Usamos a URL para guardar o tempo em segundos
    };
    setSteps(prev => [...prev, waitStep]);
  };

  const removeStep = (id, groupId = null) => {
    if (groupId) {
      setSteps(steps.map(s => s.id === groupId ? { ...s, requests: s.requests.filter(r => r.id !== id) } : s));
    } else {
      setSteps(steps.filter(s => s.id !== id));
    }
  };

  const moveStep = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    const [removed] = newSteps.splice(index, 1);
    newSteps.splice(newIndex, 0, removed);
    setSteps(newSteps);
  };

  const moveSubStep = (groupIndex, subIndex, direction) => {
    const group = steps[groupIndex];
    const newIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    if (newIndex < 0 || newIndex >= group.requests.length) return;
    const newRequests = [...group.requests];
    const [removed] = newRequests.splice(subIndex, 1);
    newRequests.splice(newIndex, 0, removed);
    setSteps(steps.map((s, i) => i === groupIndex ? { ...s, requests: newRequests } : s));
  };

  const updateWaitStepDuration = (index, value) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, url: String(value), name: `Pausa (${value}s)` } : step
    ));
  };

  const renderStepCard = (step, index, subIndex = null) => {
    const isWaitStep = step.type === 'wait';
    const isRequestStep = step.type === 'request';
    const isTopLevel = subIndex === null;
    const parentList = isTopLevel ? steps : steps[index].requests;
    const currentIndex = isTopLevel ? index : subIndex;

    return (
      <div key={step.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          {isWaitStep ? (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-500/20 text-amber-500 uppercase">⌛ WAIT</span>
          ) : (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-500 uppercase">{step.method}</span>
          )}
          <div className="text-xs font-bold truncate dark:text-slate-200">
            {isWaitStep ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span>{t.scenarios.editor.waitLabel}</span>
                <input 
                  type="number" 
                  min="1"
                  className="w-14 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 text-center font-black text-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={step.url} // url armazena a duração para WAIT
                  onChange={(e) => updateWaitStepDuration(index, e.target.value)}
                />
                <span>{t.scenarios.editor.waitSuffix}</span>
              </div>
            ) : (
              step.name
            )}
          </div>
        </div>
        <div className="flex gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
          <button 
            disabled={currentIndex === 0}
            onClick={() => isTopLevel ? moveStep(index, 'up') : moveSubStep(index, subIndex, 'up')} 
            className={`p-1 text-slate-400 hover:text-blue-500 transition-all ${currentIndex === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
            title={t.scenarios.editor.moveUp}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5"/></svg>
          </button>
          <button 
            disabled={currentIndex === parentList.length - 1}
            onClick={() => isTopLevel ? moveStep(index, 'down') : moveSubStep(index, subIndex, 'down')} 
            className={`p-1 text-slate-400 hover:text-blue-500 transition-all ${currentIndex === parentList.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
            title={t.scenarios.editor.moveDown}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg>
          </button>

        {isRequestStep && (
        <button 
          onClick={() => { // Botão de editar só para requests, não para wait
            onUpdateWorkflow({ ...workflow, name, description, steps });
            onEditStep(step, index, subIndex);
          }}
          className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
          title={t.scenarios.editor.editStep}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
        )}
        <button 
          onClick={() => removeStep(step.id, subIndex !== null ? steps[index].id : null)} 
          className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg"
          title={t.collection.tooltips.delete}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
        </button>
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">{t.workflows.editor.title} {name}</h2>
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">{t.common.save}</button>
          <button onClick={() => onRun(steps)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20">{t.config.actions.runRequests}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Toolbox */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label className="label-base">{t.workflows.placeholder}</label>
            <input className="input-base text-lg font-bold" value={name} onChange={e => setName(e.target.value)} placeholder={t.workflows.placeholder} />
          </div>
          <div>
            <label className="label-base">{t.config.descriptionPlaceholder}</label>
            <textarea className="input-base min-h-[100px] text-sm" value={description} onChange={e => setDescription(e.target.value)} placeholder={t.config.descriptionPlaceholder} />
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">{t.scenarios.editor.addComponents}</h3>
            <div className="grid gap-3">
              <button onClick={() => addRequestStep()} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 transition-all">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold dark:text-white">{t.workflows.editor.stepSingle}</p>
                  <p className="text-[10px] text-slate-500">{t.workflows.editor.stepSingleSub}</p>
                </div>
              </button>
              <button onClick={addParallelGroup} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-500 transition-all">
                <div className="w-8 h-8 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold dark:text-white">{t.workflows.editor.stepParallel}</p>
                  <p className="text-[10px] text-slate-500">{t.workflows.editor.stepParallelSub}</p>
                </div>
              </button>
              <button onClick={() => { setTargetGroupId(null); setIsCopyModalOpen(true); }} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 transition-all">
                <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" strokeWidth="2"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold dark:text-white">{t.workflows.editor.stepCopy}</p>
                  <p className="text-[10px] text-slate-500">{t.workflows.editor.stepCopySub}</p>
                </div>
              </button>
              <button onClick={addWaitStep} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-amber-500 transition-all">
                <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold dark:text-white">{t.workflows.editor.stepWait}</p>
                  <p className="text-[10px] text-slate-500">{t.workflows.editor.stepWaitSub}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Canvas do Workflow */}
        <div className="lg:col-span-2 space-y-6 bg-slate-50/30 dark:bg-slate-950/20 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Conector Visual */}
              {index > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-200 dark:border-slate-800"></div>}
              
              {step.type === 'request' && (
                <div className="animate-in zoom-in-95 duration-300">
                  {renderStepCard(step, index)}
                </div>
              )}

              {step.type === 'parallel' && (
                <div className="p-4 bg-indigo-500/5 border-2 border-indigo-500/20 rounded-2xl space-y-3 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Execução Paralela
                    </span>
                    <div className="flex gap-2">
                      <button 
                        disabled={index === 0}
                        onClick={() => moveStep(index, 'up')}
                        className={`p-1 text-indigo-400 hover:text-indigo-600 transition-all ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                        title="Mover para cima"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5"/></svg>
                      </button>
                      <button 
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(index, 'down')}
                        className={`p-1 text-indigo-400 hover:text-indigo-600 transition-all ${index === steps.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
                        title="Mover para baixo"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg>
                      </button>
                      <button onClick={() => addRequestStep(step.id)} className="text-[10px] font-bold text-indigo-600 hover:underline">+ Adicionar</button>
                      <button onClick={() => { setTargetGroupId(step.id); setIsCopyModalOpen(true); }} className="text-[10px] font-bold text-emerald-600 hover:underline">+ Copiar</button>
                      <button onClick={() => removeStep(step.id)} className="text-rose-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(step.requests || []).map((req, subIdx) => renderStepCard(req, index, subIdx))}
                    {step.requests.length === 0 && (
                      <div className="col-span-full py-4 text-center text-[10px] text-slate-400 italic">Vazio - Adicione actions paralelas</div>
                    )}
                  </div>
                </div>
              )}

              {step.type === 'wait' && (
                <div className="animate-in zoom-in-95 duration-300">
                  {renderStepCard(step, index)}
                </div>
              )}
            </div>
          ))}

          {steps.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeWidth="1.5"/></svg>
              <p className="font-medium">{t.workflows.editor.empty}</p>
              <p className="text-xs opacity-60 mt-1 text-center">{t.workflows.editor.emptySub}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Seleção para Cópia */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold dark:text-white">{t.scenarios.editor.copyModal.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.scenarios.editor.copyModal.subtitle}</p>
              </div>
              <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl">&times;</button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <input 
                autoFocus
                type="text" 
                placeholder={t.scenarios.editor.copyModal.search} 
                className="input-base text-sm"
                value={copySearch}
                onChange={(e) => setCopySearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {getAllRequests(collection?.requests)
                .filter(r => r.name.toLowerCase().includes(copySearch.toLowerCase()) || r.url.toLowerCase().includes(copySearch.toLowerCase()))
                .map(req => (
                  <div 
                    key={req.id} 
                    onClick={() => copyRequestToWorkflow(req)}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-500 uppercase">{req.method}</span>
                      <span className="text-sm font-bold dark:text-white truncate">{req.name}</span>
                    </div>
                    <span className="text-blue-500 opacity-0 group-hover:opacity-100 font-bold text-xs transition-opacity">{t.scenarios.editor.copyModal.add}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[10px] text-slate-400 italic">
          {t.workflows.editor.note}
        </p>
      </div>
    </div>
  );
}