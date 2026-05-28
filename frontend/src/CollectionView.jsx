import React, { useState, useEffect } from 'react';
import ScenarioView from './ScenarioView';
import ScenarioEditorView from './ScenarioEditorView';
import WorkflowView from './WorkflowView';
import WorkflowEditorView from './WorkflowEditorView';
import ServersView from './ServersView';

export default function CollectionView({ 
  collection, onSelectRequest, onUpdateName, onViewDocumentation, onRunRequest, 
  onRunSingleRequest, onBack, onAddRequest, onAddFolder, 
  onMoveRequest, onDeleteRequest, onDeleteFolder, onDeleteWorkflow, onReorderItem, onUpdateFolderName,
  onUpdateEnvironments, onSetActiveEnvironment, onUpdateScenarios, onUpdateWorkflows,
  selectedRequestIds = [], onToggleSelection, onViewUnifiedDoc,
  activeScenarioId, activeWorkflowId,
  setActiveScenarioId, setActiveWorkflowId, setActiveStepIndex, setActiveSubIndex
}) {
  const [activeTab, setActiveTab] = useState(activeScenarioId ? 'scenarios' : activeWorkflowId ? 'workflows' : 'requests'); // 'requests' | 'scenarios' | 'workflows' | 'mocks'
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false);
  const [search, setSearch] = useState('');
  const [isMockSubView, setIsMockSubView] = useState(false);
  const [mockCloseHandler, setMockCloseHandler] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  // Inicializa com activeScenarioId para persistir o editor ao voltar da configuração
  const [editingScenarioId, setEditingScenarioId] = useState(activeScenarioId || null); 
  const [editingWorkflowId, setEditingWorkflowId] = useState(activeWorkflowId || null);
  const [renamingCollection, setRenamingCollection] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [editingEnvId, setEditingEnvId] = useState(collection.activeEnvironmentId || (collection.environments?.[0]?.id));
  const [isRenamingEnv, setIsRenamingEnv] = useState(null);

  useEffect(() => {
    if (activeScenarioId) {
      setActiveTab('scenarios');
      setEditingScenarioId(activeScenarioId); // Ensure the editor is open if we came from editing a step
    } else {
      // If activeScenarioId becomes null, ensure we are not in scenario editor mode
      setEditingScenarioId(null);
    }
  }, [activeScenarioId]);

  useEffect(() => {
    if (activeWorkflowId) {
      setActiveTab('workflows');
      setEditingWorkflowId(activeWorkflowId);
    } else {
      setEditingWorkflowId(null);
    }
  }, [activeWorkflowId]);

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragStart = (e, requestId) => {
    e.dataTransfer.setData("requestId", requestId);
  };

  const handleAddEnvironment = () => {
    const newEnv = { id: Date.now().toString(), name: 'Novo Ambiente', variables: [] };
    onUpdateEnvironments(collection.id, [...(collection.environments || []), newEnv]);
    setEditingEnvId(newEnv.id);
  };

  const handleDeleteEnvironment = (envId) => {
    const envs = collection.environments || [];
    if (envs.length <= 1) return;
    const newEnvs = envs.filter(e => e.id !== envId);
    onUpdateEnvironments(collection.id, newEnvs);
    if (editingEnvId === envId) setEditingEnvId(newEnvs[0].id);
    if (collection.activeEnvironmentId === envId) onSetActiveEnvironment(collection.id, newEnvs[0].id);
  };

  const handleUpdateEnvName = (envId, newName) => {
    const newEnvs = (collection.environments || []).map(e => e.id === envId ? { ...e, name: newName } : e);
    onUpdateEnvironments(collection.id, newEnvs);
    setIsRenamingEnv(null);
  };

  const handleAddVariable = () => {
    const newEnvs = (collection.environments || []).map(env => {
      if (env.id !== editingEnvId) return env;
      return { ...env, variables: [...(env.variables || []), { key: '', value: '' }] };
    });
    onUpdateEnvironments(collection.id, newEnvs);
  };

  const handleUpdateVariable = (vIndex, field, val) => {
    const newEnvs = (collection.environments || []).map(env => {
      if (env.id !== editingEnvId) return env;
      const newVars = [...env.variables];
      newVars[vIndex][field] = val;
      return { ...env, variables: newVars };
    });
    onUpdateEnvironments(collection.id, newEnvs);
  };

  const handleRemoveVariable = (vIndex) => {
    const newEnvs = (collection.environments || []).map(env => {
      if (env.id !== editingEnvId) return env;
      return { ...env, variables: env.variables.filter((_, i) => i !== vIndex) };
    });
    onUpdateEnvironments(collection.id, newEnvs);
  };

  const currentEnv = collection.environments?.find(e => e.id === editingEnvId) || collection.environments?.[0];
  const activeEnvForDisplay = collection.environments?.find(e => e.id === collection.activeEnvironmentId);

  const resolveVariables = (text) => {
    if (!text || !activeEnvForDisplay) return text;
    let resolved = text;
    activeEnvForDisplay.variables.forEach(v => {
      if (v.key) {
        const regex = new RegExp(`{{\\s*${v.key}\\s*}}`, 'g');
        resolved = resolved.replace(regex, v.value);
      }
    });
    return resolved;
  };

  // Função auxiliar para renderizar um item de requisição
  const renderRequestItem = (req, isNested = false) => (
    <div key={req.id} className="flex items-center gap-2 group">
      <div className="flex items-center px-2">
        <input 
          type="checkbox" 
          checked={selectedRequestIds.includes(req.id)}
          onChange={() => onToggleSelection(req.id)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      </div>
      <div 
        draggable
        onDragStart={(e) => handleDragStart(e, req.id)}
        className={`flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all flex items-center justify-between shadow-sm ${isNested ? 'ml-2' : ''}`}
      >
      <div 
        className="flex items-center gap-4 flex-1 overflow-hidden cursor-pointer"
        onClick={() => onSelectRequest(req)}
      >
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-16 text-center ${
          req.method === 'GET' ? 'text-emerald-500' : req.method === 'POST' ? 'text-amber-500' : 'text-blue-500'
        }`}>{req.method}</span>
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{req.name}</p>
          <p className="text-[10px] text-slate-500 truncate max-w-xs md:max-w-md" title={resolveVariables(req.url)}>{resolveVariables(req.url)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, req.id, 'up'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Subir">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
        </button>
        {/* ... (existing code) */}
        <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, req.id, 'down'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Descer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onViewDocumentation(req); }}
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Ver Documentação"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onRunSingleRequest(req); }}
          className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
          title="Executar uma vez (Single Run)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onRunRequest(req); }}
          className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
          title="Executar Teste"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onSelectRequest(req); }}
          className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Editar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDeleteRequest(collection.id, req.id); }}
          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
          title="Excluir"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
        </button>
      </div>
    </div>
    </div>
  );

  const handleDragOverFolder = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation(); // Impede que o container raiz assuma o controle
    setDragOverFolderId(folderId);
  };

  const handleDragLeaveFolder = () => {
    setDragOverFolderId(null);
  };

  const handleDropOnFolder = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation(); // Crucial: evita que o item seja movido para a raiz logo em seguida
    setDragOverFolderId(null);
    setIsDraggingOverRoot(false);
    const requestId = e.dataTransfer.getData("requestId");
    if (requestId && requestId !== folderId) {
      onMoveRequest(collection.id, requestId, folderId);
    }
  };

  const renderFolderItem = (folder) => (
    <div key={folder.id} className="space-y-2">
      <div 
        onClick={() => toggleFolder(folder.id)}
        onDragOver={(e) => handleDragOverFolder(e, folder.id)}
        onDragLeave={handleDragLeaveFolder}
        onDrop={(e) => handleDropOnFolder(e, folder.id)}
        className={`flex items-center gap-2 p-2 cursor-pointer rounded-lg transition-colors group border border-transparent ${
          dragOverFolderId === folder.id ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 ring-2 ring-blue-500/50 shadow-md' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800'
        }`}
      >
        <svg className={`w-6 h-6 transition-transform text-blue-500 ${expandedFolders[folder.id] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
        <div className="flex-1 min-w-0"> {/* Flex-1 para o input usar todo o espaço disponível */}
          {renamingFolderId === folder.id ? (
            <input 
              autoFocus
              className="font-bold text-sm text-slate-600 dark:text-slate-400 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
              defaultValue={folder.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== folder.name) {
                  onUpdateFolderName(collection.id, e.target.value.trim(), folder.id);
                }
                setRenamingFolderId(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
          ) : (
            <span className="font-bold text-sm text-slate-600 dark:text-slate-400 truncate">{folder.name}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); }} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors" title="Renomear Pasta">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'up'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Subir">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'down'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Descer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onAddRequest(collection.id, 'Nova Requisição', folder.id); }} className="text-[10px] bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-all">+ Req</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(collection.id, folder.id); }} 
            className="p-1 text-slate-400 hover:text-rose-500 transition-colors" 
            title="Excluir Pasta"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
        </div>
      </div>
      {(expandedFolders[folder.id] || search.trim() !== '') && (
        <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-800 ml-6 pl-2"> {/* Aumentado ml para alinhamento */}
          {folder.requests?.map(req => renderRequestItem(req, true))}
          {folder.requests?.length === 0 && <p className="text-[10px] text-slate-500 italic ml-6">Pasta vazia</p>}
        </div>
      )}
    </div>
  );

  const handleDropOnRoot = (e) => {
    e.preventDefault();
    setIsDraggingOverRoot(false);
    setDragOverFolderId(null);
    const requestId = e.dataTransfer.getData("requestId");
    if (requestId) {
      onMoveRequest(collection.id, requestId, null);
    }
  };

  // Lógica de filtragem recursiva para buscar em pastas e requisições
  const getFilteredItems = (items, query) => {
    if (!query) return items;
    return items.reduce((acc, item) => {
      if (item.type === 'folder') {
        const filteredSub = getFilteredItems(item.requests || [], query);
        if (filteredSub.length > 0) {
          acc.push({ ...item, requests: filteredSub });
        }
      } else {
        if (item.name.toLowerCase().includes(query) || item.url.toLowerCase().includes(query)) {
          acc.push(item);
        }
      }
      return acc;
    }, []);
  };

  const filteredItems = getFilteredItems(collection.requests, search.toLowerCase());

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      {/* Modal de Gerenciamento de Ambientes */}
      {isEnvModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[70vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                Gerenciar Ambientes
              </h3>
              <button onClick={() => setIsEnvModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-2xl">&times;</button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar do Modal */}
              <div className="w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-2 overflow-y-auto">
                {(collection.environments || []).map(env => (
                  <div 
                    key={env.id}
                    onClick={() => setEditingEnvId(env.id)}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${editingEnvId === env.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                  >
                    {isRenamingEnv === env.id ? (
                      <input 
                        autoFocus
                        className="bg-transparent border-none outline-none w-full font-bold"
                        defaultValue={env.name}
                        onBlur={(e) => handleUpdateEnvName(env.id, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateEnvName(env.id, e.target.value)}
                      />
                    ) : (
                      <span className="font-bold text-sm truncate">{env.name}</span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setIsRenamingEnv(env.id); }} className="p-1 hover:text-emerald-400"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEnvironment(env.id); }} className="p-1 hover:text-rose-400"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                    </div>
                  </div>
                ))}
                <button onClick={handleAddEnvironment} className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all text-xs font-bold">+ NOVO AMBIENTE</button>
              </div>

              {/* Conteúdo de Variáveis */}
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                {currentEnv ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Variáveis em: {currentEnv.name}</h4>
                      <button onClick={handleAddVariable} className="text-xs font-bold text-blue-500 hover:underline">+ Adicionar Chave</button>
                    </div>
                    <div className="space-y-3">
                      {(currentEnv.variables || []).map((v, i) => (
                        <div key={i} className="flex gap-3">
                          <input className="input-base flex-1 font-mono text-xs" placeholder="CHAVE" value={v.key} onChange={(e) => handleUpdateVariable(i, 'key', e.target.value)} />
                          <input className="input-base flex-1 font-mono text-xs" placeholder="VALOR" value={v.value} onChange={(e) => handleUpdateVariable(i, 'value', e.target.value)} />
                          <button onClick={() => handleRemoveVariable(i)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic">Selecione ou crie um ambiente à esquerda</div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setIsEnvModalOpen(false)} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">Pronto</button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho da Coleção */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              // Se estiver editando um cenário, volta para a lista da coleção
              if (editingScenarioId) {
                setEditingScenarioId(null);
                setActiveScenarioId(null);
          } else if (editingWorkflowId) {
            setEditingWorkflowId(null);
            setActiveWorkflowId(null);
            } else if (mockCloseHandler) {
              mockCloseHandler();
              } else {
                onBack(); // Volta para o Dashboard
              }
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Voltar para o Dashboard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <div>
            {renamingCollection ? (
              <input 
                autoFocus
                className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 -ml-2"
                defaultValue={collection.name}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== collection.name) {
                    onUpdateName(collection.id, val);
                  }
                  setRenamingCollection(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              />
            ) : (
              <h1 
                onClick={() => setRenamingCollection(true)}
                className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight cursor-pointer hover:text-blue-600 transition-colors"
              >
                {collection.name}
              </h1>
            )}
            <p className="text-slate-500 text-sm italic">Ambiente de trabalho da coleção</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <select 
              value={collection.activeEnvironmentId}
              onChange={(e) => onSetActiveEnvironment(collection.id, e.target.value)}
              className="input-base !py-2 !pr-8 !text-xs font-bold appearance-none bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            >
              {collection.environments?.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </div>
          </div>
          <button 
            onClick={() => setIsEnvModalOpen(true)}
            className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            title="Gerenciar Ambientes"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        {/* Menu de Abas Interno */}
        {!editingScenarioId && !editingWorkflowId && !isMockSubView && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button 
              onClick={() => {
                setActiveTab('requests');
                setEditingScenarioId(null);
                setActiveScenarioId(null);
              }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'requests' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Requests
            </button>
            <button 
              onClick={() => {
                setActiveTab('scenarios');
              }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'scenarios' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Cenários
            </button>
            <button 
              onClick={() => {
                setActiveTab('workflows');
              }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'workflows' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Workflow
            </button>
            <button 
              onClick={() => {
                setActiveTab('mocks');
              }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'mocks' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Mocks
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo da Aba */}
      <div className="min-h-[400px]">
        {activeTab === 'requests' ? (
          <div className="space-y-6">
            {/* Cabeçalho da Aba de Requests (Estilo unificado) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Explorar Itens</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => onAddRequest(collection.id, 'Nova Requisição')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  NOVA REQUEST
                </button>
                <button 
                  onClick={() => onAddFolder(collection.id, 'Nova Pasta')}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                  NOVA PASTA
                </button>
              </div>
            </div>

            {/* Barra de Ações Contextuais e Busca */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full sm:w-auto">
                {selectedRequestIds.length > 0 && (
                  <button 
                    onClick={onViewUnifiedDoc}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-xl font-bold text-[10px] transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/40 animate-in fade-in slide-in-from-left-2 duration-300"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    GERAR DOC. UNIFICADA ({selectedRequestIds.length})
                  </button>
                )}
              </div>
              
              <div className="relative group w-full md:w-72">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar requisições..."
                  className="input-base !pl-10 !py-2 shadow-sm !bg-slate-50 dark:!bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all text-xs"
                />
              </div>
            </div>

            {/* Listagem Híbrida */}
            <div 
              className={`space-y-3 min-h-[200px] rounded-3xl transition-colors ${isDraggingOverRoot ? 'bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-300 dark:border-blue-800' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOverRoot(true); }}
              onDragLeave={() => setIsDraggingOverRoot(false)}
              onDrop={handleDropOnRoot}
            >
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 pointer-events-none">
                <p className="text-slate-500 italic">{search ? 'Nenhum item corresponde à busca' : 'Arraste itens aqui para mover para a raiz'}</p>
              </div>
            ) : (
              filteredItems.map((item) => 
                item.type === 'folder' ? renderFolderItem(item) : renderRequestItem(item)
              )
            )}
            {filteredItems.length > 0 && isDraggingOverRoot && (
               <div className="text-center py-4 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-2xl text-blue-500 text-xs font-bold">SOLTE PARA MOVER PARA A RAIZ</div>
            )}
            </div>
          </div>
        ) : activeTab === 'scenarios' ? (
          editingScenarioId ? (
            <ScenarioEditorView 
              scenario={collection.scenarios.find(s => s.id === editingScenarioId)}
              collection={collection}
              onBack={() => {
                setEditingScenarioId(null);
                setActiveScenarioId(null); // Agora limpamos para permitir a navegação correta
              }}
              onUpdateScenario={(updatedScen) => {
                const newScens = (collection.scenarios || []).map(s => s.id === updatedScen.id ? updatedScen : s);
                onUpdateScenarios(collection.id, newScens);
              }}
              onRun={(reqs, scenId) => {
                setActiveScenarioId(scenId);
                onRunRequest(reqs, scenId);
              }}
                onEditStep={(step, index) => {
                  if (!step) return;
                  onSelectRequest(step, 'config', editingScenarioId, index);
                }}
              />
            ) : (
              <ScenarioView 
                collection={collection} 
            onRunScenario={(reqs, scenId) => {
              setActiveScenarioId(scenId);
              onRunRequest(reqs, scenId);
            }} 
                onUpdateScenarios={onUpdateScenarios} 
                onEditScenario={setEditingScenarioId}
              />
            )
        ) : activeTab === 'workflows' ? (
          editingWorkflowId ? (
            <WorkflowEditorView 
              workflow={collection.workflows?.find(f => f.id === editingWorkflowId)}
              collection={collection}
              onBack={() => {
                setEditingWorkflowId(null);
                setActiveWorkflowId(null);
              }}
              onUpdateWorkflow={(updatedWorkflow) => {
                const newWorkflows = (collection.workflows || []).map(f => f.id === updatedWorkflow.id ? updatedWorkflow : f);
                onUpdateWorkflows(collection.id, newWorkflows);
              }}
              onRun={(steps) => onRunRequest(steps, editingWorkflowId, true)}
              onEditStep={(step, index, subIndex) => {
                if (!step) return;
                onSelectRequest(step, 'config', null, index, editingWorkflowId, subIndex);
              }}
            />
          ) : (
            <WorkflowView 
              collection={collection}
              onUpdateWorkflows={onUpdateWorkflows}
              onEditWorkflow={setEditingWorkflowId}
              onRunWorkflow={(steps, id) => onRunRequest(steps, id, true)}
              onDeleteWorkflow={onDeleteWorkflow}
            />
          )
        ) : (
          <ServersView onBack={() => setActiveTab('requests')} onSubViewChange={(active, closeFn) => {
            setIsMockSubView(active);
            setMockCloseHandler(() => closeFn);
          }} />
        )}
      </div>
    </div>
  );
}