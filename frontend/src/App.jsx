import React, { useState, useEffect, useRef } from 'react';
import ReportView from './ReportView';
import ConfigView from './ConfigView';
import SaveRequestForm from './SaveRequestForm';
import CollectionsView from './CollectionsView';
import CollectionView from './CollectionView';
import DocumentationView from './DocumentationView';
import { useCollections } from './hooks/useCollections';
import { useRequestForm } from './hooks/useRequestForm';
import { useTestRunner } from './hooks/useTestRunner';

function App() {
  // Hooks de Estado de UI e Navegação
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [view, setView] = useState('collections');
  const [results, setResults] = useState('Aguardando comando...');
  const [isVarsModalOpen, setIsVarsModalOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  // Notificações e Modais
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState(null);

  // UI Helpers (Devem ser declarados antes de serem usados por outros hooks)
  const showCustomToast = (message, type = 'success') => { setToastMessage(message); setToastType(type); setShowToast(true); };
  const showCustomConfirm = (message, callback) => { setConfirmMessage(message); setOnConfirmCallback(() => callback); setShowConfirmModal(true); };

  // Hooks Customizados
  const { collections, setCollections, ...colMethods } = useCollections();
  const { form, updateField, updateIndexedField, addListItem, removeListItem, resetForm, loadRequest, getPayload } = useRequestForm();
  // Encontra a coleção ativa de forma reativa aos dados
  const activeCollection = collections.find(c => c.id === activeCollectionId);
  const { isRunning, lastExecutedPayload, requestLogs, reportData, sendRequests: runRequests, stopTest, setRequestLogs, setReportData } = useTestRunner(activeCollection, getPayload, showCustomToast);

  const sendRequests = async (payload = null) => {
    setView('report');
    await runRequests(payload);
  };

  // Efeitos e Lógica de UI (Toast e Tema)
  useEffect(() => { // Lógica para o tema
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => { // Lógica para o Toast
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage('');
        setToastType('success');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);
  const saveCurrentRequest = (name, colId) => {
    const newRequest = {
      id: Date.now().toString(),
      name: name || 'Nova Requisição',
      ...form
    };

    setCollections(prev => prev.map(col => 
      col.id === colId ? { ...col, requests: [...col.requests, newRequest] } : col
    ));
  };

  const viewDocumentation = (req) => {
    if (req) {
      setSelectedRequestIds([req.id]);
      loadRequest(req);
      setView('documentation');
    } else {
      setView('documentation');
    }
  };

  const toggleRequestSelection = (requestId) => {
    setSelectedRequestIds(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId) 
        : [...prev, requestId]
    );
  };

  const getSelectedRequests = () => {
    if (!activeCollection) return [];
    const allReqs = [];
    const findInItems = (items) => {
      items.forEach(i => {
        if (i.type === 'folder') findInItems(i.requests || []);
        else if (selectedRequestIds.includes(i.id)) allReqs.push(i);
      });
    };
    findInItems(activeCollection.requests);
    return allReqs;
  };

  const updateCollectionScenarios = (colId, scenarios) => {
    setCollections(prev => prev.map(col => 
      col.id === colId ? { ...col, scenarios } : col
    ));
  };

  const handleEnterCollection = (col) => {
    setActiveCollectionId(col.id);
    setSelectedRequestIds([]); // Limpa a seleção ao entrar em uma nova coleção para evitar lixo de estado
    setView('collection-detail');
  };

  const updateRequestInCollection = (silent = false) => {
    if (!activeCollectionId) return;

    if (form.activeScenarioId !== null && form.activeStepIndex !== null) {
      setCollections(prev => prev.map(col => {
        if (col.id !== activeCollectionId) return col;
        const newScenarios = (col.scenarios || []).map(scen => {
          if (scen.id !== form.activeScenarioId) return scen;
          const newSteps = [...scen.steps];
          newSteps[form.activeStepIndex] = {
            ...newSteps[form.activeStepIndex],
            ...form,
            name: form.requestName
          };
          return { ...scen, steps: newSteps };
        });
        return { ...col, scenarios: newScenarios };
      }));
      if (!silent) showCustomToast('Passo do cenário atualizado!', 'success');
      return;
    }

    if (!form.activeRequestId) return;

    setCollections(prev => prev.map(col => {
      if (col.id !== activeCollectionId) return col;
      const recursiveUpdate = (items) => {
        return items.map(item => {
          if (item.id === form.activeRequestId) {
            return { 
              ...item, 
              ...form,
              name: form.requestName
            };
          }
          if (item.type === 'folder') {
            return { ...item, requests: recursiveUpdate(item.requests || []) };
          }
          return item;
        });
      };
      return { ...col, requests: recursiveUpdate(col.requests) };
    }));
    if (!silent) showCustomToast('Requisição atualizada com sucesso!', 'success');
  };

  const reorderCollection = (id, direction) => {
    setCollections(prev => {
      const index = prev.findIndex(c => c.id === id);
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const result = [...prev];
      const [removed] = result.splice(index, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  };

  const reorderItemInCollection = (colId, itemId, direction) => {
    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;
      const recursiveReorder = (items) => {
        const index = items.findIndex(i => i.id === itemId);
        if (index !== -1) {
          const newIndex = direction === 'up' ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= items.length) return items;
          const result = [...items];
          const [removed] = result.splice(index, 1);
          result.splice(newIndex, 0, removed);
          return result;
        }
        return items.map(i => i.type === 'folder' ? { ...i, requests: recursiveReorder(i.requests || []) } : i);
      };
      return { ...col, requests: recursiveReorder(col.requests) };
    }));
  };

  const updateCollectionEnvironments = (colId, environments) => {
    setCollections(prev => prev.map(col => 
      col.id === colId ? { ...col, environments } : col
    ));
  };

  const setActiveEnvironment = (colId, envId) => {
    setCollections(prev => prev.map(col =>
      col.id === colId ? { ...col, activeEnvironmentId: envId } : col
    ));
  };

  const deleteCollection = (id) => {
    showCustomConfirm('Tem certeza que deseja excluir esta coleção? Todas as requisições dentro dela serão perdidas.', () => {
      setCollections(prev => prev.filter(c => c.id !== id));
      showCustomToast('Coleção excluída com sucesso!', 'success');
    });
  };

  const createCollection = (name, importedData = null) => {
    if (importedData) {
      setCollections([...collections, importedData]);
    } else {
      setCollections([...collections, { 
        id: Date.now().toString(), 
        name,
        requests: [], 
        environments: [{ id: 'default', name: 'Global', variables: [] }],
        activeEnvironmentId: 'default',
        scenarios: []
      }]);
    }
  }; // Não mostra toast aqui, pois é uma ação de criação visível
  const deleteRequest = (colId, reqId) => {
    showCustomConfirm('Tem certeza que deseja excluir esta requisição?', () => {
      setCollections(prev => prev.map(collection => {
        if (collection.id !== colId) return collection;
        const recursiveFilter = (items) => {
          return items.filter(item => item.id !== reqId).map(item => item.type === 'folder' 
              ? { ...item, requests: recursiveFilter(item.requests || []) } : item);
        };
        return { ...collection, requests: recursiveFilter(collection.requests) };
      }));
      showCustomToast('Requisição excluída com sucesso!', 'success');
    });
  };

  const deleteFolder = (colId, folderId) => {
    showCustomConfirm('Tem certeza que deseja excluir esta pasta e todas as requisições dentro dela?', () => {
      setCollections(prev => prev.map(collection => {
        if (collection.id !== colId) return collection;
        const recursiveFilter = (items) => {
          return items.filter(item => item.id !== folderId).map(item => 
            item.type === 'folder' 
              ? { ...item, requests: recursiveFilter(item.requests || []) } 
              : item
          );
        };
        return { ...collection, requests: recursiveFilter(collection.requests) };
      }));
      showCustomToast('Pasta excluída com sucesso!', 'success');
    });
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const addHeader = () => {
    setHeaders(prev => [...prev, { key: '', value: '', docDescription: '', docRequired: false, docExample: '' }]);
  };

  const removeHeader = index => {
    setHeaders(prev => prev.filter((_, i) => i !== index));
  };

  const updateHeader = (index, field, value) => { // Updated to handle doc fields
    setHeaders(prev => {
      const newHeaders = [...prev];
      if (newHeaders[index]) {
        newHeaders[index] = { ...newHeaders[index], [field]: value };
      }
      return newHeaders;
    });
  };
  
  const addPathParam = (param = null) => {
    setPathParams(prev => [...prev, param || { key: '', value: '', docDescription: '', docRequired: true, docExample: '' }]);
  };

  const removePathParam = index => {
    setPathParams(prev => prev.filter((_, i) => i !== index));
  };

  const updatePathParam = (index, field, value) => {
    setPathParams(prev => {
      const newParams = [...prev];
      if (newParams[index]) {
        newParams[index] = { ...newParams[index], [field]: value };
      }
      return newParams;
    });
  };

  const handleClearBodyParams = () => setBodyParams([]);

  const addBodyParam = (param = null) => {
    // Se param for um evento do React (clique), ignoramos para usar o valor padrão
    const initialData = (param && param.nativeEvent) ? null : param;

    setBodyParams(prev => [
    ...prev,
    initialData || {
      key: '',
      value: '',
      type: 'text',
      docRequired: false,
      docExample: '',
      docDescription: ''
    }
  ]);
  };

  const removeBodyParam = index => {
    setBodyParams(prev => prev.filter((_, i) => i !== index));
  };

  const updateBodyParam = (index, field, value) => { // Updated to handle doc fields
    setBodyParams(prev => {
      const newParams = [...prev];
      if (newParams[index]) {
        newParams[index] = { ...newParams[index], [field]: value };
      }
      return newParams;
    });
  };

  const methodStyles = {
    GET: 'method-get',
    POST: 'method-post',
    PUT: 'method-put',
    DELETE: 'method-delete',
    PATCH: 'method-patch',
    HEAD: 'method-head',
    OPTIONS: 'method-options'
  };

  const handleRunSingleSavedRequest = (req) => {
    loadRequest(req);
    updateField('totalRequests', 1);
    updateField('duration', 1);

    const headerMap = {};
    (req.headers || []).forEach(h => {
      if (h.key) headerMap[h.key] = h.value;
    });

    const payload = {
      url: req.url,
      method: req.method,
      totalRequests: 1,
      duration: 1,
      headers: headerMap,
      body: req.bodyRaw || '',
      assertions: req.assertions || [],
      extractions: req.extractions || [],
      single: true
    };

    sendRequests(payload);
  };

  const handleRunSavedRequest = (req, scenId = null) => {
    // Caso o parâmetro seja um array, trata como execução de cenário
    if (Array.isArray(req) && req.length > 0) {
      if (scenId) updateField('activeScenarioId', scenId);
      updateField('method', ''); // Limpa para sinalizar "Múltiplas" no ReportView
      updateField('url', '');    // Limpa para sinalizar "Cenário" no ReportView
      updateField('totalRequests', 0); // Sinaliza carga variável por passo
      updateField('duration', 0);
      updateField('rampUp', 0);
      sendRequests(req);
      return;
    }

    loadRequest(req);

    // Prepara o payload diretamente do objeto 'req' para execução imediata
    const headerMap = {};
    (req.headers || []).forEach(h => {
      if (h.key) headerMap[h.key] = h.value;
    });

    const payload = {
      url: req.url,
      method: req.method,
      totalRequests: parseInt(req.totalRequests || req.threads || 1),
      duration: parseInt(req.duration),
      rampUp: parseInt(req.rampUp || 0),
      headers: headerMap,
      body: req.bodyRaw || '',
      assertions: req.assertions || [],
      extractions: req.extractions || []
    };

    sendRequests(payload);
  };

  return (
    <>
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 overflow-hidden">
      {/* Barra Superior (Menu) */}
      <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tighter uppercase">AST DevTools</span>
          <nav className="flex gap-4">
            <button 
              onClick={() => { setView('collections'); setActiveCollectionId(null); resetForm(); setReportData(null); }}
              className={`text-sm font-bold transition-colors ${view === 'collections' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Minhas Coleções
            </button>
            <button 
              onClick={() => {
                setView('config');
                setReportData(null);
                resetForm();
                setActiveCollectionId(null);
              }}
              className={`text-sm font-bold transition-colors ${view === 'config' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Teste Rápido
            </button>
          </nav>
        </div>
        <button
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:scale-110 transition-transform"
          onClick={toggleTheme}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="flex-1 py-12 px-4 flex flex-col items-center overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8">
            {view === 'report' ? (
              <ReportView 
                reportData={reportData} 
                requestLogs={requestLogs} 
                setView={setView}
                results={results}
                config={{ ...form, body: form.bodyRaw }}
                activeCollectionId={activeCollectionId}
                activeScenarioId={form.activeScenarioId} 
                activeCollection={activeCollection}
                theme={theme}
                sendRequests={sendRequests}
                isRunning={isRunning}
                onStop={stopTest}
                lastExecutedPayload={lastExecutedPayload}
              />
            ) : view === 'collections' ? (
              <CollectionsView 
                collections={collections}
                onSelectRequest={handleEnterCollection}
                onCreateCollection={createCollection}
                onDeleteCollection={deleteCollection}
                onReorderCollection={reorderCollection}
              />
            ) : view === 'collection-detail' ? (
              <CollectionView 
                collection={activeCollection}
                onSelectRequest={(req, targetView, scenId, stepIdx) => { loadRequest(req, scenId, stepIdx); setView(targetView || 'config'); }}
                onViewDocumentation={viewDocumentation}
                onRunRequest={handleRunSavedRequest}
                onRunSingleRequest={handleRunSingleSavedRequest}
                onBack={() => setView('collections')}
              onAddRequest={colMethods.addRequestToCollection}
              onAddFolder={colMethods.addFolderToCollection}
              onMoveRequest={colMethods.moveRequestInCollection}
              onDeleteRequest={deleteRequest}
              onDeleteFolder={deleteFolder}
              onReorderItem={reorderItemInCollection}
              onUpdateEnvironments={updateCollectionEnvironments}
              onUpdateScenarios={updateCollectionScenarios}
              activeScenarioId={form.activeScenarioId}
              setActiveScenarioId={(id) => updateField('activeScenarioId', id)}
              setActiveStepIndex={(idx) => updateField('activeStepIndex', idx)}
              onSetActiveEnvironment={colMethods.setActiveEnvironment}
              selectedRequestIds={selectedRequestIds}
              onToggleSelection={toggleRequestSelection}
              onViewUnifiedDoc={() => setView('documentation')}
              />
            ) : view === 'documentation' ? (
              <DocumentationView 
                request={{ ...form, id: form.activeRequestId, name: form.requestName }}
                requests={getSelectedRequests()}
                activeRequestId={form.activeRequestId}
                onSelectForEdit={(req) => {
                  updateRequestInCollection(true); // Salva a atual silenciosamente
                  loadRequest(req); // Carrega a próxima
                }}
                collection={activeCollection}
                bodyRawDoc={form.bodyRawDoc}
                authDoc={form.authDoc}
                isRunning={isRunning}
                updateHeader={(i, f, v) => updateIndexedField('headers', i, f, v)}
                updatePathParam={(i, f, v) => updateIndexedField('pathParams', i, f, v)}
                updateBodyParam={(i, f, v) => updateIndexedField('bodyParams', i, f, v)}
                updateRequestInCollection={updateRequestInCollection}
                bodyParams={form.bodyParams}
                addHeader={() => addListItem('headers', { key: '', value: '' })}
                addPathParam={() => addListItem('pathParams', { key: '', value: '', docRequired: true })}
                removeHeader={(i) => removeListItem('headers', i)}
                removePathParam={(i) => removeListItem('pathParams', i)}
                addBodyParam={(p) => addListItem('bodyParams', p && !p.nativeEvent ? p : { key: '', value: '', type: 'text' })}
                removeBodyParam={(i) => removeListItem('bodyParams', i)}
                onClearBodyParams={() => updateField('bodyParams', [])}
                setBodyRawDoc={(v) => updateField('bodyRawDoc', v)}
                setAuthDoc={(v) => updateField('authDoc', v)}
                setUrl={(v) => updateField('url', v)}
                setMethod={(v) => updateField('method', v)}
                setDescription={(v) => updateField('description', v)}
                setBodyRaw={(v) => updateField('bodyRaw', v)}
                setAuthType={(v) => updateField('authType', v)}
                setRequestName={(v) => updateField('requestName', v)}
                showCustomToast={showCustomToast} // Passa a função de toast
                onBack={() => setView('collection-detail')}
                onEdit={() => setView('config')}
                onRun={handleRunSavedRequest}
                methodStyles={methodStyles}
                theme={theme}
              />
            ) : (
              <div className="animate-in fade-in duration-500">
                {/* Ação de voltar para a coleção posicionada no topo absoluto */}
                {activeCollectionId && form.activeRequestId && (
                  <div className="mb-6">
                    <button 
                      onClick={() => {
                        setView('collection-detail');
                        updateField('activeStepIndex', null);
                      }}
                      className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                      {form.activeScenarioId ? 'Voltar para o Cenário' : 'Voltar para Coleção'}
                    </button>
                  </div>
                )}
                <SaveRequestForm 
                  collections={collections} 
                  onSaveRequest={saveCurrentRequest} 
                  requestName={form.requestName}
                  setRequestName={(v) => updateField('requestName', v)}
                />
                <ConfigView
                  {...form}
                  setUrl={(v) => updateField('url', v)} setMethod={(v) => updateField('method', v)}
                  setTotalRequests={(v) => updateField('totalRequests', v)} setDuration={(v) => updateField('duration', v)} setRampUp={(v) => updateField('rampUp', v)}
                  methodStyles={methodStyles}
                  addHeader={() => addListItem('headers', { key: '', value: '' })} 
                  removeHeader={(i) => removeListItem('headers', i)} 
                  updateHeader={(i, f, v) => updateIndexedField('headers', i, f, v)}
                  setBodyType={(v) => updateField('bodyType', v)} 
                  setBodyRaw={(v) => updateField('bodyRaw', v)}
                  addBodyParam={(p) => addListItem('bodyParams', p && !p.nativeEvent ? p : { key: '', value: '', type: 'text' })} 
                  removeBodyParam={(i) => removeListItem('bodyParams', i)} 
                  updateBodyParam={(i, f, v) => updateIndexedField('bodyParams', i, f, v)}
                  setAuthType={(v) => updateField('authType', v)} 
                  setBodyRawDoc={(v) => updateField('bodyRawDoc', v)} 
                  setAuthDoc={(v) => updateField('authDoc', v)}
                  sendRequests={sendRequests}
                  setDescription={(v) => updateField('description', v)}
                  updateRequestInCollection={updateRequestInCollection}
                  isVarsModalOpen={isVarsModalOpen} 
                  setIsVarsModalOpen={setIsVarsModalOpen}
                  activeRequestId={form.activeRequestId}
                  setAssertions={(v) => updateField('assertions', v)} 
                  setExtractions={(v) => updateField('extractions', v)}
                  isScenarioMode={form.activeScenarioId !== null}
                  showCustomToast={showCustomToast} // Passa a função de toast
                />
              </div>
            )}
          </div>
      </main>

    </div>
    {showToast && (
      <div className={`fixed bottom-8 right-8 p-4 rounded-lg shadow-lg text-white flex items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-300 z-50
        ${toastType === 'success' ? 'bg-emerald-500' : toastType === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`}
      >
        {toastType === 'success' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
        {toastType === 'error' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
        {toastType === 'info' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
        <span>{toastMessage}</span>
      </div>
    )}

    {/* Confirmation Modal */}
    {showConfirmModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="text-xl font-bold dark:text-white">Confirmação</h3>
            <button 
              onClick={() => setShowConfirmModal(false)} 
              className="text-slate-400 hover:text-rose-500 transition-colors p-2 text-2xl"
            >&times;</button>
          </div>
          
          <div className="p-8 text-slate-700 dark:text-slate-300 text-lg">
            {confirmMessage}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button 
              onClick={() => {
                setShowConfirmModal(false);
                if (onConfirmCallback) {
                  onConfirmCallback();
                }
              }}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
            >
              Confirmar
            </button>
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default App;