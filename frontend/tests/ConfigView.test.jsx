import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfigView from '../src/views/ConfigView';
import { pt } from '../src/locales/pt';

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
  description: '',
  setDescription: vi.fn(),
  updateRequestInCollection: vi.fn(),
  activeRequestId: 'req-1',
  isScenarioMode: false,
  activeWorkflowId: null,
  isVarsModalOpen: false,
  setIsVarsModalOpen: vi.fn(),
  t: pt,
};

describe('ConfigView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render URL and method fields', () => {
    render(<ConfigView {...defaultProps} />);
    expect(screen.getByDisplayValue('http://api.test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('GET')).toBeInTheDocument();
  });

  it('should allow editing URL', () => {
    render(<ConfigView {...defaultProps} />);
    const urlInput = screen.getByDisplayValue('http://api.test');
    fireEvent.change(urlInput, { target: { value: 'http://new.url' } });
    expect(defaultProps.setUrl).toHaveBeenCalledWith('http://new.url');
  });

  it('should render load parameters (RPS, duration, ramp-up)', () => {
    render(<ConfigView {...defaultProps} />);
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('should hide load parameters when in scenario mode', () => {
    const { rerender } = render(<ConfigView {...defaultProps} />);
    expect(screen.getByText(pt.config.rps)).toBeInTheDocument();

    rerender(<ConfigView {...defaultProps} isScenarioMode={true} />);
    expect(screen.queryByText(pt.config.rps)).not.toBeInTheDocument();
  });

  it('should manage Headers section', () => {
    render(<ConfigView {...defaultProps} headers={[{ key: 'X-Custom', value: 'val1' }]} />);
    // Open headers section
    fireEvent.click(screen.getByText(pt.config.sections.headers).closest('button'));
    expect(screen.getByDisplayValue('X-Custom')).toBeInTheDocument();
    expect(screen.getByDisplayValue('val1')).toBeInTheDocument();

    // Edit header key
    fireEvent.change(screen.getByDisplayValue('X-Custom'), { target: { value: 'X-New' } });
    expect(defaultProps.updateHeader).toHaveBeenCalledWith(0, 'key', 'X-New');
  });

  it('should manage Body section (JSON)', () => {
    render(<ConfigView {...defaultProps} bodyType="json" bodyRaw='{"foo": "bar"}' />);
    fireEvent.click(screen.getByText(pt.config.sections.body).closest('button'));
    const textarea = screen.getByDisplayValue('{"foo": "bar"}');
    fireEvent.change(textarea, { target: { value: '{}' } });
    expect(defaultProps.setBodyRaw).toHaveBeenCalledWith('{}');
  });

  it('should manage Body section (Form Data)', () => {
    render(<ConfigView {...defaultProps} bodyType="form-data" bodyParams={[{ key: 'field1', value: 'val1', type: 'text' }]} />);
    fireEvent.click(screen.getByText(pt.config.sections.body).closest('button'));
    expect(screen.getByDisplayValue('field1')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('field1'), { target: { value: 'newKey' } });
    expect(defaultProps.updateBodyParam).toHaveBeenCalledWith(0, 'key', 'newKey');
  });

  it('should manage Authentication section (Bearer)', () => {
    render(<ConfigView {...defaultProps} authType="bearer" authToken="my-token" />);
    fireEvent.click(screen.getByText(pt.config.sections.auth).closest('button'));
    const tokenInput = screen.getByDisplayValue('my-token');
    fireEvent.change(tokenInput, { target: { value: 'new-token' } });
    expect(defaultProps.setAuthToken).toHaveBeenCalledWith('new-token');
  });

  it('should manage Authentication section (Basic Auth)', () => {
    render(<ConfigView {...defaultProps} authType="basic" authUsername="user1" authPassword="pass1" />);
    fireEvent.click(screen.getByText(pt.config.sections.auth).closest('button'));
    fireEvent.change(screen.getByDisplayValue('user1'), { target: { value: 'admin' } });
    expect(defaultProps.setAuthUsername).toHaveBeenCalledWith('admin');
  });

  it('should manage Assertions section', () => {
    render(<ConfigView {...defaultProps} assertions={[{ source: 'status', operator: '==', target: '200', property: '' }]} />);
    fireEvent.click(screen.getByText(pt.config.sections.assertions).closest('button'));
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('200'), { target: { value: '404' } });
    expect(defaultProps.setAssertions).toHaveBeenCalled();
  });

  it('should manage Extractions section in workflow mode', () => {
    render(<ConfigView {...defaultProps} activeWorkflowId="w1" extractions={[{ source: 'body', property: 'id', varName: 'uid' }]} />);
    fireEvent.click(screen.getByText(pt.config.sections.extractions).closest('button'));
    expect(screen.getByDisplayValue('uid')).toBeInTheDocument();
  });

  it('should open variables modal when clicking Ambiente button', () => {
    render(<ConfigView {...defaultProps} />);
    fireEvent.click(screen.getByText(pt.config.variables));
    expect(defaultProps.setIsVarsModalOpen).toHaveBeenCalledWith(true);
  });
});
