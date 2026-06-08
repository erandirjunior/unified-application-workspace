import React, { useState, useEffect } from 'react';
import WorkflowView from './WorkflowView';
import WorkflowEditorView from './WorkflowEditorView';
import ServersView from './ServersView';
import ReportView from './ReportView';
import DocumentationView from './DocumentationView';
import SaveRequestForm from './SaveRequestForm';
import ConfigView from './ConfigView';

export default function CollectionView({ 
  collection, t, onSelectRequest, onUpdateName, onViewDocumentation, onRunRequest, 
  onRunSingleRequest, onBack, onAddRequest, onAddFolder, onImportCurl,
  onMoveRequest, onDeleteRequest, onDeleteFolder, onDeleteWorkflow, onReorderItem, onUpdateFolderName,
  onUpdateEnvironments, onSetActiveEnvironment, onUpdateScenarios, onUpdateWorkflows,
  reportData, requestLogs, isRunning, stopTest, sendRequests, lastExecutedPayload, onSaveResponseToDoc,
  docProps,
  selectedRequestIds = [], onToggleSelection, onViewUnifiedDoc,
  activeWorkflowId,
  setActiveWorkflowId, setActiveStepIndex, setActiveSubIndex, onCloseRequestEditor,
  isEnvModalOpen, setIsEnvModalOpen,
  activeTab, onTabChange, editorProps, children
}) { 
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false);
  const [search, setSearch] = useState('');
  const [isMockSubView, setIsMockSubView] = useState(false);
  const [mockCloseHandler, setMockCloseHandler] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState(activeWorkflowId || null);
  const [renamingCollection, setRenamingCollection] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [editingEnvId, setEditingEnvId] = useState(collection.activeEnvironmentId || (collection.environments?.[0]?.id));
  const [isRenamingEnv, setIsRenamingEnv] = useState(null);
  const [rightPanelTab, setRightPanelTab] = useState('docs');
  const [rightPanelSize, setRightPanelSize] = useState('normal'); // 'normal' | 'maximized' | 'minimized'
  const [selectedMock, setSelectedMock] = useState(null);
  const [isEditingMock, setIsEditingMock] = useState(false);
  const [monitoringMock, setMonitoringMock] = useState(null);
  const [mocks, setMocks] = useState([]);

  const fetchMocksList = async () => {
    try {
      const res = await fetch("http://localhost:8080/manage-mocks");
      const data = await res.json();
      setMocks(data || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === 'mocks') fetchMocksList();
  }, [activeTab]);

  useEffect(() => {
    if (activeWorkflowId) {
      onTabChange('workflows');
      setEditingWorkflowId(activeWorkflowId);
    } else {
      setEditingWorkflowId(null);
    }
  }, [activeWorkflowId, onTabChange]);

  const handleSaveMock = async (mockToSave = selectedMock, shouldClose = true, skipRefresh = false) => {
    if (!mockToSave) return;
    try {
      await fetch("http://localhost:8080/manage-mocks", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockToSave)
      });
      if (shouldClose) setIsEditingMock(false);
      if (skipRefresh) {
        // Atualiza apenas o item na lista local sem re-buscar do backend
        setMocks(prev => prev.map(m => m.id === mockToSave.id ? mockToSave : m));
      } else {
        fetchMocksList();
      }
    } catch (e) {}
  };

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

    if (!window.confirm('Tem certeza que deseja excluir este ambiente?')) return;

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

  const handleRunAndSwitch = (req, scenId, isWorkflow) => {
    if (rightPanelSize === 'minimized') setRightPanelSize('normal');
    setRightPanelTab('execution');
    onRunRequest(req, scenId, isWorkflow);
  };

  const handleRunSingleAndSwitch = (req) => {
    if (rightPanelSize === 'minimized') setRightPanelSize('normal');
    setRightPanelTab('execution');
    onRunSingleRequest(req);
  };

  const handleAddNewAction = () => {
    const newId = Date.now().toString();
    const newReq = { 
      id: newId, 
      name: 'Nova Action', 
      method: 'GET', 
      url: '', 
      responses: [], 
      headers: [], 
      bodyParams: [], 
      assertions: [], 
      extractions: [],
      type: 'request'
    };
    onAddRequest(collection.id, newReq.name, null);
    onSelectRequest(newReq);
  };

  const handleAddNewWorkflow = () => {
    const newId = Date.now().toString();
    const newWorkflow = { id: newId, name: 'Novo Workflow', description: '', steps: [] };
    onUpdateWorkflows(collection.id, [...(collection.workflows || []), newWorkflow]);
    setEditingWorkflowId(newId);
    if (setActiveWorkflowId) setActiveWorkflowId(newId);
  };

  const handleAddNewMock = () => {
    const newMock = { 
      id: Date.now().toString(), 
      name: 'Novo Mock', 
      path: '/api/v1/resource', 
      method: 'GET', 
      response: { status: 200, body: '{}', headers: { 'Content-Type': 'application/json' } }, 
      assertions: [], 
      active: false 
    };
    setSelectedMock(newMock);
    setIsEditingMock(true);
    setMonitoringMock(null);
  };

  // Função auxiliar para renderizar um item de requisição
  const renderRequestItem = (req, isNested = false, index, parentList) => (
    <div key={req.id} className="group">
      <div 
        draggable
        onDragStart={(e) => handleDragStart(e, req.id)}
        onClick={() => {
          if (rightPanelSize === 'maximized') setRightPanelSize('normal');
          onSelectRequest(req);
        }}
        className={`flex items-center gap-2 h-[40px] px-3 rounded-lg cursor-pointer transition-all border font-['Inter'] ${
          editorProps?.activeRequestId === req.id 
            ? 'bg-[#161E31] border-[#7C5CFF] shadow-[0_0_0_1px_#7C5CFF,0_0_30px_rgba(124,92,255,0.25)]' 
            : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
        } ${isNested ? 'ml-4' : ''}`}
      >
        <div className={`w-[42px] h-4.5 rounded flex items-center justify-center text-[8px] font-black shrink-0 tracking-widest ${
          req.method === 'GET' ? 'bg-[#0A2E22] text-[#00D084]' : 
          req.method === 'POST' ? 'bg-[#332200] text-[#FFB020]' : 
          req.method === 'PUT' ? 'bg-[#002A4E] text-[#3B82F6]' : 'bg-[#3B0B0B] text-[#EF4444]'
        }`}>
          {req.method}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-200 truncate block leading-none">{req.name}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, req.id, 'up'); }}
            className={`p-1 text-slate-500 hover:text-blue-500 transition-colors ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
            title={t.collection.tooltips.moveUp}
            disabled={index === 0}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, req.id, 'down'); }}
            className={`p-1 text-slate-500 hover:text-blue-500 transition-colors ${index === parentList.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
            title={t.collection.tooltips.moveDown}
            disabled={index === parentList.length - 1}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(collection.id, req.id); }}
            className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
            title={t.collection.tooltips.delete}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  );

  const handleDragOverFolder = (e, folderId) => { // Drag and Drop handlers
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

  const renderFolderItem = (folder, index, parentList) => (
    <div key={folder.id} className="space-y-1">
      <div 
        onClick={() => toggleFolder(folder.id)}
        onDragOver={(e) => handleDragOverFolder(e, folder.id)}
        onDragLeave={handleDragLeaveFolder}
        onDrop={(e) => handleDropOnFolder(e, folder.id)}
        className={`flex items-center gap-2 h-[38px] px-3 rounded-lg transition-all group border border-transparent ${
          dragOverFolderId === folder.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-transparent hover:bg-white/5'
        }`}
      >
        <svg className={`w-3.5 h-3.5 transition-transform text-slate-500 ${expandedFolders[folder.id] ? 'rotate-90 text-slate-300' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
        <svg className="w-4 h-4 text-amber-500/80 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
        <div className="flex-1 min-w-0">
          {renamingFolderId === folder.id ? (
            <input 
              autoFocus
              className="font-bold text-[11px] text-slate-600 dark:text-slate-400 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
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
            <span className="font-bold text-xs text-slate-400 truncate uppercase tracking-widest block">{folder.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'up'); }}
            className={`p-1 text-slate-400 hover:text-blue-500 ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
            title={t.collection.tooltips.moveUp}
            disabled={index === 0}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'down'); }}
            className={`p-1 text-slate-400 hover:text-blue-500 ${index === parentList.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
            title={t.collection.tooltips.moveDown}
            disabled={index === parentList.length - 1}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (rightPanelSize === 'maximized') setRightPanelSize('normal');
              onAddRequest(collection.id, 'Nova Action', folder.id); 
            }} 
            className="p-1 text-slate-400 hover:text-blue-500"
            title={t.collection.actions.newRequest}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); }} 
            className="p-1 text-slate-400 hover:text-emerald-500" 
            title={t.collection.tooltips.renameFolder}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(collection.id, folder.id); }} 
            className="p-1 text-slate-400 hover:text-rose-500"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2.5"/></svg>
          </button>
        </div>
      </div>
      {(expandedFolders[folder.id] || search.trim() !== '') && (
        <div className="space-y-0.5 border-l border-white/5 ml-3.5">
          {folder.requests?.map((req, index) => renderRequestItem(req, true, index, folder.requests))}
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
        const searchFields = [item.name, item.url, item.path].filter(Boolean).map(s => s.toLowerCase());
        if (searchFields.some(f => f.includes(query))) {
          acc.push(item);
        }
      }
      return acc;
    }, []);
  };

  const filteredItems = getFilteredItems(collection.requests, search.toLowerCase());
  const filteredWorkflows = getFilteredItems(collection.workflows || [], search.toLowerCase());
  const filteredMocks = mocks.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.path?.toLowerCase().includes(search.toLowerCase())
  );

  // Renderiza item de pasta para workflows
  const renderWorkflowFolderItem = (folder, index, parentList) => (
    <div key={folder.id} className="space-y-1">
      <div 
        onClick={() => toggleFolder(folder.id)}
        className={`flex items-center gap-2 h-[38px] px-3 rounded-lg transition-all group border border-transparent bg-transparent hover:bg-white/5`}
      >
        <svg className={`w-3.5 h-3.5 transition-transform text-slate-500 ${expandedFolders[folder.id] ? 'rotate-90 text-slate-300' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
        <svg className="w-4 h-4 text-amber-500/80 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
        <div className="flex-1 min-w-0">
          {renamingFolderId === folder.id ? (
            <input 
              autoFocus
              className="font-bold text-[11px] text-slate-400 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
              defaultValue={folder.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== folder.name) {
                  onUpdateFolderName(collection.id, e.target.value.trim(), folder.id, 'workflows');
                }
                setRenamingFolderId(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
          ) : (
            <span className="font-bold text-xs text-slate-400 truncate uppercase tracking-widest block">{folder.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'up', 'workflows'); }} className={`p-1 text-slate-400 hover:text-blue-500 ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === 0}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'down', 'workflows'); }} className={`p-1 text-slate-400 hover:text-blue-500 ${index === parentList.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === parentList.length - 1}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); }} className="p-1 text-slate-400 hover:text-emerald-500" title={t.collection.tooltips.renameFolder}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(collection.id, folder.id, 'workflows'); }} className="p-1 text-slate-400 hover:text-rose-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2.5"/></svg>
          </button>
        </div>
      </div>
      {(expandedFolders[folder.id] || search.trim() !== '') && (
        <div className="space-y-0.5 border-l border-white/5 ml-3.5">
          {folder.requests?.map((wf, idx) => renderWorkflowListItem(wf, idx, folder.requests, true))}
        </div>
      )}
    </div>
  );

  // Renderiza item de pasta para mocks
  const renderMockFolderItem = (folder, index, parentList) => (
    <div key={folder.id} className="space-y-1">
      <div 
        onClick={() => toggleFolder(folder.id)}
        className={`flex items-center gap-2 h-[38px] px-3 rounded-lg transition-all group border border-transparent bg-transparent hover:bg-white/5`}
      >
        <svg className={`w-3.5 h-3.5 transition-transform text-slate-500 ${expandedFolders[folder.id] ? 'rotate-90 text-slate-300' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
        <svg className="w-4 h-4 text-amber-500/80 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
        <div className="flex-1 min-w-0">
          {renamingFolderId === folder.id ? (
            <input 
              autoFocus
              className="font-bold text-[11px] text-slate-400 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-full"
              defaultValue={folder.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== folder.name) {
                  onUpdateFolderName(collection.id, e.target.value.trim(), folder.id, 'mocks');
                }
                setRenamingFolderId(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
          ) : (
            <span className="font-bold text-xs text-slate-400 truncate uppercase tracking-widest block">{folder.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'up', 'mocks'); }} className={`p-1 text-slate-400 hover:text-blue-500 ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === 0}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, folder.id, 'down', 'mocks'); }} className={`p-1 text-slate-400 hover:text-blue-500 ${index === parentList.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === parentList.length - 1}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); }} className="p-1 text-slate-400 hover:text-emerald-500" title={t.collection.tooltips.renameFolder}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(collection.id, folder.id, 'mocks'); }} className="p-1 text-slate-400 hover:text-rose-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2.5"/></svg>
          </button>
        </div>
      </div>
      {(expandedFolders[folder.id] || search.trim() !== '') && (
        <div className="space-y-0.5 border-l border-white/5 ml-3.5">
          {folder.requests?.map((mock, idx) => renderMockListItem(mock, idx, folder.requests, true))}
        </div>
      )}
    </div>
  );

  // Renderiza item de workflow na listagem
  const renderWorkflowListItem = (workflow, index, parentList, isNested = false) => (
    <div 
      key={workflow.id}
      onClick={() => { if (rightPanelSize === 'maximized') setRightPanelSize('normal'); onTabChange('workflows'); setEditingWorkflowId(workflow.id); }}
      className={`group flex items-center justify-between gap-2 h-[40px] px-3 rounded-lg cursor-pointer transition-all border ${
        editingWorkflowId === workflow.id 
          ? 'bg-[#161E31] border-[#7C5CFF] shadow-[0_0_0_1px_#7C5CFF,0_0_30px_rgba(124,92,255,0.25)]' 
          : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
      } pr-2 ${isNested ? 'ml-4' : ''}`}
    >
      <div className="flex-1 flex items-center gap-2 overflow-hidden">
        <svg className={`w-4 h-4 shrink-0 ${editingWorkflowId === workflow.id ? 'text-[#7C5CFF]' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <span className="text-sm font-medium text-slate-200 truncate">{workflow.name}</span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, workflow.id, 'up', 'workflows'); }} className={`p-1 text-slate-500 hover:text-blue-400 transition-colors ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === 0}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, workflow.id, 'down', 'workflows'); }} className={`p-1 text-slate-500 hover:text-blue-400 transition-colors ${index === parentList.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === parentList.length - 1}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDeleteWorkflow(collection.id, workflow.id); if(editingWorkflowId === workflow.id) setEditingWorkflowId(null); }} className="p-1 text-slate-500 hover:text-rose-500 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
        </button>
      </div>
    </div>
  );

  // Renderiza item de mock na listagem
  const renderMockListItem = (mock, index, parentList, isNested = false) => (
    <div 
      key={mock.id}
      onClick={() => {
        onTabChange('mocks');
        if (rightPanelSize === 'maximized') setRightPanelSize('normal');
        setSelectedMock(mock);
        setIsEditingMock(true);
        setMonitoringMock(null);
      }}
      className={`group flex items-center justify-between gap-2 h-[40px] px-3 rounded-lg cursor-pointer transition-all border ${
        (monitoringMock?.id === mock.id || selectedMock?.id === mock.id)
          ? 'bg-[#161E31] border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
          : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
      } pr-2 ${isNested ? 'ml-4' : ''}`}
    >
      <div className="flex-1 flex items-center gap-2 overflow-hidden">
        <div className={`w-[42px] h-4.5 rounded flex items-center justify-center text-[8px] font-black shrink-0 tracking-widest ${
          mock.method === 'GET' ? 'bg-[#0A2E22] text-[#00D084]' : 
          mock.method === 'POST' ? 'bg-[#332200] text-[#FFB020]' : 
          mock.method === 'PUT' ? 'bg-[#002A4E] text-[#3B82F6]' : 
          mock.method === 'DELETE' ? 'bg-[#3B0B0B] text-[#EF4444]' : 'bg-[#1a1a2e] text-[#a78bfa]'
        }`}>
          {mock.method}
        </div>
        <span className="text-sm font-medium text-slate-200 truncate">{mock.name}</span>
        {mock.active && monitoringMock?.id === mock.id && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]"></span>}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, mock.id, 'up', 'mocks'); }} className={`p-1 text-slate-500 hover:text-blue-400 transition-colors ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === 0}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onReorderItem(collection.id, mock.id, 'down', 'mocks'); }} className={`p-1 text-slate-500 hover:text-blue-400 transition-colors ${index === parentList.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`} disabled={index === parentList.length - 1}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button onClick={async (e) => { e.stopPropagation(); if (window.confirm(t.mocks.confirmDelete)) { await fetch(`http://localhost:8080/manage-mocks?id=${mock.id}`, { method: 'DELETE' }); fetchMocksList(); if (monitoringMock?.id === mock.id) setMonitoringMock(null); if (selectedMock?.id === mock.id) { setSelectedMock(null); setIsEditingMock(false); } } }} className="p-1 text-slate-500 hover:text-rose-500 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
        </button>
      </div>
    </div>
  );

  // Verifica se temos uma action selecionada para exibir o editor
  const isEditingAction = editorProps?.activeRequestId || 
                          (editorProps?.activeScenarioId && editorProps?.activeStepIndex !== null) ||
                          (editorProps?.activeWorkflowId && editorProps?.activeStepIndex !== null);

  return (
    <div className="flex flex-col h-full w-full bg-[#0B1020] overflow-hidden">
      {/* Modal de Gerenciamento de Ambientes */}
      {isEnvModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
          <div className="bg-[#111827] rounded-3xl w-full max-w-4xl shadow-2xl border border-white/5 flex flex-col h-[70vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                {t.collection.envModalTitle}
              </h3>
              <button onClick={() => setIsEnvModalOpen(false)} className="text-slate-500 hover:text-white transition-colors text-2xl">&times;</button>
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
                      <button onClick={(e) => { e.stopPropagation(); setIsRenamingEnv(env.id); }} className="p-1 hover:text-emerald-400" title={t.collection.envModal.renameEnv}><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEnvironment(env.id); }} className="p-1 hover:text-rose-400" title={t.collection.envModal.deleteEnv}><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                    </div>
                  </div>
                ))}
                <button onClick={handleAddEnvironment} className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all text-xs font-bold">{t.collection.envModal.newEnv}</button>
              </div>

              {/* Conteúdo de Variáveis */}
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                {currentEnv ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t.collection.envModal.varsTitle} {currentEnv.name}</h4>
                      <button onClick={handleAddVariable} className="text-xs font-bold text-blue-500 hover:underline">{t.collection.envModal.addVar}</button>
                    </div>
                    <div className="space-y-3">
                      {(currentEnv.variables || []).map((v, i) => (
                        <div key={i} className="flex gap-3">
                          <input className="input-base flex-1 font-mono text-xs" placeholder={t.collection.envModal.placeholderKey} value={v.key} onChange={(e) => handleUpdateVariable(i, 'key', e.target.value)} />
                          <input className="input-base flex-1 font-mono text-xs" placeholder={t.collection.envModal.placeholderValue} value={v.value} onChange={(e) => handleUpdateVariable(i, 'value', e.target.value)} />
                          <button onClick={() => handleRemoveVariable(i)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Remover Variável"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic">{t.collection.envModal.selectEnv}</div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setIsEnvModalOpen(false)} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">{t.collection.envModal.done}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
          {/* Coluna 1: Sidebar (Compartilhada entre Actions e Workflows) */}
          <div className="w-80 border-r border-white/5 flex flex-col bg-[#0B1020]">
            <div className="p-4 border-b border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={onBack}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
                  title={t.collection.backToDashboard}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                </button>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-sm font-black text-slate-200 truncate uppercase tracking-tighter" title={collection.name}>
                    {collection.name}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={t.collection.searchPlaceholder || "Search..."}
                  className="input-base !pl-10 !py-2 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>

            <div className="p-4 border-b border-white/5">
              <div className="grid grid-cols-3 gap-1.5">
                {activeTab === 'requests' ? (
                  <>
                    <button 
                      onClick={handleAddNewAction}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-blue-600/10 border border-blue-500/20 rounded-lg text-[8px] font-black text-blue-400 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-tight"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                      Action
                    </button>
                    <button 
                      onClick={() => onAddFolder(collection.id, 'Nova Pasta')}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-800 border border-white/5 rounded-lg text-[8px] font-black text-slate-400 hover:bg-slate-700 hover:text-white transition-all uppercase tracking-tight"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                      Pasta
                    </button>
                    <button 
                      onClick={() => onImportCurl(collection.id)}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-800 border border-white/5 rounded-lg text-[8px] font-black text-slate-400 hover:bg-slate-700 hover:text-white transition-all uppercase tracking-tight"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      cURL
                    </button>
                  </>
                ) : activeTab === 'workflows' ? (
                  <>
                    <button 
                      onClick={handleAddNewWorkflow}
                      className="col-span-2 flex flex-col items-center justify-center gap-1 py-2 px-1 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-[8px] font-black text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-tight"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                      {t.workflows.newBtn}
                    </button>
                    <button 
                      onClick={() => onAddFolder(collection.id, 'Nova Pasta', 'workflows')}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-800 border border-white/5 rounded-lg text-[8px] font-black text-slate-400 hover:bg-slate-700 hover:text-white transition-all uppercase tracking-tight"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                      Pasta
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleAddNewMock}
                      className="col-span-2 flex flex-col items-center justify-center gap-1 py-2 px-1 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[8px] font-black text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-tight"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                      {t.mocks.newBtn}
                    </button>
                    <button 
                      onClick={() => onAddFolder(collection.id, 'Nova Pasta', 'mocks')}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-800 border border-white/5 rounded-lg text-[8px] font-black text-slate-400 hover:bg-slate-700 hover:text-white transition-all uppercase tracking-tight"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                      Pasta
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div 
              className={`flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar ${isDraggingOverRoot && activeTab === 'requests' ? 'bg-blue-500/5' : ''}`}
              onDragOver={(e) => { if(activeTab === 'requests') { e.preventDefault(); setIsDraggingOverRoot(true); } }}
              onDragLeave={() => setIsDraggingOverRoot(false)}
              onDrop={activeTab === 'requests' ? handleDropOnRoot : undefined}
            >
              {activeTab === 'requests' ? (
                <>
                  {filteredItems.map((item, index) => 
                    item.type === 'folder' 
                      ? renderFolderItem(item, index, filteredItems) 
                      : renderRequestItem(item, false, index, filteredItems)
                  )}
                  {filteredItems.length === 0 && (
                    <div className="py-20 text-center text-slate-500 text-xs italic">{t.common.empty}</div>
                  )}
                </>
              ) : activeTab === 'workflows' ? (
                <>
                  {filteredWorkflows.map((item, index) => 
                    item.type === 'folder' 
                      ? renderWorkflowFolderItem(item, index, filteredWorkflows) 
                      : renderWorkflowListItem(item, index, filteredWorkflows)
                  )}
                  {filteredWorkflows.length === 0 && (
                    <div className="py-20 text-center text-slate-500 text-xs italic">{t.common.empty}</div>
                  )}
                </>
              ) : (
                <>
                  {filteredMocks.map((mock, index) => renderMockListItem(mock, index, filteredMocks))}
                  {filteredMocks.length === 0 && (
                    <div className="py-20 text-center text-slate-500 text-xs italic">{t.common.empty}</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Área Principal (Colunas 2 e 3) */}
          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'requests' ? (
              !isEditingAction ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
                  </div>
                  <p className="text-sm">{t.collection.exploreTitle || "Selecione uma Action para começar"}</p>
                </div>
              ) : (
                <div className="flex-1 flex overflow-hidden"> {/* Wrapper div for columns 2 and 3 */}
                  {/* Coluna 2: Editor de Requisição */}
                  {rightPanelSize !== 'maximized' && (
                    <div className="flex-1 flex flex-col border-r border-white/5 bg-[#0B1020] overflow-hidden p-6 custom-scrollbar">
                      <div className="max-w-[1100px] w-full mx-auto">
                        <SaveRequestForm 
                          onSaveRequest={editorProps.updateRequestInCollection}
                          requestName={editorProps.requestName}
                          setRequestName={editorProps.setRequestName}
                          method={editorProps.method}
                          setMethod={editorProps.setMethod}
                          onRun={editorProps.sendRequests}
                          onClose={onCloseRequestEditor}
                          t={t}
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto px-4">
                        <ConfigView {...editorProps} />
                      </div>
                    </div>
                  )}

                  {/* Coluna 3: Painel Lateral (Execução/Docs) */}
                  <div className={`flex flex-col bg-[#111827] transition-all duration-500 border-l border-white/5 ${rightPanelSize === 'maximized' ? 'flex-1' : rightPanelSize === 'minimized' ? 'w-12' : 'w-[450px]'}`}>
                    <div className={`p-4 border-b border-white/5 shrink-0 flex items-center gap-3 ${rightPanelSize === 'minimized' ? 'flex-col !p-2' : ''}`}>
                      {rightPanelSize !== 'minimized' ? (
                        <div className="flex flex-1 bg-[#0B1020] p-1 rounded-2xl border border-white/5">
                          <button onClick={() => setRightPanelTab('docs')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${rightPanelTab === 'docs' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-slate-500 hover:text-slate-400 hover:bg-white/[0.02]'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            {t.config.panels.documentation}
                          </button>
                          <button onClick={() => setRightPanelTab('execution')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${rightPanelTab === 'execution' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-slate-500 hover:text-slate-400 hover:bg-white/[0.02]'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            {t.config.panels.execution}
                            {isRunning && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 py-2">
                          <button onClick={() => { setRightPanelTab('docs'); setRightPanelSize('normal'); }} className={`p-2 rounded-lg ${rightPanelTab === 'docs' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500'}`} title={t.config.panels.documentation}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          </button>
                          <button onClick={() => { setRightPanelTab('execution'); setRightPanelSize('normal'); }} className={`p-2 rounded-lg relative ${rightPanelTab === 'execution' ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500'}`} title={t.config.panels.execution}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            {isRunning && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.6)]"></span>}
                          </button>
                        </div>
                      )}

                      <div className={`flex gap-1 ${rightPanelSize === 'minimized' ? 'flex-col mt-auto' : ''}`}>
                        <button onClick={() => setRightPanelSize(rightPanelSize === 'maximized' ? 'normal' : 'maximized')} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'maximized' ? 'Restaurar' : 'Maximizar'}>
                          {rightPanelSize === 'maximized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9h6m-6 6h6M4 4h16v16H4V4z"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4"/></svg>}
                        </button>
                        <button onClick={() => setRightPanelSize(rightPanelSize === 'minimized' ? 'normal' : 'minimized')} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'minimized' ? 'Expandir' : 'Recolher'}>
                          {rightPanelSize === 'minimized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>}
                        </button>
                      </div>
                    </div>
                    
                    <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 ${rightPanelSize === 'minimized' ? 'hidden' : 'block'}`}>
                      {rightPanelTab === 'docs' ? (
                        <DocumentationView 
                          key={editorProps.activeRequestId || 'empty'} // Força atualização ao trocar de Action
                          {...docProps} 
                          requests={[]} 
                          t={t} 
                          collection={collection} 
                          onBack={() => setRightPanelTab('execution')} 
                          methodStyles={editorProps.methodStyles} 
                        />
                      ) : (
                        <ReportView t={t} reportData={reportData} requestLogs={requestLogs} setView={() => {}} config={{ ...editorProps, body: editorProps.bodyRaw }} activeCollectionId={collection.id} activeCollection={collection} sendRequests={sendRequests} isRunning={isRunning} onStop={stopTest} lastExecutedPayload={lastExecutedPayload} onSaveResponseToDoc={onSaveResponseToDoc} theme={editorProps.theme} />
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : activeTab === 'workflows' ? (
              !editingWorkflowId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  <p className="text-sm">{t.collection.selectWorkflow}</p>
                </div>
              ) : (
                <div className="flex-1 flex overflow-hidden">
                  {/* Coluna 2: Editor de Workflow */}
                  {rightPanelSize !== 'maximized' && (
                    <div className="flex-1 flex flex-col border-r border-white/5 bg-[#0B1020] overflow-hidden p-6 custom-scrollbar">
                      {editorProps.activeStepIndex !== null ? (
                        <div className="animate-in fade-in duration-300">
                          <div className="mb-6">
                            <button 
                              onClick={() => {
                                setActiveStepIndex(null);
                                setActiveSubIndex(null);
                              }}
                              className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                              {t.config.actions.backToWork}
                            </button>
                          </div>
                          <div className="max-w-[1100px] w-full mx-auto">
                            <SaveRequestForm 
                              onSaveRequest={() => editorProps.updateRequestInCollection()}
                              requestName={editorProps.requestName}
                              setRequestName={editorProps.setRequestName}
                              method={editorProps.method}
                              setMethod={editorProps.setMethod}
                              onRun={null}
                              onClose={() => {
                                setActiveStepIndex(null);
                                setActiveSubIndex(null);
                              }}
                              t={t}
                            />
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto">
                            <ConfigView {...editorProps} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="max-w-[1100px] w-full mx-auto">
                            <SaveRequestForm
                              onSaveRequest={() => {
                                const wf = collection.workflows?.find(f => f.id === editingWorkflowId);
                                if (wf) onUpdateWorkflows(collection.id, collection.workflows.map(w => w.id === wf.id ? wf : w));
                              }}
                              requestName={collection.workflows?.find(f => f.id === editingWorkflowId)?.name || ''}
                              setRequestName={(newName) => {
                                const wf = collection.workflows?.find(f => f.id === editingWorkflowId);
                                if (wf) onUpdateWorkflows(collection.id, collection.workflows.map(w => w.id === wf.id ? { ...w, name: newName } : w));
                              }}
                              onRun={() => {
                                const wf = collection.workflows?.find(f => f.id === editingWorkflowId);
                                if (wf) onRunRequest(wf.steps, editingWorkflowId, true);
                              }}
                              onClose={() => { setEditingWorkflowId(null); setActiveWorkflowId(null); }}
                              t={t}
                            />
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto">
                            <WorkflowEditorView 
                              workflow={collection.workflows?.find(f => f.id === editingWorkflowId)}
                              collection={collection}
                              t={t}
                              onBack={() => {
                                setEditingWorkflowId(null);
                                setActiveWorkflowId(null);
                              }}
                              onUpdateWorkflow={(updatedWorkflow) => {
                                const newWorkflows = (collection.workflows || []).map(f => f.id === updatedWorkflow.id ? updatedWorkflow : f);
                                onUpdateWorkflows(collection.id, newWorkflows);
                              }}
                              onRun={(steps) => { 
                                onRunRequest(steps, editingWorkflowId, true); 
                              }}
                              onEditStep={(step, index, subIndex) => {
                                if (!step) return;
                                onSelectRequest(step, 'config', null, index, editingWorkflowId, subIndex);
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Coluna 3: Painel Lateral (Execução) */}
                  <div className={`flex flex-col bg-[#111827] transition-all duration-500 border-l border-white/5 ${rightPanelSize === 'maximized' ? 'flex-1' : rightPanelSize === 'minimized' ? 'w-12' : 'w-[450px]'}`}>
                    <div className={`p-4 border-b border-white/5 shrink-0 flex items-center gap-3 ${rightPanelSize === 'minimized' ? 'flex-col !p-2' : ''}`}>
                      {rightPanelSize !== 'minimized' && (
                        <h3 className="flex-1 text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                          {t.config.panels.execution}
                          {isRunning && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>}
                        </h3>
                      )}
                      <div className={`flex gap-1 ${rightPanelSize === 'minimized' ? 'flex-col mt-auto' : ''}`}>
                        <button onClick={() => setRightPanelSize(rightPanelSize === 'maximized' ? 'normal' : 'maximized')} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'maximized' ? 'Restaurar' : 'Maximizar'}>
                          {rightPanelSize === 'maximized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9h6m-6 6h6M4 4h16v16H4V4z"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4"/></svg>}
                        </button>
                        <button onClick={() => setRightPanelSize(rightPanelSize === 'minimized' ? 'normal' : 'minimized')} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'minimized' ? 'Expandir' : 'Recolher'}>
                          {rightPanelSize === 'minimized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>}
                        </button>
                      </div>
                    </div>
                    <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 ${rightPanelSize === 'minimized' ? 'hidden' : 'block'}`}>
                      <ReportView t={t} reportData={reportData} requestLogs={requestLogs} setView={() => {}} config={{ ...editorProps, body: editorProps.bodyRaw }} activeCollectionId={collection.id} activeCollection={collection} sendRequests={sendRequests} isRunning={isRunning} onStop={stopTest} lastExecutedPayload={lastExecutedPayload} onSaveResponseToDoc={onSaveResponseToDoc} theme={editorProps.theme} />
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Área Principal: Mocks */
              !monitoringMock && !isEditingMock ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.98 7.99 0 01-2.343 5.657z"/></svg>
                  </div>
                  <p className="text-sm">{t.mocks.selectMock}</p>
                </div>
              ) : (
                <div className="flex-1 flex overflow-hidden">
                  {/* Coluna 2: Editor de Mock */}
                  {rightPanelSize !== 'maximized' && (
                    <div className="flex-1 flex flex-col border-r border-white/5 bg-[#0B1020] overflow-hidden p-6 custom-scrollbar">
                      {(isEditingMock || monitoringMock) && (
                        <div className="max-w-[1100px] w-full mx-auto">
                          {isEditingMock && (
                          <SaveRequestForm 
                            onSaveRequest={() => handleSaveMock()}
                            requestName={selectedMock?.name || ''}
                            setRequestName={(newName) => setSelectedMock({ ...selectedMock, name: newName })}
                            method={selectedMock?.method}
                            setMethod={(m) => setSelectedMock({ ...selectedMock, method: m })}
                            onRun={async () => {
                              const activeMock = { ...selectedMock, active: true };
                              setSelectedMock(activeMock);
                              await handleSaveMock(activeMock, false, true);
                              setMonitoringMock(activeMock);
                            }}
                            onClose={() => setIsEditingMock(false)}
                            t={t}
                          />
                          )}
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto">
                        <ServersView 
                          t={t} 
                          onBack={() => { setMonitoringMock(null); setIsEditingMock(false); }} 
                          isEditing={isEditingMock}
                          setIsEditing={setIsEditingMock}
                          currentMock={selectedMock}
                          setCurrentMock={setSelectedMock}
                          monitoringMock={null}
                          setMonitoringMock={setMonitoringMock}
                          embedded={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* Coluna 3: Monitoramento Lateral */}
                  <div className={`flex flex-col bg-[#111827] transition-all duration-500 border-l border-white/5 overflow-hidden ${rightPanelSize === 'maximized' ? 'flex-1' : rightPanelSize === 'minimized' ? 'w-12' : 'w-[500px]'}`}>
                    <div className={`p-6 border-b border-white/5 flex justify-between items-center bg-[#161E31]/50 ${rightPanelSize === 'minimized' ? 'flex-col !p-2 gap-4' : ''}`}>
                      {rightPanelSize !== 'minimized' && (
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full ${monitoringMock ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`}></span>
                          {t.mocks.monitoringLive}
                        </h3>
                      )}
                      <div className="flex items-center gap-3">
                        {rightPanelSize !== 'minimized' && monitoringMock && (
                          <button 
                            onClick={async () => {
                              const stoppedMock = { ...monitoringMock, active: false };
                              await handleSaveMock(stoppedMock, false);
                              setMonitoringMock(null);
                            }}
                            className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg font-bold text-[10px] transition-all flex items-center gap-2 uppercase tracking-widest hover:bg-rose-500 hover:text-white shrink-0"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                            {t.mocks.stopMonitoring}
                          </button>
                        )}
                        <div className={`flex gap-1 ${rightPanelSize === 'minimized' ? 'flex-col mt-auto' : ''}`}>
                          <button onClick={() => setRightPanelSize(rightPanelSize === 'maximized' ? 'normal' : 'maximized')} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors">
                            {rightPanelSize === 'maximized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9h6m-6 6h6M4 4h16v16H4V4z"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4"/></svg>}
                          </button>
                          <button onClick={() => setRightPanelSize(rightPanelSize === 'minimized' ? 'normal' : 'minimized')} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors">
                            {rightPanelSize === 'minimized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>}
                          </button>
                        </div>
                        {rightPanelSize !== 'minimized' && monitoringMock && (
                          <button onClick={() => setMonitoringMock(null)} className="text-slate-500 hover:text-white text-xl p-1 transition-colors">&times;</button>
                        )}
                      </div>
                    </div>
                    {monitoringMock && (
                      <>
                        {/* Campo para copiar Endpoint */}
                        <div className={`px-6 py-3 bg-[#111827] border-b border-white/5 flex items-center justify-between gap-3 ${rightPanelSize === 'minimized' ? 'hidden' : 'flex'}`}>
                          <div className="flex-1 min-w-0 bg-[#0B1020] px-3 py-2 rounded-xl border border-white/5 flex items-center gap-2 overflow-hidden">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter shrink-0">Endpoint</span>
                            <code className="text-[10px] text-slate-500 truncate font-mono">http://localhost:8080/mock{monitoringMock.path}</code>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`http://localhost:8080/mock${monitoringMock.path}`);
                              alert(t.mocks.urlCopied);
                            }}
                            className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-500/20 shadow-sm"
                            title={t.mocks.copyUrl}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                          </button>
                        </div>
                      </>
                    )}
                    <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${rightPanelSize === 'minimized' ? 'hidden' : 'block'}`}>
                      {monitoringMock ? (
                        <ServersView 
                          t={t} 
                          monitoringMock={monitoringMock}
                          setMonitoringMock={setMonitoringMock}
                          embedded={true}
                        />
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-3 py-12">
                          <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c3.55 0 6.715 1.85 8.711 4.673l.036.052a2 2 0 010 2.274l-.036.052C18.715 17.15 15.55 19 12 19c-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          <p className="text-xs">{t.mocks.startMonitoring}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
      </div>
    </div>
  );
}