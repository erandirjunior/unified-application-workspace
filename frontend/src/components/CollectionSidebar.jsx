import React, { useState } from 'react';

export default function CollectionSidebar({
  collection,
  t,
  activeTab,
  onTabChange,
  search,
  setSearch,
  onBack,
  // Request actions
  onAddRequest,
  onAddFolder,
  onImportCurl,
  onSelectRequest,
  onDeleteRequest,
  onDeleteFolder,
  onDeleteWorkflow,
  onReorderItem,
  onMoveRequest,
  onUpdateFolderName,
  // Workflow actions
  onUpdateWorkflows,
  editingWorkflowId,
  setEditingWorkflowId,
  setActiveWorkflowId,
  // Mock actions
  mocks,
  selectedMock,
  monitoringMock,
  setSelectedMock,
  setIsEditingMock,
  setMonitoringMock,
  fetchMocksList,
  handleAddNewAction,
  handleAddNewWorkflow,
  handleAddNewMock,
  // Editor state
  editorProps,
  rightPanelSize,
  setRightPanelSize,
  // Filtered items
  filteredItems,
  filteredWorkflows,
  filteredMocks,
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [renamingFolderId, setRenamingFolderId] = useState(null);

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragStart = (e, requestId) => {
    e.dataTransfer.setData("requestId", requestId);
  };

  const handleDragOverFolder = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeaveFolder = () => {
    setDragOverFolderId(null);
  };

  const handleDropOnFolder = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setIsDraggingOverRoot(false);
    const requestId = e.dataTransfer.getData("requestId");
    if (requestId && requestId !== folderId) {
      onMoveRequest(collection.id, requestId, folderId);
    }
  };

  const handleDropOnRoot = (e) => {
    e.preventDefault();
    setIsDraggingOverRoot(false);
    setDragOverFolderId(null);
    const requestId = e.dataTransfer.getData("requestId");
    if (requestId) {
      onMoveRequest(collection.id, requestId, null);
    }
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

  return (
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
  );
}
