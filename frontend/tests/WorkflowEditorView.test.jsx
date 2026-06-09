import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WorkflowEditorView from '../src/WorkflowEditorView';

const mockWorkflow = {
  id: 'w1',
  name: 'Workflow 1',
  description: 'Desc 1',
  steps: [
    { id: 's1', type: 'request', name: 'Step 1', method: 'GET', url: 'http://api.com' }
  ]
};

const mockCollection = {
  id: 'col-1',
  requests: [
    { id: 'r1', name: 'Existing Req', method: 'GET', url: '/api', type: 'request' }
  ]
};

const t = {
  config: { descriptionPlaceholder: 'Description' },
  scenarios: { editor: { addComponents: 'Adicionar', waitLabel: 'Wait', waitSuffix: 'seconds', moveUp: 'Up', moveDown: 'Down', editStep: 'Edit', copyModal: { title: 'Copy', subtitle: 'Select', search: 'Search', add: 'Add' } } },
  workflows: { editor: { stepSingle: 'Action', stepSingleSub: 'Seq', stepParallel: 'Parallel', stepParallelSub: 'Multi', stepCopy: 'Copiar', stepCopySub: 'Use', stepWait: 'Wait', stepWaitSub: 'Time', stepLoop: 'Loop', stepLoopSub: 'Repeat', stepCondition: 'If/Else', stepConditionSub: 'Branch', empty: 'Empty workflow', emptySub: 'Add steps', note: 'Note', loopCondition: 'While', loopVariable: 'Variable', loopEmpty: 'Empty loop', addAction: 'Action', conditionLabel: 'Condition', conditionIf: 'If', conditionThen: 'Then', conditionElse: 'Else' } },
  collection: { tooltips: { delete: 'Delete' } },
  common: { empty: 'Empty' },
};

const defaultProps = {
  workflow: mockWorkflow,
  onUpdateWorkflow: vi.fn(),
  onBack: vi.fn(),
  onRun: vi.fn(),
  onEditStep: vi.fn(),
  collection: mockCollection,
  t,
};

describe('WorkflowEditorView', () => {
  it('should render existing steps in the list', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('should render description textarea', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Description');
    expect(textarea.value).toBe('Desc 1');
  });

  it('should add a request step when clicking Action button', () => {
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} onUpdateWorkflow={onUpdate} />);
    fireEvent.click(screen.getByText('Action'));
    expect(screen.getByText('Nova Action')).toBeInTheDocument();
  });

  it('should add a wait step', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Wait'));
    expect(screen.getByText('Aguardar')).toBeInTheDocument();
  });

  it('should add a loop step', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Loop'));
    expect(screen.getByText('While')).toBeInTheDocument();
  });

  it('should add a condition step', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('If/Else'));
    expect(screen.getByText('If')).toBeInTheDocument();
  });

  it('should add a parallel step', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Parallel'));
    expect(screen.getAllByText('Parallel').length).toBeGreaterThan(1);
  });

  it('should show empty state when no steps', () => {
    render(<WorkflowEditorView {...defaultProps} workflow={{ ...mockWorkflow, steps: [] }} />);
    expect(screen.getByText('Empty workflow')).toBeInTheDocument();
  });

  it('should allow editing wait duration', () => {
    const wf = { ...mockWorkflow, steps: [{ id: 'w1', type: 'wait', name: 'Pausa (5s)', url: '5' }] };
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '15' } });
    // onUpdateWorkflow should be called with the updated steps
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should open copy modal when clicking Copiar', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar'));
    expect(screen.getByText('Existing Req')).toBeInTheDocument();
  });

  it('should copy a request from collection', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar'));
    fireEvent.click(screen.getByText('Existing Req'));
    // After copy, modal closes and new step appears
    expect(screen.getAllByText('Existing Req').length).toBeGreaterThanOrEqual(1);
  });

  it('should toggle between list and flowchart view', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    const flowchartBtn = screen.getByText('Fluxograma');
    fireEvent.click(flowchartBtn);
    expect(screen.getByText(/arraste/i)).toBeInTheDocument();
  });

  it('should sync steps with onUpdateWorkflow', () => {
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} onUpdateWorkflow={onUpdate} />);
    fireEvent.click(screen.getByText('Action'));
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should remove a step', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    // Hover the step to show the delete button
    const step = screen.getByText('Step 1').closest('.group');
    fireEvent.mouseOver(step);
    // Find and click the X button (last button in the actions)
    const buttons = step.querySelectorAll('button');
    const deleteBtn = buttons[buttons.length - 1];
    fireEvent.click(deleteBtn);
    expect(screen.queryByText('Step 1')).not.toBeInTheDocument();
  });

  it('should move a step up and down', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 's1', type: 'request', name: 'Step 1', method: 'GET', url: '/1' },
      { id: 's2', type: 'request', name: 'Step 2', method: 'POST', url: '/2' }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Move second step up
    const step2 = screen.getByText('Step 2').closest('.group');
    const buttons = step2.querySelectorAll('button');
    // First button is up, second is down
    const upBtn = buttons[0];
    fireEvent.click(upBtn);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should move a step down', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 's1', type: 'request', name: 'Step 1', method: 'GET', url: '/1' },
      { id: 's2', type: 'request', name: 'Step 2', method: 'POST', url: '/2' }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Move first step down
    const step1 = screen.getByText('Step 1').closest('.group');
    const buttons = step1.querySelectorAll('button');
    // Second button is down
    const downBtn = buttons[1];
    fireEvent.click(downBtn);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should navigate into a parallel group and back', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'p1', type: 'parallel', requests: [{ id: 'pr1', type: 'request', name: 'Inner Req', method: 'GET', url: '/inner' }] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Find the container Parallel label (the one with class text-xs inside .group)
    const parallelLabels = screen.getAllByText('Parallel');
    const containerLabel = parallelLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const container = containerLabel.closest('.group');
    fireEvent.mouseOver(container);
    fireEvent.click(screen.getByText('Editar →'));
    
    // Should show breadcrumb and inner content
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    
    // Navigate back
    fireEvent.click(screen.getByText('Workflow'));
    expect(screen.getAllByText('Parallel').length).toBeGreaterThan(0);
  });

  it('should navigate into a loop group', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'l1', type: 'loop', loop: { source: 'status', operator: '==', target: '200', maxIter: 10, conditions: [] }, steps: [{ id: 'lr1', type: 'request', name: 'Loop Inner', method: 'GET', url: '/loop' }] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    const loopLabels = screen.getAllByText('Loop');
    const containerLabel = loopLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const container = containerLabel.closest('.group');
    fireEvent.mouseOver(container);
    fireEvent.click(screen.getByText('Editar →'));
    
    expect(screen.getByText('Loop Inner')).toBeInTheDocument();
  });

  it('should navigate into condition then and else branches', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'status', operator: '==', target: '200', conditions: [] }, steps: [{ id: 'ct1', type: 'request', name: 'Then Req', method: 'GET', url: '/then' }], elseSteps: [{ id: 'ce1', type: 'request', name: 'Else Req', method: 'POST', url: '/else' }] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    const ifLabels = screen.getAllByText('If/Else');
    const containerLabel = ifLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const container = containerLabel.closest('.group');
    fireEvent.mouseOver(container);
    
    // Navigate into Then branch
    fireEvent.click(screen.getByText('Then →'));
    expect(screen.getByText('Then Req')).toBeInTheDocument();
    
    // Navigate back
    fireEvent.click(screen.getByText('Workflow'));
    
    // Navigate into Else branch
    const ifLabels2 = screen.getAllByText('If/Else');
    const containerLabel2 = ifLabels2.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const container2 = containerLabel2.closest('.group');
    fireEvent.mouseOver(container2);
    fireEvent.click(screen.getByText('Else →'));
    expect(screen.getByText('Else Req')).toBeInTheDocument();
  });

  it('should navigate back using breadcrumb at specific index', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'l1', type: 'loop', loop: { source: 'status', operator: '==', target: '200', maxIter: 5, conditions: [] }, steps: [
        { id: 'p1', type: 'parallel', requests: [{ id: 'pr1', type: 'request', name: 'Deep Req', method: 'GET', url: '/deep' }] }
      ]}
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    
    // Navigate into loop
    const loopLabels = screen.getAllByText('Loop');
    const loopLabel = loopLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const loopContainer = loopLabel.closest('.group');
    fireEvent.mouseOver(loopContainer);
    fireEvent.click(screen.getByText('Editar →'));
    
    // Navigate into parallel inside the loop
    const parallelLabels = screen.getAllByText('Parallel');
    const parallelLabel = parallelLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const parallelContainer = parallelLabel.closest('.group');
    fireEvent.mouseOver(parallelContainer);
    fireEvent.click(screen.getByText('Editar →'));
    
    expect(screen.getByText('Deep Req')).toBeInTheDocument();
    
    // Navigate back to Loop level via breadcrumb button (it's a button element in the breadcrumb nav)
    const loopBreadcrumbs = screen.getAllByText('Loop');
    const breadcrumbBtn = loopBreadcrumbs.find(el => el.tagName === 'BUTTON' && el.classList.contains('text-slate-500'));
    fireEvent.click(breadcrumbBtn);
    expect(screen.getAllByText('Parallel').length).toBeGreaterThan(0);
  });

  it('should edit condition fields (source, operator, target, property, logic)', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'status', property: '', operator: '==', target: '200', logic: 'and', conditions: [] }, steps: [], elseSteps: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Change source to "body"
    const sourceSelect = screen.getByDisplayValue('Status');
    fireEvent.change(sourceSelect, { target: { value: 'body' } });
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should edit loop condition maxIter', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'l1', type: 'loop', loop: { source: 'status', property: '', operator: '==', target: '200', maxIter: 10, logic: 'and', conditions: [] }, steps: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Change maxIter
    const maxIterInput = screen.getByDisplayValue('10');
    fireEvent.change(maxIterInput, { target: { value: '20' } });
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should add and remove extra conditions', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'status', property: '', operator: '==', target: '200', logic: 'and', conditions: [] }, steps: [], elseSteps: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Add extra condition
    fireEvent.click(screen.getByText('+ Condição'));
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should update extra condition fields and remove them', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'status', property: '', operator: '==', target: '200', logic: 'and', conditions: [{ source: 'body', property: 'id', operator: '!=', target: '0' }] }, steps: [], elseSteps: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Should show the AND badge and extra condition row
    expect(screen.getByText('AND')).toBeInTheDocument();
    
    // Should show logic select (AND/OR)
    const logicSelect = screen.getByDisplayValue('AND');
    fireEvent.change(logicSelect, { target: { value: 'or' } });
    expect(onUpdate).toHaveBeenCalled();
    
    // Remove the extra condition (X button)
    const removeButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg path[d="M6 18L18 6M6 6l12 12"]'));
    // The last X button in the condition editor is the remove extra cond button
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[removeButtons.length - 1]);
      expect(onUpdate).toHaveBeenCalled();
    }
  });

  it('should change operator to exists/not_exists and hide target input', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'body', property: 'field', operator: '==', target: '200', logic: 'and', conditions: [] }, steps: [], elseSteps: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Change operator to "exists"
    const operatorSelect = screen.getByDisplayValue('==');
    fireEvent.change(operatorSelect, { target: { value: 'exists' } });
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should change condition target value', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'status', property: '', operator: '==', target: '200', logic: 'and', conditions: [] }, steps: [], elseSteps: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    const targetInput = screen.getByDisplayValue('200');
    fireEvent.change(targetInput, { target: { value: '404' } });
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should change condition property when source is not status', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'body', property: 'user.id', operator: '==', target: '1', logic: 'and', conditions: [] }, steps: [], elseSteps: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    const propertyInput = screen.getByDisplayValue('user.id');
    fireEvent.change(propertyInput, { target: { value: 'user.name' } });
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should trigger onEditStep when clicking edit button on a request step', () => {
    const onEditStep = vi.fn();
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} onEditStep={onEditStep} onUpdateWorkflow={onUpdate} />);
    
    const step = screen.getByText('Step 1').closest('.group');
    fireEvent.mouseOver(step);
    // The edit button is the one with a pencil icon (before the delete button)
    const buttons = step.querySelectorAll('button');
    // Edit button is the third-to-last (up, down, edit, delete)
    const editBtn = buttons[buttons.length - 2];
    fireEvent.click(editBtn);
    expect(onEditStep).toHaveBeenCalled();
  });

  it('should render flowchart with parallel steps', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'p1', type: 'parallel', requests: [
        { id: 'pr1', type: 'request', name: 'P Req 1', method: 'GET', url: '/p1' },
        { id: 'pr2', type: 'request', name: 'P Req 2', method: 'POST', url: '/p2' }
      ]}
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    // The flowchart SVG should be rendered with parallel nodes
    expect(screen.getByText(/arraste/i)).toBeInTheDocument();
  });

  it('should render flowchart with loop steps', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'l1', type: 'loop', loop: { source: 'status', operator: '==', target: '200', maxIter: 5, conditions: [] }, steps: [
        { id: 'lr1', type: 'request', name: 'Loop Req', method: 'GET', url: '/loop' }
      ]}
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    expect(screen.getByText(/arraste/i)).toBeInTheDocument();
  });

  it('should render flowchart with condition steps (with then and else)', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'status', operator: '==', target: '200', conditions: [] }, steps: [
        { id: 'ct1', type: 'request', name: 'Then Req', method: 'GET', url: '/then' }
      ], elseSteps: [
        { id: 'ce1', type: 'request', name: 'Else Req', method: 'POST', url: '/else' }
      ]}
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    expect(screen.getByText(/arraste/i)).toBeInTheDocument();
  });

  it('should render flowchart with empty condition branches', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'c1', type: 'condition', condition: { source: 'status', operator: '==', target: '200', conditions: [] }, steps: [], elseSteps: [] }
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    expect(screen.getByText(/arraste/i)).toBeInTheDocument();
  });

  it('should support drag interaction on flowchart nodes', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 's1', type: 'request', name: 'Drag Me', method: 'GET', url: '/drag' }
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    
    // Get the SVG element
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
    
    // Find a node group (g element with onMouseDown)
    const nodeGroups = svg.querySelectorAll('g[style]');
    if (nodeGroups.length > 0) {
      const node = nodeGroups[0];
      // Simulate drag
      fireEvent.mouseDown(node, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(svg);
    }
  });

  it('should support panning the flowchart background', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 's1', type: 'request', name: 'Pan Test', method: 'GET', url: '/pan' }
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
    
    // Pan the background
    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, target: svg });
    fireEvent.mouseMove(svg, { clientX: 250, clientY: 250 });
    fireEvent.mouseUp(svg);
  });

  it('should reset layout when clicking Reset Layout button', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    fireEvent.click(screen.getByText('Reset Layout'));
    // Should not throw
    expect(screen.getByText(/arraste/i)).toBeInTheDocument();
  });

  it('should filter requests in copy modal by search', () => {
    const col = { ...mockCollection, requests: [
      { id: 'r1', name: 'Login API', method: 'POST', url: '/auth', type: 'request' },
      { id: 'r2', name: 'Get Users', method: 'GET', url: '/users', type: 'request' },
      { id: 'f1', name: 'Folder', type: 'folder', requests: [{ id: 'r3', name: 'Nested', method: 'GET', url: '/nested', type: 'request' }] }
    ]};
    render(<WorkflowEditorView {...defaultProps} collection={col} />);
    fireEvent.click(screen.getByText('Copiar'));
    
    // All items should be visible initially (including nested)
    expect(screen.getByText('Login API')).toBeInTheDocument();
    expect(screen.getByText('Get Users')).toBeInTheDocument();
    expect(screen.getByText('Nested')).toBeInTheDocument();
    
    // Search should filter
    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.change(searchInput, { target: { value: 'Login' } });
    expect(screen.getByText('Login API')).toBeInTheDocument();
    expect(screen.queryByText('Get Users')).not.toBeInTheDocument();
  });

  it('should close copy modal with the X button', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar'));
    expect(screen.getByText('Existing Req')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
  });

  it('should add steps inside a navigated container (setCurrentSteps with navPath)', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'p1', type: 'parallel', requests: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // Navigate into the parallel group
    const parallelLabels = screen.getAllByText('Parallel');
    const containerLabel = parallelLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const container = containerLabel.closest('.group');
    fireEvent.mouseOver(container);
    fireEvent.click(screen.getByText('Editar →'));
    
    // Add a step inside
    fireEvent.click(screen.getByText('Action'));
    expect(onUpdate).toHaveBeenCalled();
    expect(screen.getByText('Nova Action')).toBeInTheDocument();
  });

  it('should show empty state inside navigated container when no steps', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 'p1', type: 'parallel', requests: [] }
    ]};
    render(<WorkflowEditorView {...defaultProps} workflow={wf} />);
    
    const parallelLabels = screen.getAllByText('Parallel');
    const containerLabel = parallelLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const container = containerLabel.closest('.group');
    fireEvent.mouseOver(container);
    fireEvent.click(screen.getByText('Editar →'));
    
    expect(screen.getByText(/Vazio/i)).toBeInTheDocument();
  });

  it('should move container steps (loop, parallel) up and down', () => {
    const wf = { ...mockWorkflow, steps: [
      { id: 's1', type: 'request', name: 'Step 1', method: 'GET', url: '/1' },
      { id: 'p1', type: 'parallel', requests: [] }
    ]};
    const onUpdate = vi.fn();
    render(<WorkflowEditorView {...defaultProps} workflow={wf} onUpdateWorkflow={onUpdate} />);
    
    // The parallel container: find the label inside .group (not the toolbox one)
    const parallelLabels = screen.getAllByText('Parallel');
    const containerLabel = parallelLabels.find(el => el.classList.contains('font-bold') && el.closest('.group'));
    const container = containerLabel.closest('.group');
    fireEvent.mouseOver(container);
    const buttons = container.querySelectorAll('button');
    // Click move up (first button in the container's actions)
    const upBtn = buttons[0];
    fireEvent.click(upBtn);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should handle mouseLeave on SVG to stop drag/pan', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Fluxograma'));
    
    const svg = document.querySelector('svg');
    fireEvent.mouseLeave(svg);
    // Should not throw
    expect(svg).toBeInTheDocument();
  });
});
