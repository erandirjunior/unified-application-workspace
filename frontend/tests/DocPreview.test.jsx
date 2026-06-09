import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DocPreview from '../src/components/documentation/DocPreview';
import { pt } from '../src/locales/pt';

describe('DocPreview', () => {
  const baseReq = {
    id: '1',
    name: 'Get Users',
    method: 'GET',
    url: 'http://api.com/{{version}}/users',
    documentation: '# API Docs\nThis is **important**.',
    authType: 'bearer',
    authToken: 'token123',
    bodyType: 'none',
    bodyRaw: '',
    headers: [{ key: 'Accept', value: 'application/json', docDescription: 'Accept header', docRequired: true, docExample: 'application/json' }],
    pathParams: [{ key: 'version', value: 'v1', docDescription: 'API version', docRequired: true, docExample: 'v2' }],
    responses: [
      { statusCode: '200', description: 'Success', body: '{"ok":true}', bodyFields: [{ key: 'ok', type: 'bool', docDescription: 'Status flag', docExample: 'true' }] }
    ]
  };

  const activeEnv = { variables: [{ key: 'version', value: 'v2' }] };

  const defaultProps = {
    req: baseReq,
    reqIdx: 0,
    activeEnv,
    methodStyles: { GET: 'text-green-500', POST: 'text-blue-500' },
    authExpanded: false,
    setAuthExpanded: vi.fn(),
    pathExpanded: false,
    setPathExpanded: vi.fn(),
    headersExpanded: false,
    setHeadersExpanded: vi.fn(),
    bodyExpanded: false,
    setBodyExpanded: vi.fn(),
    responsesExpanded: false,
    handleToggleResponses: vi.fn(),
    activeBodyParams: [],
    copyToClipboard: vi.fn(),
    requestList: [baseReq],
    t: pt,
  };

  it('should render request name and method', () => {
    render(<DocPreview {...defaultProps} />);
    expect(screen.getByText('Get Users')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('should resolve environment variables in URL', () => {
    render(<DocPreview {...defaultProps} />);
    expect(screen.getByText('http://api.com/v2/users')).toBeInTheDocument();
  });

  it('should render documentation markdown', () => {
    render(<DocPreview {...defaultProps} />);
    expect(screen.getByText('important')).toBeInTheDocument();
  });

  it('should show empty state when no documentation', () => {
    const reqNoDoc = { ...baseReq, documentation: '' };
    render(<DocPreview {...defaultProps} req={reqNoDoc} />);
    expect(screen.getByText(/Nenhuma documentação detalhada/)).toBeInTheDocument();
  });

  it('should show auth section when authType is not none', () => {
    render(<DocPreview {...defaultProps} authExpanded={true} />);
    expect(screen.getByText('BEARER')).toBeInTheDocument();
  });

  it('should show path parameters when expanded', () => {
    render(<DocPreview {...defaultProps} pathExpanded={true} />);
    expect(screen.getByText('version')).toBeInTheDocument();
    expect(screen.getByText('API version')).toBeInTheDocument();
  });

  it('should show headers table when expanded', () => {
    render(<DocPreview {...defaultProps} headersExpanded={true} />);
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getAllByText('application/json').length).toBeGreaterThan(0);
  });

  it('should show body section when bodyType is not none', () => {
    const reqWithBody = { ...baseReq, bodyType: 'json', bodyRaw: '{"id":1}' };
    render(<DocPreview {...defaultProps} req={reqWithBody} bodyExpanded={true} activeBodyParams={[{ key: 'id', type: 'int', value: '1', docDescription: 'User ID', docRequired: true, docExample: '1' }]} />);
    expect(screen.getByText('{"id":1}')).toBeInTheDocument();
    expect(screen.getByText('User ID')).toBeInTheDocument();
  });

  it('should show bodyRawDoc markdown when provided', () => {
    const reqWithBodyDoc = { ...baseReq, bodyType: 'json', bodyRaw: '{}', bodyRawDoc: 'Body **docs**' };
    render(<DocPreview {...defaultProps} req={reqWithBodyDoc} bodyExpanded={true} activeBodyParams={[]} />);
    expect(screen.getByText('docs')).toBeInTheDocument();
  });

  it('should show responses section when expanded', () => {
    render(<DocPreview {...defaultProps} responsesExpanded={true} />);
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('{"ok":true}')).toBeInTheDocument();
  });

  it('should show response body fields dictionary', () => {
    render(<DocPreview {...defaultProps} responsesExpanded={true} />);
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('Status flag')).toBeInTheDocument();
  });

  it('should show empty responses message when no responses', () => {
    const reqNoResp = { ...baseReq, responses: [] };
    render(<DocPreview {...defaultProps} req={reqNoResp} responsesExpanded={true} />);
    expect(screen.getByText(/Nenhum exemplo de resposta/)).toBeInTheDocument();
  });

  it('should show cURL snippet for single request list', () => {
    render(<DocPreview {...defaultProps} />);
    expect(screen.getByText(/curl -X GET/)).toBeInTheDocument();
  });

  it('should not show cURL snippet for multiple request list', () => {
    render(<DocPreview {...defaultProps} requestList={[baseReq, baseReq]} />);
    expect(screen.queryByText(/curl -X GET/)).not.toBeInTheDocument();
  });

  it('should call copyToClipboard when clicking copy button on body', () => {
    const reqWithBody = { ...baseReq, bodyType: 'json', bodyRaw: '{"test":1}' };
    render(<DocPreview {...defaultProps} req={reqWithBody} bodyExpanded={true} activeBodyParams={[]} />);
    // The copy button is hidden by default (opacity-0), but still clickable
    const copyBtns = screen.getAllByRole('button');
    // Click the one inside the body code section
    const codeBlock = screen.getByText('{"test":1}');
    const copyBtn = codeBlock.parentElement.querySelector('button');
    if (copyBtn) fireEvent.click(copyBtn);
    expect(defaultProps.copyToClipboard).toHaveBeenCalled();
  });

  it('should call section toggle handlers', () => {
    render(<DocPreview {...defaultProps} />);
    // Auth section toggle
    fireEvent.click(screen.getByText('Segurança & Autenticação'));
    expect(defaultProps.setAuthExpanded).toHaveBeenCalled();
  });

  it('should not render auth section when authType is none', () => {
    const reqNoAuth = { ...baseReq, authType: 'none', authDoc: '' };
    render(<DocPreview {...defaultProps} req={reqNoAuth} />);
    expect(screen.queryByText('Segurança & Autenticação')).not.toBeInTheDocument();
  });

  it('should not render headers section when no headers', () => {
    const reqNoHeaders = { ...baseReq, headers: [] };
    render(<DocPreview {...defaultProps} req={reqNoHeaders} />);
    expect(screen.queryByText('Request Headers')).not.toBeInTheDocument();
  });

  it('should not render path params section when empty', () => {
    const reqNoPath = { ...baseReq, pathParams: [] };
    render(<DocPreview {...defaultProps} req={reqNoPath} />);
    expect(screen.queryByText('Path Parameters')).not.toBeInTheDocument();
  });
});
