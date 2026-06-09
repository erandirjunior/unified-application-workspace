import React, { useState, useEffect } from 'react';

export default function WorkflowEditorView({ workflow, onUpdateWorkflow, onBack, onRun, onEditStep, collection, t }) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [steps, setSteps] = useState(workflow?.steps || []);
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
    setSteps(workflow?.steps || []);
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
      <div className="p-3 theme-base border theme-border rounded-xl space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{condField === 'loop' ? (t.workflows?.editor?.loopCondition || 'Repetir enquanto') : (t.workflows?.editor?.conditionIf || 'Se')}</p>
          <div className="flex items-center gap-2">
            {(cond.conditions || []).length > 0 && (
              <select className="text-[9px] theme-elevated border theme-border rounded-lg px-2 py-1 font-black uppercase theme-text-secondary cursor-pointer" value={cond.logic || 'and'} onChange={(e) => updateNestedCondField(step.id, condField, 'logic', e.target.value)}>
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            )}
            <button onClick={() => addExtraCond(step.id, condField)} className="text-[9px] font-bold text-[#7C5CFF] hover:text-[#9B7FFF] transition-colors">+ Condição</button>
          </div>
        </div>
        {renderConditionRow(step.id, condField, cond)}
        {(cond.conditions || []).map((sub, ci) => (
          <div key={ci} className="flex gap-2 flex-wrap items-center pt-2 border-t theme-border">
            <span className="text-[9px] font-black text-[#7C5CFF]/60 uppercase px-1.5 py-0.5 bg-[#7C5CFF]/5 rounded">{cond.logic || 'AND'}</span>
            {renderConditionRow(step.id, condField, sub, ci)}
            <button onClick={() => removeExtraCond(step.id, condField, ci)} className="p-1 text-rose-500/60 hover:text-rose-400 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
          </div>
        ))}
        {condField === 'loop' && (
          <div className="flex items-center gap-2 pt-2 border-t theme-border">
            <span className="text-[9px] font-bold text-slate-500">Max iterações:</span>
            <input type="number" min="1" className="w-16 text-xs theme-elevated border theme-border rounded-lg px-2 py-1 font-bold theme-text text-center focus:outline-none focus:border-[#7C5CFF]/50" value={cond.maxIter || 10} onChange={(e) => updateNestedCondField(step.id, condField, 'maxIter', parseInt(e.target.value) || 10)} />
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
        <select className="text-xs theme-elevated border theme-border rounded-lg px-2.5 py-1.5 font-bold theme-text cursor-pointer focus:outline-none focus:border-[#7C5CFF]/50" value={cond.source || 'status'} onChange={(e) => onChange('source', e.target.value)}>
          <option value="status">Status</option>
          <option value="body">Body</option>
          <option value="header">Header</option>
          <option value="variable">Variável</option>
        </select>
        {cond.source !== 'status' && (
          <input className="text-xs theme-elevated border theme-border rounded-lg px-2.5 py-1.5 font-mono theme-text-secondary flex-1 min-w-[80px] focus:outline-none focus:border-[#7C5CFF]/50" placeholder="property" value={cond.property || ''} onChange={(e) => onChange('property', e.target.value)} />
        )}
        <select className="text-xs theme-elevated border theme-border rounded-lg px-2.5 py-1.5 font-bold theme-text cursor-pointer focus:outline-none focus:border-[#7C5CFF]/50" value={cond.operator || '=='} onChange={(e) => onChange('operator', e.target.value)}>
          <option value="==">==</option><option value="!=">!=</option><option value="contains">contém</option><option value="exists">existe</option><option value="not_exists">não existe</option><option value=">">&gt;</option><option value=">=">&gt;=</option><option value="<">&lt;</option><option value="<=">&lt;=</option>
        </select>
        {cond.operator !== 'exists' && cond.operator !== 'not_exists' && (
          <input className="text-xs theme-elevated border theme-border rounded-lg px-2.5 py-1.5 font-mono theme-text-secondary w-20 focus:outline-none focus:border-[#7C5CFF]/50" placeholder="200" value={cond.target || ''} onChange={(e) => onChange('target', e.target.value)} />
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
          <div className="p-4 theme-surface rounded-2xl border theme-border">
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
                <button key={i} onClick={item.fn} className={`flex items-center gap-2 p-2.5 theme-elevated border theme-border rounded-xl hover:border-${item.color}-500/30 transition-all text-left`}>
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[10px] font-bold theme-text-secondary">{item.label}</span>
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
            <div className="flex theme-elevated border theme-border rounded-lg p-0.5 shrink-0">
              <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'list' ? 'bg-[#7C5CFF] text-white shadow' : 'text-slate-400 hover:text-white'}`}>Lista</button>
              <button onClick={() => setViewMode('flowchart')} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${viewMode === 'flowchart' ? 'bg-[#7C5CFF] text-white shadow' : 'text-slate-400 hover:text-white'}`}>Fluxograma</button>
            </div>
          </div>

          {/* Vista Fluxograma */}
          {viewMode === 'flowchart' && (
            <div className="theme-surface border theme-border rounded-2xl overflow-hidden">
              <div className="overflow-auto max-h-[600px] p-4">
                <FlowchartView steps={steps} />
              </div>
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
                <div key={step.id} className={`group rounded-xl transition-all ${isContainer ? 'theme-surface border theme-border hover:border-[#7C5CFF]/20 overflow-hidden' : 'flex items-center gap-3 p-3 theme-surface border theme-border hover:border-[#7C5CFF]/20'}`}>
                  {/* ===== CONTAINER STEPS (loop, condition, parallel) ===== */}
                  {isContainer && (
                    <div>
                      {/* Header do container */}
                      <div className="flex items-center gap-3 p-3">
                        <span className="text-sm w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 shrink-0">{meta.icon}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-xs font-bold theme-text">{meta.label}</span>
                          <span className="text-[9px] text-slate-500 theme-base px-1.5 py-0.5 rounded">{children} item{children !== 1 ? 's' : ''}</span>
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
                            <span className="text-xs font-bold theme-text-secondary">Aguardar</span>
                            <input type="number" min="1" className="w-14 text-xs theme-elevated border theme-border rounded-lg px-2 py-1 text-center font-bold text-amber-400 focus:outline-none focus:border-amber-500/50" value={step.url || '5'} onChange={(e) => { updateStepField(step.id, 'url', e.target.value); updateStepField(step.id, 'name', `Pausa (${e.target.value}s)`); }} onClick={(e) => e.stopPropagation()} />
                            <span className="text-xs text-slate-500">segundos</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-400 uppercase shrink-0">{step.method}</span>
                            <span className="text-xs font-bold theme-text truncate">{step.name}</span>
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
          <div className="theme-surface rounded-3xl w-full max-w-2xl shadow-2xl border theme-border flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b theme-border flex justify-between items-center theme-elevated">
              <div>
                <h3 className="text-lg font-bold text-white">{t.scenarios?.editor?.copyModal?.title || 'Copiar da Coleção'}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.scenarios?.editor?.copyModal?.subtitle || 'Selecione uma action para adicionar'}</p>
              </div>
              <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-2xl">&times;</button>
            </div>
            <div className="p-4 border-b theme-border">
              <input autoFocus type="text" placeholder={t.scenarios?.editor?.copyModal?.search || 'Pesquisar...'} className="w-full theme-elevated border theme-border theme-text rounded-xl px-4 py-2.5 text-xs placeholder:text-slate-600 outline-none" value={copySearch} onChange={(e) => setCopySearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {getAllRequests(collection?.requests).filter(r => r.name?.toLowerCase().includes(copySearch.toLowerCase()) || r.url?.toLowerCase().includes(copySearch.toLowerCase())).map(req => (
                <div key={req.id} onClick={() => copyRequestToWorkflow(req)} className="flex items-center justify-between p-3 theme-elevated border theme-border rounded-xl hover:border-[#7C5CFF]/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-400">{req.method}</span>
                    <span className="text-xs font-bold theme-text truncate">{req.name}</span>
                  </div>
                  <span className="text-blue-400 opacity-0 group-hover:opacity-100 font-bold text-[10px]">Adicionar →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t theme-border text-center">
        <p className="text-[9px] text-slate-600 italic">{t.workflows?.editor?.note || 'Workflows suportam carga, loops, condicionais e paralelismo.'}</p>
      </div>
    </div>
  );
}

// Componente de Fluxograma SVG com renderização recursiva e drag
function FlowchartView({ steps }) {
  const [offsets, setOffsets] = useState({});
  const [dragging, setDragging] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = React.useRef(null);

  const NODE_W = 160;
  const NODE_H = 40;
  const GAP_Y = 56;
  const BRANCH_GAP_X = 200;
  const INDENT_X = 35;

  const allNodes = [];
  const allEdges = [];

  const layoutSteps = (items, startX, startY, depth = 0) => {
    let y = startY;
    let prevId = null;

    items.forEach((step) => {
      const nodeId = step.id + '-d' + depth;
      const meta = {
        request: { color: '#3B82F6', bg: '#1E3A5F', icon: '→', label: `${step.method || 'GET'} ${step.name || 'Request'}` },
        wait: { color: '#F59E0B', bg: '#3D2E0A', icon: '⏳', label: `Aguardar ${step.url || 5}s` },
        parallel: { color: '#6366F1', bg: '#1E1B4B', icon: '⚡', label: `Parallel (${(step.requests || []).length})` },
        loop: { color: '#F43F5E', bg: '#3B0B1A', icon: '🔁', label: `Loop (max ${step.loop?.maxIter || 10})` },
        condition: { color: '#06B6D4', bg: '#0B2E3D', icon: '◆', label: 'Condição' },
      }[step.type] || { color: '#64748B', bg: '#1E293B', icon: '?', label: step.type };

      const shape = step.type === 'condition' ? 'diamond' : 'rect';
      allNodes.push({ id: nodeId, x: startX, y, w: NODE_W, h: NODE_H, label: meta.label, color: meta.color, bg: meta.bg, shape, icon: meta.icon, depth });
      if (prevId) allEdges.push({ from: prevId, to: nodeId });

      let blockEndY = y + NODE_H;

      if (step.type === 'parallel' && (step.requests || []).length > 0) {
        const children = step.requests;
        const childW = 120;
        const childGap = 12;
        const totalW = children.length * (childW + childGap) - childGap;
        let cx = startX + NODE_W / 2 - totalW / 2;
        const childY = y + GAP_Y;
        const joinId = nodeId + '-join';

        children.forEach((child) => {
          const cid = child.id + '-p' + depth;
          allNodes.push({ id: cid, x: cx, y: childY, w: childW, h: 32, label: `${child.method || 'GET'} ${child.name || ''}`.trim(), color: '#3B82F6', bg: '#1E3A5F', shape: 'rect', icon: '→', depth: depth + 1 });
          allEdges.push({ from: nodeId, to: cid });
          allEdges.push({ from: cid, to: joinId });
          cx += childW + childGap;
        });

        allNodes.push({ id: joinId, x: startX + NODE_W / 2 - 15, y: childY + 32 + 16, w: 30, h: 20, label: '●', color: '#6366F1', bg: '#1E1B4B', shape: 'circle', depth });
        blockEndY = childY + 32 + 16 + 20;
      }

      if (step.type === 'loop' && (step.steps || []).length > 0) {
        const innerY = y + GAP_Y;
        const innerEndY = layoutSteps(step.steps, startX + INDENT_X, innerY, depth + 1);
        allEdges.push({ from: nodeId, to: step.steps[0].id + '-d' + (depth + 1), dashed: false });
        // Loop back arrow
        allEdges.push({ fromX: startX + INDENT_X + NODE_W + 10, fromY: innerEndY - GAP_Y / 2, toX: startX + NODE_W / 2, toY: y + NODE_H, curved: true, loopBack: true });
        blockEndY = innerEndY;
      }

      if (step.type === 'condition') {
        const thenSteps = step.steps || [];
        const elseSteps = step.elseSteps || [];
        const branchY = y + GAP_Y;

        if (thenSteps.length > 0) {
          const thenX = startX - BRANCH_GAP_X / 2;
          const thenFirstId = thenSteps[0].id + '-d' + (depth + 1);
          allEdges.push({ from: nodeId, to: thenFirstId, label: '✓' });
          const thenEndY = layoutSteps(thenSteps, thenX, branchY, depth + 1);
          blockEndY = Math.max(blockEndY, thenEndY);
        } else {
          const emptyThenId = nodeId + '-then-empty';
          allNodes.push({ id: emptyThenId, x: startX - BRANCH_GAP_X / 2 + 30, y: branchY, w: 80, h: 24, label: '(vazio)', color: '#10B981', bg: '#0B2E1E', shape: 'rect', icon: '✓', depth: depth + 1 });
          allEdges.push({ from: nodeId, to: emptyThenId, label: '✓' });
          blockEndY = Math.max(blockEndY, branchY + 24);
        }

        if (elseSteps.length > 0) {
          const elseX = startX + BRANCH_GAP_X / 2;
          const elseFirstId = elseSteps[0].id + '-d' + (depth + 1);
          allEdges.push({ from: nodeId, to: elseFirstId, label: '✗' });
          const elseEndY = layoutSteps(elseSteps, elseX, branchY, depth + 1);
          blockEndY = Math.max(blockEndY, elseEndY);
        } else {
          const emptyElseId = nodeId + '-else-empty';
          allNodes.push({ id: emptyElseId, x: startX + BRANCH_GAP_X / 2 + 30, y: branchY, w: 80, h: 24, label: '(vazio)', color: '#F43F5E', bg: '#3B0B1A', shape: 'rect', icon: '✗', depth: depth + 1 });
          allEdges.push({ from: nodeId, to: emptyElseId, label: '✗' });
          blockEndY = Math.max(blockEndY, branchY + 24);
        }
      }

      y = blockEndY + GAP_Y - NODE_H;
      prevId = nodeId;
      y += NODE_H;
    });

    return y;
  };

  const totalHeight = layoutSteps(steps, 250, 30);
  const svgWidth = 750;
  const svgHeight = Math.max(totalHeight + 30, 200);

  const getNodePos = (node) => ({
    x: node.x + (offsets[node.id]?.x || 0),
    y: node.y + (offsets[node.id]?.y || 0),
  });

  const handleMouseDown = (e, nodeId) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const svgRect = svgRef.current.getBoundingClientRect();
    const scale = svgWidth / svgRect.width;
    setDragging({ id: nodeId, startX: e.clientX * scale, startY: e.clientY * scale, origOffset: offsets[nodeId] || { x: 0, y: 0 } });
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const scale = svgWidth / svgRect.width;
      const dx = e.clientX * scale - dragging.startX;
      const dy = e.clientY * scale - dragging.startY;
      setOffsets(prev => ({ ...prev, [dragging.id]: { x: dragging.origOffset.x + dx, y: dragging.origOffset.y + dy } }));
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  const handleBgMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect' && e.target.dataset.bg) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-black theme-text-muted uppercase tracking-widest">Arraste os nodes • Clique no fundo para mover a vista</span>
        <button onClick={() => { setOffsets({}); setPanOffset({ x: 0, y: 0 }); }} className="text-[9px] font-bold text-blue-500 hover:text-blue-400 transition-colors">Reset Layout</button>
      </div>
      <svg
        ref={svgRef}
        width="100%"
        height={svgHeight}
        viewBox={`${-panOffset.x} ${-panOffset.y} ${svgWidth} ${svgHeight}`}
        className="mx-auto cursor-grab active:cursor-grabbing select-none rounded-xl"
        onMouseDown={handleBgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
      <defs>
        <marker id="flow-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" opacity="0.7" />
        </marker>
        <marker id="loop-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#F43F5E" opacity="0.7" />
        </marker>
        <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Edges */}
      {allEdges.map((edge, i) => {
        if (edge.loopBack) {
          const { fromX, fromY, toX, toY } = edge;
          return <path key={i} d={`M${fromX},${fromY} C${fromX + 40},${fromY} ${toX + NODE_W},${toY} ${toX},${toY}`} fill="none" stroke="#F43F5E" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#loop-arrow)" opacity="0.5" />;
        }
        const fromNode = allNodes.find(n => n.id === edge.from);
        const toNode = allNodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return null;
        const fp = getNodePos(fromNode);
        const tp = getNodePos(toNode);
        const fx = fp.x + fromNode.w / 2;
        const fy = fp.y + fromNode.h;
        const tx = tp.x + toNode.w / 2;
        const ty = tp.y;
        const midY = (fy + ty) / 2;
        return (
          <g key={i}>
            <path d={`M${fx},${fy} C${fx},${midY} ${tx},${midY} ${tx},${ty}`} fill="none" stroke="#6366F1" strokeWidth="1.5" markerEnd="url(#flow-arrow)" opacity="0.5" />
            {edge.label && (
              <g>
                <rect x={(fx + tx) / 2 - 8} y={midY - 8} width="16" height="14" rx="3" fill="var(--bg-elevated)" stroke="var(--border-base)" strokeWidth="0.5" />
                <text x={(fx + tx) / 2} y={midY + 2} textAnchor="middle" fill={edge.label === '✓' ? '#10B981' : edge.label === '✗' ? '#F43F5E' : '#94A3B8'} fontSize="9" fontWeight="bold">{edge.label}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {allNodes.map(node => {
        const pos = getNodePos(node);
        const isDraggingThis = dragging?.id === node.id;
        if (node.shape === 'circle') {
          return (
            <g key={node.id} onMouseDown={(e) => handleMouseDown(e, node.id)} style={{ cursor: 'move' }}>
              <circle cx={pos.x + node.w / 2} cy={pos.y + node.h / 2} r={node.h / 2} fill={node.bg} stroke={node.color} strokeWidth="2" filter="url(#node-shadow)" />
            </g>
          );
        }
        const isSmall = node.h < 30;
        return (
          <g key={node.id} onMouseDown={(e) => handleMouseDown(e, node.id)} style={{ cursor: 'move' }} opacity={isDraggingThis ? 0.8 : 1}>
            {node.shape === 'diamond' ? (
              <polygon
                points={`${pos.x + node.w / 2},${pos.y - 4} ${pos.x + node.w + 4},${pos.y + node.h / 2} ${pos.x + node.w / 2},${pos.y + node.h + 4} ${pos.x - 4},${pos.y + node.h / 2}`}
                fill="var(--bg-elevated)" stroke={node.color} strokeWidth={isDraggingThis ? 3 : 2} filter="url(#node-shadow)"
              />
            ) : (
              <rect x={pos.x} y={pos.y} width={node.w} height={node.h} rx="10" fill="var(--bg-elevated)" stroke={node.color} strokeWidth={isDraggingThis ? 2.5 : 1.5} filter="url(#node-shadow)" />
            )}
            {node.shape === 'rect' && !isSmall && (
              <rect x={pos.x} y={pos.y} width="4" height={node.h} rx="2" fill={node.color} opacity="0.8" />
            )}
            <text
              x={pos.x + (node.shape === 'rect' && !isSmall ? 14 : node.w / 2)}
              y={pos.y + node.h / 2 + 4}
              textAnchor={node.shape === 'rect' && !isSmall ? 'start' : 'middle'}
              fill="var(--text-primary)"
              fontSize={isSmall ? 8 : 10}
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {node.label.length > 22 ? node.label.slice(0, 22) + '…' : node.label}
            </text>
          </g>
        );
      })}

      {steps.length === 0 && (
        <text x={svgWidth / 2} y={svgHeight / 2} textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontFamily="system-ui">Adicione steps para visualizar o fluxograma</text>
      )}
    </svg>
    </div>
  );
}
