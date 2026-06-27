import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ServersView from '../src/views/ServersView';
import { pt } from '../src/locales/pt';

describe('ServersView', () => {
  const defaultMock = {
    id: '',
    name: '',
    path: '/test',
    method: 'GET',
    active: true,
    delay: 0,
    response: { status: 200, body: '{}', isFile: false },
    assertions: []
  };

  const existingMock = {
    id: 'm1',
    name: 'Auth Mock',
    path: '/auth',
    method: 'POST',
    active: true,
    delay: 0,
    response: { status: 200, body: '{}', isFile: false },
    assertions: []
  };

  let defaultProps;

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch.mockResolvedValue({
      json: async () => [existingMock],
      ok: true,
      status: 200,
    });

    defaultProps = {
      onBack: vi.fn(),
      onSubViewChange: vi.fn(),
      t: pt,
      monitoringMock: null,
      setMonitoringMock: vi.fn(),
      isEditing: false,
      setIsEditing: vi.fn(),
      currentMock: defaultMock,
      setCurrentMock: vi.fn(),
      fetchMocksExternal: vi.fn(),
    };
  });

  describe('Default state (no editing, no monitoring)', () => {
    it('should return null when not editing and not monitoring', () => {
      const { container } = render(<ServersView {...defaultProps} />);
      expect(container.innerHTML).toBe('');
    });

    it('should call fetchMocks on mount', async () => {
      render(<ServersView {...defaultProps} />);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/manage-mocks');
      });
    });
  });

  describe('Editing mode', () => {
    it('should render the editor form when isEditing is true', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      expect(screen.getByText(pt.mocks.createTitle)).toBeInTheDocument();
    });

    it('should show edit title when editing an existing mock', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={existingMock} />);
      expect(screen.getByText(pt.mocks.editTitle)).toBeInTheDocument();
    });

    it('should call onSubViewChange when entering edit mode', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      expect(defaultProps.onSubViewChange).toHaveBeenCalledWith(true, expect.any(Function));
    });

    it('should call setIsEditing(false) when clicking close button', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const closeBtn = screen.getByText('×');
      fireEvent.click(closeBtn);
      expect(defaultProps.setIsEditing).toHaveBeenCalledWith(false);
    });

    it('should call setCurrentMock when changing the method', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const methodSelect = screen.getByLabelText(pt.config.method);
      fireEvent.change(methodSelect, { target: { value: 'POST' } });
      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({ ...defaultMock, method: 'POST' });
    });

    it('should call setCurrentMock when changing the path', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const pathInput = screen.getByPlaceholderText('/users/:id');
      fireEvent.change(pathInput, { target: { value: '/users' } });
      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({ ...defaultMock, path: '/users' });
    });

    it('should call setCurrentMock when changing the HTTP status', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const statusSelect = screen.getByLabelText(pt.mocks.statusLabel);
      fireEvent.change(statusSelect, { target: { value: '404' } });
      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...defaultMock,
        response: { ...defaultMock.response, status: 404 }
      });
    });

    it('should call setCurrentMock when changing the delay', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const delayInput = screen.getByLabelText(pt.mocks.delayLabel);
      fireEvent.change(delayInput, { target: { value: '500' } });
      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({ ...defaultMock, delay: 500 });
    });

    it('should call setCurrentMock when changing the response body', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const bodyTextarea = document.getElementById('mock-payload');
      fireEvent.change(bodyTextarea, { target: { value: '{"hello":"world"}' } });
      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...defaultMock,
        response: { ...defaultMock.response, body: '{"hello":"world"}' }
      });
    });

    it('should save the mock and close editor when clicking save', async () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={existingMock} />);
      
      const saveBtn = screen.getByText(pt.common.save);
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/manage-mocks', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(existingMock)
        }));
      });
      expect(defaultProps.setIsEditing).toHaveBeenCalledWith(false);
      expect(defaultProps.fetchMocksExternal).toHaveBeenCalled();
    });

    it('should switch to FILE mode when clicking ARQUIVO button', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const fileBtn = screen.getByText(pt.mocks.typeFile);
      fireEvent.click(fileBtn);
      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...defaultMock,
        response: { ...defaultMock.response, isFile: true }
      });
    });

    it('should show file upload input when in file mode', () => {
      const fileMock = { ...defaultMock, response: { ...defaultMock.response, isFile: true } };
      render(<ServersView {...defaultProps} isEditing={true} currentMock={fileMock} />);
      expect(screen.getByLabelText(pt.mocks.uploadLabel)).toBeInTheDocument();
    });

    it('should handle file upload and update currentMock', async () => {
      const fileMock = { ...defaultMock, response: { ...defaultMock.response, isFile: true } };
      render(<ServersView {...defaultProps} isEditing={true} currentMock={fileMock} />);

      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByLabelText('Upload do Arquivo');

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:text/plain;base64,aGVsbG8=',
        onload: null,
      };
      vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader);

      fireEvent.change(input, { target: { files: [file] } });

      // Trigger the onload callback
      act(() => {
        mockFileReader.onload({ target: { result: 'data:text/plain;base64,aGVsbG8=' } });
      });

      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...fileMock,
        response: {
          ...fileMock.response,
          isFile: true,
          fileName: 'test.txt',
          fileContent: 'aGVsbG8='
        }
      });
    });

    it('should show ready status when file is already selected', () => {
      const fileMock = {
        ...defaultMock,
        response: { ...defaultMock.response, isFile: true, fileName: 'document.pdf' }
      };
      render(<ServersView {...defaultProps} isEditing={true} currentMock={fileMock} />);
      expect(screen.getByText(new RegExp(`document\\.pdf \\(${pt.mocks.readyToServe}\\)`))).toBeInTheDocument();
    });

    it('should allow adding assertions', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const addBtn = screen.getByText(pt.mocks.addValidation);
      fireEvent.click(addBtn);

      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...defaultMock,
        assertions: [{ source: 'header', property: 'Authorization', operator: '==', target: '' }]
      });
    });

    it('should allow removing assertions', () => {
      const mockWithAssertions = {
        ...defaultMock,
        assertions: [{ source: 'header', property: 'Authorization', operator: '==', target: 'Bearer token' }]
      };
      render(<ServersView {...defaultProps} isEditing={true} currentMock={mockWithAssertions} />);

      const removeBtn = screen.getByTitle(pt.collection.tooltips.delete);
      fireEvent.click(removeBtn);

      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...mockWithAssertions,
        assertions: []
      });
    });

    it('should allow editing assertion source', () => {
      const mockWithAssertions = {
        ...defaultMock,
        assertions: [{ source: 'header', property: 'Authorization', operator: '==', target: '' }]
      };
      render(<ServersView {...defaultProps} isEditing={true} currentMock={mockWithAssertions} />);

      const sourceSelect = screen.getByDisplayValue('Header');
      fireEvent.change(sourceSelect, { target: { value: 'body' } });

      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...mockWithAssertions,
        assertions: [{ source: 'body', property: 'Authorization', operator: '==', target: '' }]
      });
    });

    it('should allow editing assertion property', () => {
      const mockWithAssertions = {
        ...defaultMock,
        assertions: [{ source: 'header', property: 'Authorization', operator: '==', target: '' }]
      };
      render(<ServersView {...defaultProps} isEditing={true} currentMock={mockWithAssertions} />);

      const propertyInput = screen.getByDisplayValue('Authorization');
      fireEvent.change(propertyInput, { target: { value: 'Content-Type' } });

      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...mockWithAssertions,
        assertions: [{ source: 'header', property: 'Content-Type', operator: '==', target: '' }]
      });
    });

    it('should allow editing assertion target value', () => {
      const mockWithAssertions = {
        ...defaultMock,
        assertions: [{ source: 'header', property: 'Authorization', operator: '==', target: '' }]
      };
      render(<ServersView {...defaultProps} isEditing={true} currentMock={mockWithAssertions} />);

      const targetInput = screen.getByPlaceholderText(pt.config.assertionExpectedPlaceholder);
      fireEvent.change(targetInput, { target: { value: 'Bearer abc123' } });

      expect(defaultProps.setCurrentMock).toHaveBeenCalledWith({
        ...mockWithAssertions,
        assertions: [{ source: 'header', property: 'Authorization', operator: '==', target: 'Bearer abc123' }]
      });
    });

    it('should call setIsEditing(false) when clicking cancel', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);
      const cancelBtn = screen.getByText(pt.common.cancel);
      fireEvent.click(cancelBtn);
      expect(defaultProps.setIsEditing).toHaveBeenCalledWith(false);
    });
  });

  describe('Monitoring mode', () => {
    it('should render monitoring view when monitoringMock is set', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      expect(screen.getByText(new RegExp(`${pt.mocks.monitoring} ${existingMock.name}`))).toBeInTheDocument();
    });

    it('should show the mock path in monitoring header', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      expect(screen.getByText(/http:\/\/localhost:8080\/mock\/auth/)).toBeInTheDocument();
    });

    it('should show Live indicator', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should call onSubViewChange when entering monitoring mode', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      expect(defaultProps.onSubViewChange).toHaveBeenCalledWith(true, expect.any(Function));
    });

    it('should show empty state when no logs received', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      expect(screen.getByText(pt.mocks.emptyLogs)).toBeInTheDocument();
    });

    it('should show inspection placeholder when no log is selected', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      expect(screen.getByText(pt.mocks.selectToInspect)).toBeInTheDocument();
    });

    it('should create EventSource with correct URL for monitoring', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      expect(global.EventSource).toHaveBeenCalledWith('http://localhost:8080/mock-stream');
    });

    it('should receive and display real-time logs via EventSource', async () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const esInstance = global.EventSource.mock.results[0].value;
      const logData = {
        mockId: 'm1',
        method: 'POST',
        url: '/auth',
        statusCode: 201,
        timestamp: '12:00:00',
        requestHeaders: { 'Content-Type': 'application/json' },
        responseHeaders: { 'Server': 'AST-Mock' },
        requestBody: '{"user": "test"}',
        responseBody: '{"token": "abc"}'
      };

      act(() => {
        esInstance.onmessage({ data: JSON.stringify(logData) });
      });

      expect(screen.getByText('12:00:00')).toBeInTheDocument();
      expect(screen.getByText('201')).toBeInTheDocument();
      expect(screen.getByText('POST /auth')).toBeInTheDocument();
    });

    it('should filter logs by mockId - only show matching logs', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const esInstance = global.EventSource.mock.results[0].value;

      // Log from a different mock
      act(() => {
        esInstance.onmessage({ data: JSON.stringify({ mockId: 'other', method: 'GET', url: '/other', statusCode: 200, timestamp: '13:00:00' }) });
      });

      expect(screen.queryByText('13:00:00')).not.toBeInTheDocument();
    });

    it('should display log details when clicking a log entry', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const esInstance = global.EventSource.mock.results[0].value;
      const logData = {
        mockId: 'm1',
        method: 'POST',
        url: '/auth',
        statusCode: 200,
        timestamp: '14:00:00',
        requestHeaders: { 'Authorization': 'Bearer token123' },
        responseHeaders: { 'X-Custom': 'value' },
        requestBody: '{"login": true}',
        responseBody: '{"success": true}'
      };

      act(() => {
        esInstance.onmessage({ data: JSON.stringify(logData) });
      });

      fireEvent.click(screen.getByText('14:00:00'));

      expect(screen.getByText(pt.mocks.transactionDetails)).toBeInTheDocument();
      expect(screen.getByText(/"Authorization": "Bearer token123"/)).toBeInTheDocument();
      expect(screen.getByText('{"login": true}')).toBeInTheDocument();
      expect(screen.getByText('{"success": true}')).toBeInTheDocument();
    });

    it('should show file sent indicator when responseBody is empty', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const esInstance = global.EventSource.mock.results[0].value;
      const logData = {
        mockId: 'm1',
        method: 'GET',
        url: '/auth',
        statusCode: 200,
        timestamp: '15:00:00',
        requestHeaders: {},
        responseHeaders: {},
        requestBody: null,
        responseBody: null
      };

      act(() => {
        esInstance.onmessage({ data: JSON.stringify(logData) });
      });

      fireEvent.click(screen.getByText('15:00:00'));
      expect(screen.getByText(pt.mocks.fileSent)).toBeInTheDocument();
    });

    it('should close log detail panel when clicking close button', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const esInstance = global.EventSource.mock.results[0].value;
      const logData = {
        mockId: 'm1',
        method: 'POST',
        url: '/auth',
        statusCode: 200,
        timestamp: '16:00:00',
        requestHeaders: {},
        responseHeaders: {},
        requestBody: '{}',
        responseBody: '{}'
      };

      act(() => {
        esInstance.onmessage({ data: JSON.stringify(logData) });
      });

      fireEvent.click(screen.getByText('16:00:00'));
      expect(screen.getByText(pt.mocks.transactionDetails)).toBeInTheDocument();

      // Find and click the close button (X svg button)
      const closeBtn = screen.getByText(pt.mocks.transactionDetails).closest('div').querySelector('button');
      fireEvent.click(closeBtn);

      expect(screen.queryByText(pt.mocks.transactionDetails)).not.toBeInTheDocument();
      expect(screen.getByText(pt.mocks.selectToInspect)).toBeInTheDocument();
    });

    it('should close EventSource on unmount', () => {
      const { unmount } = render(<ServersView {...defaultProps} monitoringMock={existingMock} />);
      const esInstance = global.EventSource.mock.results[0].value;
      unmount();
      expect(esInstance.close).toHaveBeenCalled();
    });

    it('should style error status codes differently', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const esInstance = global.EventSource.mock.results[0].value;

      act(() => {
        esInstance.onmessage({ data: JSON.stringify({
          mockId: 'm1', method: 'GET', url: '/auth', statusCode: 500, timestamp: '17:00:00',
          requestHeaders: {}, responseHeaders: {}
        }) });
      });

      const statusBadge = screen.getByText('500');
      expect(statusBadge.className).toContain('text-rose-500');
    });

    it('should limit logs to 100 entries', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const esInstance = global.EventSource.mock.results[0].value;

      // Send 105 logs
      act(() => {
        for (let i = 0; i < 105; i++) {
          esInstance.onmessage({ data: JSON.stringify({
            mockId: 'm1', method: 'GET', url: '/auth', statusCode: 200, timestamp: `${i}:00:00`,
            requestHeaders: {}, responseHeaders: {}
          }) });
        }
      });

      // Should only show at most 100 entries
      const logEntries = screen.getAllByText(/:\d{2}:\d{2}/);
      expect(logEntries.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Embedded mode', () => {
    it('should not show header in monitoring when embedded', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} embedded={true} />);
      // The header with the title should not be present
      expect(screen.queryByText(new RegExp(`${pt.mocks.monitoring} ${existingMock.name}`))).not.toBeInTheDocument();
    });

    it('should not show header/footer in editor when embedded', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} embedded={true} />);
      expect(screen.queryByText(pt.mocks.createTitle)).not.toBeInTheDocument();
      expect(screen.queryByText(pt.common.save)).not.toBeInTheDocument();
      expect(screen.queryByText(pt.common.cancel)).not.toBeInTheDocument();
    });
  });

  describe('Internal fetchMocks', () => {
    it('should handle fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ServersView {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar mocks', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('onSubViewChange callback', () => {
    it('should reset state when close callback is invoked from editing', () => {
      render(<ServersView {...defaultProps} isEditing={true} currentMock={defaultMock} />);

      const closeFn = defaultProps.onSubViewChange.mock.calls.find(call => call[0] === true)?.[1];
      expect(closeFn).toBeDefined();

      act(() => {
        closeFn();
      });

      expect(defaultProps.setIsEditing).toHaveBeenCalledWith(false);
      expect(defaultProps.setMonitoringMock).toHaveBeenCalledWith(null);
    });

    it('should reset state when close callback is invoked from monitoring', () => {
      render(<ServersView {...defaultProps} monitoringMock={existingMock} />);

      const closeFn = defaultProps.onSubViewChange.mock.calls.find(call => call[0] === true)?.[1];
      expect(closeFn).toBeDefined();

      act(() => {
        closeFn();
      });

      expect(defaultProps.setIsEditing).toHaveBeenCalledWith(false);
      expect(defaultProps.setMonitoringMock).toHaveBeenCalledWith(null);
    });

    it('should signal false when neither editing nor monitoring', () => {
      render(<ServersView {...defaultProps} isEditing={false} monitoringMock={null} />);
      expect(defaultProps.onSubViewChange).toHaveBeenCalledWith(false, null);
    });
  });
});
