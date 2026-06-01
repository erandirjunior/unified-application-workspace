import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScenarioView from './ScenarioView';

const mockCollection = {
  id: 'col-1',
  requests: [],
  scenarios: [
    { 
      id: 's1', 
      name: 'Cenário Principal', 
      description: 'Descrição do cenário',
      steps: [
        { 
          id: 'step-1', 
          name: 'Login', 
          method: 'POST', 
          url: '/auth', 
          headers: [{ key: 'X-Test', value: 'True' }],
          bodyRaw: '{"user":"test"}',
          threads: 5,
          duration: 30,
          rampUp: 10
        }
      ] 
    },
    { id: 's2', name: 'Cenário Vazio', steps: [] }
  ]
};

const defaultProps = {
  collection: mockCollection,
  onRunScenario: vi.fn(),
  onUpdateScenarios: vi.fn(),
  onEditScenario: vi.fn(),
};

describe('ScenarioView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the list of scenarios and their descriptions', () => {
    render(<ScenarioView {...defaultProps} />);
    expect(screen.getByText('Cenário Principal')).toBeInTheDocument();
    expect(screen.getByText('1 Requisições')).toBeInTheDocument();
    expect(screen.getByText('Descrição do cenário')).toBeInTheDocument();
  });

  it('should open the creation form and allow saving a new scenario', () => {
    render(<ScenarioView {...defaultProps} />);
    fireEvent.click(screen.getByText('+ Novo Cenário'));
    
    const input = screen.getByPlaceholderText('Nome do cenário...');
    fireEvent.change(input, { target: { value: 'Cenário de Performance' } });
    fireEvent.click(screen.getByText('Salvar'));
    
    expect(defaultProps.onUpdateScenarios).toHaveBeenCalledWith('col-1', expect.arrayContaining([
      expect.objectContaining({ name: 'Cenário de Performance' })
    ]));
  });

  it('should allow cancelling scenario creation', () => {
    render(<ScenarioView {...defaultProps} />);
    fireEvent.click(screen.getByText('+ Novo Cenário'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByPlaceholderText('Nome do cenário...')).not.toBeInTheDocument();
  });

  it('should correctly format data when running a scenario', () => {
    render(<ScenarioView {...defaultProps} />);
    const runBtns = screen.getAllByTitle('Executar Cenário');
    fireEvent.click(runBtns[0]); // Clica no botão do cenário 's1'

    expect(defaultProps.onRunScenario).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          headers: { 'X-Test': 'True' },
          totalRequests: 5,
          duration: 30,
          rampUp: 10
        })
      ]),
      's1'
    );
  });

  it('should delete a scenario when clicking the remove button', () => {
    render(<ScenarioView {...defaultProps} />);
    fireEvent.click(screen.getAllByTitle('Excluir Cenário')[0]);
    // Deve chamar onUpdateScenarios apenas com o cenário 's2' restante
    expect(defaultProps.onUpdateScenarios).toHaveBeenCalledWith('col-1', [mockCollection.scenarios[1]]);
  });
});