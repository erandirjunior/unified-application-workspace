import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SaveRequestForm from '../src/SaveRequestForm';

const defaultProps = {
  onSaveRequest: vi.fn(),
  requestName: '',
  setRequestName: vi.fn(),
};

describe('SaveRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fields and button correctly', () => {
    render(<SaveRequestForm {...defaultProps} />);
    expect(screen.getByLabelText('Nome da Requisição')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SALVAR NA COLEÇÃO/i })).toBeInTheDocument();
  });

  it('should call setRequestName when typing in the name field', () => {
    render(<SaveRequestForm {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ex: Criar Novo Usuário');
    fireEvent.change(input, { target: { value: 'Minha Nova Request' } });
    expect(defaultProps.setRequestName).toHaveBeenCalledWith('Minha Nova Request');
  });

  it('should call onSaveRequest when the button is clicked and a name is filled', () => {
    const props = { ...defaultProps, requestName: 'User Checkout' };
    render(<SaveRequestForm {...props} />);
    
    fireEvent.click(screen.getByRole('button', { name: /SALVAR NA COLEÇÃO/i }));
    
    expect(props.onSaveRequest).toHaveBeenCalledWith('User Checkout');
    // Deve limpar o nome após salvar
    expect(props.setRequestName).toHaveBeenCalledWith('');
  });

  it('should not trigger save if the request name is empty', () => {
    render(<SaveRequestForm {...defaultProps} requestName="   " />);
    fireEvent.click(screen.getByRole('button', { name: /SALVAR NA COLEÇÃO/i }));
    expect(defaultProps.onSaveRequest).not.toHaveBeenCalled();
  });
});