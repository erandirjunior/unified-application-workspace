import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollectionsProvider, useCollectionsContext } from '../src/contexts/CollectionsContext';
import { ToastProvider } from '../src/contexts/ToastContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';

// Helper component that exposes context functions via button
let ctxRef = null;
function TestConsumer() {
  const ctx = useCollectionsContext();
  ctxRef = ctx;
  return (
    <div>
      <span data-testid="collections">{JSON.stringify(ctx.collections)}</span>
      <span data-testid="active-id">{ctx.activeCollectionId || 'null'}</span>
      <span data-testid="count">{ctx.collections.length}</span>
    </div>
  );
}

async function renderAndWait() {
  render(
    <ToastProvider>
      <ThemeProvider>
        <CollectionsProvider>
          <TestConsumer />
        </CollectionsProvider>
      </ThemeProvider>
    </ToastProvider>
  );
  // Wait for async collections to load
  await waitFor(() => {
    expect(parseInt(screen.getByTestId('count').textContent)).toBeGreaterThan(0);
  });
  return ctxRef;
}

function getCollections() {
  return JSON.parse(screen.getByTestId('collections').textContent);
}

describe('CollectionsContext', () => {
  it('should provide collections from useCollections hook', async () => {
    await renderAndWait();
    expect(getCollections().length).toBeGreaterThan(0);
  });

  it('should set activeCollectionId', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.setActiveCollectionId('1'); });
    expect(screen.getByTestId('active-id').textContent).toBe('1');
  });

  it('should create a collection with name', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.createCollection('New Collection'); });
    expect(getCollections().some(c => c.name === 'New Collection')).toBe(true);
  });

  it('should create a collection from imported data', async () => {
    const ctx = await renderAndWait();
    const imported = { id: 'imported-1', name: 'Imported', requests: [], environments: [], workflows: [] };
    act(() => { ctx.createCollection('', imported); });
    expect(getCollections().some(c => c.id === 'imported-1')).toBe(true);
  });

  it('should rename a collection', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.renameCollection('1', 'Renamed'); });
    expect(getCollections().find(c => c.id === '1').name).toBe('Renamed');
  });

  it('should reorder collection up', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.reorderCollection('2', 'up'); });
    expect(getCollections()[0].id).toBe('2');
  });

  it('should not reorder if already at top', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.reorderCollection('1', 'up'); });
    expect(getCollections()[0].id).toBe('1');
  });

  it('should not reorder if already at bottom', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.reorderCollection('2', 'down'); });
    expect(getCollections()[1].id).toBe('2');
  });

  it('should update collection environments', async () => {
    const ctx = await renderAndWait();
    const newEnvs = [{ id: 'prod', name: 'Prod', variables: [] }];
    act(() => { ctx.updateCollectionEnvironments('1', newEnvs); });
    expect(getCollections().find(c => c.id === '1').environments).toEqual(newEnvs);
  });

  it('should set active environment', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.setActiveEnvironment('1', 'prod-env'); });
    expect(getCollections().find(c => c.id === '1').activeEnvironmentId).toBe('prod-env');
  });

  it('should update folder name in requests section', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.updateFolderName('1', 'New Folder Name', 'folder-1', 'requests'); });
    const folder = getCollections().find(c => c.id === '1').requests.find(r => r.id === 'folder-1');
    expect(folder.name).toBe('New Folder Name');
  });

  it('should update folder name in workflows section', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? { ...c, workflows: [{ id: 'wf-1', name: 'Old WF' }] } : c));
    });
    act(() => { ctx.updateFolderName('1', 'New WF', 'wf-1', 'workflows'); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.workflows[0].name).toBe('New WF');
  });

  it('should update folder name in mocks section', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? { ...c, mockFolders: [{ id: 'mf-1', name: 'Old', type: 'folder' }] } : c));
    });
    act(() => { ctx.updateFolderName('1', 'New Mock', 'mf-1', 'mocks'); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.mockFolders[0].name).toBe('New Mock');
  });

  it('should reorder item in collection (requests)', async () => {
    const ctx = await renderAndWait();
    // folder-1 is at index 1, move it up
    act(() => { ctx.reorderItemInCollection('1', 'folder-1', 'up'); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.requests[0].id).toBe('folder-1');
  });

  it('should reorder item in collection (mocks section)', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? {
        ...c, mockFolders: [{ id: 'mf-1', name: 'A' }, { id: 'mf-2', name: 'B' }]
      } : c));
    });
    // Need to wait for the ctx to have updated collections reference
    await waitFor(() => {
      const col = getCollections().find(c => c.id === '1');
      expect(col.mockFolders).toHaveLength(2);
    });
    act(() => { ctxRef.reorderItemInCollection('1', 'mf-2', 'up', 'mocks'); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.mockFolders[0].id).toBe('mf-2');
  });

  it('should reorder workflow items', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? {
        ...c, workflows: [{ id: 'w1', name: 'WF1' }, { id: 'w2', name: 'WF2' }]
      } : c));
    });
    await waitFor(() => {
      const col = getCollections().find(c => c.id === '1');
      expect(col.workflows).toHaveLength(2);
    });
    act(() => { ctxRef.reorderItemInCollection('1', 'w2', 'up'); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.workflows[0].id).toBe('w2');
  });

  it('should reorder nested item inside a folder', async () => {
    const ctx = await renderAndWait();
    // req-nested-2 is at index 1 inside folder-1, move it up
    act(() => { ctx.reorderItemInCollection('1', 'req-nested-2', 'up'); });
    const col = getCollections().find(c => c.id === '1');
    const folder = col.requests.find(r => r.id === 'folder-1');
    expect(folder.requests[0].id).toBe('req-nested-2');
  });

  it('should not reorder if collection not found', async () => {
    const ctx = await renderAndWait();
    const before = getCollections();
    act(() => { ctx.reorderItemInCollection('nonexistent', 'item', 'up'); });
    expect(getCollections()).toEqual(before);
  });

  it('should not reorder mocks if item not found', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? {
        ...c, mockFolders: [{ id: 'mf-1', name: 'A' }]
      } : c));
    });
    act(() => { ctx.reorderItemInCollection('1', 'nonexistent', 'up', 'mocks'); });
    // Should not crash
    const col = getCollections().find(c => c.id === '1');
    expect(col.mockFolders[0].id).toBe('mf-1');
  });

  it('should delete request after confirmation', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.deleteRequest('1', 'req-1'); });
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('Confirmar')); });
    const col = getCollections().find(c => c.id === '1');
    const reqIds = col.requests.map(r => r.id);
    expect(reqIds).not.toContain('req-1');
  });

  it('should delete folder after confirmation', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.deleteFolder('1', 'folder-1'); });
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('Confirmar')); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.requests.find(r => r.id === 'folder-1')).toBeUndefined();
  });

  it('should delete folder in workflows section', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? {
        ...c, workflows: [{ id: 'wf-del', name: 'ToDelete', type: 'folder' }]
      } : c));
    });
    act(() => { ctx.deleteFolder('1', 'wf-del', 'workflows'); });
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('Confirmar')); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.workflows).toHaveLength(0);
  });

  it('should delete folder in mocks section', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? {
        ...c, mockFolders: [{ id: 'mf-del', name: 'Mock', type: 'folder' }]
      } : c));
    });
    act(() => { ctx.deleteFolder('1', 'mf-del', 'mocks'); });
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('Confirmar')); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.mockFolders).toHaveLength(0);
  });

  it('should delete workflow after confirmation', async () => {
    const ctx = await renderAndWait();
    act(() => {
      ctx.setCollections(prev => prev.map(c => c.id === '1' ? {
        ...c, workflows: [{ id: 'wf-1', name: 'WF' }]
      } : c));
    });
    act(() => { ctx.deleteWorkflow('1', 'wf-1'); });
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('Confirmar')); });
    const col = getCollections().find(c => c.id === '1');
    expect(col.workflows).toHaveLength(0);
  });

  it('should delete collection after confirmation', async () => {
    const ctx = await renderAndWait();
    act(() => { ctx.deleteCollection('2'); });
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('Confirmar')); });
    expect(getCollections().find(c => c.id === '2')).toBeUndefined();
  });
});
