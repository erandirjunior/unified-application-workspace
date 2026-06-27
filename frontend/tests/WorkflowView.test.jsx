import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WorkflowView from '../src/views/WorkflowView';

const mockCollection = {
  id: 'col-1',
  workflows: [
    { id: 'w1', name: 'Fluxo de Compra', steps: [{}, {}] }
  ]
};

const defaultProps = {
  collection: mockCollection,
  onUpdateWorkflows: vi.fn(),
  onEditWorkflow: vi.fn(),
  onRunWorkflow: vi.fn(),
  onDeleteWorkflow: vi.fn(),
  t: {
    workflows: { title: 'Workflows', newBtn: 'New', placeholder: 'Name...', stepsCount: 'Blocos de Execução' },
    common: { create: 'Create', cancel: 'Cancel' },
  },
};

describe('WorkflowView', () => {
  it('should render the list of existing workflows', () => {
    render(<WorkflowView {...defaultProps} />);
    expect(screen.getByText('Fluxo de Compra')).toBeInTheDocument();
    expect(screen.getByText('2 Blocos de Execução')).toBeInTheDocument();
  });

  it('should allow opening the form and creating a new workflow', () => {
    render(<WorkflowView {...defaultProps} />);
    
    fireEvent.click(screen.getByText('New'));
    const input = screen.getByPlaceholderText('Name...');
    
    fireEvent.change(input, { target: { value: 'Fluxo Novo' } });
    fireEvent.click(screen.getByText('Create'));
    
    expect(defaultProps.onUpdateWorkflows).toHaveBeenCalledWith('col-1', expect.arrayContaining([
      expect.objectContaining({ name: 'Fluxo Novo' })
    ]));
  });

  it('should trigger run, edit and delete actions', () => {
    render(<WorkflowView {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle('Editar'));
    expect(defaultProps.onEditWorkflow).toHaveBeenCalledWith('w1');

    fireEvent.click(screen.getByTitle('Excluir'));
    expect(defaultProps.onDeleteWorkflow).toHaveBeenCalledWith('col-1', 'w1');
  });
});