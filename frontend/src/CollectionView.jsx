import React, { useState, useEffect } from 'react';
import EnvironmentsModal from './components/EnvironmentsModal';
import CollectionSidebar from './components/CollectionSidebar';
import RequestsPanel from './components/RequestsPanel';
import WorkflowsPanel from './components/WorkflowsPanel';
import MocksPanel from './components/MocksPanel';

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
  const [search, setSearch] = useState('');
  const [isMockSubView, setIsMockSubView] = useState(false);
  const [mockCloseHandler, setMockCloseHandler] = useState(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState(activeWorkflowId || null);
  const [renamingCollection, setRenamingCollection] = useState(false);
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
        setMocks(prev => prev.map(m => m.id === mockToSave.id ? mockToSave : m));
      } else {
        fetchMocksList();
      }
    } catch (e) {}
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

  const handleAddNewMock = async () => {
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
    // Salva imediatamente no backend para aparecer na listagem lateral
    try {
      await fetch("http://localhost:8080/manage-mocks", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMock)
      });
      fetchMocksList();
    } catch (e) {}
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
  
  // Combina pastas de mocks (armazenadas na coleção) com mocks do backend
  const getMockIdsInFolders = (folders) => {
    const ids = new Set();
    const collect = (items) => items.forEach(item => {
      if (item.type === 'folder') collect(item.requests || []);
      else ids.add(item.id);
    });
    collect(folders || []);
    return ids;
  };
  const mockIdsInFolders = getMockIdsInFolders(collection.mockFolders);
  const mockItems = [
    ...(collection.mockFolders || []),
    ...mocks.filter(m => !mockIdsInFolders.has(m.id))
  ];
  const filteredMocks = search.trim() 
    ? getFilteredItems(mockItems, search.toLowerCase())
    : mockItems;

  // Wrapper para mover que lida com mocks do backend → mockFolders
  const handleMoveRequest = (colId, itemId, targetFolderId, section) => {
    if (section === 'mocks') {
      const mockFromBackend = mocks.find(m => m.id === itemId);
      onMoveRequest(colId, itemId, targetFolderId, section, mockFromBackend);
      return;
    }
    onMoveRequest(colId, itemId, targetFolderId, section);
  };

  // Verifica se temos uma action selecionada para exibir o editor
  const isEditingAction = editorProps?.activeRequestId || 
                          (editorProps?.activeScenarioId && editorProps?.activeStepIndex !== null) ||
                          (editorProps?.activeWorkflowId && editorProps?.activeStepIndex !== null);

  return (
    <div className="flex flex-col h-full w-full theme-base overflow-hidden">
      {/* Modal de Gerenciamento de Ambientes */}
      {isEnvModalOpen && (
        <EnvironmentsModal
          collection={collection}
          t={t}
          editingEnvId={editingEnvId}
          setEditingEnvId={setEditingEnvId}
          isRenamingEnv={isRenamingEnv}
          setIsRenamingEnv={setIsRenamingEnv}
          currentEnv={currentEnv}
          onClose={() => setIsEnvModalOpen(false)}
          onAddEnvironment={handleAddEnvironment}
          onDeleteEnvironment={handleDeleteEnvironment}
          onUpdateEnvName={handleUpdateEnvName}
          onAddVariable={handleAddVariable}
          onUpdateVariable={handleUpdateVariable}
          onRemoveVariable={handleRemoveVariable}
          onSetActiveEnvironment={onSetActiveEnvironment}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Coluna 1: Sidebar */}
        <CollectionSidebar
          collection={collection}
          t={t}
          activeTab={activeTab}
          onTabChange={onTabChange}
          search={search}
          setSearch={setSearch}
          onBack={onBack}
          onAddRequest={onAddRequest}
          onAddFolder={onAddFolder}
          onImportCurl={onImportCurl}
          onSelectRequest={onSelectRequest}
          onDeleteRequest={onDeleteRequest}
          onDeleteFolder={onDeleteFolder}
          onDeleteWorkflow={onDeleteWorkflow}
          onReorderItem={onReorderItem}
          onMoveRequest={handleMoveRequest}
          onUpdateFolderName={onUpdateFolderName}
          onUpdateWorkflows={onUpdateWorkflows}
          editingWorkflowId={editingWorkflowId}
          setEditingWorkflowId={setEditingWorkflowId}
          setActiveWorkflowId={setActiveWorkflowId}
          mocks={mocks}
          selectedMock={selectedMock}
          monitoringMock={monitoringMock}
          setSelectedMock={setSelectedMock}
          setIsEditingMock={setIsEditingMock}
          setMonitoringMock={setMonitoringMock}
          fetchMocksList={fetchMocksList}
          handleAddNewAction={handleAddNewAction}
          handleAddNewWorkflow={handleAddNewWorkflow}
          handleAddNewMock={handleAddNewMock}
          editorProps={editorProps}
          rightPanelSize={rightPanelSize}
          setRightPanelSize={setRightPanelSize}
          filteredItems={filteredItems}
          filteredWorkflows={filteredWorkflows}
          filteredMocks={filteredMocks}
        />

        {/* Área Principal (Colunas 2 e 3) */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'requests' ? (
            <RequestsPanel
              t={t}
              collection={collection}
              editorProps={editorProps}
              isEditingAction={isEditingAction}
              rightPanelTab={rightPanelTab}
              setRightPanelTab={setRightPanelTab}
              rightPanelSize={rightPanelSize}
              setRightPanelSize={setRightPanelSize}
              isRunning={isRunning}
              reportData={reportData}
              requestLogs={requestLogs}
              sendRequests={sendRequests}
              stopTest={stopTest}
              lastExecutedPayload={lastExecutedPayload}
              onSaveResponseToDoc={onSaveResponseToDoc}
              docProps={docProps}
              onCloseRequestEditor={onCloseRequestEditor}
            />
          ) : activeTab === 'workflows' ? (
            <WorkflowsPanel
              t={t}
              collection={collection}
              editorProps={editorProps}
              editingWorkflowId={editingWorkflowId}
              setEditingWorkflowId={setEditingWorkflowId}
              setActiveWorkflowId={setActiveWorkflowId}
              setActiveStepIndex={setActiveStepIndex}
              setActiveSubIndex={setActiveSubIndex}
              onUpdateWorkflows={onUpdateWorkflows}
              onRunRequest={onRunRequest}
              onSelectRequest={onSelectRequest}
              rightPanelSize={rightPanelSize}
              setRightPanelSize={setRightPanelSize}
              isRunning={isRunning}
              reportData={reportData}
              requestLogs={requestLogs}
              sendRequests={sendRequests}
              stopTest={stopTest}
              lastExecutedPayload={lastExecutedPayload}
              onSaveResponseToDoc={onSaveResponseToDoc}
            />
          ) : (
            <MocksPanel
              t={t}
              collection={collection}
              selectedMock={selectedMock}
              setSelectedMock={setSelectedMock}
              isEditingMock={isEditingMock}
              setIsEditingMock={setIsEditingMock}
              monitoringMock={monitoringMock}
              setMonitoringMock={setMonitoringMock}
              handleSaveMock={handleSaveMock}
              rightPanelSize={rightPanelSize}
              setRightPanelSize={setRightPanelSize}
              mocks={mocks}
              fetchMocksList={fetchMocksList}
            />
          )}
        </div>
      </div>
    </div>
  );
}
