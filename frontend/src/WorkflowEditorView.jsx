import React, { useState, useEffect } from 'react';

export default function WorkflowEditorView({ workflow, onUpdateWorkflow, onBack, onRun, onEditStep, collection, t }) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [steps, setSteps] = useState(workflow.steps || []);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySearch, setCopySearch] = useState('');
  const [targetGroupId, setTargetGroupId] = useState(null);
  // Navegação drill-down: path é um array de {id, label, branch}
  const [navPath, setNavPath] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'flowchart'

  useEffect(() => {
    onUpdateWorkflow({ ...workflow, name, description, steps });
  }, [steps]);

  useEffect(() => {
    setSteps(workflow.steps || []);
  }, [workflow?.id]);

  // Navegação: resolve o array de steps para o nível atual do navPath
  const getCurrentSteps = () => {
    let current = steps;
    for (const nav of navPath) {
      const parent = current.find(s => s.id === nav.id);
      if (!parent) return [];
      if (nav.branch === 'requests') current = parent.requests || [];
      else if (nav.branch === 'elseSteps') current = parent.elseSteps || [];
      else current = parent.steps || [];
    }
    return current;
  };

  const setCurrentSteps = (newItems) => {
    if (navPath.length === 0) {
      setSteps(newItems);
      return;
    }
    setSteps(prev => {
      const updateAtPath = (items, pathIdx) => {
        if (pathIdx >= navPath.length) return newItems;
        const nav = navPath[pathIdx];
        return items.map(s => {
          if (s.id !== nav.id) return s;
          const branch = nav.branch || 'steps';
          const childItems = branch === 'requests' ? (s.requests || []) : branch === 'elseSteps' ? (s.elseSteps || []) : (s.steps || []);
          const updated = updateAtPath(childItems, pathIdx + 1);
          return { ...s, [branch]: updated };
        });
      };
      return updateAtPath(prev, 0);
    });
  };

  const navigateInto = (step, branch = 'steps', label = '') => {
    setNavPath(prev => [...prev, { id: step.id, branch, label: label || step.name || step.type }]);
  };

  const navigateBack = (toIndex = -1) => {
    if (toIndex < 0) setNavPath([]);
    else setNavPath(prev => prev.slice(0, toIndex + 1));
  };

  // CRUD genérico no nível atual
  const addStep = (newStep) => {
    const current = getCurrentSteps();
    setCurrentSteps([...current, newStep]);
  };

  const removeStep = (id) => {
    setCurrentSteps(getCurrentSteps().filter(s => s.id !== id));
  };

  const moveStep = (index, direction) => {
    const current = [...getCurrentSteps()];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= current.length) return;
    const [removed] = current.splice(index, 1);
    current.splice(newIndex, 0, removed);
    setCurrentSteps(current);
  };

  const updateStepField = (id, field, value) => {
    setCurrentSteps(getCurrentSteps().map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const updateNestedCondField = (id, condField, field, value) => {
    setCurrentSteps(getCurrentSteps().map(s => s.id === id ? { ...s, [condField]: { ...s[condField], [field]: value } } : s));
  };

  const addExtraCond = (id, condField) => {
    setCurrentSteps(getCurrentSteps().map(s => {
      if (s.id !== id) return s;
      const obj = s[condField] || {};
      return { ...s, [condField]: { ...obj, conditions: [...(obj.conditions || []), { source: 'status', property: '', operator: '==', target: '200' }] } };
    }));
  };

  const updateExtraCond = (id, condField, ci, field, value) => {
    setCurrentSteps(getCurrentSteps().map(s => {
      if (s.id !== id) return s;
      const obj = { ...s[condField] };
      const conds = [...(obj.conditions || [])];
      conds[ci] = { ...conds[ci], [field]: value };
      return { ...s, [condField]: { ...obj, conditions: conds } };
    }));
  };

  const removeExtraCond = (id, condField, ci) => {
    setCurrentSteps(getCurrentSteps().map(s => {
      if (s.id !== id) return s;
      const obj = { ...s[condField] };
      return { ...s, [condField]: { ...obj, conditions: (obj.conditions || []).filter((_, i) => i !== ci) } };
    }));
  };

  // Fábricas de steps
  const makeRequest = () => ({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), type: 'request', name: 'Nova Action', method: 'GET', url: 'https://api.example.com', totalRequests: 1, duration: 0, headers: [], bodyType: 'none' });
  const makeParallel = () => ({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), type: 'parallel', requests: [] });
  const makeLoop = () => ({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), type: 'loop', loop: { source: 'status', property: '', operator: '==', target: '200', maxIter: 10, logic: 'and', conditions: [] }, steps: [] });
  const makeCondition = () => ({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), type: 'condition', condition: { source: 'status', property: '', operator: '==', target: '200', logic: 'and', conditions: [] }, steps: [], elseSteps: [] });
  const makeWait = () => ({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), type: 'wait', name: 'Pausa (5s)', url: '5' });

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
    const newStep = { ...originalReq, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), type: 'request', totalRequests: 1, duration: 0 };
    addStep(newStep);
    setIsCopyModalOpen(false);
    setCopySearch('');
  };

  // Helpers de renderização
  const getStepIcon = (type) => {
    switch (type) {
      case 'parallel': return { icon: '⚡', color: 'indigo', label: 'Parallel' };
      case 'loop': return { icon: '🔁', color: 'rose', label: 'Loop' };
      case 'condition': return { icon: '🔀', color: 'cyan', label: 'If/Else' };
      case 'wait': return { icon: '⏳', color: 'amber', label: 'Wait' };
      default: return { icon: '→', color: 'blue', label: 'Request' };
    }
  };

  const countChildren = (step) => {
    if (step.type === 'parallel') return (step.requests || []).length;
    if (step.type === 'loop') return (step.steps || []).length;
    if (step.type === 'condition') return (step.steps || []).length + (step.elseSteps || []).length;
    return 0;
  };

  const currentSteps = getCurrentSteps();

  // Renderiza a UI de condição inline (para loop e condition)
  const renderConditionEditor = (step, condField) => {
    const cond = step[condField] || {};
    return (
      <div className="p-3 bg-[#0B1020] border border-white/10 rounded-xl space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{condField === 'loop' ? (t.workflows?.editor?.loopCondition || 'Repetir enquanto') : (t.workflows?.editor?.conditionIf || 'Se')}</p>
          <div className="flex items-center gap-2">
            {(cond.conditions || []).length > 0 && (
              <select className="text-[9px] bg-[#161E31] border border-white/10 rounded-lg px-2 py-1 font-black uppercase text-slate-300 cursor-pointer" value={cond.logic || 'and'} onChange={(e) => updateNestedCondField(step.id, condField, 'logic', e.target.value)}>
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            )}
            <button onClick={() => addExtraCond(step.id, condField)} className="text-[9px] font-bold text-[#7C5CFF] hover:text-[#9B7FFF] transition-colors">+ Condição</button>
          </div>
        </div>
        {renderConditionRow(step.id, condField, cond)}
        {(cond.conditions || []).map((sub, ci) => (
          <div key={ci} className="flex gap-2 flex-wrap items-center pt-2 border-t border-white/5">
            <span className="text-[9px] font-black text-[#7C5CFF]/60 uppercase px-1.5 py-0.5 bg-[#7C5CFF]/5 rounded">{cond.logic || 'AND'}</span>
            {renderConditionRow(step.id, condField, sub, ci)}
            <button onClick={() => removeExtraCond(step.id, condField, ci)} className="p-1 text-rose-500/60 hover:text-rose-400 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
          </div>
        ))}
        {condField === 'loop' && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-[9px] font-bold text-slate-500">Max iterações:</span>
            <input type="number" min="1" className="w-16 text-xs bg-[#161E31] border border-white/10 rounded-lg px-2 py-1 font-bold text-slate-200 text-center focus:outline-none focus:border-[#7C5CFF]/50" value={cond.maxIter || 10} onChange={(e) => updateNestedCondField(step.id, condField, 'maxIter', parseInt(e.target.value) || 10)} />
          </div>
        )}
      </div>
    );
  };

  const renderConditionRow = (stepId, condField, cond, ci = null) => {
    const onChange = (field, value) => {
      if (ci !== null) updateExtraCond(stepId, condField, ci, field, value);
      else updateNestedCondField(stepId, condField, field, value);
    };
    return (
      <div className="flex gap-2 flex-wrap items-center">
        <select className="text-xs bg-[#161E31] border border-white/10 rounded-lg px-2.5 py-1.5 font-bold text-slate-200 cursor-pointer focus:outline-none focus:border-[#7C5CFF]/50" value={cond.source || 'status'} onChange={(e) => onChange('source', e.target.value)}>
          <option value="status">Status</option>
          <option value="body">Body</option>
          <option value="header">Header</option>
          <option value="variable">Variável</option>
        </select>
        {cond.source !== 'status' && (
          <input className="text-xs bg-[#161E31] border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-slate-300 flex-1 min-w-[80px] focus:outline-none focus:border-[#7C5CFF]/50" placeholder="property" value={cond.property || ''} onChange={(e) => onChange('property', e.target.value)} />
        )}
        <select className="text-xs bg-[#161E31] border border-white/10 rounded-lg px-2.5 py-1.5 font-bold text-slate-200 cursor-pointer focus:outline-none focus:border-[#7C5CFF]/50" value={cond.operator || '=='} onChange={(e) => onChange('operator', e.target.value)}>
          <option value="==">==</option><option value="!=">!=</option><option value="contains">contém</option><option value="exists">existe</option><option value="not_exists">não existe</option><option value=">">&gt;</option><option value=">=">&gt;=</option><option value="<">&lt;</option><option value="<=">&lt;=</option>
        </select>
        {cond.operator !== 'exists' && cond.operator !== 'not_exists' && (
          <input className="text-xs bg-[#161E31] border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-slate-300 w-20 focus:outline-none focus:border-[#7C5CFF]/50" placeholder="200" value={cond.target || ''} onChange={(e) => onChange('target', e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Toolbox */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label className="label-base">{t.config.descriptionPlaceholder}</label>
            <textarea className="input-base min-h-[80px] text-sm" value={description} onChange={e => setDescription(e.target.value)} placeholder={t.config.descriptionPlaceholder} />
          </div>
          <div className="p-4 bg-[#111827] rounded-2xl border border-white/5">
            <h3 className="text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest">{t.scenarios?.editor?.addComponents || 'Adicionar'}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { fn: () => addStep(makeRequest()), icon: '⚡', label: 'Action', color: 'blue' },
                { fn: () => addStep(makeParallel()), icon: '⫘', label: 'Parallel', color: 'indigo' },
                { fn: () => addStep(makeLoop()), icon: '🔁', label: 'Loop', color: 'rose' },
                { fn: () => addStep(makeCondition()), icon: '🔀', label: 'If/Else', color: 'cyan' },
                { fn: () => addStep(makeWait()), icon: '⏳', label: 'Wait', color: 'amber' },
                { fn: () => setIsCopyModalOpen(true), icon: '📋', label: 'Copiar', color: 'emerald' },
              ].map((item, i) => (
                <button key={i} onClick={item.fn} className={`flex items-center gap-2 p-2.5 bg-[#161E31] border border-white/5 rounded-xl hover:border-${item.color}-500/30 transition-all text-left`}>
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[10px] font-bold text-slate-300">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header com breadcrumb e toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-xs flex-wrap flex-1">
              {navPath.length > 0 ? (
                <>
                  <button onClick={() => navigateBack(-1)} className="text-slate-500 hover:text-white font-bold transition-colors">Workflow</button>
                  {navPath.map((nav, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-slate-600">/</span>
                      <button onClick={() => navigateBack(i)} className={`font-bold transition-colors ${i === navPath.length - 1 ? 'text-[#7C5CFF]' : 'text-slate-500 hover:text-white'}`}>{nav.label}</button>
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Steps do Workflow</span>
              )}
            </div>
            <div className="flex bg-[#161E31] border border-white/10 rounded-lg p-0.5 shrink-0">
              <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'list' ? 'bg-[#7C5CFF] text-white shadow' : 'text-slate-400 hover:text-white'}`}>Lista</button>
              <button onClick={() => setViewMode('flowchart')} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'flowchart' ? 'bg-[#7C5CFF] text-white shadow' : 'text-slate-400 hover:text-white'}`}>Fluxograma</button>
            </div>
          </div>

          {/* Vista Fluxograma */}
          {viewMode === 'flowchart' && (
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 overflow-auto max-h-[600px]">
              <FlowchartView steps={steps} />
            </div>
          )}

          {/* Vista Lista */}
          {viewMode === 'list' && (
          <>
          {/* Lista de steps do nível atual */}
          <div className="space-y-2">
            {currentSteps.map((step, index) => {
              const meta = getStepIcon(step.type);
              const children = countChildren(step);
              const isContainer = ['loop', 'condition', 'parallel'].includes(step.type);

              return (
                <div key={step.id} className={`group rounded-xl transition-all ${isContainer ? 'bg-[#111827] border border-white/5 hover:border-[#7C5CFF]/20 overflow-hidden' : 'flex items-center gap-3 p-3 bg-[#111827] border border-white/5 hover:border-[#7C5CFF]/20'}`}>
                  {/* ===== CONTAINER STEPS (loop, condition, parallel) ===== */}
                  {isContainer && (
                    <div>
                      {/* Header do container */}
                      <div className="flex items-center gap-3 p-3">
                        <span className="text-sm w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 shrink-0">{meta.icon}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{meta.label}</span>
                          <span className="text-[9px] text-slate-500 bg-[#0B1020] px-1.5 py-0.5 rounded">{children} item{children !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button disabled={index === 0} onClick={() => moveStep(index, 'up')} className={`p-1 text-slate-500 hover:text-blue-400 ${index === 0 ? 'opacity-20' : ''}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5"/></svg>
                          </button>
                          <button disabled={index === currentSteps.length - 1} onClick={() => moveStep(index, 'down')} className={`p-1 text-slate-500 hover:text-blue-400 ${index === currentSteps.length - 1 ? 'opacity-20' : ''}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg>
                          </button>
                          {step.type === 'parallel' && (
                            <button onClick={() => navigateInto(step, 'requests', 'Parallel')} className="px-2 py-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded-lg">Editar →</button>
                          )}
                          {step.type === 'loop' && (
                            <button onClick={() => navigateInto(step, 'steps', 'Loop')} className="px-2 py-1 text-[9px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg">Editar →</button>
                          )}
                          {step.type === 'condition' && (
                            <>
                              <button onClick={() => navigateInto(step, 'steps', 'Then ✅')} className="px-2 py-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg">Then →</button>
                              <button onClick={() => navigateInto(step, 'elseSteps', 'Else ❌')} className="px-2 py-1 text-[9px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg">Else →</button>
                            </>
                          )}
                          <button onClick={() => removeStep(step.id)} className="p-1 text-rose-500 hover:text-rose-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
                          </button>
                        </div>
                      </div>

                      {/* Condição inline (loop e condition) */}
                      {(step.type === 'loop' || step.type === 'condition') && (
                        <div className="px-3 pb-3">
                          {renderConditionEditor(step, step.type === 'loop' ? 'loop' : 'condition')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== SIMPLE STEPS (request, wait) ===== */}
                  {!isContainer && (
                    <>
                      <span className="text-sm w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 shrink-0">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        {step.type === 'wait' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300">Aguardar</span>
                            <input type="number" min="1" className="w-14 text-xs bg-[#161E31] border border-white/10 rounded-lg px-2 py-1 text-center font-bold text-amber-400 focus:outline-none focus:border-amber-500/50" value={step.url || '5'} onChange={(e) => { updateStepField(step.id, 'url', e.target.value); updateStepField(step.id, 'name', `Pausa (${e.target.value}s)`); }} onClick={(e) => e.stopPropagation()} />
                            <span className="text-xs text-slate-500">segundos</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-400 uppercase shrink-0">{step.method}</span>
                            <span className="text-xs font-bold text-slate-200 truncate">{step.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button disabled={index === 0} onClick={() => moveStep(index, 'up')} className={`p-1 text-slate-500 hover:text-blue-400 ${index === 0 ? 'opacity-20' : ''}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5"/></svg>
                        </button>
                        <button disabled={index === currentSteps.length - 1} onClick={() => moveStep(index, 'down')} className={`p-1 text-slate-500 hover:text-blue-400 ${index === currentSteps.length - 1 ? 'opacity-20' : ''}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg>
                        </button>
                        {step.type === 'request' && (
                          <button onClick={() => { onUpdateWorkflow({ ...workflow, name, description, steps }); onEditStep(step, navPath.length > 0 ? null : index, navPath.length > 0 ? index : null); }} className="p-1 text-blue-400 hover:text-blue-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        )}
                        <button onClick={() => removeStep(step.id)} className="p-1 text-rose-500 hover:text-rose-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {currentSteps.length === 0 && (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" strokeWidth="1.5"/></svg>
                <p className="text-sm font-medium">{navPath.length > 0 ? 'Vazio — adicione steps acima' : (t.workflows?.editor?.empty || 'Comece a montar seu workflow')}</p>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      {/* Modal de Cópia */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="bg-[#111827] rounded-3xl w-full max-w-2xl shadow-2xl border border-white/5 flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#161E31]">
              <div>
                <h3 className="text-lg font-bold text-white">{t.scenarios?.editor?.copyModal?.title || 'Copiar da Coleção'}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.scenarios?.editor?.copyModal?.subtitle || 'Selecione uma action para adicionar'}</p>
              </div>
              <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-2xl">&times;</button>
            </div>
            <div className="p-4 border-b border-white/5">
              <input autoFocus type="text" placeholder={t.scenarios?.editor?.copyModal?.search || 'Pesquisar...'} className="w-full bg-[#161E31] border border-white/5 text-slate-200 rounded-xl px-4 py-2.5 text-xs placeholder:text-slate-600 outline-none" value={copySearch} onChange={(e) => setCopySearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {getAllRequests(collection?.requests).filter(r => r.name?.toLowerCase().includes(copySearch.toLowerCase()) || r.url?.toLowerCase().includes(copySearch.toLowerCase())).map(req => (
                <div key={req.id} onClick={() => copyRequestToWorkflow(req)} className="flex items-center justify-between p-3 bg-[#161E31] border border-white/5 rounded-xl hover:border-[#7C5CFF]/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-400">{req.method}</span>
                    <span className="text-xs font-bold text-slate-200 truncate">{req.name}</span>
                  </div>
                  <span className="text-blue-400 opacity-0 group-hover:opacity-100 font-bold text-[10px]">Adicionar →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-white/5 text-center">
        <p className="text-[9px] text-slate-600 italic">{t.workflows?.editor?.note || 'Workflows suportam carga, loops, condicionais e paralelismo.'}</p>
      </div>
    </div>
  );
}

// Componente de Fluxograma SVG
function FlowchartView({ steps }) {
  const NODE_W = 160;
  const NODE_H = 40;
  const GAP_Y = 50;
  const GAP_X = 200;

  const layoutNodes = (items, startX, startY) => {
    const nodes = [];
    const edges = [];
    let y = startY;

    items.forEach((step, i) => {
      const nodeId = step.id;
      const label = step.type === 'request' ? `${step.method} ${step.name || ''}`.trim() :
                    step.type === 'wait' ? `⏳ ${step.url || 5}s` :
                    step.type === 'parallel' ? `⚡ Parallel (${(step.requests || []).length})` :
                    step.type === 'loop' ? `🔁 Loop (max ${step.loop?.maxIter || 10})` :
                    step.type === 'condition' ? `🔀 If/Else` : step.type;
      
      const color = step.type === 'request' ? '#3B82F6' :
                    step.type === 'wait' ? '#F59E0B' :
                    step.type === 'parallel' ? '#6366F1' :
                    step.type === 'loop' ? '#F43F5E' :
                    step.type === 'condition' ? '#06B6D4' : '#64748B';

      const shape = step.type === 'condition' ? 'diamond' : 'rect';
      nodes.push({ id: nodeId, x: startX, y, w: NODE_W, h: NODE_H, label, color, shape, type: step.type });

      if (i > 0) edges.push({ from: items[i - 1].id, to: nodeId });

      if (step.type === 'condition') {
        const thenCount = (step.steps || []).length;
        const elseCount = (step.elseSteps || []).length;
        if (thenCount > 0) {
          nodes.push({ id: `${nodeId}-then`, x: startX - GAP_X / 2, y: y + GAP_Y, w: 100, h: 28, label: `✅ Then (${thenCount})`, color: '#10B981', shape: 'rect', type: 'branch' });
          edges.push({ from: nodeId, to: `${nodeId}-then`, label: 'true' });
        }
        if (elseCount > 0) {
          nodes.push({ id: `${nodeId}-else`, x: startX + GAP_X / 2, y: y + GAP_Y, w: 100, h: 28, label: `❌ Else (${elseCount})`, color: '#F43F5E', shape: 'rect', type: 'branch' });
          edges.push({ from: nodeId, to: `${nodeId}-else`, label: 'false' });
        }
        if (thenCount > 0 || elseCount > 0) y += GAP_Y;
      }

      if (step.type === 'loop' && (step.steps || []).length > 0) {
        nodes.push({ id: `${nodeId}-body`, x: startX + NODE_W + 30, y, w: 110, h: 28, label: `↪ ${(step.steps || []).length} steps`, color: '#F43F5E', shape: 'rect', type: 'branch' });
        edges.push({ from: nodeId, to: `${nodeId}-body` });
        edges.push({ from: `${nodeId}-body`, to: nodeId, curved: true });
      }

      y += GAP_Y;
    });

    return { nodes, edges, totalHeight: y };
  };

  const { nodes, edges, totalHeight } = layoutNodes(steps, 250, 30);
  const svgWidth = 600;
  const svgHeight = Math.max(totalHeight + 30, 200);

  const getNodeBottom = (node) => ({ x: node.x + node.w / 2, y: node.y + node.h });
  const getNodeTop = (node) => ({ x: node.x + node.w / 2, y: node.y });

  return (
    <svg width={svgWidth} height={svgHeight} className="mx-auto">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#475569" />
        </marker>
      </defs>

      {edges.map((edge, i) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return null;
        const from = getNodeBottom(fromNode);
        const to = getNodeTop(toNode);

        if (edge.curved) {
          const cx = Math.max(from.x, to.x) + 50;
          return <path key={i} d={`M${from.x},${from.y} C${cx},${from.y} ${cx},${to.y} ${to.x},${to.y}`} fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#arrowhead)" />;
        }

        return (
          <g key={i}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
            {edge.label && <text x={(from.x + to.x) / 2 + 8} y={(from.y + to.y) / 2} fill="#64748B" fontSize="9" fontWeight="bold">{edge.label}</text>}
          </g>
        );
      })}

      {nodes.map(node => (
        <g key={node.id}>
          {node.shape === 'diamond' ? (
            <polygon points={`${node.x + node.w / 2},${node.y} ${node.x + node.w},${node.y + node.h / 2} ${node.x + node.w / 2},${node.y + node.h} ${node.x},${node.y + node.h / 2}`} fill="#0B1020" stroke={node.color} strokeWidth="2" />
          ) : (
            <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="8" fill="#0B1020" stroke={node.color} strokeWidth={node.type === 'branch' ? 1 : 2} />
          )}
          <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 4} textAnchor="middle" fill="#E2E8F0" fontSize={node.type === 'branch' ? 9 : 10} fontWeight="bold" fontFamily="monospace">
            {node.label.length > 22 ? node.label.slice(0, 22) + '…' : node.label}
          </text>
        </g>
      ))}

      {steps.length === 0 && (
        <text x={svgWidth / 2} y={svgHeight / 2} textAnchor="middle" fill="#475569" fontSize="12">Nenhum step no workflow</text>
      )}
    </svg>
  );
}
