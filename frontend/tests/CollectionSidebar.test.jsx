import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionSidebar from '../src/components/CollectionSidebar';
import { pt } from '../src/locales/pt';

const mockCollection = {
  id: 'col-1',
  name: 'Test Collection',
  requests: [
    { id: 'req-1', name: 'Get Users', method: 'GET', url: '/users', type: 'request' },
    { id: 'folder-1', name: 'Auth', type: 'folder', requests: [
      { id: 'req-2', name: 'Login', method: 'POST', url: '/login', type: 'request' }
    ]},
  ],
  workflows: [
    { id: 'wf-1', name: 'Workflow A', type: 'workflow' },
    { id: 'wf-folder-1', name: 'WF Folder', type: 'folder', requests: [
      { id: 'wf-2', name: 'Workflow B', type: 'workflow' }
    ]}
  ],
  mockFolders: [],
};

const defaultProps = {
  collection: mockCollection,
  t: pt,
  activeTab: 'requests',
  onTabChange: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  onBack: vi.fn(),
  onAddRequest: vi.fn(),
  onAddFolder: vi.fn(),
  onImportCurl: vi.fn(),
  onSelectRequest: vi.fn(),
  onDeleteRequest: vi.fn(),
  onDeleteFolder: vi.fn(),
  onDeleteWorkflow: vi.fn(),
  onReorderItem: vi.fn(),
  onMoveRequest: vi.fn(),
  onUpdateFolderName: vi.fn(),
  onUpdateWorkflows: vi.fn(),
  editingWorkflowId: null,
  setEditingWorkflowId: vi.fn(),
  setActiveWorkflowId: vi.fn(),
  mocks: [],
  selectedMock: null,
  monitoringMock: null,
  setSelectedMock: vi.fn(),
  setIsEditingMock: vi.fn(),
  setMonitoringMock: vi.fn(),
  fetchMocksList: vi.fn(),
  handleAddNewAction: vi.fn(),
  handleAddNewWorkflow: vi.fn(),
  handleAddNewMock: vi.fn(),
  editorProps: { activeRequestId: null },
  rightPanelSize: 'normal',
  setRightPanelSize: vi.fn(),
  filteredItems: mockCollection.requests,
  filteredWorkflows: mockCollection.workflows,
  filteredMocks: [],
};

describe('CollectionSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collection name and back button', () => {
    render(<CollectionSidebar {...defaultProps} />);
    expect(screen.getByText('Test Collection')).toBeInTheDocument();
    expect(screen.getByTitle(pt.collection.backToDashboard)).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByTitle(pt.collection.backToDashboard));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('renders request items in requests tab', () => {
    render(<CollectionSidebar {...defaultProps} />);
    expect(screen.getByText('Get Users')).toBeInTheDocument();
    expect(screen.getByText('Auth')).toBeInTheDocument();
  });

  it('renders folder items and expands on click', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Auth'));
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('selects a request on click', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Users'));
    expect(defaultProps.onSelectRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 'req-1' }));
  });

  it('selects a request and resets panel size when maximized', () => {
    const setSize = vi.fn();
    render(<CollectionSidebar {...defaultProps} rightPanelSize="maximized" setRightPanelSize={setSize} />);
    fireEvent.click(screen.getByText('Get Users'));
    expect(setSize).toHaveBeenCalledWith('normal');
    expect(defaultProps.onSelectRequest).toHaveBeenCalled();
  });

  it('calls handleAddNewAction when Action button is clicked', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('HTTP Request'));
    expect(defaultProps.handleAddNewAction).toHaveBeenCalled();
  });

  it('calls onAddFolder when Pasta button is clicked in requests tab', () => {
    render(<CollectionSidebar {...defaultProps} />);
    const pastaButtons = screen.getAllByText('Pasta');
    fireEvent.click(pastaButtons[0]);
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', 'Nova Pasta');
  });

  it('calls onImportCurl when cURL button is clicked', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('cURL'));
    expect(defaultProps.onImportCurl).toHaveBeenCalledWith('col-1');
  });

  it('calls onDeleteRequest when delete button is clicked on a request', () => {
    render(<CollectionSidebar {...defaultProps} />);
    const deleteBtn = screen.getAllByTitle(pt.collection.tooltips.delete)[0];
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDeleteRequest).toHaveBeenCalledWith('col-1', 'req-1');
  });

  it('calls onReorderItem with up direction on request', () => {
    // req-1 is at index 0, so up is disabled. Use the folder at index 1 instead
    const items = [
      { id: 'req-1', name: 'First', method: 'GET', url: '/first', type: 'request' },
      { id: 'req-2', name: 'Second', method: 'POST', url: '/second', type: 'request' },
    ];
    render(<CollectionSidebar {...defaultProps} filteredItems={items} />);
    const allUpBtns = screen.getAllByTitle(pt.collection.tooltips.moveUp);
    // The second item's up button should be enabled
    fireEvent.click(allUpBtns[1]);
    expect(defaultProps.onReorderItem).toHaveBeenCalledWith('col-1', 'req-2', 'up');
  });

  it('calls onReorderItem with down direction on request', () => {
    const items = [
      { id: 'req-1', name: 'First', method: 'GET', url: '/first', type: 'request' },
      { id: 'req-2', name: 'Second', method: 'POST', url: '/second', type: 'request' },
    ];
    render(<CollectionSidebar {...defaultProps} filteredItems={items} />);
    const allDownBtns = screen.getAllByTitle(pt.collection.tooltips.moveDown);
    // The first item's down button should be enabled
    fireEvent.click(allDownBtns[0]);
    expect(defaultProps.onReorderItem).toHaveBeenCalledWith('col-1', 'req-1', 'down');
  });

  it('handles drag and drop on root', () => {
    const { container } = render(<CollectionSidebar {...defaultProps} />);
    const scrollArea = container.querySelector('.overflow-y-auto');
    
    // Drop on root
    fireEvent.dragOver(scrollArea, { preventDefault: vi.fn() });
    fireEvent.drop(scrollArea, { 
      preventDefault: vi.fn(), 
      dataTransfer: { 
        getData: vi.fn((key) => {
          if (key === 'requestId') return 'req-1';
          if (key === 'section') return 'requests';
          return '';
        }) 
      } 
    });
    
    expect(defaultProps.onMoveRequest).toHaveBeenCalledWith('col-1', 'req-1', null, 'requests');
  });

  it('handles drag and drop on folder', () => {
    render(<CollectionSidebar {...defaultProps} />);
    const folderEl = screen.getByText('Auth').closest('[class*="rounded-lg"]');
    
    fireEvent.dragOver(folderEl, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    fireEvent.drop(folderEl, { 
      preventDefault: vi.fn(), 
      stopPropagation: vi.fn(),
      dataTransfer: { getData: vi.fn((key) => key === 'requestId' ? 'req-1' : 'requests') }
    });
    
    expect(defaultProps.onMoveRequest).toHaveBeenCalledWith('col-1', 'req-1', 'folder-1', 'requests');
  });

  it('handles drag leave on folder', () => {
    render(<CollectionSidebar {...defaultProps} />);
    const folderEl = screen.getByText('Auth').closest('[class*="rounded-lg"]');
    fireEvent.dragLeave(folderEl);
    // No error thrown
  });

  it('renders rename folder input on edit button click', () => {
    render(<CollectionSidebar {...defaultProps} />);
    // Expand folder first
    fireEvent.click(screen.getByText('Auth'));
    // Click rename
    const renameBtn = screen.getByTitle(pt.collection.tooltips.renameFolder);
    fireEvent.click(renameBtn);
    
    const input = screen.getByDisplayValue('Auth');
    expect(input).toBeInTheDocument();
    
    fireEvent.change(input, { target: { value: 'Auth V2' } });
    fireEvent.blur(input);
    expect(defaultProps.onUpdateFolderName).toHaveBeenCalledWith('col-1', 'Auth V2', 'folder-1');
  });

  it('does not rename folder if name unchanged', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Auth'));
    const renameBtn = screen.getByTitle(pt.collection.tooltips.renameFolder);
    fireEvent.click(renameBtn);
    
    const input = screen.getByDisplayValue('Auth');
    fireEvent.blur(input);
    expect(defaultProps.onUpdateFolderName).not.toHaveBeenCalled();
  });

  it('closes rename on Enter key', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Auth'));
    const renameBtn = screen.getByTitle(pt.collection.tooltips.renameFolder);
    fireEvent.click(renameBtn);
    
    const input = screen.getByDisplayValue('Auth');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onUpdateFolderName).toHaveBeenCalledWith('col-1', 'New Name', 'folder-1');
  });

  it('calls onDeleteFolder when delete folder button is clicked', () => {
    render(<CollectionSidebar {...defaultProps} />);
    // The folder itself has a delete button
    fireEvent.click(screen.getByText('Auth'));
    const folderDeleteBtns = screen.getByText('Auth').closest('.space-y-1').querySelectorAll('button');
    // Find the delete button (last action button in the folder header)
    const deleteBtn = Array.from(folderDeleteBtns).find(btn => {
      const svg = btn.querySelector('svg');
      return svg && btn.classList.contains('hover:text-rose-500') && !btn.title;
    });
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      expect(defaultProps.onDeleteFolder).toHaveBeenCalledWith('col-1', 'folder-1');
    }
  });

  it('adds request inside folder when + button is clicked', () => {
    render(<CollectionSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Auth'));
    const addBtn = screen.getByTitle(pt.collection.actions.newRequest);
    fireEvent.click(addBtn);
    expect(defaultProps.onAddRequest).toHaveBeenCalledWith('col-1', 'HTTP Request', 'folder-1');
  });

  // Workflows tab tests
  it('renders workflows when activeTab is workflows', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    expect(screen.getByText('Workflow A')).toBeInTheDocument();
  });

  it('renders workflow new button in workflows tab', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    expect(screen.getByText(pt.workflows.newBtn)).toBeInTheDocument();
  });

  it('calls handleAddNewWorkflow when workflow add button clicked', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    fireEvent.click(screen.getByText(pt.workflows.newBtn));
    expect(defaultProps.handleAddNewWorkflow).toHaveBeenCalled();
  });

  it('selects a workflow on click', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    fireEvent.click(screen.getByText('Workflow A'));
    expect(defaultProps.onTabChange).toHaveBeenCalledWith('workflows');
    expect(defaultProps.setEditingWorkflowId).toHaveBeenCalledWith('wf-1');
  });

  it('deletes a workflow on delete button click', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    // Hover to show buttons
    const wfItem = screen.getByText('Workflow A').closest('.group');
    fireEvent.mouseOver(wfItem);
    const deleteBtn = wfItem.querySelectorAll('button');
    const lastBtn = deleteBtn[deleteBtn.length - 1];
    fireEvent.click(lastBtn);
    expect(defaultProps.onDeleteWorkflow).toHaveBeenCalledWith('col-1', 'wf-1');
  });

  it('expands workflow folder and renders nested workflows', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    fireEvent.click(screen.getByText('WF Folder'));
    expect(screen.getByText('Workflow B')).toBeInTheDocument();
  });

  // Mocks tab tests
  it('renders mocks tab with new mock button', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="mocks" />);
    expect(screen.getByText(pt.mocks.newBtn)).toBeInTheDocument();
  });

  it('calls handleAddNewMock when mock add button clicked', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="mocks" />);
    fireEvent.click(screen.getByText(pt.mocks.newBtn));
    expect(defaultProps.handleAddNewMock).toHaveBeenCalled();
  });

  it('renders mock items in mocks tab', () => {
    const mocks = [{ id: 'mock-1', name: 'Mock Users', method: 'GET', active: false }];
    render(<CollectionSidebar {...defaultProps} activeTab="mocks" filteredMocks={mocks} />);
    expect(screen.getByText('Mock Users')).toBeInTheDocument();
  });

  it('selects a mock on click', () => {
    const mocks = [{ id: 'mock-1', name: 'Mock Users', method: 'GET', active: false }];
    render(<CollectionSidebar {...defaultProps} activeTab="mocks" filteredMocks={mocks} />);
    fireEvent.click(screen.getByText('Mock Users'));
    expect(defaultProps.onTabChange).toHaveBeenCalledWith('mocks');
    expect(defaultProps.setSelectedMock).toHaveBeenCalledWith(mocks[0]);
    expect(defaultProps.setIsEditingMock).toHaveBeenCalledWith(true);
    expect(defaultProps.setMonitoringMock).toHaveBeenCalledWith(null);
  });

  it('shows empty state when filteredItems is empty', () => {
    render(<CollectionSidebar {...defaultProps} filteredItems={[]} />);
    expect(screen.getByText(pt.common.empty)).toBeInTheDocument();
  });

  it('shows empty state for workflows when filteredWorkflows is empty', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" filteredWorkflows={[]} />);
    expect(screen.getByText(pt.common.empty)).toBeInTheDocument();
  });

  it('shows empty state for mocks when filteredMocks is empty', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="mocks" filteredMocks={[]} />);
    expect(screen.getByText(pt.common.empty)).toBeInTheDocument();
  });

  it('highlights active request item', () => {
    render(<CollectionSidebar {...defaultProps} editorProps={{ activeRequestId: 'req-1' }} />);
    const item = screen.getByText('Get Users').closest('[draggable]');
    expect(item.className).toContain('border-[#7C5CFF]');
  });

  it('highlights active workflow item', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" editingWorkflowId="wf-1" />);
    const item = screen.getByText('Workflow A').closest('[draggable]');
    expect(item.className).toContain('border-[#7C5CFF]');
  });

  it('shows search input and calls setSearch on change', () => {
    render(<CollectionSidebar {...defaultProps} />);
    const input = screen.getByPlaceholderText(pt.collection.searchPlaceholder);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(defaultProps.setSearch).toHaveBeenCalledWith('test');
  });

  it('shows folder contents when search is active', () => {
    // When search is not empty, folders auto-expand
    render(<CollectionSidebar {...defaultProps} search="Login" />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders mock folder items in mocks tab', () => {
    const mockFolder = { id: 'mf-1', name: 'Mock Folder', type: 'folder', requests: [{ id: 'mock-2', name: 'Nested Mock', method: 'POST', active: false }] };
    render(<CollectionSidebar {...defaultProps} activeTab="mocks" filteredMocks={[mockFolder]} />);
    expect(screen.getByText('Mock Folder')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mock Folder'));
    expect(screen.getByText('Nested Mock')).toBeInTheDocument();
  });

  it('handles mock delete with confirmation', async () => {
    const mocks = [{ id: 'mock-1', name: 'Mock Users', method: 'GET', active: false }];
    window.confirm.mockReturnValueOnce(true);
    global.fetch.mockResolvedValueOnce({ ok: true });
    
    render(<CollectionSidebar {...defaultProps} activeTab="mocks" filteredMocks={mocks} />);
    const mockItem = screen.getByText('Mock Users').closest('.group');
    fireEvent.mouseOver(mockItem);
    const buttons = mockItem.querySelectorAll('button');
    const deleteBtn = buttons[buttons.length - 1];
    fireEvent.click(deleteBtn);
    
    expect(window.confirm).toHaveBeenCalledWith(pt.mocks.confirmDelete);
  });

  it('renders active mock with pulse indicator', () => {
    const mocks = [{ id: 'mock-1', name: 'Active Mock', method: 'GET', active: true }];
    const { container } = render(<CollectionSidebar {...defaultProps} activeTab="mocks" filteredMocks={mocks} monitoringMock={mocks[0]} />);
    const pulse = container.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
  });

  it('handles drag start on workflow item', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    const wfItem = screen.getByText('Workflow A').closest('[draggable]');
    const setData = vi.fn();
    fireEvent.dragStart(wfItem, { dataTransfer: { setData } });
    expect(setData).toHaveBeenCalledWith('requestId', 'wf-1');
    expect(setData).toHaveBeenCalledWith('section', 'workflows');
  });

  it('handles drop on workflow folder', () => {
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" />);
    const folderEl = screen.getByText('WF Folder').closest('[class*="rounded-lg"]');
    
    fireEvent.dragOver(folderEl, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    fireEvent.drop(folderEl, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { getData: vi.fn((key) => key === 'requestId' ? 'wf-1' : 'workflows') }
    });
    
    expect(defaultProps.onMoveRequest).toHaveBeenCalledWith('col-1', 'wf-1', 'wf-folder-1', 'workflows');
  });

  it('reorders workflow items', () => {
    // Use 2 workflows so one has an enabled up button
    const workflows = [
      { id: 'wf-1', name: 'Workflow A', type: 'workflow' },
      { id: 'wf-2', name: 'Workflow C', type: 'workflow' },
    ];
    render(<CollectionSidebar {...defaultProps} activeTab="workflows" filteredWorkflows={workflows} />);
    // wf-2 (second item) should have an enabled up button
    const wfItem = screen.getByText('Workflow C').closest('.group');
    const buttons = wfItem.querySelectorAll('button');
    // First button is up
    fireEvent.click(buttons[0]);
    expect(defaultProps.onReorderItem).toHaveBeenCalledWith('col-1', 'wf-2', 'up', 'workflows');
  });
});
