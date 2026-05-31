import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReportView from './ReportView';

const mockReportData = {
  totalRequests: 100,
  successCount: 95,
  errorCount: 5,
  totalDuration: 10.0,
};

const mockLogs = [
  { timestamp: '10:00:01', statusCode: 200, success: true, method: 'POST', url: '/test', responseTime: 150 },
  { timestamp: '10:00:02', statusCode: 500, success: false, method: 'POST', url: '/test', responseTime: 50, errorMessage: 'Timeout' },
];

const mockCollection = {
  activeEnvironmentId: 'env-1',
  environments: [
    {
      id: 'env-1',
      variables: [{ key: 'host', value: 'api.local' }]
    }
  ]
};

const defaultProps = {
  reportData: mockReportData,
  requestLogs: mockLogs,
  config: { method: 'POST', url: 'http://{{host}}/test', totalRequests: 100, duration: 10 },
  isRunning: false,
  activeCollection: mockCollection,
  theme: 'light',
  setView: vi.fn(),
  onStop: vi.fn(),
  sendRequests: vi.fn(),
  onSaveResponseToDoc: vi.fn(),
};

describe('ReportView', () => {
  it('should correctly display summary cards (Success/Failures)', () => {
    render(<ReportView {...defaultProps} />);
    
    expect(screen.getByText('100')).toBeDefined(); // Total
    expect(screen.getByText('95')).toBeDefined();  // Sucesso
    expect(screen.getByText('5')).toBeDefined();   // Falhas
  });

  it('should correctly calculate average RPS', () => {
    render(<ReportView {...defaultProps} />);
    // 100 reqs / 10s = 10.00
    expect(screen.getByText('10.00')).toBeDefined();
  });

  it('should calculate average latency based on logs', () => {
    render(<ReportView {...defaultProps} />);
    // (150 + 50) / 2 = 100ms
    expect(screen.getByText('100.00')).toBeDefined();
  });

  it('should list execution logs in the table', () => {
    render(<ReportView {...defaultProps} />);
    expect(screen.getByText('10:00:01')).toBeDefined();
    expect(screen.getByText('10:00:02')).toBeDefined();
  });

  it('should filter logs by type (Success/Error)', () => {
    render(<ReportView {...defaultProps} />);
    
    // Clica no filtro de ERRO
    const errorFilterBtn = screen.getByText(/ERRO/);
    fireEvent.click(errorFilterBtn);
    
    expect(screen.queryByText('10:00:01')).not.toBeInTheDocument(); // O log de 200 deve sumir
    expect(screen.getByText('10:00:02')).toBeInTheDocument(); // O log de 500 deve ficar
  });

  it('should open inspection modal when clicking a log', () => {
    render(<ReportView {...defaultProps} />);
    
    const logEntry = screen.getByText('10:00:01');
    fireEvent.click(logEntry);
    
    expect(screen.getByText('Inspeção da Requisição')).toBeInTheDocument();
    
    // O valor '150ms' aparece tanto na lista quanto no modal, por isso buscamos dentro do contexto do modal
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText(/150\s*ms/)).toBeInTheDocument();
    
    // Fecha o modal
    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Inspeção da Requisição')).not.toBeInTheDocument();
  });

  it('should correctly calculate latency percentiles', () => {
    // Simulando uma série de latências variadas (100 itens para garantir distinção entre percentis)
    const manyLogs = Array.from({ length: 100 }, (_, i) => ({
      timestamp: `10:00:${i}`, statusCode: 200, success: true, method: 'GET', url: '/',
      responseTime: i + 1 // 1, 2, 3... 100ms
    }));
    
    render(<ReportView {...defaultProps} requestLogs={manyLogs} />);
    
    // P50 (mediana)
    expect(screen.getByText(/P50/)).toBeInTheDocument();
    expect(screen.getAllByText(/50\.00\s*ms/)[0]).toBeInTheDocument();
    
    // P90
    expect(screen.getByText(/P90/)).toBeInTheDocument();
    expect(screen.getAllByText(/90\.00\s*ms/)[0]).toBeInTheDocument();

    // P95
    expect(screen.getByText(/P95/)).toBeInTheDocument();
    expect(screen.getByText(/95\.00\s*ms/)).toBeInTheDocument();
  });

  it('should omit sensitive headers in inspection by default', () => {
    const logWithAuth = { ...mockLogs[0], requestHeaders: { 'Authorization': 'Bearer secret', 'Content-Type': 'application/json' } };
    render(<ReportView {...defaultProps} requestLogs={[logWithAuth]} />);
    
    fireEvent.click(screen.getByText('10:00:01'));
    
    const modal = screen.getByRole('dialog');
    // Verifica se o valor foi omitido no modal usando regex flexível e case-insensitive
    expect(within(modal).getByText(/Authorization.*OMITIDO/i)).toBeInTheDocument();
    expect(screen.getByText(/"Content-Type": "application\/json"/)).toBeInTheDocument();
  });

  it('should correctly display the calculated RPS', () => {
    render(<ReportView {...defaultProps} />);
    // 100 reqs / 10s = 10.00 req/s
    expect(screen.getByText('10.00')).toBeInTheDocument();
  });

  it('should update real-time timer while test is running', () => {
    vi.useFakeTimers();
    render(<ReportView {...defaultProps} isRunning={true} />);
    
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    
    // O componente deve mostrar 3.50s no card de Real Time
    expect(screen.getByText(/3\.50s/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('should trigger HTML and PDF report downloads', () => {
    // Mock para evitar erro de navegação do JSDOM ao clicar em links de download
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({
      document: { write: vi.fn(), close: vi.fn() },
      close: vi.fn(),
      print: vi.fn()
    }));

    render(<ReportView {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle('Exportar como arquivo HTML'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Imprimir ou Salvar como PDF'));
    expect(openSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('should call onStop when clicking the STOP button', () => {
    render(<ReportView {...defaultProps} isRunning={true} />);
    fireEvent.click(screen.getByText('STOP'));
    expect(defaultProps.onStop).toHaveBeenCalled();
  });

  it('should allow navigating back to config or collection detail', () => {
    const { rerender } = render(<ReportView {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle('Voltar para Configuração'));
    expect(defaultProps.setView).toHaveBeenCalledWith('config');

    rerender(<ReportView {...defaultProps} activeCollectionId="col-1" activeScenarioId="s1" />);
    fireEvent.click(screen.getByTitle('Voltar para Configuração'));
    expect(defaultProps.setView).toHaveBeenCalledWith('collection-detail');
  });

  it('should allow running the test again using previous payload or current config', () => {
    const { rerender } = render(<ReportView {...defaultProps} lastExecutedPayload={{ url: '/last' }} />);
    
    const rerunBtn = screen.getByTitle('Rodar o teste novamente com a mesma configuração');
    fireEvent.click(rerunBtn);
    expect(defaultProps.sendRequests).toHaveBeenCalledWith({ url: '/last' });

    rerender(<ReportView {...defaultProps} lastExecutedPayload={null} />);
    fireEvent.click(rerunBtn);
    expect(defaultProps.sendRequests).toHaveBeenCalled();
  });

  it('should correctly render in SCENARIO execution mode (no fixed method)', () => {
    const scenarioConfig = { ...defaultProps.config, method: '', url: '' };
    render(<ReportView {...defaultProps} config={scenarioConfig} />);
    
    expect(screen.getByText('SCENARIO')).toBeInTheDocument();
    expect(screen.getByText('Múltiplas Requisições (Cenário)')).toBeInTheDocument();
    expect(screen.getAllByText('Varia por passo').length).toBeGreaterThan(0);
  });

  it('should calculate planned total considering ramp-up', () => {
    // totalRequests * (duration - (rampUp / 2))
    // 10 * (10 - 2) = 80
    render(<ReportView {...defaultProps} config={{ ...defaultProps.config, totalRequests: 10, duration: 10, rampUp: 4 }} />);
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('should allow exporting individual log in HTML/PDF inside modal', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({
      document: { write: vi.fn(), close: vi.fn() },
      close: vi.fn(),
      print: vi.fn()
    }));
    render(<ReportView {...defaultProps} />);
    
    fireEvent.click(screen.getByText('10:00:01'));
    const modal = screen.getByRole('dialog');

    fireEvent.click(within(modal).getByTitle('HTML'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    fireEvent.click(within(modal).getByTitle('PDF'));
    expect(openSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('should allow saving a response to documentation through modal', () => {
    render(<ReportView 
      {...defaultProps} 
      activeCollectionId="col-1" 
      config={{...defaultProps.config, activeRequestId: 'req-1'}} 
    />);
    fireEvent.click(screen.getByText('10:00:01'));
    const modal = screen.getByRole('dialog');
    fireEvent.click(within(modal).getByTitle('Adicionar esta resposta à documentação da requisição'));
    expect(defaultProps.onSaveResponseToDoc).toHaveBeenCalledWith('col-1', 'req-1', mockLogs[0]);
  });
});