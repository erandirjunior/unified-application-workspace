import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfigView from '../src/ConfigView';

const defaultProps = {
  url: 'http://api.test',
  setUrl: vi.fn(),
  method: 'GET',
  setMethod: vi.fn(),
  totalRequests: '10',
  setTotalRequests: vi.fn(),
  duration: '5',
  setDuration: vi.fn(),
  rampUp: '2',
  setRampUp: vi.fn(),
  methodStyles: { GET: 'method-get', POST: 'method-post' },
  headers: [{ key: 'Content-Type', value: 'application/json' }],
  addHeader: vi.fn(),
  removeHeader: vi.fn(),
  updateHeader: vi.fn(),
  bodyType: 'none',
  setBodyType: vi.fn(),
  bodyRaw: '',
  setBodyRaw: vi.fn(),
  bodyParams: [],
  addBodyParam: vi.fn(),
  removeBodyParam: vi.fn(),
  updateBodyParam: vi.fn(),
  authType: 'none',
  setAuthType: vi.fn(),
  authToken: '',
  setAuthToken: vi.fn(),
  authUsername: '',
  setAuthUsername: vi.fn(),
  authPassword: '',
  setAuthPassword: vi.fn(),
  apiKeyName: '',
  setApiKeyName: vi.fn(),
  apiKeyValue: '',
  setApiKeyValue: vi.fn(),
  sendRequests: vi.fn(),
  assertions: [],
  setAssertions: vi.fn(),
  extractions: [],
  setExtractions: vi.fn(),
  bodyRawDoc: '',
  setBodyRawDoc: vi.fn(),
  authDoc: '',
  setAuthDoc: vi.fn(),
  description: 'Test Description',
  setDescription: vi.fn(),
  updateRequestInCollection: vi.fn(),
  activeRequestId: 'req-1',
  isScenarioMode: false,
  activeWorkflowId: null,
  isVarsModalOpen: false,
  setIsVarsModalOpen: vi.fn(),
};

describe('ConfigView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render basic fields and allow editing', () => {
    render(<ConfigView {...defaultProps} />);
    
    const urlInput = screen.getByDisplayValue('http://api.test');
    fireEvent.change(urlInput, { target: { value: 'http://new.url' } });
    expect(defaultProps.setUrl).toHaveBeenCalledWith('http://new.url');

    const descInput = screen.getByPlaceholderText(/Adicione uma descrição detalhada/i);
    fireEvent.change(descInput, { target: { value: 'New Desc' } });
    expect(defaultProps.setDescription).toHaveBeenCalledWith('New Desc');
  });

  it('should hide load parameters when in scenario mode', () => {
    const { rerender } = render(<ConfigView {...defaultProps} />);
    expect(screen.getByText('Requests por Segundo (RPS)')).toBeInTheDocument();

    rerender(<ConfigView {...defaultProps} isScenarioMode={true} />);
    expect(screen.queryByText('Requests por Segundo (RPS)')).not.toBeInTheDocument();
  });

  it('should manage the Headers section (add, update, and remove)', () => {
    render(<ConfigView {...defaultProps} headers={[{ key: 'Header1', value: 'Value1' }]} />);
    fireEvent.click(screen.getByText('Headers').closest('button'));

    expect(screen.getByDisplayValue('Header1')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('+ ADD HEADER'));
    expect(defaultProps.addHeader).toHaveBeenCalled();

    const keyInput = screen.getByDisplayValue('Header1');
    fireEvent.change(keyInput, { target: { value: 'New-Key' } });
    expect(defaultProps.updateHeader).toHaveBeenCalledWith(0, 'key', 'New-Key');

    const valInput = screen.getByDisplayValue('Value1');
    fireEvent.change(valInput, { target: { value: 'New-Val' } });
    expect(defaultProps.updateHeader).toHaveBeenCalledWith(0, 'value', 'New-Val');

    const headersSection = screen.getByText('Headers').closest('.collapse-card');
    fireEvent.click(within(headersSection).getByText('×'));
    expect(defaultProps.removeHeader).toHaveBeenCalled();
  });

  it('should manage the Body section (JSON)', () => {
    const props = { ...defaultProps, bodyType: 'json', bodyRaw: '{"foo": "bar"}' };
    render(<ConfigView {...props} />);
    fireEvent.click(screen.getByText('Request Body').closest('button'));

    const textarea = screen.getByPlaceholderText(/Insira o corpo da requisição \(JSON\)/i);
    expect(textarea.value).toBe('{"foo": "bar"}');
    
    fireEvent.change(textarea, { target: { value: '{"val": 1}' } });
    expect(defaultProps.setBodyRaw).toHaveBeenCalledWith('{"val": 1}');
  });

  it('should manage the Body section (Form Data)', () => {
    const props = { ...defaultProps, bodyType: 'form-data', bodyParams: [{ key: 'field1', value: 'val1' }] };
    render(<ConfigView {...props} />);
    fireEvent.click(screen.getByText('Request Body').closest('button'));

    expect(screen.getByDisplayValue('field1')).toBeInTheDocument();
    
    fireEvent.change(screen.getByDisplayValue('field1'), { target: { value: 'field-updated' } });
    expect(defaultProps.updateBodyParam).toHaveBeenCalledWith(0, 'key', 'field-updated');

    fireEvent.click(screen.getByText('+ ADD FORM PARAM'));
    expect(defaultProps.addBodyParam).toHaveBeenCalled();

    const bodySection = screen.getByText('Request Body').closest('.collapse-card');
    fireEvent.click(within(bodySection).getByText('×'));
    expect(defaultProps.removeBodyParam).toHaveBeenCalledWith(0);
  });

  it('should manage the Authentication section (Bearer)', () => {
    const props = { ...defaultProps, authType: 'bearer', authToken: 'old-token' };
    render(<ConfigView {...props} />);
    fireEvent.click(screen.getByText('Authentication').closest('button'));

    const tokenInput = screen.getByPlaceholderText(/Token \(suporta {{vars}}\)/i);
    fireEvent.change(tokenInput, { target: { value: 'new-token' } });
    expect(defaultProps.setAuthToken).toHaveBeenCalledWith('new-token');
  });

  it('should manage the Authentication section (Basic Auth)', () => {
    const props = { ...defaultProps, authType: 'basic', authUsername: 'user' };
    render(<ConfigView {...props} />);
    fireEvent.click(screen.getByText('Authentication').closest('button'));

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
    expect(defaultProps.setAuthUsername).toHaveBeenCalledWith('admin');
    
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass' } });
    expect(defaultProps.setAuthPassword).toHaveBeenCalledWith('pass');
  });

  it('should manage the Authentication section (API Key)', () => {
    const props = { ...defaultProps, authType: 'apikey' };
    render(<ConfigView {...props} />);
    fireEvent.click(screen.getByText('Authentication').closest('button'));

    fireEvent.change(screen.getByPlaceholderText(/Key \(ex: X-API-Key\)/i), { target: { value: 'X-Auth' } });
    expect(defaultProps.setApiKeyName).toHaveBeenCalledWith('X-Auth');
  });

  it('should manage the Assertions section (update fields)', () => {
    const props = { ...defaultProps, assertions: [{ source: 'status', operator: '==', target: '200' }] };
    render(<ConfigView {...props} />);
    fireEvent.click(screen.getByText(/Assertions/i).closest('button'));

    const statusSelect = screen.getByDisplayValue('Status Code');
    fireEvent.change(statusSelect, { target: { value: 'body' } });
    expect(defaultProps.setAssertions).toHaveBeenCalled();
    
    const opSelect = screen.getByDisplayValue('Equals');
    fireEvent.change(opSelect, { target: { value: 'contains' } });
    expect(defaultProps.setAssertions).toHaveBeenCalled();

    const targetInput = screen.getByDisplayValue('200');
    fireEvent.change(targetInput, { target: { value: '404' } });
    expect(defaultProps.setAssertions).toHaveBeenCalled();

    fireEvent.click(screen.getByText('+ ADD ASSERTION'));
    expect(defaultProps.setAssertions).toHaveBeenCalled();

    const assertionsSection = screen.getByText(/Assertions/i).closest('.collapse-card');
    fireEvent.click(within(assertionsSection).getByText('×'));
    expect(defaultProps.setAssertions).toHaveBeenCalledWith([]);
  });

  it('should manage the Extractions section in scenario and workflow mode', () => {
    const { rerender } = render(<ConfigView {...defaultProps} />);
    expect(screen.queryByText(/Extract to Variable/i)).not.toBeInTheDocument();

    // Testa no modo Workflow
    const props = { ...defaultProps, activeWorkflowId: 'w1', extractions: [{ source: 'body', property: 'id', varName: 'uid' }] };
    rerender(<ConfigView {...props} />);
    fireEvent.click(screen.getByText(/Extract to Variable/i).closest('button'));
    
    expect(screen.getByDisplayValue('uid')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('uid'), { target: { value: 'new_var' } });
    expect(defaultProps.setExtractions).toHaveBeenCalled();

    fireEvent.change(screen.getByDisplayValue('Full Body'), { target: { value: 'header' } });
    expect(defaultProps.setExtractions).toHaveBeenCalled();

    fireEvent.click(screen.getByText('+ ADD EXTRACTION'));
    expect(defaultProps.setExtractions).toHaveBeenCalled();
  });

  it('should trigger execution and update actions', () => {
    render(<ConfigView {...defaultProps} />);
    
    fireEvent.click(screen.getByText('RUN REQUESTS'));
    expect(defaultProps.sendRequests).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Atualizar Request'));
    expect(defaultProps.updateRequestInCollection).toHaveBeenCalled();
    
    fireEvent.click(screen.getByText('Variáveis'));
    expect(defaultProps.setIsVarsModalOpen).toHaveBeenCalledWith(true);
  });
});