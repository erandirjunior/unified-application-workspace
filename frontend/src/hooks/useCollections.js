import { useState, useEffect } from 'react';

export function useCollections() {
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
          activeEnvironmentId: 'default',
          scenarios: []
        }];
      }
      
      return parsed.map(col => ({
        ...col,
        environments: col.environments || [{ id: 'default', name: 'Global', variables: col.variables || [] }],
        activeEnvironmentId: col.activeEnvironmentId || 'default',
        scenarios: (col.scenarios || []).map(s => ({ ...s, steps: s.steps || [] }))
      }));
    } catch (e) {
      return [{ id: '1', name: 'Minha Coleção', requests: [], environments: [{ id: 'default', name: 'Global', variables: [] }], activeEnvironmentId: 'default' }];
    }
  });

  useEffect(() => {
    localStorage.setItem('ast_collections', JSON.stringify(collections));
  }, [collections]);

  const createCollection = (name, importedData = null) => {
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
  };

  const deleteCollection = (id) => {
    setCollections(prev => prev.filter(c => c.id !== id));
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

  const updateCollectionName = (id, newName) => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const updateCollectionEnvironments = (colId, environments) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, environments } : col));
  };

  const setActiveEnvironment = (colId, envId) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, activeEnvironmentId: envId } : col));
  };

  const updateCollectionScenarios = (colId, scenarios) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, scenarios } : col));
  };

  const addRequestToCollection = (colId, name, folderId = null) => {
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
  };

  const addFolderToCollection = (colId, name) => {
    const newFolder = { id: Date.now().toString(), type: 'folder', name: name || 'Nova Pasta', requests: [] };
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, requests: [...col.requests, newFolder] } : col));
  };

  const moveRequestInCollection = (colId, requestId, targetFolderId = null) => {
    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;
      let requestToMove = null;
      const extract = (items) => {
        const result = [];
        for (const item of items) {
          if (item.id === requestId) requestToMove = item;
          else if (item.type === 'folder') result.push({ ...item, requests: extract(item.requests || []) });
          else result.push(item);
        }
        return result;
      };
      const cleanedRequests = extract(col.requests);
      if (!requestToMove) return col;
      const insert = (items) => items.map(item => {
        if (item.id === targetFolderId) return { ...item, requests: [...(item.requests || []), requestToMove] };
        if (item.type === 'folder') return { ...item, requests: insert(item.requests || []) };
        return item;
      });
      return { ...col, requests: !targetFolderId ? [...cleanedRequests, requestToMove] : insert(cleanedRequests) };
    }));
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

  return {
    collections, setCollections,
    createCollection, deleteCollection, reorderCollection,
    updateCollectionName,
    updateCollectionEnvironments, setActiveEnvironment,
    updateCollectionScenarios,
    addRequestToCollection, addFolderToCollection,
    moveRequestInCollection, reorderItemInCollection
  };
}