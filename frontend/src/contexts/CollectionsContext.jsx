import React, { createContext, useContext, useState, useCallback } from 'react';
import { useCollections } from '../hooks/useCollections';
import { useToast } from './ToastContext';
import { useTheme } from './ThemeContext';

const CollectionsContext = createContext(null);

export function CollectionsProvider({ children }) {
  const { showCustomToast, showCustomConfirm } = useToast();
  const { t } = useTheme();
  const { collections, setCollections, ...colMethods } = useCollections();
  const [activeCollectionId, setActiveCollectionId] = useState(null);

  // Derived state
  const activeCollection = collections.find(c => c.id === activeCollectionId);

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
        workflows: []
      }]);
    }
  }, [setCollections]);

  const deleteCollection = useCallback((id) => {
    showCustomConfirm(t.toasts.confirmDeleteCollection, () => {
      setCollections(prev => prev.filter(c => c.id !== id));
      showCustomToast(t.toasts.collectionDeleted, 'success');
    });
  }, [setCollections, showCustomConfirm, showCustomToast, t]);

  const renameCollection = useCallback((id, newName) => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  }, [setCollections]);

  const reorderCollection = useCallback((id, direction) => {
    const index = collections.findIndex(c => c.id === id);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || newIndex < 0 || newIndex >= collections.length) return;

    setCollections(prev => {
      const result = [...prev];
      const [removed] = result.splice(index, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  }, [collections, setCollections]);

  const reorderItemInCollection = useCallback((colId, itemId, direction, section) => {
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
  }, [collections, setCollections]);

  const updateCollectionEnvironments = useCallback((colId, environments) => {
    setCollections(prev => prev.map(col =>
      col.id === colId ? { ...col, environments } : col
    ));
  }, [setCollections]);

  const setActiveEnvironment = useCallback((colId, envId) => {
    setCollections(prev => prev.map(col =>
      col.id === colId ? { ...col, activeEnvironmentId: envId } : col
    ));
  }, [setCollections]);

  const updateFolderName = useCallback((colId, newName, folderId, section = 'requests') => {
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
  }, [setCollections, showCustomToast, t]);

  const deleteRequest = useCallback((colId, reqId) => {
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
  }, [setCollections, showCustomConfirm, showCustomToast, t]);

  const deleteFolder = useCallback((colId, folderId, section = 'requests') => {
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
  }, [setCollections, showCustomConfirm, showCustomToast, t]);

  const deleteWorkflow = useCallback((colId, workflowId) => {
    showCustomConfirm(t.toasts.confirmDeleteWorkflow, () => {
      setCollections(prev => prev.map(collection => {
        if (collection.id !== colId) return collection;
        return { ...collection, workflows: (collection.workflows || []).filter(w => w.id !== workflowId) };
      }));
      showCustomToast(t.toasts.workflowDeleted, 'success');
    });
  }, [setCollections, showCustomConfirm, showCustomToast, t]);

  const value = {
    collections,
    setCollections,
    activeCollectionId,
    setActiveCollectionId,
    activeCollection,
    createCollection,
    deleteCollection,
    renameCollection,
    reorderCollection,
    reorderItemInCollection,
    updateCollectionEnvironments,
    setActiveEnvironment,
    updateFolderName,
    deleteRequest,
    deleteFolder,
    deleteWorkflow,
    // Pass through methods from useCollections hook
    addRequestToCollection: colMethods.addRequestToCollection,
    addFolderToCollection: colMethods.addFolderToCollection,
    moveRequestInCollection: colMethods.moveRequestInCollection,
    updateCollectionWorkflows: colMethods.updateCollectionWorkflows,
    updateCollectionMockFolders: colMethods.updateCollectionMockFolders,
  };

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollectionsContext() {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error('useCollectionsContext must be used within a CollectionsProvider');
  }
  return context;
}
