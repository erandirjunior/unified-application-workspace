import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RequestsPanel from '../src/components/RequestsPanel';
import { pt } from '../src/locales/pt';

// Mock child components
vi.mock('../src/SaveRequestForm', () => ({
  default: ({ requestName, onRun, onClose }) => (
    <div data-testid="save-form">
      <span>{requestName}</span>
      {onRun && <button onClick={onRun}>Run</button>}
      {onClose && <button onClick={onClose}>Close</button>}
    </div>
  )
}));
vi.mock('../src/ConfigView', () => ({
  default: () => <div data-testid="config-view">ConfigView</div>
}));
vi.mock('../src/DocumentationView', () => ({
  default: () => <div data-testid="doc-view">DocView</div>
}));
vi.mock('../src/ReportView', () => ({
  default: () => <div data-testid="report-view">ReportView</div>
}));

describe('RequestsPanel', () => {
  const collection = {
    id: 'col-1',
    name: 'Test',
    requests: [],
    environments: [{ id: 'env-1', variables: [] }],
    activeEnvironmentId: 'env-1'
  };

  const defaultProps = {
    t: pt,
    collection,
    editorProps: {
      activeRequestId: null,
      requestName: '',
      method: 'GET',
      bodyRaw: '',
      methodStyles: {},
      setRequestName: vi.fn(),
      setMethod: vi.fn(),
      updateRequestInCollection: vi.fn(),
      sendRequests: vi.fn(),
    },
    isEditingAction: false,
    rightPanelTab: 'docs',
    setRightPanelTab: vi.fn(),
    rightPanelSize: 'normal',
    setRightPanelSize: vi.fn(),
    isRunning: false,
    reportData: null,
    requestLogs: [],
    sendRequests: vi.fn(),
    stopTest: vi.fn(),
    lastExecutedPayload: null,
    onSaveResponseToDoc: vi.fn(),
    docProps: {},
    onCloseRequestEditor: vi.fn(),
  };

  it('should show empty state when no action is being edited', () => {
    render(<RequestsPanel {...defaultProps} />);
    expect(screen.getByText(pt.collection.exploreTitle)).toBeInTheDocument();
  });

  it('should show editor when isEditingAction is true', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1', requestName: 'My Request' }} />);
    expect(screen.getByTestId('save-form')).toBeInTheDocument();
    expect(screen.getByTestId('config-view')).toBeInTheDocument();
  });

  it('should show documentation panel tab by default', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    expect(screen.getByText(pt.config.panels.documentation)).toBeInTheDocument();
    expect(screen.getByText(pt.config.panels.execution)).toBeInTheDocument();
  });

  it('should render documentation view when docs tab is active', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} rightPanelTab="docs" editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    expect(screen.getByTestId('doc-view')).toBeInTheDocument();
  });

  it('should render report view when execution tab is active', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} rightPanelTab="execution" editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    expect(screen.getByTestId('report-view')).toBeInTheDocument();
  });

  it('should switch tabs when clicking tab buttons', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    fireEvent.click(screen.getByText(pt.config.panels.execution));
    expect(defaultProps.setRightPanelTab).toHaveBeenCalledWith('execution');
  });

  it('should hide editor column when rightPanelSize is maximized', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} rightPanelSize="maximized" editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    expect(screen.queryByTestId('config-view')).not.toBeInTheDocument();
    // But the right panel should still be visible
    expect(screen.getByTestId('doc-view')).toBeInTheDocument();
  });

  it('should hide right panel content when minimized', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} rightPanelSize="minimized" editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    // The content is hidden via CSS class 'hidden' but still in DOM
    const docView = screen.getByTestId('doc-view');
    expect(docView.closest('.hidden')).not.toBeNull();
  });

  it('should call onCloseRequestEditor when close is clicked', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    fireEvent.click(screen.getByText('Close'));
    expect(defaultProps.onCloseRequestEditor).toHaveBeenCalled();
  });

  it('should show running indicator when isRunning', () => {
    render(<RequestsPanel {...defaultProps} isEditingAction={true} isRunning={true} editorProps={{ ...defaultProps.editorProps, activeRequestId: 'req-1' }} />);
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });
});
