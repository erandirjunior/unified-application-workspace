import React, { useState } from 'react';
// Certifique-se de que o caminho abaixo é o da imagem que você quer usar agora
import logo from './img/logo.png'; 

export default function CollectionsView({ collections, t, onSelectRequest, onCreateCollection, onDeleteCollection, onReorderCollection, onUpdateName }) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  // Estados para o Modal de Exportação
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingCol, setExportingCol] = useState(null);
  const [selectedVars, setSelectedVars] = useState({}); // { envId: { varKey: bool } }
  // NOVOS Estados para o Modal de Opções de Exportação
  const [exportOptionsModalOpen, setExportOptionsModalOpen] = useState(false);
  const [selectedExportOptions, setSelectedExportOptions] = useState({
    requests: {}, // { id: boolean }
    workflows: {},
  });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [renamingColId, setRenamingColId] = useState(null);

  // Helper para renderizar item granular no modal de exportação (Movido para fora do JSX)
  const renderExportItem = (item, type, level = 0) => {
    const isSelected = !!selectedExportOptions[type][item.id];
    return (
      <div key={item.id}>
        <label 
          className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={(e) => {
              const checked = e.target.checked;
              setSelectedExportOptions(prev => {
                const newSection = { ...prev[type], [item.id]: checked };
                if (item.type === 'folder') {
                  const fill = (children) => children.forEach(c => {
                    newSection[c.id] = checked;
                    if (c.type === 'folder') fill(c.requests || []);
                  });
                  fill(item.requests || []);
                }
                return { ...prev, [type]: newSection };
              });
            }}
            className="w-4 h-4 rounded border-slate-600 text-[#7C5CFF] focus:ring-[#7C5CFF] theme-base"
          />
          <div className="flex items-center gap-2 min-w-0">
            {item.type === 'folder' ? (
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            ) : type === 'workflows' ? (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            ) : (
              <span className={`text-[8px] font-black px-1 rounded border flex-shrink-0 ${item.method === 'GET' ? 'text-emerald-400 border-emerald-500/20' : 'text-blue-400 border-blue-500/20'}`}>{item.method}</span>
            )}
            <span className={`text-xs truncate ${item.type === 'folder' ? 'font-bold theme-text' : 'text-slate-400'}`}>
              {item.name}
            </span>
          </div>
        </label>
        {item.type === 'folder' && item.requests?.map(child => renderExportItem(child, type, level + 1))}
      </div>
    );
  };

  const handleOpenExport = (e, col) => {
    e.stopPropagation();
    setExportingCol(col);
    
    // Inicializa tudo como selecionado
    const requests = {};
    const workflows = {};

    const fillReqs = (items) => items.forEach(i => {
      requests[i.id] = true;
      if (i.type === 'folder') fillReqs(i.requests || []);
    });
    fillReqs(col.requests || []);
    (col.workflows || []).forEach(w => workflows[w.id] = true);

    setSelectedExportOptions({ requests, workflows });
    setExportOptionsModalOpen(true);
  };

  const handleExportOptionsNext = () => {
    setExportOptionsModalOpen(false);
    if (!exportingCol) return;

    const hasVars = exportingCol.environments?.some(env => env.variables?.length > 0);
    if (hasVars) {
      const initialSelection = {};
      exportingCol.environments.forEach(env => {
        initialSelection[env.id] = {};
        env.variables.forEach(v => {
          if (v.key) initialSelection[env.id][v.key] = true;
        });
      });
      setSelectedVars(initialSelection);
      setExportModalOpen(true);
    } else {
      executeExport(exportingCol, selectedExportOptions, {});
    }
  };

  const toggleVar = (envId, key) => {
    setSelectedVars(prev => ({
      ...prev,
      [envId]: {
        ...prev[envId],
        [key]: !prev[envId][key]
      }
    }));
  };

  const selectAllVars = (select) => {
    const newSelection = {};
    exportingCol.environments.forEach(env => {
      newSelection[env.id] = {};
      env.variables.forEach(v => {
        if (v.key) newSelection[env.id][v.key] = select;
      });
    });
    setSelectedVars(newSelection);
  };

  const executeExport = (col, itemOptions, varSelection) => {
    // Deep clone para não mexer no estado original
    const exportData = JSON.parse(JSON.stringify(col));

    // Filtra as variáveis de ambiente baseada na seleção
    if (exportData.environments) {
      exportData.environments = exportData.environments.map(env => ({
        ...env,
        variables: (env.variables || []).filter(v => varSelection[env.id]?.[v.key])
      }));
    }

    // Filtra requests, cenários e workflows baseados nas opções de item
    const filterRequests = (items) => {
      return items
        .map(item => {
          if (item.type === 'folder') {
            const filteredChildren = filterRequests(item.requests || []);
            // Mantém a pasta se ela estiver selecionada ou se tiver filhos selecionados
            if (itemOptions.requests[item.id] || filteredChildren.length > 0) {
              return { ...item, requests: filteredChildren };
            }
            return null;
          }
          return itemOptions.requests[item.id] ? item : null;
        })
        .filter(Boolean);
    };

    exportData.requests = filterRequests(col.requests || []);
    exportData.workflows = (col.workflows || []).filter(w => itemOptions.workflows[w.id]);

    // Metadados adicionais de exportação
    const finalPayload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      collection: exportData
    };

    const blob = new Blob([JSON.stringify(finalPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ast-collection-${col.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportModalOpen(false);
    setExportOptionsModalOpen(false);
    setExportingCol(null);
  };

  const countSelectedVars = () => {
    let count = 0;
    Object.values(selectedVars).forEach(env => {
      Object.values(env).forEach(val => { if (val) count++; });
    });
    return count;
  };

  const handleImportFileChange = (e) => {
    setImportFile(e.target.files[0]);
  };

  const handleImportCollection = () => {
    if (!importFile) return alert(t.toasts.importSelectFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        // Validação básica da estrutura
        if (!importedData.collection || !importedData.collection.id || !importedData.collection.name) {
          alert(t.toasts.importInvalidJson);
          return;
        }
        
        // Garante que o ID da coleção importada seja único
        const newCol = { ...importedData.collection, id: Date.now().toString() };
        onCreateCollection(newCol.name, newCol); // Passa a coleção completa para onCreateCollection
        alert(t.toasts.importSuccess.replace('{name}', newCol.name));
        setIsImportModalOpen(false);
        setImportFile(null);
      } catch (e) {
        alert(t.toasts.importError + e.message);
      }
    };
    reader.onerror = () => {
      alert(t.toasts.importReadError);
    };
    reader.readAsText(importFile);
  };

  const filteredCollections = collections.filter(col => 
    col.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 w-full h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl w-full mx-auto px-8 py-10 space-y-10">
        {/* Header com logo e criação */}
        <div className="flex flex-col items-center gap-6">
          <img 
            src={logo} 
            alt={t.header.logoAlt} 
            className="h-16 w-auto object-contain opacity-80" 
            key={logo}
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.dashboard.placeholder}
              className="flex-1 theme-elevated border theme-border theme-text rounded-xl px-5 py-3 text-sm font-mono placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#7C5CFF]/30 transition-all"
            />
            <button 
              onClick={() => { if(name.trim()) { onCreateCollection(name); setName(''); } }}
              className="bg-[#7C5CFF] hover:brightness-110 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-[#7C5CFF]/20 active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              {t.dashboard.newCollection}
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtro */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b theme-border pb-6">
          <div className="space-y-1 text-left">
            <h2 className="text-lg font-bold theme-text">{t.dashboard.title}</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{filteredCollections.length} {t.dashboard.itemsFound}</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto items-center">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 theme-elevated text-slate-400 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border theme-border whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {t.dashboard.import}
            </button>
            <div className="w-full md:w-72 relative">
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.dashboard.search}
                className="w-full theme-elevated border theme-border theme-text rounded-xl px-4 py-2.5 text-xs placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#7C5CFF]/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Grid de Collections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map(col => (
            <div key={col.id} onClick={() => onSelectRequest(col)} className="theme-surface border theme-border rounded-2xl p-5 hover:border-[#7C5CFF]/30 transition-all group relative flex flex-col cursor-pointer hover:shadow-lg hover:shadow-[#7C5CFF]/5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-[#7C5CFF] uppercase tracking-widest bg-[#7C5CFF]/10 px-2 py-0.5 rounded-md">
                    {col.requests?.length || 0} {t.dashboard.itemsCount}
                  </span>
                  {renamingColId === col.id ? (
                    <input 
                      autoFocus
                      className="text-base font-bold theme-text mt-2 bg-transparent border-none outline-none focus:ring-2 focus:ring-[#7C5CFF] rounded w-full"
                      defaultValue={col.name}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== col.name) {
                          onUpdateName(col.id, e.target.value.trim());
                        }
                        setRenamingColId(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    />
                  ) : (
                    <h3 className="text-base font-bold theme-text mt-2 truncate pr-6" title={col.name}>{col.name}</h3>
                  )}
                </div>
                <div className="flex gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setRenamingColId(col.id); }} className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/5" title={t.dashboard.rename}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onReorderCollection(col.id, 'up'); }} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5" title={t.dashboard.moveUp}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onReorderCollection(col.id, 'down'); }} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5" title={t.dashboard.moveDown}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button onClick={(e) => handleOpenExport(e, col)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title={t.dashboard.export}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteCollection(col.id); }} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title={t.dashboard.delete}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              
              {(col.workflows?.length > 0) && (
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{col.workflows.length} workflows</p>
              )}

              <div className="mt-auto pt-4 border-t theme-border">
                <span className="text-[10px] font-bold text-[#7C5CFF] uppercase tracking-widest group-hover:underline">
                  {t.dashboard.manage} →
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredCollections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <p className="text-sm font-medium">{t.common.empty || 'Nenhuma coleção encontrada'}</p>
          </div>
        )}
      </div>

      {/* Modal de Opções de Exportação */}
      {exportOptionsModalOpen && exportingCol && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="theme-surface rounded-3xl w-full max-w-lg shadow-2xl border theme-border flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b theme-border flex justify-between items-center theme-elevated">
              <div>
                <h3 className="text-xl font-bold theme-text">{t.dashboard.exportTitle}: {exportingCol.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.dashboard.exportDescription}</p>
              </div>
              <button onClick={() => setExportOptionsModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl">&times;</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b theme-border pb-1">{t.collection.tabs.requests}</h4>
                {exportingCol.requests?.length > 0 ? exportingCol.requests.map(item => renderExportItem(item, 'requests')) : <p className="text-xs text-slate-500 italic">{t.common.empty}</p>}
              </div>
              
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b theme-border pb-1">{t.collection.tabs.workflows}</h4>
                {exportingCol.workflows?.length > 0 ? exportingCol.workflows.map(item => renderExportItem(item, 'workflows')) : <p className="text-xs text-slate-500 italic">{t.common.empty}</p>}
              </div>
            </div>

            <div className="p-6 theme-elevated border-t theme-border flex justify-end gap-3">
              <button 
                onClick={() => setExportOptionsModalOpen(false)} 
                className="px-6 py-2.5 theme-base text-slate-400 rounded-xl font-bold hover:text-white transition-all border theme-border"
              >
                {t.common.cancel}
              </button>
              <button 
                onClick={handleExportOptionsNext} 
                className="px-8 py-2.5 bg-[#7C5CFF] text-white rounded-xl font-bold hover:brightness-110 shadow-lg shadow-[#7C5CFF]/20 transition-all flex items-center gap-2"
              >
                {t.common.next}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Fim do Bloco de Exportação Granular */}

      {/* Modal de Exportação com Seleção de Variáveis */}
      {exportModalOpen && exportingCol && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="theme-surface rounded-3xl w-full max-w-2xl shadow-2xl border theme-border flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b theme-border flex justify-between items-center theme-elevated">
              <div>
                <h3 className="text-xl font-bold theme-text">{t.dashboard.exportTitle}: {exportingCol.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.dashboard.exportVarsDescription}</p>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-center bg-[#7C5CFF]/10 p-4 rounded-2xl border border-[#7C5CFF]/20">
                <span className="text-sm font-bold text-[#7C5CFF]">
                  {countSelectedVars()} {t.common.selected}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => selectAllVars(true)} className="text-[10px] font-black theme-elevated px-3 py-1.5 rounded-lg border theme-border text-[#7C5CFF] hover:bg-[#7C5CFF]/10 transition-all uppercase">{t.header.logoAlt}</button>
                  <button onClick={() => selectAllVars(false)} className="text-[10px] font-black theme-elevated px-3 py-1.5 rounded-lg border theme-border text-slate-400 hover:text-white transition-all uppercase">{t.dashboard.clear}</button>
                </div>
              </div>

              <div className="space-y-6">
                {exportingCol.environments?.map(env => (
                  env.variables?.length > 0 && (
                    <div key={env.id} className="space-y-3">
                      <div className="flex items-center gap-2 border-b theme-border pb-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{env.name}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {env.variables.map(v => v.key && (
                          <label 
                            key={v.key} 
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedVars[env.id]?.[v.key] ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20' : 'theme-elevated theme-border'}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={!!selectedVars[env.id]?.[v.key]} 
                              onChange={() => toggleVar(env.id, v.key)}
                              className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 theme-base"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-bold truncate ${selectedVars[env.id]?.[v.key] ? 'text-emerald-400' : 'theme-text-secondary'}`}>
                                {v.key}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate font-mono">{v.value || t.dashboard.emptyValue}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="p-6 theme-elevated border-t theme-border flex justify-end gap-3">
              <button onClick={() => setExportModalOpen(false)} className="px-6 py-2.5 theme-base text-slate-400 rounded-xl font-bold hover:text-white transition-all border theme-border">{t.common.back}</button>
              <button onClick={() => executeExport(exportingCol, selectedExportOptions, selectedVars)} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {t.dashboard.exportNow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {isImportModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="theme-surface rounded-3xl w-full max-w-md shadow-2xl border theme-border flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b theme-border flex justify-between items-center theme-elevated">
              <div>
                <h3 className="text-xl font-bold theme-text">{t.dashboard.importTitle}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.dashboard.importDescription}</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <label htmlFor="import-file-input" className="block text-sm font-bold theme-text-secondary mb-2">{t.dashboard.importLabel}</label>
              <input 
                id="import-file-input"
                type="file" 
                accept=".json" 
                onChange={handleImportFileChange} 
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#7C5CFF]/10 file:text-[#7C5CFF] hover:file:bg-[#7C5CFF]/20"
              />
              {importFile && (
                <p className="text-xs text-slate-500 italic">Arquivo selecionado: {importFile.name}</p>
              )}
            </div>

            <div className="p-6 theme-elevated border-t theme-border flex justify-end gap-3">
              <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2.5 theme-base text-slate-400 rounded-xl font-bold hover:text-white transition-all border theme-border">{t.common.cancel}</button>
              <button onClick={handleImportCollection} className="px-8 py-2.5 bg-[#7C5CFF] text-white rounded-xl font-bold hover:brightness-110 shadow-lg shadow-[#7C5CFF]/20 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {t.dashboard.import}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}