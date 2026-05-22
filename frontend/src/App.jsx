import React, { useState, useEffect, useRef } from 'react';
import ReportView from './ReportView';
import ConfigView from './ConfigView';
import SaveRequestForm from './SaveRequestForm';
import CollectionsView from './CollectionsView';
import CollectionView from './CollectionView';
import DocumentationView from './DocumentationView';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [view, setView] = useState('collections');

  const [url, setUrl] = useState('https://google.com');
  const [method, setMethod] = useState('GET');

  const [threads, setThreads] = useState(1);
  const [duration, setDuration] = useState(10);
  const [rampUp, setRampUp] = useState(0);

  const [headers, setHeaders] = useState([{ key: '', value: '' }]);

  const [bodyType, setBodyType] = useState('none');
  const [bodyRaw, setBodyRaw] = useState('');

  const [pathParams, setPathParams] = useState([]);
  const [bodyParams, setBodyParams] = useState([]);

  const [authType, setAuthType] = useState('none');

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHeadersOpen, setIsHeadersOpen] = useState(false);
  const [isBodyOpen, setIsBodyOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const [results, setResults] = useState('Aguardando comando...');
  const [reportData, setReportData] = useState(null);
  const [isVarsModalOpen, setIsVarsModalOpen] = useState(false);
  const [requestLogs, setRequestLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [requestName, setRequestName] = useState('');
  const [description, setDescription] = useState('');
  const [bodyRawDoc, setBodyRawDoc] = useState('');
  const [authDoc, setAuthDoc] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef(null);

  // Estados para notificações estilizadas
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success', 'error', 'info'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState(null);

  const [collections, setCollections] = useState(() => {
    try {
      const saved = localStorage.getItem('ast_collections');
      const parsed = saved ? JSON.parse(saved) : null;
      if (!Array.isArray(parsed)) {
        return [{ 
          id: '1', 
          name: 'Minha Coleção', 
          requests: [], 
          environments: [{ id: 'default', name: 'Global', variables: [] }],
          activeEnvironmentId: 'default'
        }];
      }
      
      // Migração automática: garante que coleções antigas funcionem no novo formato
      return parsed.map(col => ({
        ...col,
        environments: col.environments || [
          { id: 'default', name: 'Global', variables: col.variables || [] }
        ],
        activeEnvironmentId: col.activeEnvironmentId || 'default'
      }));
    } catch (e) {
      return [{ 
        id: '1', 
        name: 'Minha Coleção', 
        requests: [], 
        environments: [{ id: 'default', name: 'Global', variables: [] }],
        activeEnvironmentId: 'default'
      }];
    }
  });

  // Encontra a coleção ativa de forma reativa aos dados
  const activeCollection = collections.find(c => c.id === activeCollectionId);

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  // Lógica para o Toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage('');
        setToastType('success');
      }, 3000); // Toast desaparece após 3 segundos
      return () => clearTimeout(timer);
    }
  }, [showToast]);


  useEffect(() => {
    localStorage.setItem('ast_collections', JSON.stringify(collections));
  }, [collections]);

  const saveCurrentRequest = (name, colId) => {
    const newRequest = {
      id: Date.now().toString(),
      name: name || 'Nova Requisição',
      description, url, method, threads, duration, rampUp, headers, bodyType, bodyRaw, bodyParams, authType
    };
    newRequest.bodyRawDoc = bodyRawDoc;
    newRequest.authDoc = authDoc;
    
    setCollections(prev => prev.map(col => 
      col.id === colId ? { ...col, requests: [...col.requests, newRequest] } : col
    ));
  };

  const loadSavedRequest = (req, targetView = 'config') => {
    setActiveRequestId(req.id);
    setRequestName(req.name);
    setDescription(req.description || '');
    setUrl(req.url);
    setMethod(req.method);
    setThreads(req.threads);
    setDuration(req.duration);
    setRampUp(req.rampUp);
    setHeaders(req.headers || [{ key: '', value: '', docDescription: '', docRequired: false, docExample: '' }]);
    setBodyType(req.bodyType);
    setBodyRaw(req.bodyRaw);
    setPathParams(req.pathParams || []);
    setBodyParams(req.bodyParams ? req.bodyParams.filter(p => p.key !== '') : []);
    setBodyRawDoc(req.bodyRawDoc || '');
    setAuthType(req.authType);
    setAuthDoc(req.authDoc || '');
    if (targetView) setView(targetView);
  };

  const viewDocumentation = (req) => {
    if (req) {
      setSelectedRequestIds([req.id]);
      loadSavedRequest(req, 'documentation');
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

  const handleEnterCollection = (col) => {
    setActiveCollectionId(col.id);
    setSelectedRequestIds([]); // Limpa a seleção ao entrar em uma nova coleção para evitar lixo de estado
    setView('collection-detail');
  };

  const addRequestToCollection = (colId, name, folderId = null) => {
    const newReq = {
      id: Date.now().toString(),
      type: 'request',
      name: name || 'Nova Requisição',
      url: 'https://api.example.com',
      method: 'GET',
      threads: 1,
      duration: 10,
      rampUp: 0,
      headers: [{ key: '', value: '', docDescription: '', docRequired: false, docExample: '' }],
      bodyType: 'none',
      bodyRaw: '',
      bodyRawDoc: '',
      description: '',
      pathParams: [],
      bodyParams: [],
      authType: 'none',
      authDoc: ''
    };

    setCollections(prev => prev.map(col => {
      if (col.id === colId) {
        if (!folderId) return { ...col, requests: [...col.requests, newReq] };
        return {
          ...col,
          requests: col.requests.map(item => 
            item.id === folderId ? { ...item, requests: [...item.requests, newReq] } : item
          )
        };
      }
      return col;
    }));
  };

  const addFolderToCollection = (colId, name) => {
    const newFolder = { id: Date.now().toString(), type: 'folder', name: name || 'Nova Pasta', requests: [] };
    setCollections(prev => prev.map(col => 
      col.id === colId ? { ...col, requests: [...col.requests, newFolder] } : col
    ));
  };

  const moveRequestInCollection = (colId, requestId, targetFolderId = null) => {
    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;

      let requestToMove = null;

      const extract = (items) => {
        const result = [];
        for (const item of items) {
          if (item.id === requestId) {
            requestToMove = item;
          } else if (item.type === 'folder') {
            result.push({ ...item, requests: extract(item.requests || []) });
          } else {
            result.push(item);
          }
        }
        return result;
      };

      const cleanedRequests = extract(col.requests);
      if (!requestToMove) return col;

      const insert = (items) => {
        return items.map(item => {
          if (item.id === targetFolderId) {
            return { ...item, requests: [...(item.requests || []), requestToMove] };
          }
          if (item.type === 'folder') {
            return { ...item, requests: insert(item.requests || []) };
          }
          return item;
        });
      };

      return { 
        ...col, 
        requests: !targetFolderId ? [...cleanedRequests, requestToMove] : insert(cleanedRequests) 
      };
    }));
  };

  const updateRequestInCollection = (silent = false) => {
    if (!activeCollectionId || !activeRequestId) return;

    setCollections(prev => prev.map(col => {
      console.log("updateRequestInCollection: silent =", silent); // Adicione esta linha
      if (col.id !== activeCollectionId) return col;

      const recursiveUpdate = (items) => {
        return items.map(item => {
          if (item.id === activeRequestId) {
            return { 
              ...item, 
              name: requestName,
              description,
              url, method, threads, duration, rampUp, headers, pathParams, bodyType, bodyRaw, bodyParams, authType,
              bodyRawDoc,
              authDoc
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

  const showCustomToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
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

  const createCollection = (name) => setCollections([...collections, { 
    id: Date.now().toString(), 
    name,
    requests: [], 
    environments: [{ id: 'default', name: 'Global', variables: [] }],
    activeEnvironmentId: 'default'
  }]); // Não mostra toast aqui, pois é uma ação de criação visível
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
    setActiveRequestId(req.id);
    setRequestName(req.name);
    setDescription(req.description || '');
    setUrl(req.url);
    setMethod(req.method);
    setThreads(1);
    setDuration(1);
    setRampUp(req.rampUp || 0);
    setHeaders(req.headers || [{ key: '', value: '', docDescription: '', docRequired: false, docExample: '' }]);
    setBodyType(req.bodyType || 'none');
    setBodyRaw(req.bodyRaw || '');
    setBodyRawDoc(req.bodyRawDoc || '');
    setPathParams(req.pathParams || []);
    setBodyParams(req.bodyParams ? req.bodyParams.filter(p => p.key !== '') : []);
    setAuthType(req.authType || 'none');

    const headerMap = {};
    (req.headers || []).forEach(h => {
      if (h.key) headerMap[h.key] = h.value;
    });

    const payload = {
      url: req.url,
      method: req.method,
      threads: 1,
      duration: 1,
      headers: headerMap,
      body: req.bodyRaw,
      single: true
    };

    sendRequests(payload);
  };

  const handleRunSavedRequest = (req) => {
    setActiveRequestId(req.id);
    setRequestName(req.name);
    setDescription(req.description || '');
    // Sincroniza o estado para que o ReportView e ConfigView fiquem consistentes
    setUrl(req.url);
    setMethod(req.method);
    setThreads(req.threads);
    setDuration(req.duration);
    setRampUp(req.rampUp);
    setHeaders(req.headers || [{ key: '', value: '', docDescription: '', docRequired: false, docExample: '' }]);
    setPathParams(req.pathParams || []);
    setBodyType(req.bodyType);
    setBodyRaw(req.bodyRaw);
    setBodyRawDoc(req.bodyRawDoc || '');
    setBodyParams(req.bodyParams ? req.bodyParams.filter(p => p.key !== '') : []);
    setAuthType(req.authType);

    // Prepara o payload diretamente do objeto 'req' para execução imediata
    const headerMap = {};
    (req.headers || []).forEach(h => {
      if (h.key) headerMap[h.key] = h.value;
    });

    const payload = {
      url: req.url,
      method: req.method,
      threads: parseInt(req.threads),
      duration: parseInt(req.duration),
      rampUp: parseInt(req.rampUp || 0),
      headers: headerMap,
      body: req.bodyRaw
    };

    sendRequests(payload);
  };

  const showCustomConfirm = (message, callback) => {
    setConfirmMessage(message);
    setOnConfirmCallback(() => callback); // Armazena a função de callback
    setShowConfirmModal(true);
  };

  const stopTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const sendRequests = async (overridePayload = null) => {
    setView('report');
    setRequestLogs([]);
    setSelectedLog(null);
    setReportData(null);

    let payload;
    // Verifica se overridePayload é um objeto de configuração válido e não um evento do React
    if (overridePayload && typeof overridePayload === 'object' && 'url' in overridePayload) {
      payload = overridePayload;
    } else {
      const headerMap = {};
      headers.forEach(h => {
        if (h.key) headerMap[h.key] = h.value;
      });
      payload = {
        url,
        method,
        threads: parseInt(threads),
        duration: parseInt(duration),
        rampUp: parseInt(rampUp),
        headers: headerMap,
        body: bodyRaw
      };
    }

    const envVars = {};
    if (activeCollection?.environments && activeCollection.activeEnvironmentId) {
      const activeEnv = activeCollection.environments.find(e => e.id === activeCollection.activeEnvironmentId);
      if (activeEnv) {
        activeEnv.variables.forEach(v => { if(v.key) envVars[v.key] = v.value; });
      }
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRunning(true);

    try {
      const response = await fetch('http://localhost:8080/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...payload, variables: envVars }),
        signal: controller.signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Remove o último elemento do array e guarda no buffer. 
        // Se a linha estiver completa, o pop() pega uma string vazia (devido ao \n final).
        // Se estiver incompleta, guarda o fragmento para o próximo chunk.
        buffer = lines.pop();

        lines.forEach(line => {
          if (line.trim() === '') return;
          try {
            const data = JSON.parse(line);

            if (data.type === 'summary') {
              setReportData(data);
            } else {
              setRequestLogs(prev =>
                [data, ...prev].slice(0, 100)
              );
            }
          } catch (e) {
            console.error('Erro ao processar chunk:', e);
          }
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Teste interrompido pelo usuário');
      } else {
        console.error(error);
        setResults('Erro na conexão com o backend.');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
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
              onClick={() => { setView('collections'); setActiveCollectionId(null); setActiveRequestId(null); setRequestName(''); setDescription(''); }}
              className={`text-sm font-bold transition-colors ${view === 'collections' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Minhas Coleções
            </button>
            <button 
              onClick={() => { setView('config'); setReportData(null); setActiveCollectionId(null); setActiveRequestId(null); setRequestName(''); setDescription(''); }}
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
                config={{ method, url, threads, duration, body: bodyRaw, rampUp, activeRequestId, headers, bodyType, bodyParams, authType }}
                activeCollectionId={activeCollectionId}
                activeCollection={activeCollection}
                theme={theme}
                sendRequests={sendRequests}
                isRunning={isRunning}
                onStop={stopTest}
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
                onSelectRequest={loadSavedRequest}
                onViewDocumentation={viewDocumentation}
                onRunRequest={handleRunSavedRequest}
                onRunSingleRequest={handleRunSingleSavedRequest}
                onBack={() => setView('collections')}
              onAddRequest={addRequestToCollection}
              onAddFolder={addFolderToCollection}
              onMoveRequest={moveRequestInCollection}
              onDeleteRequest={deleteRequest}
              onDeleteFolder={deleteFolder}
              onReorderItem={reorderItemInCollection}
              onUpdateEnvironments={updateCollectionEnvironments}
              onSetActiveEnvironment={setActiveEnvironment}
              selectedRequestIds={selectedRequestIds}
              onToggleSelection={toggleRequestSelection}
              onViewUnifiedDoc={() => setView('documentation')}
              />
            ) : view === 'documentation' ? (
              <DocumentationView 
                request={{ id: activeRequestId, name: requestName, description, url, method, headers, pathParams, bodyType, bodyRaw, bodyParams, authType, threads }}
                requests={getSelectedRequests()}
                activeRequestId={activeRequestId}
                onSelectForEdit={(req) => {
                  updateRequestInCollection(true); // Salva a atual silenciosamente
                  loadSavedRequest(req, 'documentation'); // Carrega a próxima
                }}
                collection={activeCollection}
                bodyRawDoc={bodyRawDoc}
                authDoc={authDoc}
                isRunning={isRunning}
                updateHeader={updateHeader}
                updatePathParam={updatePathParam}
                updateBodyParam={updateBodyParam}
                updateRequestInCollection={updateRequestInCollection}
                bodyParams={bodyParams}
                addHeader={addHeader}
                addPathParam={addPathParam}
                removeHeader={removeHeader}
                removePathParam={removePathParam}
                addBodyParam={addBodyParam}
                removeBodyParam={removeBodyParam}
                onClearBodyParams={handleClearBodyParams}
                setBodyRawDoc={setBodyRawDoc}
                setAuthDoc={setAuthDoc}
                setUrl={setUrl}
                setMethod={setMethod}
                setDescription={setDescription}
                setBodyRaw={setBodyRaw}
                setAuthType={setAuthType}
                setRequestName={setRequestName}
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
                {activeCollectionId && activeRequestId && (
                  <div className="mb-6">
                    <button 
                      onClick={() => setView('collection-detail')}
                      className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                      Voltar para Coleção
                    </button>
                  </div>
                )}
                <SaveRequestForm 
                  collections={collections} 
                  onSaveRequest={saveCurrentRequest} 
                  requestName={requestName}
                  setRequestName={setRequestName}
                />
                <ConfigView
                  url={url} setUrl={setUrl}
                  method={method} setMethod={setMethod}
                  threads={threads} setThreads={setThreads}
                  duration={duration} setDuration={setDuration}
                  rampUp={rampUp} setRampUp={setRampUp}
                  methodStyles={methodStyles}
                  isHeadersOpen={isHeadersOpen} setIsHeadersOpen={setIsHeadersOpen}
                  isBodyOpen={isBodyOpen} setIsBodyOpen={setIsBodyOpen}
                  isAuthOpen={isAuthOpen} setIsAuthOpen={setIsAuthOpen}
                  headers={headers} addHeader={addHeader} removeHeader={removeHeader} updateHeader={updateHeader}
                  bodyType={bodyType} setBodyType={setBodyType}
                  bodyRaw={bodyRaw} setBodyRaw={setBodyRaw}
                  bodyParams={bodyParams} addBodyParam={addBodyParam} removeBodyParam={removeBodyParam} updateBodyParam={updateBodyParam}
                  authType={authType} setAuthType={setAuthType}
                  bodyRawDoc={bodyRawDoc} setBodyRawDoc={setBodyRawDoc}
                  authDoc={authDoc} setAuthDoc={setAuthDoc}
                  sendRequests={sendRequests}
                  description={description}
                  setDescription={setDescription}
                  isDescriptionOpen={isDescriptionOpen}
                  setIsDescriptionOpen={setIsDescriptionOpen}
                  updateRequestInCollection={updateRequestInCollection}
                  isVarsModalOpen={isVarsModalOpen}
                  setIsVarsModalOpen={setIsVarsModalOpen}
                  activeRequestId={activeRequestId}
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