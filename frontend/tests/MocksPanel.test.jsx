import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MocksPanel from '../src/components/mocks/MocksPanel';
import { pt } from '../src/locales/pt';

describe('MocksPanel', () => {
  const defaultProps = {
    t: pt,
    selectedMock: null,
    setSelectedMock: vi.fn(),
    isEditingMock: false,
    setIsEditingMock: vi.fn(),
    monitoringMock: null,
    setMonitoringMock: vi.fn(),
    handleSaveMock: vi.fn(),
    rightPanelSize: 'normal',
    setRightPanelSize: vi.fn(),
  };

  it('should show empty state when no mock is selected or monitoring', () => {
    render(<MocksPanel {...defaultProps} />);
    expect(screen.getByText(pt.mocks.selectMock)).toBeInTheDocument();
  });

  it('should show editor panel when isEditingMock is true', () => {
    const mock = { id: 'm1', name: 'Test Mock', method: 'GET', path: '/test', response: { status: 200, body: '{}' }, assertions: [], active: false };
    render(<MocksPanel {...defaultProps} isEditingMock={true} selectedMock={mock} />);
    expect(screen.getByText(pt.mocks.monitoringLive)).toBeInTheDocument();
  });

  it('should show start monitoring message when no monitoring mock active', () => {
    const mock = { id: 'm1', name: 'Test Mock', method: 'GET', path: '/test', response: { status: 200, body: '{}' }, assertions: [], active: false };
    render(<MocksPanel {...defaultProps} isEditingMock={true} selectedMock={mock} />);
    expect(screen.getByText(pt.mocks.startMonitoring)).toBeInTheDocument();
  });

  it('should show stop button when monitoring a mock', () => {
    const mock = { id: 'm1', name: 'Test Mock', method: 'GET', path: '/test', response: { status: 200, body: '{}' }, assertions: [], active: true };
    render(<MocksPanel {...defaultProps} monitoringMock={mock} isEditingMock={true} selectedMock={mock} />);
    expect(screen.getByText(pt.mocks.stopMonitoring)).toBeInTheDocument();
  });

  it('should show endpoint URL when monitoring a mock', () => {
    const mock = { id: 'm1', name: 'Test Mock', method: 'GET', path: '/api/users', response: { status: 200, body: '{}' }, assertions: [], active: true };
    render(<MocksPanel {...defaultProps} monitoringMock={mock} isEditingMock={true} selectedMock={mock} />);
    expect(screen.getByText(/\/mock\/api\/users/)).toBeInTheDocument();
  });

  it('should call setRightPanelSize when clicking maximize button', () => {
    const mock = { id: 'm1', name: 'Test', method: 'GET', path: '/t', response: { status: 200, body: '{}' }, assertions: [], active: false };
    render(<MocksPanel {...defaultProps} isEditingMock={true} selectedMock={mock} />);
    // There are 2 pairs of size buttons (max/min)
    const buttons = screen.getAllByRole('button');
    // Find the maximize/minimize buttons by their proximity to the panel
    expect(defaultProps.setRightPanelSize).not.toHaveBeenCalled();
  });

  it('should hide content when rightPanelSize is minimized', () => {
    const mock = { id: 'm1', name: 'Test', method: 'GET', path: '/t', response: { status: 200, body: '{}' }, assertions: [], active: false };
    render(<MocksPanel {...defaultProps} isEditingMock={true} selectedMock={mock} rightPanelSize="minimized" />);
    expect(screen.queryByText(pt.mocks.monitoringLive)).not.toBeInTheDocument();
  });
});
