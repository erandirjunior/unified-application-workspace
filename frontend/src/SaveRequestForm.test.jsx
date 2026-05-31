import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SaveRequestForm from './SaveRequestForm';

const mockCollections = [
  { id: '1', name: 'API Produção' },
  { id: '2', name: 'Microserviços' },
];

const defaultProps = {
  collections: mockCollections,
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
    expect(screen.getByLabelText('Request Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Coleção Alvo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SALVAR NA COLEÇÃO/i })).toBeInTheDocument();
  });

  it('should call setRequestName when typing in the name field', () => {
    render(<SaveRequestForm {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ex: Get Users API');
    fireEvent.change(input, { target: { value: 'Minha Nova Request' } });
    expect(defaultProps.setRequestName).toHaveBeenCalledWith('Minha Nova Request');
  });

  it('should select the first available collection by default', () => {
    render(<SaveRequestForm {...defaultProps} />);
    const select = screen.getByLabelText('Coleção Alvo');
    expect(select.value).toBe('1');
  });

  it('should allow the user to change the target collection', () => {
    render(<SaveRequestForm {...defaultProps} />);
    const select = screen.getByLabelText('Coleção Alvo');
    fireEvent.change(select, { target: { value: '2' } });
    expect(select.value).toBe('2');
  });

  it('should call onSaveRequest when the button is clicked and a name is filled', () => {
    const props = { ...defaultProps, requestName: 'User Checkout' };
    render(<SaveRequestForm {...props} />);
    
    fireEvent.click(screen.getByRole('button', { name: /SALVAR NA COLEÇÃO/i }));
    
    expect(props.onSaveRequest).toHaveBeenCalledWith('User Checkout', '1');
    // Deve limpar o nome após salvar
    expect(props.setRequestName).toHaveBeenCalledWith('');
  });

  it('should not trigger save if the request name is empty', () => {
    render(<SaveRequestForm {...defaultProps} requestName="   " />);
    fireEvent.click(screen.getByRole('button', { name: /SALVAR NA COLEÇÃO/i }));
    expect(defaultProps.onSaveRequest).not.toHaveBeenCalled();
  });

  it('should react to changes in the collection array to set the initial value', () => {
    const { rerender } = render(<SaveRequestForm {...defaultProps} collections={[]} />);
    rerender(<SaveRequestForm {...defaultProps} collections={mockCollections} />);
    const select = screen.getByLabelText('Coleção Alvo');
    expect(select.value).toBe('1');
  });
});