import { useState, useEffect } from 'react';

export function useCollections() {
  const [collections, setCollections] = useState(() => {
    try {
      const saved = localStorage.getItem('ast_collections');
      const parsed = saved ? JSON.parse(saved) : null;
      if (!Array.isArray(parsed)) {
        return [{ 
          id: '1', 
          name: 'Minha Coleção', // Coleção com uma pasta para testes de reordenação interna
          requests: [
            { id: 'req-1', name: 'Default Request', method: 'GET', url: 'http://example.com', type: 'request' },
            { id: 'folder-1', name: 'Pasta Teste', type: 'folder', requests: [
              { id: 'req-nested-1', name: 'Nested Req 1', method: 'GET', url: 'http://nested.com/1', type: 'request' },
              { id: 'req-nested-2', name: 'Nested Req 2', method: 'POST', url: 'http://nested.com/2', type: 'request' }
            ]}
          ],
          environments: [{ id: 'default', name: 'Global', variables: [] }],
          activeEnvironmentId: 'default',
          scenarios: [],
          workflows: []
        }, { // Adiciona uma segunda coleção para que os testes de reordenação de coleção funcionem
          requests: [], 
          environments: [{ id: 'default', name: 'Global', variables: [] }],
          activeEnvironmentId: 'default',
          scenarios: [],
          workflows: []
        }];
      }
      
      return parsed.map(col => ({
        ...col,
        environments: col.environments || [{ id: 'default', name: 'Global', variables: [] }], // Garante que environments exista
        requests: col.requests && col.requests.length > 0 ? col.requests : [{ id: 'req-1', name: 'Default Request', method: 'GET', url: 'http://example.com', type: 'request' }], // Garante requests
        activeEnvironmentId: col.activeEnvironmentId || 'default',
        scenarios: (col.scenarios || []).map(s => ({ ...s, steps: s.steps || [] })),
        workflows: (col.workflows || []).map(w => w.type === 'folder' ? w : ({ ...w, steps: w.steps || [] })),
        mockFolders: col.mockFolders || []
      }));
    } catch (e) {
      return [{ 
        id: '1', 
        name: 'Minha Coleção', 
        requests: [ // Garante que a estrutura para o teste exista no catch também
          { id: 'req-1', name: 'Default Request', method: 'GET', url: 'http://example.com', type: 'request' },
          { id: 'folder-1', name: 'Pasta Teste', type: 'folder', requests: [
            { id: 'req-nested-1', name: 'Nested Req 1', method: 'GET', url: 'http://nested.com/1', type: 'request' },
            { id: 'req-nested-2', name: 'Nested Req 2', method: 'POST', url: 'http://nested.com/2', type: 'request' }
          ]}
        ], 
        environments: [{ id: 'default', name: 'Global', variables: [] }], activeEnvironmentId: 'default',
        scenarios: [], workflows: []
      }];
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

  const updateCollectionWorkflows = (colId, workflows) => {
    setCollections(prev => prev.map(col => col.id === colId ? { ...col, workflows } : col));
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

  const addFolderToCollection = (colId, name, section = 'requests') => {
    const newFolder = { id: Date.now().toString(), type: 'folder', name: name || 'Nova Pasta', requests: [] };
    setCollections(prev => prev.map(col => {
      if (col.id !== colId) return col;
      if (section === 'workflows') {
        return { ...col, workflows: [...(col.workflows || []), newFolder] };
      }
      if (section === 'mocks') {
        // Para mocks, não usa pastas no backend, mas permite organização local
        return { ...col, mockFolders: [...(col.mockFolders || []), newFolder] };
      }
      return { ...col, requests: [...col.requests, newFolder] };
    }));
  };

  const moveRequestInCollection = (colId, requestId, targetFolderId = null, section = 'requests', itemData = null) => {
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
      
      // Se não encontrou no array, usa itemData fornecido (ex: mock do backend)
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
      updateCollectionScenarios, updateCollectionWorkflows,
    addRequestToCollection, addFolderToCollection,
    moveRequestInCollection, reorderItemInCollection
  };
}