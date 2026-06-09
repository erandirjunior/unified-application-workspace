import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DocumentationView from '../src/DocumentationView';
import { pt } from '../src/locales/pt';

const mockRequest = {
  id: '1',
  name: 'Get Users',
  method: 'GET',
  url: 'http://api.local/{{version}}/users',
  documentation: '# API Title\nThis is a **bold** description.',
  authType: 'bearer',
  bodyType: 'none',
  headers: [],
  responses: [
    { statusCode: '200', description: 'Success', body: '{"status": "ok"}', bodyFields: [] }
  ]
};

const mockCollection = {
  activeEnvironmentId: 'env-1',
  environments: [
    {
      id: 'env-1',
      variables: [{ key: 'version', value: 'v2' }]
    }
  ]
};

const defaultProps = {
  request: mockRequest,
  requests: [mockRequest],
  activeRequestId: '1',
  collection: mockCollection,
  t: pt,
  methodStyles: { GET: 'text-green-500' },
  bodyParams: [],
  onBack: vi.fn(),
  onSelectForEdit: vi.fn(),
  updateField: vi.fn(),
  onEdit: vi.fn(),
  onRun: vi.fn(),
  onClearBodyParams: vi.fn(),
  updateHeader: vi.fn(),
  updatePathParam: vi.fn(),
  updateBodyParam: vi.fn(),
  updateRequestInCollection: vi.fn(),
  addHeader: vi.fn(),
  addPathParam: vi.fn(),
  removeHeader: vi.fn(),
  removePathParam: vi.fn(),
  updateResponse: vi.fn(),
  addResponse: vi.fn(),
  removeResponse: vi.fn(),
  addResponseField: vi.fn(),
  removeResponseField: vi.fn(),
  updateResponseField: vi.fn(),
  onUpdateGeneralDoc: vi.fn(),
  addBodyParam: vi.fn(),
  removeBodyParam: vi.fn(),
  setBodyRawDoc: vi.fn(),
  setAuthDoc: vi.fn(),
  setUrl: vi.fn(),
  setMethod: vi.fn(),
  setDescription: vi.fn(),
  setBodyRaw: vi.fn(),
  setAuthType: vi.fn(),
  setRequestName: vi.fn(),
  setBodyType: vi.fn(),
  setDocumentation: vi.fn(),
};

describe('DocumentationView', () => {
  it('should render the request name and convert Markdown in the documentation', () => {
    render(<DocumentationView {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: 'Get Users' })).toBeInTheDocument();
    const boldElement = screen.getByText('bold');
    expect(boldElement.tagName).toBe('STRONG');
  });

  it('should resolve environment variables in the displayed URL', () => {
    render(<DocumentationView {...defaultProps} />);
    expect(screen.getAllByText(/http:\/\/api\.local\/v2\/users/).length).toBeGreaterThan(0);
  });

  it('should render lists and links in Markdown correctly', () => {
    const requestWithMarkdown = {
      ...mockRequest,
      documentation: '- Item A\n- Item B\n[Guia](http://docs.local)'
    };
    render(<DocumentationView {...defaultProps} request={requestWithMarkdown} requests={[requestWithMarkdown]} />);
    
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guia' })).toHaveAttribute('href', 'http://docs.local');
  });

  it('should generate the cURL command in the preview', () => {
    render(<DocumentationView {...defaultProps} />);
    const curlSnippet = screen.getByText(/curl -X GET/);
    expect(curlSnippet).toBeInTheDocument();
    expect(curlSnippet.textContent).toContain('http://api.local/v2/users');
  });

  it('should expand collapsible sections on click', () => {
    render(<DocumentationView {...defaultProps} />);
    const authSection = screen.getByText('Segurança & Autenticação');
    fireEvent.click(authSection);
    expect(screen.getByText('BEARER')).toBeInTheDocument();
  });

  it('should switch to EDITOR mode when clicking the corresponding button', () => {
    render(<DocumentationView {...defaultProps} />);
    const editorBtn = screen.getByText('EDITOR');
    
    fireEvent.click(editorBtn);
    
    expect(screen.getByText('Editor de Documentação')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Get Users')).toBeInTheDocument();
  });

  it('should call update functions when editing fields in EDITOR mode', () => {
    render(<DocumentationView {...defaultProps} />);
    fireEvent.click(screen.getByText('EDITOR'));

    const nameInput = screen.getByDisplayValue('Get Users');
    fireEvent.change(nameInput, { target: { value: 'Updated Request' } });
    expect(defaultProps.setRequestName).toHaveBeenCalledWith('Updated Request');

    // Testa expansão de Headers no Editor
    const headersSection = screen.getByText('Request Headers');
    fireEvent.click(headersSection);
    
    const addHeaderBtn = screen.getByText(/\+ HEADERS/i);
    fireEvent.click(addHeaderBtn);
    expect(defaultProps.addHeader).toHaveBeenCalled();
  });

  it('should synchronize fields from a JSON body in EDITOR mode', () => {
    const reqWithJson = { 
      ...mockRequest, 
      bodyType: 'json', 
      bodyRaw: '{"id": 1, "user": {"name": "John"}}' 
    };
    render(<DocumentationView {...defaultProps} request={reqWithJson} requests={[reqWithJson]} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Request Body/));
    
    const syncBtn = screen.getByTitle('Sincroniza chaves do JSON/XML com a tabela de documentação');
    fireEvent.click(syncBtn);
    
    expect(defaultProps.addBodyParam).toHaveBeenCalled();
  });

  it('should manage HTTP responses in EDITOR mode', () => {
    render(<DocumentationView {...defaultProps} />);
    fireEvent.click(screen.getByText('EDITOR'));
    
    const respSection = screen.getByText('Exemplos de Respostas (Responses)');
    fireEvent.click(respSection);
    
    const addBtn = screen.getByText('+ ADICIONAR RESPOSTA');
    fireEvent.click(addBtn);
    expect(defaultProps.addResponse).toHaveBeenCalled();
  });

  it('should allow editing Path Parameters in EDITOR mode', () => {
    const reqWithParams = { ...mockRequest, pathParams: [{ key: 'id', value: '123', docDescription: 'User ID', docRequired: true, docExample: '1' }] };
    render(<DocumentationView {...defaultProps} request={reqWithParams} requests={[reqWithParams]} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText('Path Parameters'));
    
    const keyInput = screen.getByDisplayValue('id');
    fireEvent.change(keyInput, { target: { value: 'userId' } });
    expect(defaultProps.updatePathParam).toHaveBeenCalledWith(0, 'key', 'userId');
    
    const removeBtn = screen.getByText('×');
    fireEvent.click(removeBtn);
    expect(defaultProps.removePathParam).toHaveBeenCalledWith(0);
  });

  it('should trigger HTML and PDF export of the documentation', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURLMock = vi.fn().mockReturnValue('blob:url');
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = vi.fn();
    window.open = vi.fn().mockReturnValue({ document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() });

    render(<DocumentationView {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle('Exportar HTML'));
    expect(createObjectURLMock).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Imprimir ou Salvar PDF'));
    expect(window.open).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('should call body parameters cleanup when requested', () => {
    const reqWithParams = { ...mockRequest, bodyType: 'json', bodyParams: [{ key: 'foo' }] };
    render(<DocumentationView {...defaultProps} request={reqWithParams} requests={[reqWithParams]} bodyParams={reqWithParams.bodyParams} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Request Body/));
    
    // The clear button text is now t.common.cancel = "CANCELAR"
    const clearBtn = screen.getByText('CANCELAR');
    fireEvent.click(clearBtn);
    expect(defaultProps.onClearBodyParams).toHaveBeenCalled();
  });

  it('should format the JSON request body in EDITOR mode', () => {
    const reqWithUnformattedJson = { 
      ...mockRequest, 
      bodyType: 'json', 
      bodyRaw: '{"id":1,"name":"test"}' 
    };
    render(<DocumentationView {...defaultProps} request={reqWithUnformattedJson} requests={[reqWithUnformattedJson]} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Request Body/));
    
    // Multiple PREVIEW buttons exist (view mode toggle + format button). Get the last one (within body section)
    const previewBtns = screen.getAllByText('PREVIEW');
    fireEvent.click(previewBtns[previewBtns.length - 1]);
    
    expect(defaultProps.setBodyRaw).toHaveBeenCalledWith('{\n  "id": 1,\n  "name": "test"\n}');
  });

  it('should synchronize fields from a form-urlencoded body in EDITOR mode', () => {
    const reqWithFormUrlEncoded = {
      ...mockRequest,
      bodyType: 'form-urlencoded',
      bodyRaw: 'param1=value1&param2=value2'
    };
    render(<DocumentationView {...defaultProps} request={reqWithFormUrlEncoded} requests={[reqWithFormUrlEncoded]} />);

    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Request Body/));
    fireEvent.click(screen.getByTitle('Sincroniza chaves do JSON/XML com a tabela de documentação'));
    expect(defaultProps.addBodyParam).toHaveBeenCalledWith(expect.objectContaining({ key: 'param1', value: 'value1' }));
  });

  it('should add and remove body parameter fields in EDITOR mode', () => {
    const reqWithBodyParams = { ...mockRequest, bodyType: 'form-data', bodyParams: [{ key: 'field1', value: 'value1' }] };
    render(<DocumentationView {...defaultProps} request={reqWithBodyParams} requests={[reqWithBodyParams]} bodyParams={reqWithBodyParams.bodyParams} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Request Body/));
    
    // Add body param button text is now: + CORPO DA ACTION
    const addParamBtn = screen.getByText(/\+ CORPO DA ACTION/i);
    fireEvent.click(addParamBtn);
    expect(defaultProps.addBodyParam).toHaveBeenCalled();

    const removeParamBtn = screen.getAllByText('×')[0];
    fireEvent.click(removeParamBtn);
    expect(defaultProps.removeBodyParam).toHaveBeenCalledWith(0);
  });

  it('should add and remove response fields in EDITOR mode', () => {
    const reqWithResponse = { 
      ...mockRequest, 
      responses: [{ statusCode: '200', body: '{}', bodyFields: [{ key: 'status', type: 'text' }] }] 
    };
    render(<DocumentationView {...defaultProps} request={reqWithResponse} requests={[reqWithResponse]} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Exemplos de Respostas/));
    
    const addFieldBtn = screen.getByText('+ ADICIONAR CAMPO DE RESPOSTA');
    fireEvent.click(addFieldBtn);
    expect(defaultProps.addResponseField).toHaveBeenCalledWith(0);

    const removeFieldBtns = screen.getAllByText('×');
    // Find the correct remove button (for response field)
    fireEvent.click(removeFieldBtns[removeFieldBtns.length - 1]);
    expect(defaultProps.removeResponseField).toHaveBeenCalledWith(0, 0);
  });

  it('should format the JSON response body in EDITOR mode', () => {
    const reqWithUnformattedResponseJson = { 
      ...mockRequest, 
      responses: [{ statusCode: '200', body: '{"status":"ok"}' }] 
    };
    render(<DocumentationView {...defaultProps} request={reqWithUnformattedResponseJson} requests={[reqWithUnformattedResponseJson]} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Exemplos de Respostas/));
    
    const formatBtn = screen.getByTitle('Formatar JSON');
    fireEvent.click(formatBtn);
    
    expect(defaultProps.updateResponse).toHaveBeenCalledWith(0, 'body', '{\n  "status": "ok"\n}');
  });

  it('should synchronize JSON response body fields in EDITOR mode', () => {
    const reqWithResponseJson = { 
      ...mockRequest, 
      responses: [{ statusCode: '200', body: '{"data":{"id":1}}' }] 
    };
    render(<DocumentationView {...defaultProps} request={reqWithResponseJson} requests={[reqWithResponseJson]} />);
    
    fireEvent.click(screen.getByText('EDITOR'));
    fireEvent.click(screen.getByText(/Exemplos de Respostas/));
    
    const syncBtn = screen.getByTitle('Sincroniza chaves do JSON com a tabela de documentação');
    fireEvent.click(syncBtn);
    
    expect(defaultProps.updateResponse).toHaveBeenCalledWith(0, 'bodyFields', expect.arrayContaining([
      expect.objectContaining({ key: 'data.id' })
    ]));
  });
});
