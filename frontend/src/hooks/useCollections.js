import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllCollections, saveAllCollections, migrateFromLocalStorage } from '../utils/indexedDB';

const DEFAULT_COLLECTIONS = [];

function normalizeCollections(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return parsed.map(col => ({
    ...col,
    environments: col.environments || [{ id: 'default', name: 'Global', variables: [] }],
    requests: col.requests && col.requests.length > 0 ? col.requests : [{ id: 'req-1', name: 'Default Request', method: 'GET', url: 'http://example.com', type: 'request' }],
    activeEnvironmentId: col.activeEnvironmentId || 'default',
    scenarios: (col.scenarios || []).map(s => ({ ...s, steps: s.steps || [] })),
    workflows: (col.workflows || []).map(w => w.type === 'folder' ? w : ({ ...w, steps: w.steps || [] })),
    mockFolders: col.mockFolders || []
  }));
}

export function useCollections() {
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Carrega dados do IndexedDB na inicialização (com migração do localStorage se necessário)
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        // Tenta migrar do localStorage primeiro (para usuários existentes)
        const migrated = await migrateFromLocalStorage();
        if (migrated && !cancelled) {
          const normalized = normalizeCollections(migrated);
          if (normalized) {
            setCollections(normalized);
            setIsLoaded(true);
            return;
          }
        }

        // Carrega do IndexedDB
        const stored = await getAllCollections();
        if (!cancelled) {
          const normalized = normalizeCollections(stored);
          if (normalized) {
            setCollections(normalized);
          }
          setIsLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load collections from IndexedDB:', e);
        if (!cancelled) setIsLoaded(true);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Persiste no IndexedDB com debounce quando collections mudam (após o carregamento inicial)
  useEffect(() => {
    if (!isLoaded) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAllCollections(collections).catch(err => {
        console.error('Failed to save collections to IndexedDB:', err);
      });
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [collections, isLoaded]);

  const createCollection = useCallback((name, importedData = null) => {
    if (importedData) {
      setCollections(prev => [...prev, importedData]);
    } else {
      setCollections(prev => [...prev, { 
        id: Date.now().toString(), 
        name,
        requests: [], 
        environments: [{ id: 'default', name: 'Global', variables: [] }],
        activeEnvironmentId: 'default',
        scenarios: []
      }]);
    }
  }, []);

  const deleteCollection = useCallback((id) => {
    setCollections(prev => prev.filter(c => c.id !== id));
  }, []);

  const reorderCollection = useCallback((id, direction) => {
    setCollections(prev => {
      const index = prev.findIndex(c => c.id === id);
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const result = [...prev];
      const [removed] = result.splice(index, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  }, []);

  const updateCollectionName = useCallback((id, newName) => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  }, []);

  const updateCollectionEnvironments = useCallback((colId, environments) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, environments } : col));
  }, []);

  const setActiveEnvironment = useCallback((colId, envId) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, activeEnvironmentId: envId } : col));
  }, []);

  const updateCollectionScenarios = useCallback((colId, scenarios) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, scenarios } : col));
  }, []);

  const updateCollectionWorkflows = useCallback((colId, workflows) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, workflows } : col));
  }, []);

  const updateCollectionMockFolders = useCallback((colId, mockFolders) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, mockFolders } : col));
  }, []);

  const addRequestToCollection = useCallback((colId, name, folderId = null) => {
    const newReq = {
      id: Date.now().toString(),
      type: 'request',
      name: name || 'Nova Requisição',
      url: 'https://api.example.com',
      method: 'GET',
      totalRequests: 1, duration: 10, rampUp: 0,
      headers: [{ key: '', value: '' }],
      bodyType: 'none', bodyRaw: '', bodyRawDoc: '',
      description: '', pathParams: [], bodyParams: [],
      authType: 'none', authDoc: '', assertions: [], extractions: []
    };

    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;
      if (!folderId) return { ...col, requests: [...col.requests, newReq] };
      return {
        ...col,
        requests: col.requests.map(item => item.id === folderId ? { ...item, requests: [...item.requests, newReq] } : item)
      };
    }));
  }, []);

  const addFolderToCollection = useCallback((colId, name, section = 'requests') => {
    const newFolder = { id: Date.now().toString(), type: 'folder', name: name || 'Nova Pasta', requests: [] };
    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;
      if (section === 'workflows') {
        return { ...col, workflows: [...(col.workflows || []), newFolder] };
      }
      if (section === 'mocks') {
        return { ...col, mockFolders: [...(col.mockFolders || []), newFolder] };
      }
      return { ...col, requests: [...col.requests, newFolder] };
    }));
  }, []);

  const moveRequestInCollection = useCallback((colId, requestId, targetFolderId = null, section = 'requests', itemData = null) => {
    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;
      
      const sourceKey = section === 'workflows' ? 'workflows' : section === 'mocks' ? 'mockFolders' : 'requests';
      const items = col[sourceKey] || [];
      
      let itemToMove = null;
      const extract = (list) => {
        const result = [];
        for (const item of list) {
          if (item.id === requestId) itemToMove = item;
          else if (item.type === 'folder') result.push({ ...item, requests: extract(item.requests || []) });
          else result.push(item);
        }
        return result;
      };
      const cleaned = extract(items);
      
      if (!itemToMove && itemData) itemToMove = itemData;
      if (!itemToMove) return col;
      
      const insert = (list) => list.map(item => {
        if (item.id === targetFolderId) return { ...item, requests: [...(item.requests || []), itemToMove] };
        if (item.type === 'folder') return { ...item, requests: insert(item.requests || []) };
        return item;
      });
      
      const updated = !targetFolderId ? [...cleaned, itemToMove] : insert(cleaned);
      return { ...col, [sourceKey]: updated };
    }));
  }, []);

  const reorderItemInCollection = useCallback((colId, itemId, direction) => {
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
  }, []);

  return {
    collections, setCollections, isLoaded,
    createCollection, deleteCollection, reorderCollection,
    updateCollectionName,
    updateCollectionEnvironments, setActiveEnvironment,
    updateCollectionScenarios, updateCollectionWorkflows, updateCollectionMockFolders,
    addRequestToCollection, addFolderToCollection,
    moveRequestInCollection, reorderItemInCollection
  };
}
