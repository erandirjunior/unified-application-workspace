import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScenarioEditorView from './ScenarioEditorView';

const mockScenario = {
  id: 's1',
  name: 'Scenario 1',
  description: 'Desc 1',
  steps: [
    { id: 'step-1', name: 'Step 1', method: 'GET', url: 'http://api.com', headers: [], bodyRaw: '', threads: 1, duration: 10, rampUp: 0 }
  ]
};

const mockCollection = {
  id: 'col-1',
  requests: [
    { id: 'r1', name: 'Collection Request', method: 'POST', url: '/post', type: 'request' }
  ]
};

const defaultProps = {
  scenario: mockScenario,
  collection: mockCollection,
  onUpdateScenario: vi.fn(),
  onBack: vi.fn(),
  onEditStep: vi.fn(),
  onRun: vi.fn(),
};

describe('ScenarioEditorView', () => {
  it('should render scenario details and steps', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    expect(screen.getByDisplayValue('Scenario 1')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('should allow editing name and description', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    const nameInput = screen.getByDisplayValue('Scenario 1');
    fireEvent.change(nameInput, { target: { value: 'Scenario Updated' } });
    expect(nameInput.value).toBe('Scenario Updated');
  });

  it('should allow adding a new manual request', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Nova Requisição'));
    expect(screen.getByText('Novo Passo 2')).toBeInTheDocument();
  });

  it('should allow adding a wait step', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Pausa (Wait)'));
    expect(screen.getByText('⌛ WAIT')).toBeInTheDocument();
  });

  it('should allow copying from the collection', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar da Coleção'));
    
    expect(screen.getByText('Collection Request')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Collection Request'));
    
    expect(screen.getAllByText('Collection Request').length).toBeGreaterThan(0);
  });

  it('should allow removing a step', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    const removeBtns = screen.getAllByTitle('Remover Passo');
    fireEvent.click(removeBtns[0]);
    expect(screen.queryByText('Step 1')).not.toBeInTheDocument();
  });

  it('should call onUpdateScenario when saving', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('SALVAR'));
    expect(defaultProps.onUpdateScenario).toHaveBeenCalled();
  });

  it('should call onRun when executing', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    fireEvent.click(screen.getByText('EXECUTAR'));
    expect(defaultProps.onRun).toHaveBeenCalled();
  });

  it('should allow reordering steps in sequence', () => {
    const scenarioWithSteps = {
      ...mockScenario,
      steps: [
        { id: 'step-1', name: 'Step 1', method: 'GET', url: '/1' },
        { id: 'step-2', name: 'Step 2', method: 'GET', url: '/2' }
      ]
    };
    render(<ScenarioEditorView {...defaultProps} scenario={scenarioWithSteps} />);

    const moveDownBtn = screen.getAllByTitle('Mover para baixo')[0];
    fireEvent.click(moveDownBtn);
    expect(screen.getAllByText(/Step \d/)[0]).toHaveTextContent('Step 2');
  });

  it('should call onEditStep when clicking the edit button of a step', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Editar Requisição'));
    expect(defaultProps.onEditStep).toHaveBeenCalledWith(mockScenario.steps[0], 0);
  });

  it('should allow removing a step from the scenario', () => {
    render(<ScenarioEditorView {...defaultProps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Remover Passo'));
    expect(screen.queryByText('Step 1')).not.toBeInTheDocument();
  });
});