import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SaveRequestForm from '../src/SaveRequestForm';

const defaultProps = {
  onSaveRequest: vi.fn(),
  requestName: 'Test Request',
  setRequestName: vi.fn(),
  method: 'GET',
  setMethod: vi.fn(),
  onRun: vi.fn(),
  onClose: vi.fn(),
  t: { common: { save: 'Save' } },
};

describe('SaveRequestForm', () => {
  it('should render the name input with current value', () => {
    render(<SaveRequestForm {...defaultProps} />);
    expect(screen.getByDisplayValue('Test Request')).toBeInTheDocument();
  });

  it('should render Run and Save buttons', () => {
    render(<SaveRequestForm {...defaultProps} />);
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should call setRequestName when typing in the name field', () => {
    render(<SaveRequestForm {...defaultProps} />);
    const input = screen.getByDisplayValue('Test Request');
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(defaultProps.setRequestName).toHaveBeenCalledWith('New Name');
  });

  it('should call onSaveRequest when Save is clicked and name is filled', () => {
    render(<SaveRequestForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Save'));
    expect(defaultProps.onSaveRequest).toHaveBeenCalledWith('Test Request');
  });

  it('should not call onSaveRequest when name is empty', () => {
    const onSave = vi.fn();
    render(<SaveRequestForm {...defaultProps} requestName="   " onSaveRequest={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should call onRun when Run button is clicked', () => {
    render(<SaveRequestForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Run'));
    expect(defaultProps.onRun).toHaveBeenCalled();
  });

  it('should not render Run button when onRun is null', () => {
    render(<SaveRequestForm {...defaultProps} onRun={null} />);
    expect(screen.queryByText('Run')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<SaveRequestForm {...defaultProps} />);
    const closeBtn = screen.getByTitle('Fechar Action');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
