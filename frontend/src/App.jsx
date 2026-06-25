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
import { parseCurl } from './utils/curlParser';
import logo from './img/logo.png'; 
import { pt } from './locales/pt';
import { en } from './locales/en';

function App() {
  // Hooks de Estado de UI e Navegação
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'pt');
  const [view, setView] = useState('collections');
  const [activeTab, setActiveTab] = useState('requests');
  const t = lang === 'pt' ? pt : en;
  const [results, setResults] = useState('');
  const [isVarsModalOpen, setIsVarsModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  // Notificações e Modais
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState(null);
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [curlInput, setCurlInput] = useState('');
  const [importTarget, setImportTarget] = useState({ colId: null, folderId: null });

  // UI Helpers (Devem ser declarados antes de serem usados por outros hooks)
  const showCustomToast = (message, type = 'success') => { setToastMessage(message); setToastType(type); setShowToast(true); };
  const showCustomConfirm = (message, callback) => { setConfirmMessage(message); setOnConfirmCallback(() => callback); setShowConfirmModal(true); };

  // Hooks Customizados
  const { collections, setCollections, ...colMethods } = useCollections();
  const { form, updateField, updateIndexedField, addListItem, removeListItem, resetForm, loadRequest, getPayload } = useRequestForm();
  // Encontra a coleção ativa de forma reativa aos dados
  const activeCollection = collections.find(c => c.id === activeCollectionId);

  // Garante que o estado do formulário sempre tenha o campo 'responses' para evitar erros de iteração
  useEffect(() => {
    if (!form) return;
    const fields = ['responses', 'headers', 'pathParams', 'bodyParams', 'assertions', 'extractions'];
    fields.forEach(field => {
      if (!Array.isArray(form[field])) { // Verifica se não é um array (inclui undefined e null)
        updateField(field, []);
      }
    });
  }, [form?.activeRequestId, view, updateField]);

  const { isRunning, lastExecutedPayload, requestLogs, reportData, liveStats, sendRequests: runRequests, stopTest, setRequestLogs, setReportData } = useTestRunner(activeCollection, getPayload, showCustomToast, t);

  const sendRequests = async (payload = null) => {
    if (view !== 'collection-detail') setView('report');
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
    const finalName = name || form.requestName || 'Action';
    const newRequest = {
      ...form,
      id: Date.now().toString(),
      name: finalName
    };

    setCollections(prev => prev.map(col => 
      col.id === colId ? { ...col, requests: [...col.requests, newRequest] } : col
    ));
    updateField('requestName', ''); // Limpa o campo apenas após criar uma nova via Dashboard
  };

  const viewDocumentation = (req) => {
    if (req) {
      setSelectedRequestIds([req.id]);
      const sanitizedReq = { 
        ...req, 
        responses: Array.isArray(req.responses) 
          ? req.responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) 
          : [] 
      };
      loadRequest(sanitizedReq);
      updateField('requestName', req.name);
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
        if (i.type === 'folder') findInItems(i.requests || []); // Recursively search folders
        else if (selectedRequestIds.includes(i.id)) {
          allReqs.push({ 
            ...i, 
            responses: Array.isArray(i.responses) 
              ? i.responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) 
              : [] 
          }); // Ensure responses and their bodyFields are arrays
        }
      });
    };
    findInItems(activeCollection.requests);
    return allReqs;
  };

  const handleEnterCollection = (col) => {
    setActiveCollectionId(col.id);
    setSelectedRequestIds([]); // Limpa a seleção ao entrar em uma nova coleção para evitar lixo de estado
    resetForm(); // Garante que o formulário comece limpo ao trocar de coleção
    setActiveTab('requests');
    setView('collection-detail');
  };

  const updateCollectionName = (id, newName) => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const updateRequestInCollection = (silent = false) => {
    if (!activeCollectionId) return;

    // Validação: Impede salvar se houver respostas sem Status Code
    if (Array.isArray(form.responses)) {
      const hasEmptyStatus = form.responses.some(r => !r.statusCode || String(r.statusCode).trim() === '');
      if (hasEmptyStatus) {
        showCustomToast(t.toasts.responseStatusError, 'error');
        return;
      }
    }

    if (form.activeWorkflowId !== null && form.activeStepIndex !== null) {
      setCollections(prev => prev.map(col => {
        if (col.id !== activeCollectionId) return col;
        const newWorkflows = (col.workflows || []).map(workflow => {
          if (workflow.id !== form.activeWorkflowId) return workflow;
          const newSteps = [...workflow.steps];
          
          if (form.activeSubIndex !== null) {
            // Edição dentro de um Grupo (Paralelo, Loop ou Condition)
            const group = { ...newSteps[form.activeStepIndex] };
            if (group.type === 'loop') {
              const newLoopSteps = [...(group.steps || [])];
              newLoopSteps[form.activeSubIndex] = {
                ...newLoopSteps[form.activeSubIndex],
                ...form,
                name: form.requestName
              };
              newSteps[form.activeStepIndex] = { ...group, steps: newLoopSteps };
            } else if (group.type === 'condition') {
              // Tenta encontrar o sub-step no branch "steps" (then)
              const thenSteps = [...(group.steps || [])];
              if (form.activeSubIndex < thenSteps.length) {
                thenSteps[form.activeSubIndex] = {
                  ...thenSteps[form.activeSubIndex],
                  ...form,
                  name: form.requestName
                };
                newSteps[form.activeStepIndex] = { ...group, steps: thenSteps };
              } else {
                // É do branch "elseSteps"
                const elseIdx = form.activeSubIndex - thenSteps.length;
                const elseSteps = [...(group.elseSteps || [])];
                elseSteps[elseIdx] = {
                  ...elseSteps[elseIdx],
                  ...form,
                  name: form.requestName
                };
                newSteps[form.activeStepIndex] = { ...group, elseSteps };
              }
            } else {
              const newGroupRequests = [...(group.requests || [])];
              newGroupRequests[form.activeSubIndex] = {
                ...newGroupRequests[form.activeSubIndex],
                ...form,
                name: form.requestName
              };
              newSteps[form.activeStepIndex] = { ...group, requests: newGroupRequests };
            }
          } else {
            // Edição de requisição no nível raiz do Workflow
            newSteps[form.activeStepIndex] = {
              ...newSteps[form.activeStepIndex],
              ...form,
              name: form.requestName
            };
          }
          return { ...workflow, steps: newSteps };
        });
        return { ...col, workflows: newWorkflows };
      }));
      if (!silent) showCustomToast(t.toasts.workflowStepUpdated, 'success');
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
    if (!silent) showCustomToast(t.toasts.reqUpdated || 'Success', 'success');
  };

  const handleImportFromCurl = (curlString, colId, folderId = null) => {
    try {
      const parsed = parseCurl(curlString);
      const newRequest = {
        id: Date.now().toString(),
        type: 'request',
        ...parsed,
        responses: [],
        pathParams: [],
        bodyParams: parsed.bodyParams || [],
        assertions: [],
        extractions: []
      };

      setCollections(prev => prev.map(col => {
        if (col.id !== colId) return col;

        const updateItems = (items) => {
          if (!folderId) return [...items, newRequest];
          return items.map(item => {
            if (item.type === 'folder' && item.id === folderId) {
              return { ...item, requests: [...(item.requests || []), newRequest] };
            }
            if (item.type === 'folder') {
              return { ...item, requests: updateItems(item.requests || []) };
            }
            return item;
          });
        };

        return { ...col, requests: updateItems(col.requests) };
      }));
      showCustomToast(t.toasts.curlSuccess, 'success');
    } catch (e) {
      showCustomToast(t.toasts.curlError, 'error');
    }
  };

  const executeCurlImport = () => {
    if (!curlInput.trim()) return;
    handleImportFromCurl(curlInput, importTarget.colId, importTarget.folderId);
    setCurlInput('');
    setShowCurlModal(false);
  };

  const reorderCollection = (id, direction) => {
    const index = collections.findIndex(c => c.id === id);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || newIndex < 0 || newIndex >= collections.length) return;

    setCollections(prev => {
      const result = [...prev];
      const [removed] = result.splice(index, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  };

  const reorderItemInCollection = (colId, itemId, direction, section) => {
    const col = collections.find(c => c.id === colId);
    if (!col) return;

    // Determina o array alvo baseado na seção
    if (section === 'mocks') {
      const items = col.mockFolders || [];
      const idx = items.findIndex(i => i.id === itemId);
      if (idx === -1) return;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= items.length) return;
      setCollections(prev => prev.map(c => {
        if (c.id !== colId) return c;
        const result = [...(c.mockFolders || [])];
        const [removed] = result.splice(idx, 1);
        result.splice(newIdx, 0, removed);
        return { ...c, mockFolders: result };
      }));
      return;
    }

    let canMove = false;
    // Verifica em Workflows
    const wfIndex = (col.workflows || []).findIndex(w => w.id === itemId);
    if (wfIndex !== -1) {
      const nextIdx = direction === 'up' ? wfIndex - 1 : wfIndex + 1;
      if (nextIdx >= 0 && nextIdx < col.workflows.length) canMove = true;
    }

    const findAndCheck = (items) => {
      const idx = items.findIndex(i => i.id === itemId);
      if (idx !== -1) {
        const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < items.length) canMove = true;
        return true;
      }
      return items.some(i => i.type === 'folder' && findAndCheck(i.requests || []));
    };

    findAndCheck(col.requests || []);
    if (!canMove) return;

    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;

      // Tenta reordenar nos Workflows
      const wIdx = (col.workflows || []).findIndex(w => w.id === itemId);
      if (wIdx !== -1) {
        const nIdx = direction === 'up' ? wIdx - 1 : wIdx + 1;
        const result = [...col.workflows];
        const [removed] = result.splice(wIdx, 1);
        result.splice(nIdx, 0, removed);
        return { ...col, workflows: result };
      }

      const recursiveReorder = (items) => {
        const index = items.findIndex(i => i.id === itemId);
        if (index !== -1) {
          const newIndex = direction === 'up' ? index - 1 : index + 1;
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

  const updateFolderName = (colId, newName, folderId, section = 'requests') => {
    setCollections(prev => prev.map(collection => {
      if (collection.id !== colId) return collection;
      const recursiveUpdate = (items) => {
        return items.map(item => {
          if (item.id === folderId) {
            return { ...item, name: newName };
          }
          if (item.type === 'folder') {
            return { ...item, requests: recursiveUpdate(item.requests || []) };
          }
          return item;
        });
      };
      if (section === 'workflows') {
        return { ...collection, workflows: recursiveUpdate(collection.workflows || []) };
      }
      if (section === 'mocks') {
        return { ...collection, mockFolders: recursiveUpdate(collection.mockFolders || []) };
      }
      return { ...collection, requests: recursiveUpdate(collection.requests) };
    }));
    showCustomToast(t.toasts.folderUpdated, 'success');
  };

  const saveResponseToDoc = (colId, reqId, log) => {
    if (!colId || !reqId) return;

    const targetCol = collections.find(c => c.id === colId);
    if (!targetCol) return;

    // Guard: Impede atualizações se houver incompatibilidade de contexto (Cenário/Workflow)
    if (form.activeWorkflowId && form.activeStepIndex !== null) {
      const w = targetCol.workflows?.find(w => w.id === form.activeWorkflowId);
      const step = w?.steps?.[form.activeStepIndex];
      const actualId = form.activeSubIndex !== null ? step?.requests?.[form.activeSubIndex]?.id : step?.id;
      if (actualId !== reqId) return;
    }

  const statusCodeStr = String(log.statusCode || 'ERR');
  const newResponse = {
    statusCode: statusCodeStr,
    description: log.statusCode >= 200 && log.statusCode < 300 ? `Sucesso (${statusCodeStr})` : `Erro (${statusCodeStr})`,
    body: log.responseBody || '',
    bodyFields: []
  };

  // Tenta preencher dicionário de dados se for JSON
  const trimmedBody = newResponse.body.trim();
  if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmedBody);
      const flatten = (obj, prefix = '', fields) => {
        if (typeof obj !== 'object' || obj === null) return;
        Object.keys(obj).forEach(key => {
          const path = prefix ? `${prefix}.${key}` : key;
          const val = obj[key];
          const type = Array.isArray(val) ? 'array' : (val === null ? 'null' : typeof val);
          fields.push({ key: path, type, docRequired: false, docExample: typeof val === 'object' ? JSON.stringify(val) : String(val), docDescription: '' });
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) flatten(val, path, fields);
        });
      };
      flatten(parsed, '', newResponse.bodyFields);
    } catch (e) { newResponse.bodyFields = []; }
  }

  // Busca as respostas que já existem na coleção para esta request específica antes de sincronizar o form
  // Isso evita que o estado do formulário (se estiver incompleto) sobrescreva o histórico da coleção
  let baseResps = [];
  if (targetCol) {
     const findInItems = (items) => {
       for (const item of items) {
         if (item.id === reqId) return item.responses;
         if (item.type === 'folder') {
           const r = findInItems(item.requests || []);
           if (r) return r;
         }
       }
       return null;
     };
     
     baseResps = findInItems(targetCol.requests || []) || [];
     // Se não achou na raiz, busca em cenários e workflows
     if (baseResps.length === 0) {
       targetCol.workflows?.forEach(w => w.steps?.forEach(step => {
         if (step.id === reqId) baseResps = step.responses || [];
         else if (step.type === 'parallel') step.requests?.forEach(r => { if (r.id === reqId) baseResps = r.responses || []; });
       }));
     }

     // Guard Final: Se não estiver em modo automação, verifica se a request existe na raiz/pastas
     // Isso evita disparar setCollections se o reqId não pertencer a esta coleção
     if (!form.activeWorkflowId) {
        const itemExists = (items) => items.some(i => i.id === reqId || (i.type === 'folder' && itemExists(i.requests || [])));
        if (!itemExists(targetCol.requests || [])) return;
     }
  }

  // 1. Sincroniza imediatamente com o formulário se for a request ativa
  if (form.activeRequestId === reqId || (form.activeStepIndex !== null && reqId)) {
    // Mescla o que está na coleção com o que está no form (para não perder edições manuais não salvas)
    const mergedMap = new Map();
    baseResps.forEach(r => mergedMap.set(String(r.statusCode), r));
    (Array.isArray(form.responses) ? form.responses : []).forEach(r => mergedMap.set(String(r.statusCode), r));
    
    const currentResps = Array.from(mergedMap.values());
    const idx = currentResps.findIndex(r => String(r.statusCode) === statusCodeStr);
    const updatedResps = idx >= 0 ? currentResps.map((r, i) => i === idx ? newResponse : r) : [newResponse, ...currentResps];
    updateField('responses', updatedResps);
  }

  // 2. Atualiza a Coleção (Persistência)
  setCollections(prev => prev.map(col => {
    if (col.id !== colId) return col;

    // Se for passo de workflow
    if (form.activeWorkflowId && form.activeStepIndex !== null) {
      return { ...col, workflows: (col.workflows || []).map(w => {
        if (w.id !== form.activeWorkflowId) return w;
        const steps = [...w.steps];
        
        if (form.activeSubIndex !== null) {
          // Edição dentro de um Grupo Paralelo
          const group = { ...steps[form.activeStepIndex] };
          const reqs = [...(group.requests || [])];
          const req = { ...reqs[form.activeSubIndex] };
          // Verifica se o ID bate para evitar salvar no lugar errado se o contexto estiver sujo
          if (req.id !== reqId) return w;

          const resps = Array.isArray(req.responses) ? [...req.responses] : [];
          const idx = resps.findIndex(r => String(r.statusCode) === statusCodeStr);
          if (idx >= 0) resps[idx] = newResponse; else resps.unshift(newResponse);
          reqs[form.activeSubIndex] = { ...req, responses: resps };
          steps[form.activeStepIndex] = { ...group, requests: reqs };
        } else {
          // Edição de requisição no nível raiz do Workflow
          const step = { ...steps[form.activeStepIndex] };
          if (step.id !== reqId) return w;

          const resps = Array.isArray(step.responses) ? [...step.responses] : [];
          const idx = resps.findIndex(r => String(r.statusCode) === statusCodeStr);
          if (idx >= 0) resps[idx] = newResponse; else resps.unshift(newResponse);
          steps[form.activeStepIndex] = { ...step, responses: resps };
        }
        return { ...w, steps };
      })};
    }

    // Caso padrão: Request raiz ou pasta
    const recursiveUpdate = (items) => items.map(item => {
      if (item.id === reqId) {
        const resps = Array.isArray(item.responses) ? [...item.responses] : [];
        const idx = resps.findIndex(r => String(r.statusCode) === statusCodeStr);
        if (idx >= 0) resps[idx] = newResponse; else resps.unshift(newResponse);
        return { ...item, responses: resps };
      }
      if (item.type === 'folder') return { ...item, requests: recursiveUpdate(item.requests || []) };
      return item;
    });
    return { ...col, requests: recursiveUpdate(col.requests) };
  }));

  showCustomToast(t.toasts.responseSaved.replace('{status}', log.statusCode), 'success');
};

  const deleteCollection = (id) => {
    showCustomConfirm(t.toasts.confirmDeleteCollection, () => {
      setCollections(prev => prev.filter(c => c.id !== id));
      showCustomToast(t.toasts.collectionDeleted, 'success');
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
        workflows: []
      }]);
    }
  }; // Não mostra toast aqui, pois é uma ação de criação visível
  const deleteRequest = (colId, reqId) => {
    showCustomConfirm(t.toasts.confirmDeleteRequest, () => {
      setCollections(prev => prev.map(collection => {
        if (collection.id !== colId) return collection;
        const recursiveFilter = (items) => {
          return items.filter(item => item.id !== reqId).map(item => item.type === 'folder' 
              ? { ...item, requests: recursiveFilter(item.requests || []) } : item);
        };
        return { ...collection, requests: recursiveFilter(collection.requests) };
      }));
      showCustomToast(t.toasts.requestDeleted, 'success');
    });
  };

  const deleteFolder = (colId, folderId, section = 'requests') => {
    showCustomConfirm(t.toasts.confirmDeleteFolder, () => {
      setCollections(prev => prev.map(collection => {
        if (collection.id !== colId) return collection;
        const recursiveFilter = (items) => {
          return items.filter(item => item.id !== folderId).map(item => 
            item.type === 'folder' 
              ? { ...item, requests: recursiveFilter(item.requests || []) } 
              : item
          );
        };
        if (section === 'workflows') {
          return { ...collection, workflows: recursiveFilter(collection.workflows || []) };
        }
        if (section === 'mocks') {
          return { ...collection, mockFolders: recursiveFilter(collection.mockFolders || []) };
        }
        return { ...collection, requests: recursiveFilter(collection.requests) };
      }));
      showCustomToast(t.toasts.folderDeleted, 'success');
    });
  };

  const deleteWorkflow = (colId, workflowId) => {
    showCustomConfirm(t.toasts.confirmDeleteWorkflow, () => {
      setCollections(prev => prev.map(collection => {
        if (collection.id !== colId) return collection;
        return { ...collection, workflows: (collection.workflows || []).filter(w => w.id !== workflowId) };
      }));
      showCustomToast(t.toasts.workflowDeleted, 'success');
    });
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Removidas as funções addHeader, removeHeader, etc. que chamavam setters inexistentes.
  // Agora o App.jsx passa diretamente as funções do useRequestForm (addListItem, removeListItem, updateIndexedField)
  // para os subcomponentes nas linhas 495-535.

  // Funções para manipular os campos do corpo da resposta (nested array)
  const addResponseField = (responseIndex, field = null) => {
    if (!Array.isArray(form.responses)) return;
    const newResponses = [...form.responses];
    if (newResponses[responseIndex]) {
      const resp = { ...newResponses[responseIndex] };
      const currentFields = Array.isArray(resp.bodyFields) ? [...resp.bodyFields] : [];
      currentFields.push(field || { key: '', type: 'text', docRequired: false, docExample: '', docDescription: '' });
      resp.bodyFields = currentFields;
      newResponses[responseIndex] = resp;
      updateField('responses', newResponses);
    }
  };

  const removeResponseField = (responseIndex, fieldIndex) => {
    if (!Array.isArray(form.responses)) return;
    const newResponses = [...form.responses];
    if (newResponses[responseIndex] && Array.isArray(newResponses[responseIndex].bodyFields)) {
      const resp = { ...newResponses[responseIndex] };
      resp.bodyFields = resp.bodyFields.filter((_, i) => i !== fieldIndex);
      newResponses[responseIndex] = resp;
      updateField('responses', newResponses);
    }
  };

  const updateResponseField = (responseIndex, fieldIndex, fieldName, value) => {
    if (!Array.isArray(form.responses)) return;
    const newResponses = [...form.responses];
    if (newResponses[responseIndex] && Array.isArray(newResponses[responseIndex].bodyFields) && newResponses[responseIndex].bodyFields[fieldIndex]) {
      const resp = { ...newResponses[responseIndex] };
      const newFields = [...resp.bodyFields];
      newFields[fieldIndex] = {
        ...newFields[fieldIndex],
        [fieldName]: value
      };
      resp.bodyFields = newFields;
      newResponses[responseIndex] = resp;
      updateField('responses', newResponses);
    }
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
    const sanitizedReq = { 
      ...req, 
      responses: Array.isArray(req.responses) 
        ? req.responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) 
        : [] 
    };
    loadRequest(sanitizedReq);
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
      bodyType: req.bodyType,
      bodyParams: req.bodyParams || [],
      assertions: req.assertions || [],
      extractions: req.extractions || [],
      authType: req.authType,
      authToken: req.authToken,
      authUsername: req.authUsername,
      authPassword: req.authPassword,
      apiKeyName: req.apiKeyName,
      apiKeyValue: req.apiKeyValue,
      single: true
    };

    sendRequests(payload);
  };

  const handleRunSavedRequest = (req, scenId = null, isWorkflow = false) => {
    // Caso o parâmetro seja um array, trata como execução de cenário
    if (Array.isArray(req) && req.length > 0) {
      // Helper para formatar os passos (Cenários ou Workflows) para o formato do Backend
      const formatStep = (s, isWorkflowMode) => {
        const formatReq = (r) => {
          // Se headers já for um objeto (mapa) e não um array, assume que já está formatado
          if (r.headers && !Array.isArray(r.headers)) return r;
          
          const headerMap = {};
          (r.headers || []).forEach(h => { if (h.key) headerMap[h.key] = h.value; });
          
          return { 
            ...r, 
            headers: headerMap, 
            body: r.bodyRaw || '',
            bodyType: r.bodyType,
            bodyParams: r.bodyParams || [],
            totalRequests: (parseInt(r.totalRequests) || 1),
            duration: (parseInt(r.duration) || 0),
            rampUp: (parseInt(r.rampUp) || 0),
            single: (parseInt(r.totalRequests) || 1) <= 1 && (parseInt(r.duration) || 0) <= 0
          };
        };

        if (s.type === 'parallel') {
          return { ...s, requests: (s.requests || []).map(formatReq) };
        }
        if (s.type === 'loop') {
          return { 
            type: 'loop', 
            loop: s.loop, 
            steps: (s.steps || []).map(sub => formatStep(sub, isWorkflowMode))
          };
        }
        if (s.type === 'condition') {
          return { 
            type: 'condition', 
            condition: s.condition, 
            steps: (s.steps || []).map(sub => formatStep(sub, isWorkflowMode)),
            elseSteps: (s.elseSteps || []).map(sub => formatStep(sub, isWorkflowMode))
          };
        }
        return { ...formatReq(s), type: s.type || 'request' };
      };

      const formattedSteps = req.map(s => formatStep(s, isWorkflow));

      if (scenId) {
        if (isWorkflow) {
          updateField('activeWorkflowId', scenId);
        }
      }
      updateField('method', ''); // Limpa para sinalizar "Múltiplas" no ReportView
      updateField('url', '');    // Limpa para sinalizar "Cenário" no ReportView
      updateField('totalRequests', 0); // Sinaliza carga variável por passo
      updateField('duration', 0);
      updateField('rampUp', 0);
      
      // Envia o payload encapsulado no objeto "requests" esperado pelo motor em Go
      sendRequests({ requests: formattedSteps });
      return;
    }

    const sanitizedReq = { 
      ...req, 
      responses: Array.isArray(req.responses) 
        ? req.responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) 
        : [] 
    };
    loadRequest(sanitizedReq);

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
      bodyType: req.bodyType,
      bodyParams: req.bodyParams || [],
      assertions: req.assertions || [],
      extractions: req.extractions || [],
      authType: req.authType,
      authToken: req.authToken,
      authUsername: req.authUsername,
      authPassword: req.authPassword,
      apiKeyName: req.apiKeyName,
      apiKeyValue: req.apiKeyValue
    };

    sendRequests(payload);
  };

  return (
    <div className="h-screen w-full theme-base font-['Inter',_sans-serif] flex flex-col transition-colors duration-300 overflow-hidden selection:bg-[var(--accent)]/30" style={{ color: 'var(--text-primary)' }}>
      {/* Main App Header */}
      {/* Barra Superior (Menu) */}
      <header className="w-full theme-header border-b theme-border flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-8 mr-8">
          <button 
            onClick={() => {
              setView('collections');
              setActiveCollectionId(null);
              resetForm();
              setReportData(null);
            }}
            className="hover:opacity-80 transition-opacity"
          >
            <img 
              src={logo} 
              alt={t.header.logoAlt} 
              className="h-8 w-auto object-contain" 
              key={logo} 
            />
          </button>
        </div>

        {/* Menu Centralizado da Collection */}
        <div className="flex-1 flex justify-left">
          {activeCollectionId && view === 'collection-detail' && (
            <nav className="flex gap-8 items-center">
              {/* Actions dropdown */}
              <div className="relative group/actions">
                <button
                  onClick={() => {
                    setActiveTab('requests');
                    updateField('activeWorkflowId', null);
                    updateField('activeStepIndex', null);
                    updateField('activeSubIndex', null);
                  }}
                  className={`text-xs font-black uppercase tracking-widest transition-all border-b-1 flex items-center gap-1 ${
                    activeTab === 'requests'
                      ? 'text-blue-600 border-blue-600' 
                      : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {t.collection.tabs.requests}
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                </button>
                {/* Submenu */}
                <div className="absolute top-full left-0 mt-2 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all duration-200 z-50">
                  <div className="theme-surface border theme-border rounded-xl shadow-xl p-2 min-w-[180px]">
                    <button 
                      onClick={() => {
                        setActiveTab('requests');
                        updateField('activeWorkflowId', null);
                        updateField('activeStepIndex', null);
                        updateField('activeSubIndex', null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold theme-text hover:bg-blue-500/10 hover:text-blue-500 transition-all text-left"
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-500/10 text-blue-500 text-[9px] font-black">H</span>
                      HTTP Request
                    </button>
                  </div>
                </div>
              </div>

              {/* Outros tabs */}
              {['workflows', 'mocks'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    updateField('activeWorkflowId', null);
                    updateField('activeStepIndex', null);
                    updateField('activeSubIndex', null);
                  }}
                  className={`text-xs font-black uppercase tracking-widest transition-all border-b-1 ${
                    activeTab === tab
                      ? 'text-blue-600 border-blue-600' 
                      : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {t.collection.tabs[tab]}
                </button>
              ))}
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 self-center mx-2"></div>
              <button
                onClick={() => {
                  setIsEnvModalOpen(true);
                }}
                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-all border-b-2 border-transparent"
              >
                {t.collection.tabs.environment}
              </button>
            </nav>
          )}
        </div>
        {/* Right side of header */}
        <div className="flex items-center gap-3 pr-4">
          <div className="relative group">
            <select 
              value={lang} 
              onChange={(e) => { setLang(e.target.value); localStorage.setItem('lang', e.target.value); }}
              className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 pl-4 pr-8 py-2 rounded-full text-[10px] font-black tracking-widest cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 border-none shadow-sm"
            >
              <option value="pt">BR</option>
              <option value="en">EN</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <button
          className="p-2 rounded-full theme-elevated hover:scale-110 transition-transform"
          onClick={toggleTheme}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        </div>
      </header>

      <main className={`flex-1 flex flex-col overflow-hidden ${view === 'collection-detail' || view === 'collections' ? 'theme-base' : 'py-12 px-4 overflow-y-auto items-center'}`}>
          <div className={`w-full flex flex-col ${view === 'collection-detail' || view === 'collections' ? 'max-w-full h-full' : 'max-w-5xl theme-surface rounded-2xl shadow-2xl border theme-border p-8 transition-all'}`}>
            {view === 'report' ? (
              <ReportView 
                reportData={reportData} 
                requestLogs={requestLogs}
                liveStats={liveStats}
                setView={setView}
                t={t}
                results={results}
                config={{ ...form, body: form.bodyRaw }}
                activeCollectionId={activeCollectionId}
                activeWorkflowId={form.activeWorkflowId}
                activeCollection={activeCollection}
                theme={theme}
                sendRequests={sendRequests}
                isRunning={isRunning}
                onStop={stopTest}
                lastExecutedPayload={lastExecutedPayload}
                onSaveResponseToDoc={saveResponseToDoc}
              />
            ) : view === 'collections' ? (
              <CollectionsView 
                collections={collections}
                t={t}
                onSelectRequest={handleEnterCollection}
                onCreateCollection={createCollection}
                onDeleteCollection={deleteCollection}
                onReorderCollection={reorderCollection}
                onUpdateName={updateCollectionName}
              />
            ) : view === 'collection-detail' ? (
              <CollectionView 
                collection={activeCollection}
                activeTab={activeTab}
                isEnvModalOpen={isEnvModalOpen}
                setIsEnvModalOpen={setIsEnvModalOpen}
                onTabChange={setActiveTab}
                t={t}
                onSelectRequest={(req, targetView, scenId, stepIdx, workflowId, subIdx) => { 
                // Salva o estado da action/passo atual antes de carregar a nova
                // Isso garante a persistência de campos como 'documentation' ao navegar pela barra lateral
                if (form.activeRequestId || (form.activeWorkflowId && form.activeStepIndex !== null)) {
                  updateRequestInCollection(true);
                }

                  const sanitizedReq = { 
                    ...req, 
                    responses: Array.isArray(req.responses) 
                      ? req.responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) 
                      : [] 
                  };
                  // Limpa resultados de execução anteriores ao trocar de action
                  setReportData(null);
                  setRequestLogs([]);
                  
                  loadRequest(sanitizedReq, scenId, stepIdx, workflowId, subIdx);
                  
                  // Sincroniza todos os campos de UI e Documentação de uma vez
                  updateField('requestName', req.name || 'Action');
                  updateField('documentation', req.documentation || '');
                  updateField('description', req.documentation || ''); // Mantém compatibilidade se algum componente ainda ler 'description'
                  updateField('authDoc', req.authDoc || '');
                  updateField('bodyRawDoc', req.bodyRawDoc || '');
                  
                  // Sincroniza manualmente os IDs de contexto no estado do formulário
                  updateField('activeWorkflowId', workflowId || null);
                  updateField('activeStepIndex', stepIdx ?? null);
                  updateField('activeSubIndex', subIdx ?? null);
                }}
                onViewDocumentation={(req) => viewDocumentation(req)}
                onRunRequest={handleRunSavedRequest}
                onRunSingleRequest={handleRunSingleSavedRequest}
                reportData={reportData}
                requestLogs={requestLogs}
                liveStats={liveStats}
                isRunning={isRunning}
                stopTest={stopTest}
                sendRequests={sendRequests}
                lastExecutedPayload={lastExecutedPayload}
                onSaveResponseToDoc={saveResponseToDoc}
                onBack={() => setView('collections')}
                // Props para o Editor embutido
                requestName={form.requestName}
                editorProps={{
                  ...form,
                  t,
                  setUrl: (v) => updateField('url', v),
                  setMethod: (v) => updateField('method', v),
                  setTotalRequests: (v) => updateField('totalRequests', v),
                  setDuration: (v) => updateField('duration', v),
                  setRampUp: (v) => updateField('rampUp', v),
                  setMode: (v) => updateField('mode', v),
                  setWorkers: (v) => updateField('workers', v),
                  setCaptureBody: (v) => updateField('captureBody', v),
                  methodStyles,
                  addHeader: () => addListItem('headers', { key: '', value: '' }),
                  removeHeader: (i) => removeListItem('headers', i),
                  updateHeader: (i, f, v) => updateIndexedField('headers', i, f, v),
                  setBodyType: (v) => updateField('bodyType', v),
                  setBodyRaw: (v) => updateField('bodyRaw', v),
                  addBodyParam: (p) => addListItem('bodyParams', p && !p.nativeEvent ? p : { key: '', value: '', type: 'text' }),
                  removeBodyParam: (i) => removeListItem('bodyParams', i),
                  updateBodyParam: (i, f, v) => updateIndexedField('bodyParams', i, f, v),
                  setAuthType: (v) => updateField('authType', v),
                  setAuthToken: (v) => updateField('authToken', v),
                  setAuthUsername: (v) => updateField('authUsername', v),
                  setAuthPassword: (v) => updateField('authPassword', v),
                  setApiKeyName: (v) => updateField('apiKeyName', v),
                  setApiKeyValue: (v) => updateField('apiKeyValue', v),
                  setAuthDoc: (v) => updateField('authDoc', v),
                  setRequestName: (v) => updateField('requestName', v),
                  sendRequests: () => sendRequests(form),
                  setDescription: (v) => updateField('description', v),
                  updateRequestInCollection,
                  setAssertions: (v) => updateField('assertions', v),
                  setExtractions: (v) => updateField('extractions', v),
                  showCustomToast,
                  isVarsModalOpen,
                  setIsVarsModalOpen
                }}
                // Props para a Documentação na sidebar
                docProps={{
                  request: { ...form, id: form.activeRequestId, name: form.requestName },
                  requests: getSelectedRequests(),
                  activeRequestId: form.activeRequestId,
                  bodyRawDoc: form.bodyRawDoc,
                  authDoc: form.authDoc,
                  bodyParams: form.bodyParams,
                  updateHeader: (i, f, v) => updateIndexedField('headers', i, f, v),
                  updatePathParam: (i, f, v) => updateIndexedField('pathParams', i, f, v),
                  updateResponse: (i, f, v) => updateIndexedField('responses', i, f, v),
                  addResponse: (curr) => updateField('responses', [...(Array.isArray(curr) ? curr : []), { statusCode: '', description: '', body: '', bodyFields: [] }]),
                  removeResponse: (i) => removeListItem('responses', i),
                  addResponseField,
                  removeResponseField,
                  updateResponseField,
                  addHeader: () => addListItem('headers', { key: '', value: '' }),
                  addPathParam: () => addListItem('pathParams', { key: '', value: '', docRequired: true }),
                  removeHeader: (i) => removeListItem('headers', i),
                  removePathParam: (i) => removeListItem('pathParams', i),
                  addBodyParam: (p) => addListItem('bodyParams', p && !p.nativeEvent ? p : { key: '', value: '', type: 'text' }),
                  removeBodyParam: (i) => removeListItem('bodyParams', i),
                  updateBodyParam: (i, f, v) => updateIndexedField('bodyParams', i, f, v),
                  updateField,
                  setBodyRawDoc: (v) => updateField('bodyRawDoc', v),
                  setAuthDoc: (v) => updateField('authDoc', v),
                  setDocumentation: (v) => updateField('documentation', v),
                  setBodyRaw: (v) => updateField('bodyRaw', v),
                  setAuthType: (v) => updateField('authType', v),
                  setRequestName: (v) => updateField('requestName', v),
                  showCustomToast
                }}
                onCloseRequestEditor={resetForm} // New prop: function to reset the form state
              onDeleteRequest={deleteRequest}
              onDeleteFolder={deleteFolder}
              onDeleteWorkflow={deleteWorkflow}
              onReorderItem={reorderItemInCollection}
              onUpdateFolderName={updateFolderName}
              onUpdateEnvironments={updateCollectionEnvironments}
              onSetActiveEnvironment={setActiveEnvironment}
              onUpdateName={updateCollectionName}
              onUpdateWorkflows={colMethods.updateCollectionWorkflows}
              onUpdateMockFolders={colMethods.updateCollectionMockFolders}
              onAddRequest={colMethods.addRequestToCollection}
              onAddFolder={colMethods.addFolderToCollection}
              onImportCurl={(colId, folderId = null) => {
                setImportTarget({ colId, folderId });
                setShowCurlModal(true);
              }}
              onMoveRequest={colMethods.moveRequestInCollection}
              selectedRequestIds={selectedRequestIds}
              onToggleSelection={toggleRequestSelection}
              activeWorkflowId={form.activeWorkflowId}
              setActiveWorkflowId={(v) => updateField('activeWorkflowId', v)}
              setActiveStepIndex={(v) => updateField('activeStepIndex', v)}
              setActiveSubIndex={(v) => updateField('activeSubIndex', v)}
              onViewUnifiedDoc={() => {
                const selected = getSelectedRequests();
                if (selected.length > 0) {
                  const sanitizedReq = { 
                    ...selected[0], 
                    responses: Array.isArray(selected[0].responses) 
                      ? selected[0].responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) 
                      : [] 
                  };
                  loadRequest(sanitizedReq);
                  updateField('requestName', selected[0].name);
                } else {
                  resetForm();
                  updateField('responses', []);
                }
                setView('documentation');
              }}
              />
            ) : view === 'documentation' ? (
              <DocumentationView 
                request={{ ...form, id: form.activeRequestId, name: form.requestName }}
                requests={getSelectedRequests()}
                activeRequestId={form.activeRequestId}
                t={t}
                onSelectForEdit={(req) => {
                  updateRequestInCollection(true); // Salva a atual silenciosamente
                  const sanitizedReq = { 
                    ...req, 
                    responses: Array.isArray(req.responses) 
                      ? req.responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) 
                      : [] 
                  };
                  loadRequest(sanitizedReq); // Carrega a próxima garantindo responses
                  updateField('requestName', req.name);
                }}
                collection={activeCollection}
                bodyRawDoc={form.bodyRawDoc}
                authDoc={form.authDoc}
                isRunning={isRunning}
                updateHeader={(i, f, v) => updateIndexedField('headers', i, f, v)}
                updatePathParam={(i, f, v) => updateIndexedField('pathParams', i, f, v)}
                updateResponse={(i, f, v) => updateIndexedField('responses', i, f, v)}
                onUpdateGeneralDoc={(doc) => {
                  setCollections(prev => prev.map(col => 
                    col.id === activeCollectionId ? { ...col, generalDoc: doc } : col
                  ));
                }}
                addResponse={(currentResponsesFromView = []) => { // Aceita as respostas atuais da view como base
                  const current = Array.isArray(currentResponsesFromView) ? [...currentResponsesFromView] : [];
                  const newItem = { statusCode: '', description: '', body: '', bodyFields: [] };
                  updateField('responses', [...current, newItem]);
                }}
                addResponseField={addResponseField}
                removeResponseField={removeResponseField}
                updateResponseField={updateResponseField}
                removeResponse={(i) => {
                  removeListItem('responses', i);
                  // Sincroniza a exclusão com a coleção imediatamente para evitar restauração pelo merge da View
                  setTimeout(() => updateRequestInCollection(true), 0);
                }}
                updateRequestInCollection={updateRequestInCollection}
                bodyParams={form.bodyParams}
                addHeader={() => addListItem('headers', { key: '', value: '' })}
                addPathParam={() => addListItem('pathParams', { key: '', value: '', docRequired: true })}
                removeHeader={(i) => removeListItem('headers', i)}
                removePathParam={(i) => removeListItem('pathParams', i)}
                addBodyParam={(p) => addListItem('bodyParams', p && !p.nativeEvent ? p : { key: '', value: '', type: 'text' })}
                removeBodyParam={(i) => removeListItem('bodyParams', i)}
                onClearBodyParams={() => updateField('bodyParams', [])}
                updateField={updateField}
                setBodyRawDoc={(v) => updateField('bodyRawDoc', v)}
                setAuthDoc={(v) => updateField('authDoc', v)}
                setUrl={(v) => updateField('url', v)}
                setMethod={(v) => updateField('method', v)}
                setDescription={(v) => updateField('description', v)}
                setBodyRaw={(v) => updateField('bodyRaw', v)}
                setAuthType={(v) => updateField('authType', v)}
                setRequestName={(v) => updateField('requestName', v)}
                setBodyType={(v) => updateField('bodyType', v)}
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
                        updateField('activeSubIndex', null);
                      }}
                      className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                      {form.activeWorkflowId ? t.config.actions.backToWork : t.config.actions.backToCol}
                    </button>
                  </div>
                )}
                <div className="max-w-[1100px] mx-auto">
                  <SaveRequestForm  
                    onSaveRequest={(name) => saveCurrentRequest(name, activeCollectionId)} 
                    requestName={form.requestName}
                    t={t}
                    setRequestName={(v) => updateField('requestName', v)}
                  />
                </div>
                <ConfigView
                  {...form}
                  t={t}
                  setUrl={(v) => updateField('url', v)} setMethod={(v) => updateField('method', v)}
                  setTotalRequests={(v) => updateField('totalRequests', v)} setDuration={(v) => updateField('duration', v)} setRampUp={(v) => updateField('rampUp', v)}
                  setMode={(v) => updateField('mode', v)}
                  setWorkers={(v) => updateField('workers', v)}
                  setCaptureBody={(v) => updateField('captureBody', v)}
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
                  setAuthToken={(v) => updateField('authToken', v)}
                  setAuthUsername={(v) => updateField('authUsername', v)}
                  setAuthPassword={(v) => updateField('authPassword', v)}
                  setApiKeyName={(v) => updateField('apiKeyName', v)}
                  setApiKeyValue={(v) => updateField('apiKeyValue', v)}
                  setBodyRawDoc={(v) => updateField('bodyRawDoc', v)} 
                  setAuthDoc={(v) => updateField('authDoc', v)}
                  sendRequests={() => sendRequests(form)}
                  setDescription={(v) => updateField('description', v)}
                  updateRequestInCollection={updateRequestInCollection}
                  isVarsModalOpen={isVarsModalOpen} 
                  setIsVarsModalOpen={setIsVarsModalOpen}
                  activeRequestId={form.activeRequestId}
                  setAssertions={(v) => updateField('assertions', v)} 
                  setExtractions={(v) => updateField('extractions', v)}
                  activeWorkflowId={form.activeWorkflowId}
                  showCustomToast={showCustomToast} // Passa a função de toast
                />
              </div>
            )}
          </div>
      </main>

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

    {/* Modal de Importação cURL */}
    {showCurlModal && ( // Curl Import Modal
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
        <div className="bg-[#111827] rounded-3xl w-full max-w-2xl shadow-2xl border border-[#161E31] overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#161E31]">
            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <span className="text-blue-500">curl</span> Importar Action
            </h3>
            <button onClick={() => setShowCurlModal(false)} className="text-slate-400 hover:text-rose-500 text-2xl">&times;</button>
          </div>
          <div className="p-6">
            <label className="label-base">{t.dashboard.importDescription}</label>
            <textarea
              className="input-base h-64 font-mono text-xs resize-none"
              placeholder="curl -X POST https://api.exemplo.com/users -d '...' "
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
            />
            <p className="mt-2 text-xs text-slate-500">Suporta headers, autenticação Basic/Bearer e corpos JSON/Raw.</p>
          </div>
          <div className="p-6 bg-[#161E31] border-t border-slate-700 flex justify-end gap-3">
            <button onClick={() => setShowCurlModal(false)} className="px-6 py-2 text-slate-600 dark:text-slate-400 font-bold">{t.common.cancel}</button>
            <button 
              onClick={executeCurlImport}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase"
            >
              {t.dashboard.import}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Confirmation Modal */}
    {showConfirmModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300"> {/* Confirmation Modal */}
        <div className="bg-[#111827] rounded-3xl w-full max-w-md shadow-2xl border border-[#161E31] overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#161E31]">
            <h3 className="text-xl font-bold dark:text-white">Confirmação</h3>
            <button 
              onClick={() => setShowConfirmModal(false)} 
              className="text-slate-400 hover:text-rose-500 transition-colors p-2 text-2xl"
            >&times;</button>
          </div>
          
          <div className="p-8 text-slate-700 dark:text-slate-300 text-lg">
            {confirmMessage}
          </div>

          <div className="p-6 bg-[#161E31] border-t border-slate-700 flex justify-end gap-3">
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
    </div>
  );
}

export default App;