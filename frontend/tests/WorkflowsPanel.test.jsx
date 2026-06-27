import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WorkflowsPanel from '../src/components/workflow/WorkflowsPanel';
import { pt } from '../src/locales/pt';

// Mock child components to avoid deep rendering
vi.mock('../src/views/WorkflowEditorView', () => ({
  default: () => <div data-testid="workflow-editor">WorkflowEditor</div>
}));
vi.mock('../src/views/SaveRequestForm', () => ({
  default: ({ requestName }) => <div data-testid="save-form">{requestName}</div>
}));
vi.mock('../src/views/ConfigView', () => ({
  default: () => <div data-testid="config-view">ConfigView</div>
}));
vi.mock('../src/views/ReportView', () => ({
  default: () => <div data-testid="report-view">ReportView</div>
}));

describe('WorkflowsPanel', () => {
  const collection = {
    id: 'col-1',
    name: 'Test Collection',
    workflows: [
      { id: 'wf-1', name: 'Login Flow', steps: [{ id: 's1', name: 'Step 1' }] }
    ],
    requests: [],
    environments: [{ id: 'env-1', name: 'Dev', variables: [] }],
    activeEnvironmentId: 'env-1'
  };

  const defaultProps = {
    t: pt,
    collection,
    editorProps: { activeStepIndex: null, bodyRaw: '', theme: 'dark' },
    editingWorkflowId: null,
    setEditingWorkflowId: vi.fn(),
    setActiveWorkflowId: vi.fn(),
    setActiveStepIndex: vi.fn(),
    setActiveSubIndex: vi.fn(),
    onUpdateWorkflows: vi.fn(),
    onRunRequest: vi.fn(),
    onSelectRequest: vi.fn(),
    rightPanelSize: 'normal',
    setRightPanelSize: vi.fn(),
    isRunning: false,
    reportData: null,
    requestLogs: [],
    sendRequests: vi.fn(),
    stopTest: vi.fn(),
    lastExecutedPayload: null,
    onSaveResponseToDoc: vi.fn(),
  };

  it('should show empty state when no workflow is being edited', () => {
    render(<WorkflowsPanel {...defaultProps} />);
    expect(screen.getByText(pt.collection.selectWorkflow)).toBeInTheDocument();
  });

  it('should show workflow editor when a workflow is selected', () => {
    render(<WorkflowsPanel {...defaultProps} editingWorkflowId="wf-1" />);
    expect(screen.getByTestId('workflow-editor')).toBeInTheDocument();
    expect(screen.getByTestId('save-form')).toBeInTheDocument();
  });

  it('should display workflow name in save form', () => {
    render(<WorkflowsPanel {...defaultProps} editingWorkflowId="wf-1" />);
    expect(screen.getByText('Login Flow')).toBeInTheDocument();
  });

  it('should show execution panel label', () => {
    render(<WorkflowsPanel {...defaultProps} editingWorkflowId="wf-1" />);
    expect(screen.getByText(pt.config.panels.execution)).toBeInTheDocument();
  });

  it('should show report view in the right panel', () => {
    render(<WorkflowsPanel {...defaultProps} editingWorkflowId="wf-1" />);
    expect(screen.getByTestId('report-view')).toBeInTheDocument();
  });

  it('should show step editor when activeStepIndex is set', () => {
    render(<WorkflowsPanel {...defaultProps} editingWorkflowId="wf-1" editorProps={{ ...defaultProps.editorProps, activeStepIndex: 0, requestName: 'Step 1', method: 'GET', updateRequestInCollection: vi.fn(), setRequestName: vi.fn(), setMethod: vi.fn() }} />);
    expect(screen.getByTestId('config-view')).toBeInTheDocument();
    expect(screen.getByText(pt.config.actions.backToWork)).toBeInTheDocument();
  });

  it('should hide editor column when rightPanelSize is maximized', () => {
    render(<WorkflowsPanel {...defaultProps} editingWorkflowId="wf-1" rightPanelSize="maximized" />);
    expect(screen.queryByTestId('workflow-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('report-view')).toBeInTheDocument();
  });

  it('should show pulse indicator when isRunning', () => {
    render(<WorkflowsPanel {...defaultProps} editingWorkflowId="wf-1" isRunning={true} />);
    // The running indicator is a small pulsing span
    const indicators = document.querySelectorAll('.animate-pulse');
    expect(indicators.length).toBeGreaterThan(0);
  });
});
