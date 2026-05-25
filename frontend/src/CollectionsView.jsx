import React, { useState } from 'react';

export default function CollectionsView({ collections, onSelectRequest, onCreateCollection, onDeleteCollection, onReorderCollection, onUpdateName }) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  // Estados para o Modal de Exportação
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingCol, setExportingCol] = useState(null);
  const [selectedVars, setSelectedVars] = useState({}); // { envId: { varKey: bool } }
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [renamingColId, setRenamingColId] = useState(null);

  const handleOpenExport = (e, col) => {
    e.stopPropagation();
    const hasVars = col.environments?.some(env => env.variables?.length > 0);
    
    if (!hasVars) {
      // Se não houver variáveis, exporta direto
      executeExport(col, {});
    } else {
      // Inicializa todas como selecionadas por padrão
      const initialSelection = {};
      col.environments.forEach(env => {
        initialSelection[env.id] = {};
        env.variables.forEach(v => {
          if (v.key) initialSelection[env.id][v.key] = true;
        });
      });
      setSelectedVars(initialSelection);
      setExportingCol(col);
      setExportModalOpen(true);
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

  const executeExport = (col, selection) => {
    // Deep clone para não mexer no estado original
    const exportData = JSON.parse(JSON.stringify(col));

    // Filtra as variáveis de ambiente baseada na seleção
    if (exportData.environments) {
      exportData.environments = exportData.environments.map(env => ({
        ...env,
        variables: (env.variables || []).filter(v => selection[env.id]?.[v.key])
      }));
    }

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
    if (!importFile) return alert('Por favor, selecione um arquivo para importar.');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        // Validação básica da estrutura
        if (!importedData.collection || !importedData.collection.id || !importedData.collection.name) {
          alert('Arquivo JSON inválido. Certifique-se de que é um arquivo de coleção AST DevTools.');
          return;
        }
        
        // Garante que o ID da coleção importada seja único
        const newCol = { ...importedData.collection, id: Date.now().toString() };
        onCreateCollection(newCol.name, newCol); // Passa a coleção completa para onCreateCollection
        alert(`Coleção "${newCol.name}" importada com sucesso!`);
        setIsImportModalOpen(false);
        setImportFile(null);
      } catch (e) {
        alert('Erro ao processar o arquivo JSON: ' + e.message);
      }
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
    };
    reader.readAsText(importFile);
  };

  const filteredCollections = collections.filter(col => 
    col.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-12">
      {/* Cabeçalho de Introdução */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Organize seus testes de carga em coleções profissionais.</p>
      </div>

      {/* Seção de Criação Destacada (Hero Section) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: API de Pagamentos - Produção"
          className="input-base !bg-white dark:!bg-slate-900 py-3 !px-8 text-xl shadow-inner border-slate-200 dark:border-slate-800 flex-1"
        />
        <button 
          onClick={() => { if(name.trim()) { onCreateCollection(name); setName(''); } }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 rounded-2xl transition-all shadow-xl shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-3 text-lg"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Nova Coleção
        </button>
      </div>

      {/* Barra de Busca e Filtro */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1 text-left">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Suas Coleções</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredCollections.length} pastas encontradas</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto items-center">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-800 shadow-sm whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            IMPORTAR
          </button>
          <div className="w-full md:w-80 relative group">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Pesquisar coleções..."
              className="input-base !py-3 shadow-sm !bg-slate-50 dark:!bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCollections.map(col => (
          <div key={col.id} onClick={() => onSelectRequest(col)} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all group relative flex flex-col cursor-pointer hover:border-blue-500/50">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                  {col.requests?.length || 0} Itens
                </span>
                {renamingColId === col.id ? (
                  <input 
                    autoFocus
                    className="text-xl font-bold text-slate-900 dark:text-white mt-2 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded w-full"
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
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2 truncate pr-6" title={col.name}>{col.name}</h3>
                )}
              </div>
              <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setRenamingColId(col.id); }} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors" title="Renomear">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onReorderCollection(col.id, 'up'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Subir">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onReorderCollection(col.id, 'down'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Descer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <button onClick={(e) => handleOpenExport(e, col)} className="p-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md transition-colors" title="Exportar Coleção">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteCollection(col.id); }} className="p-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-md transition-colors" title="Excluir Coleção">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => onSelectRequest(col)}
              className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:no-underline"
            >
              Gerenciar Coleção →
            </button>
          </div>
        ))}
      </div>

      {/* Modal de Exportação com Seleção de Variáveis */}
      {exportModalOpen && exportingCol && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Exportar: {exportingCol.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Selecione quais variáveis de ambiente deseja incluir no arquivo.</p>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {countSelectedVars()} variáveis selecionadas
                </span>
                <div className="flex gap-2">
                  <button onClick={() => selectAllVars(true)} className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 hover:bg-blue-50 transition-all">SELECIONAR TODAS</button>
                  <button onClick={() => selectAllVars(false)} className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 transition-all">LIMPAR</button>
                </div>
              </div>

              <div className="space-y-6">
                {exportingCol.environments?.map(env => (
                  env.variables?.length > 0 && (
                    <div key={env.id} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{env.name}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {env.variables.map(v => v.key && (
                          <label 
                            key={v.key} 
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedVars[env.id]?.[v.key] ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={!!selectedVars[env.id]?.[v.key]} 
                              onChange={() => toggleVar(env.id, v.key)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-bold truncate ${selectedVars[env.id]?.[v.key] ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                {v.key}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate font-mono">{v.value || '(vazio)'}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setExportModalOpen(false)} className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition-all">CANCELAR</button>
              <button onClick={() => executeExport(exportingCol, selectedVars)} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                EXPORTAR AGORA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Importar Coleção</h3>
                <p className="text-xs text-slate-500 mt-1">Selecione um arquivo JSON de coleção para importar.</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Arquivo de Coleção (.json)</label>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportFileChange} 
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {importFile && (
                <p className="text-xs text-slate-500 italic">Arquivo selecionado: {importFile.name}</p>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition-all">CANCELAR</button>
              <button onClick={handleImportCollection} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                IMPORTAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}