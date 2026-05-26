import React, { useState, useEffect } from 'react';

export default function ReportView({ reportData, requestLogs, setView, config, results, activeCollectionId, activeCollection, sendRequests, isRunning, onStop, theme, activeScenarioId, activeWorkflowId, lastExecutedPayload }) {
  const [selectedLog, setSelectedLog] = useState(null); 
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'success' | 'error'
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval;
    if (isRunning) {
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedTime((Date.now() - start) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const resolveVariables = (text) => {
    if (!text || !activeCollection) return text;
    const activeEnv = activeCollection.environments?.find(e => e.id === activeCollection.activeEnvironmentId);
    if (!activeEnv) return text;

    let resolved = text;
    activeEnv.variables.forEach(v => {
      if (v.key) {
        const regex = new RegExp(`{{\\s*${v.key}\\s*}}`, 'g');
        resolved = resolved.replace(regex, v.value);
      }
    });
    return resolved;
  };

  const generateReportHTML = () => {
    const resolvedUrl = resolveVariables(config.url);
    const now = new Date();
    const reportDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isDark = theme === 'dark';

    const colors = {
      bg: isDark ? '#0f172a' : '#ffffff',
      text: isDark ? '#e2e8f0' : '#1e293b',
      cardBg: isDark ? '#1e293b' : '#f8fafc',
      border: isDark ? '#334155' : '#e2e8f0',
      title: isDark ? '#f8fafc' : '#0f172a',
      meta: isDark ? '#94a3b8' : '#64748b',
      accent: '#3b82f6', // blue-500
      tableHeader: isDark ? '#1e293b' : '#f1f5f9'
    };

    return `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <title>Relatório AST DevTools - ${resolvedUrl}</title>
        <style>
          html, body { background-color: ${colors.bg} !important; color: ${colors.text} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; padding: 40px; max-width: 1000px; margin: 0 auto; }
          .header { border-bottom: 2px solid ${colors.border}; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: 800; margin: 0; color: ${colors.title}; }
          .meta { color: ${colors.meta}; font-size: 14px; margin-top: 5px; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 40px; }
          .card { padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; background: ${colors.cardBg}; }
          .card-label { font-size: 11px; font-weight: 700; color: ${colors.meta}; text-transform: uppercase; letter-spacing: 0.05em; }
          .card-value { font-size: 28px; font-weight: 900; margin-top: 5px; color: ${colors.accent}; }
          .percentiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; font-family: monospace; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { text-align: left; background: ${colors.tableHeader}; padding: 12px; border-bottom: 2px solid ${colors.border}; color: ${colors.text}; }
          td { padding: 10px 12px; border-bottom: 1px solid ${colors.border}; }
          .status-ok { color: #10b981; font-weight: bold; }
          .status-warn { color: #f59e0b; font-weight: bold; }
          .status-err { color: #f43f5e; font-weight: bold; }
          @media print { .no-print { display: none; } body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Relatório de Performance</h1>
          <div class="meta">Alvo: <strong>${config.method}</strong> ${resolvedUrl}</div>
          <div class="meta">Executado em: ${reportDate}</div>
        </div>
        <div class="stats-grid">
          <div class="card"><div class="card-label">Total Requests</div><div class="card-value">${reportData?.totalRequests || 0}</div></div>
          <div class="card"><div class="card-label">RPS Médio</div><div class="card-value">${stats.rps}</div></div>
          <div className="card"><div class="card-label">Tempo de Execução</div><div class="card-value">${reportData?.totalDuration?.toFixed(2) || 0}s</div></div>
          <div class="card"><div class="card-label">Tempo Médio</div><div class="card-value">${stats.avg}ms</div></div>
          <div class="card"><div class="card-label">Sucesso / Falhas</div><div class="card-value">${reportData?.successCount || 0} / ${reportData?.errorCount || 0}</div></div>
          <div class="card">
            <div class="card-label">Percentis</div>
            <div class="percentiles">
              <span>P50: ${stats.p50}ms</span><span>P90: ${stats.p90}ms</span>
              <span>P95: ${stats.p95}ms</span><span>P99: ${stats.p99}ms</span>
            </div>
          </div>
        </div>
        <h2>Logs de Execução (Últimas ${requestLogs.length})</h2>
        <table>
          <thead>
            <tr><th>Hora</th><th>Status</th><th>Validação</th><th>Método</th><th>URL</th><th>Latência</th></tr>
          </thead>
          <tbody>
            ${requestLogs.map(log => {
              const isStatusOk = log.statusCode >= 200 && log.statusCode < 300;
              const validationClass = log.success ? 'status-ok' : (isStatusOk ? 'status-warn' : 'status-err');
              return `
              <tr>
                <td>${log.timestamp}</td>
                <td class="${isStatusOk ? 'status-ok' : 'status-err'}">${log.statusCode || 'ERR'}</td>
                <td class="${validationClass}">${log.success ? 'PASS' : 'FAIL'}</td>
                <td>${log.method}</td>
                <td>${log.url}</td>
                <td>${log.responseTime}ms</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  const exportHTML = () => {
    const blob = new Blob([generateReportHTML()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-teste-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const win = window.open('', '_blank');
    win.document.write(generateReportHTML());
    win.document.close();
    // Pequeno atraso para garantir que o CSS seja processado antes do diálogo de impressão
    setTimeout(() => {
      win.print();
    }, 500);
  };

  // Cálculos Estatísticos
  const stats = (() => {
    if (requestLogs.length === 0 && !isRunning) return { avg: "0.00", p50: "0.00", p90: "0.00", p95: "0.00", p99: "0.00", rps: "0.00" };

    const latencies = [...requestLogs].map(l => l.responseTime || 0).sort((a, b) => a - b);
    const avg = latencies.length > 0 ? latencies.reduce((acc, val) => acc + val, 0) / latencies.length : 0;
    
    const getP = (p) => (latencies.length > 0 ? latencies[Math.min(Math.floor(latencies.length * p), latencies.length - 1)] : 0);

    const p50 = getP(0.5);
    const p90 = getP(0.9);
    const p95 = getP(0.95);
    const p99 = getP(0.99);
    
    // RPS Médio (Total de reqs final / duração total)
    const currentDuration = isRunning ? elapsedTime : (reportData?.totalDuration || elapsedTime || config.duration);
    const totalReqs = reportData ? reportData.totalRequests : requestLogs.length;
    const rps = currentDuration > 0 ? (totalReqs / currentDuration).toFixed(2) : "0.00";

    // Garantimos que toFixed só seja chamado em números válidos
    return { avg: (avg || 0).toFixed(2), p50: (p50 || 0).toFixed(2), p90: (p90 || 0).toFixed(2), p95: (p95 || 0).toFixed(2), p99: (p99 || 0).toFixed(2), rps };
  })();

  // Lógica de filtragem dos logs
  const filteredLogs = requestLogs.filter(log => {
    const isLogSuccess = log.success;
    if (logFilter === 'success') return isLogSuccess;
    if (logFilter === 'error') return !isLogSuccess;
    return true;
  });

  const counts = {
    all: requestLogs.length,
    success: requestLogs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length,
    error: requestLogs.filter(l => l.statusCode === 0 || l.statusCode < 200 || l.statusCode >= 300).length
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              // Se estamos em um cenário ou workflow, volta para a coleção. Senão, para a configuração padrão.
              if (activeCollectionId && (activeScenarioId || activeWorkflowId)) {
                setView('collection-detail');
              } else {
                setView('config');
              }}}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Voltar para Configuração"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Relatório de Execução</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Monitoramento em tempo real do teste de carga</p>
          </div>
          </div>
        <div className="flex gap-3">
          {isRunning && (
            <button
              onClick={onStop}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 animate-pulse"
              title="Interromper o teste agora"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              STOP
            </button>
          )}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={exportHTML}
              className="px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1"
              title="Exportar como arquivo HTML"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              HTML
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center"></div>
            <button
              onClick={exportPDF}
              className="px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
              title="Imprimir ou Salvar como PDF"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              PDF
            </button>
          </div>
          <button
            onClick={() => {
              if (lastExecutedPayload) {
                sendRequests(lastExecutedPayload);
              } else {
                const headerMap = {};
                (config.headers || []).forEach(h => {
                  if (h.key) headerMap[h.key] = h.value;
                });

                const payload = {
                  url: config.url,
                  method: config.method,
                  totalRequests: parseInt(config.totalRequests),
                  duration: parseInt(config.duration),
                  rampUp: parseInt(config.rampUp || 0),
                  headers: headerMap,
                  body: config.body,
                  assertions: config.assertions || [],
                  extractions: config.extractions || []
                };
                sendRequests(payload);
              }
            }}
            className="px-4 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
            title="Rodar o teste novamente com a mesma configuração"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
          </button>
          {activeCollectionId && config.activeRequestId && ( // Mostra o botão Coleção apenas se veio de uma request salva
            <button
              onClick={() => setView('collection-detail')}
              className="px-4 text-blue-600 dark:text-blue-400 rounded-lg font-bold hover:bg-blue-600/20 transition-colors flex items-center gap-2"
              title="Voltar para a coleção de onde esta requisição foi executada"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 md:col-span-1">
          <span className="label-base !mb-1">Method</span>
          <span className={`font-bold method-${(config.method || 'multi').toLowerCase()}`}>{config.method || 'SCENARIO'}</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 md:col-span-3">
          <span className="label-base !mb-1">Target URL</span>
          <span className="text-slate-700 dark:text-slate-200 font-bold truncate block" title={resolveVariables(config.url)}>{config.url ? resolveVariables(config.url) : "Múltiplas Requisições (Cenário)"}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="label-base !mb-1">Total Planejado</span>
          <span className="text-slate-700 dark:text-slate-200 font-bold">
            {config.method === '' ? 'Varia por passo' : (
              config.duration > 0 ? (
                config.rampUp > 0 && config.rampUp < config.duration 
                  ? (config.totalRequests * (config.duration - (config.rampUp / 2)))
                  : config.totalRequests * config.duration
              ) : config.totalRequests
            )}
          </span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="label-base !mb-1">Duration</span>
          <span className="text-slate-700 dark:text-slate-200 font-bold">{config.method === '' ? 'Varia por passo' : `${config.duration}s`}</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="label-base !mb-1 text-emerald-600 dark:text-emerald-400">Real Time</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {isRunning 
              ? `${elapsedTime.toFixed(2)}s` 
              : (reportData?.totalDuration ? `${reportData.totalDuration.toFixed(2)}s` : `${elapsedTime.toFixed(2)}s`)
            }
          </span>
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-bold uppercase tracking-widest">RPS Médio</span>
          <div className="text-4xl font-black text-amber-600 dark:text-amber-400 mt-2">{stats.rps} <span className="text-sm">req/s</span></div>
        </div>
        <div className="p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-center">
          <span className="text-cyan-600 dark:text-cyan-400 text-sm font-bold uppercase tracking-widest">Tempo Médio</span>
          <div className="text-4xl font-black text-cyan-600 dark:text-cyan-400 mt-2">{stats.avg} <span className="text-sm">ms</span></div>
        </div>
        <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center">
          <span className="text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-widest">Percentis Latência</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-left">
            <div className="flex justify-between border-b border-purple-500/10 pb-1" title="P50 (Mediana): 50% das requisições foram processadas em tempo igual ou menor que este valor.">
              <span className="text-[10px] text-slate-500 font-bold uppercase cursor-help">P50</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{stats.p50}ms</span>
            </div>
            <div className="flex justify-between border-b border-purple-500/10 pb-1" title="P90: 90% das requisições foram processadas em tempo igual ou menor que este valor.">
              <span className="text-[10px] text-slate-500 font-bold uppercase cursor-help">P90</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{stats.p90}ms</span>
            </div>
            <div className="flex justify-between border-b border-purple-500/10 pb-1" title="P95: 95% das requisições foram processadas em tempo igual ou menor que este valor.">
              <span className="text-[10px] text-slate-500 font-bold uppercase cursor-help">P95</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{stats.p95}ms</span>
            </div>
            <div className="flex justify-between border-b border-purple-500/10 pb-1" title="P99: 99% das requisições foram processadas em tempo igual ou menor que este valor.">
              <span className="text-[10px] text-slate-500 font-bold uppercase cursor-help">P99</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{stats.p99}ms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
          <span className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-widest">Total Requests</span>
          <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mt-2">{reportData?.totalRequests ?? '...'}</div>
        </div>
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
          <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-widest">Sucesso</span>
          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{reportData?.successCount ?? '...'}</div>
        </div>
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
          <span className="text-rose-600 dark:text-rose-400 text-sm font-bold uppercase tracking-widest">Falhas</span>
          <div className="text-4xl font-black text-rose-600 dark:text-rose-400 mt-2">{reportData?.errorCount ?? '...'}</div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-2">
        <label className="label-base !mb-0">Requisições (Clique para detalhes)</label>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setLogFilter('all')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${logFilter === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            TODOS ({counts.all})
          </button>
          <button 
            onClick={() => setLogFilter('success')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${logFilter === 'success' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-500'}`}
          >
            SUCESSO ({counts.success})
          </button>
          <button 
            onClick={() => setLogFilter('error')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${logFilter === 'error' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-500'}`}
          >
            ERRO ({counts.error})
          </button>
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl p-2 font-mono text-xs text-slate-400 h-[450px] overflow-y-auto border border-slate-800 shadow-inner flex flex-col-reverse">
        {requestLogs.length === 0 && !reportData ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p>Disparando workers...</p>
          </div>
        ) : (
          <div className="space-y-1 flex flex-col-reverse">
            {filteredLogs.map((log, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedLog(log)}
                className={`flex gap-4 px-4 py-3 border-b border-slate-800/50 items-center cursor-pointer hover:bg-slate-900 transition-colors group ${!log.success ? 'bg-rose-500/5' : ''}`}
              >
                <span className="text-slate-500 w-[75px] flex-shrink-0">{log.timestamp}</span>
                <div className="flex flex-col w-[45px] flex-shrink-0">
                  <span className={`font-bold ${log.statusCode >= 200 && log.statusCode < 300 ? 'text-emerald-500' : 'text-rose-500'}`}>{log.statusCode || 'ERR'}</span>
                  {!log.success && <span className="text-[8px] text-amber-500 font-black leading-none">WARN</span>}
                </div>
                <span className="w-[50px] text-blue-400 font-bold flex-shrink-0 uppercase">{log.method}</span>
                <span className="flex-1 truncate text-slate-400 group-hover:text-slate-200">{log.url}</span>
                <span className="text-slate-500 w-[70px] text-right">{log.responseTime}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold dark:text-white">Inspeção da Requisição</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-rose-500 transition-colors text-3xl">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {!selectedLog.success && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                  <svg className="w-5 h-5 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <div>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">Falha na Validação</p>
                    <p className="text-xs text-rose-500 dark:text-rose-500 font-mono mt-1">{selectedLog.errorMessage || "A resposta não atende aos critérios das asserções definidas."}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div><p className="label-base">Status</p><p className={`text-xl font-black ${selectedLog.statusCode >= 200 && selectedLog.statusCode < 300 ? 'text-emerald-500' : 'text-rose-500'}`}>{selectedLog.statusCode || 'ERROR'}</p></div>
                <div><p className="label-base">Time</p><p className="text-xl font-black dark:text-white">{selectedLog.responseTime}ms</p></div>
                <div className="col-span-2"><p className="label-base">Method & URL</p><p className="dark:text-slate-200 font-bold truncate"><span className="text-blue-500 uppercase mr-2">{selectedLog.method}</span>{selectedLog.url}</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lado da Requisição */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-blue-500 mb-3 uppercase tracking-widest underline decoration-2 underline-offset-4">Request</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 mb-1">HEADERS</p>
                        <pre className="text-xs bg-slate-950 p-4 rounded-xl text-blue-300 overflow-x-auto border border-blue-900/30">
                          {JSON.stringify(selectedLog.requestHeaders || {}, null, 2)}
                        </pre>
                      </div>
                      {selectedLog.requestBody && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 mb-1">BODY</p>
                          <pre className="text-xs bg-slate-950 p-4 rounded-xl text-slate-300 whitespace-pre-wrap border border-slate-800">{selectedLog.requestBody}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado da Resposta */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-500 mb-3 uppercase tracking-widest underline decoration-2 underline-offset-4">Response</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 mb-1">HEADERS</p>
                        <pre className="text-xs bg-slate-950 p-4 rounded-xl text-emerald-300 overflow-x-auto border border-emerald-900/30">
                          {JSON.stringify(selectedLog.responseHeaders || {}, null, 2)}
                        </pre>
                      </div>
                      {selectedLog.responseBody && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 mb-1">BODY</p>
                          <pre className="text-xs bg-slate-950 p-4 rounded-xl text-slate-300 whitespace-pre-wrap border border-slate-800 max-h-[300px] overflow-y-auto">
                            {selectedLog.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}