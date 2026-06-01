import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WorkflowEditorView from './WorkflowEditorView';

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

const defaultProps = {
  workflow: mockWorkflow,
  onUpdateWorkflow: vi.fn(),
  onBack: vi.fn(),
  onRun: vi.fn(),
  onEditStep: vi.fn(),
  collection: mockCollection,
};

describe('WorkflowEditorView', () => {
  it('should render workflow steps', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    expect(screen.getByDisplayValue('Workflow 1')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('should allow adding a single request', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Requisição Única'));
    expect(screen.getByText('Nova Requisição')).toBeInTheDocument();
  });

  it('should allow adding a parallel group', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Grupo Paralelo'));
    expect(screen.getByText('Execução Paralela')).toBeInTheDocument();
  });

  it('should call onUpdateWorkflow when saving', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('SALVAR'));
    expect(defaultProps.onUpdateWorkflow).toHaveBeenCalled();
  });

  it('should allow adding a wait step (WAIT) and editing duration', () => {
    render(<WorkflowEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Pausa (Wait)'));
    expect(screen.getByText('⌛ WAIT')).toBeInTheDocument();
  });

  it('should allow moving steps up and down', () => {
    const workflowWithMultipleSteps = {
      ...mockWorkflow,
      steps: [
        { id: 's1', type: 'request', name: 'Step 1', method: 'GET', url: 'http://api.com' },
        { id: 's2', type: 'request', name: 'Step 2', method: 'POST', url: 'http://api.com/post' },
      ],
    };
    render(<WorkflowEditorView {...defaultProps} workflow={workflowWithMultipleSteps} />);

    const step1 = screen.getByText('Step 1');
    const moveDownBtn = step1.closest('.flex.items-center.justify-between.p-3').querySelector('button[title="Mover para baixo"]');
    fireEvent.click(moveDownBtn);
    // Expect steps to be reordered
    const stepsAfterMove = screen.getAllByText(/Step \d/);
    expect(stepsAfterMove[0]).toHaveTextContent('Step 2');
    expect(stepsAfterMove[1]).toHaveTextContent('Step 1');
  });

  it('should allow adding a request to a parallel group', () => {
    const workflowWithParallel = {
      ...mockWorkflow,
      steps: [
        { id: 'g1', type: 'parallel', requests: [] },
      ],
    };
    render(<WorkflowEditorView {...defaultProps} workflow={workflowWithParallel} />);

    const parallelGroup = screen.getByText('Execução Paralela');
    const addReqBtn = parallelGroup.closest('.flex.justify-between').querySelector('button:nth-child(3)'); // "+ Adicionar" button
    fireEvent.click(addReqBtn);

    expect(screen.getByText('Nova Requisição')).toBeInTheDocument();
  });

  it('should allow copying a request from the collection to a parallel group', () => {
    const workflowWithParallel = {
      ...mockWorkflow,
      steps: [
        { id: 'g1', type: 'parallel', requests: [] },
      ],
    };
    render(<WorkflowEditorView {...defaultProps} workflow={workflowWithParallel} />);

    const parallelGroup = screen.getByText('Execução Paralela');
    const copyBtn = parallelGroup.closest('.flex.justify-between').querySelector('button:nth-child(4)'); // "+ Copiar" button
    fireEvent.click(copyBtn);

    expect(screen.getByText('Existing Req')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Existing Req'));
    expect(screen.getAllByText('Existing Req').length).toBeGreaterThan(0); // Should be one in collection, one in parallel group
  });

  it('should allow removing a step from a parallel group', () => {
    const workflowWithParallel = {
      ...mockWorkflow,
      steps: [
        { id: 'g1', type: 'parallel', requests: [{ id: 'sub1', type: 'request', name: 'Sub Step 1', method: 'GET', url: '/sub' }] },
      ],
    };
    render(<WorkflowEditorView {...defaultProps} workflow={workflowWithParallel} />);

    expect(screen.getByText('Sub Step 1')).toBeInTheDocument();
    const removeBtn = screen.getByText('Sub Step 1').closest('.flex.items-center.justify-between.p-3').querySelector('button[title="Remover"]');
    fireEvent.click(removeBtn);
    expect(screen.queryByText('Sub Step 1')).not.toBeInTheDocument();
  });

  it('should allow editing the duration of a wait step', () => {
    const workflowWithWait = {
      ...mockWorkflow,
      steps: [
        { id: 'w1', type: 'wait', name: 'Pausa (5s)', url: '5' },
      ],
    };
    render(<WorkflowEditorView {...defaultProps} workflow={workflowWithWait} />);

    const waitInput = screen.getByDisplayValue('5');
    fireEvent.change(waitInput, { target: { value: '10' } });
    expect(waitInput.value).toBe('10');
  });

  it('should allow moving sub-steps within a parallel group', () => {
    const workflowWithParallel = {
      ...mockWorkflow,
      steps: [{ 
        id: 'g1', type: 'parallel', 
        requests: [
          { id: 'sub1', type: 'request', name: 'Sub 1', method: 'GET', url: '/1' },
          { id: 'sub2', type: 'request', name: 'Sub 2', method: 'GET', url: '/2' }
        ] 
      }],
    };
    render(<WorkflowEditorView {...defaultProps} workflow={workflowWithParallel} />);

    const moveDownBtn = screen.getAllByTitle('Mover para baixo')[1]; // Segundo botão (o primeiro é do grupo, o segundo é do sub-passo)
    fireEvent.click(moveDownBtn);
    expect(screen.getAllByText(/Sub \d/)[0]).toHaveTextContent('Sub 2');
  });
});