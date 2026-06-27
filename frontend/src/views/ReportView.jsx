import React, { useState, useEffect } from 'react';

const MiniChart = ({ data, color, label, unit, isRunning, height = 40, loadingText = "...", emptyText = "--" }) => {
  const isEmpty = !data || data.length < 2;
  const max = Math.max(...(isEmpty ? [1] : data), 1);
  const min = isEmpty ? 0 : Math.min(...data);
  const width = 300;
  const padding = 2;
  const step = isEmpty ? 0 : width / (data.length - 1);
  
  const getX = (i) => i * step;
  const getY = (v) => height - ((v / max) * (height - padding * 2)) - padding;

  const points = isEmpty ? "" : data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const areaPoints = isEmpty ? "" : `${points} ${getX(data.length - 1)},${height} 0,${height}`;
  const gradientId = `grad-${label.replace(/[^a-zA-Z0-9]/g, '-')}`;

  // Calcula média para exibir no card
  const avg = isEmpty ? 0 : data.reduce((a, b) => a + b, 0) / data.length;

  return (
    <div className="bg-slate-900/40 rounded-2xl p-4 border theme-border space-y-3 backdrop-blur-sm hover:bg-slate-900/60 transition-all duration-500 group relative overflow-hidden">
      {!isEmpty && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}
      <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isEmpty ? 'bg-slate-700' : ''}`} style={!isEmpty ? { backgroundColor: color, boxShadow: `0 0 8px ${color}` } : {}}></div>
          <span>{label}</span>
        </div>
        <div className="flex gap-3">
          {!isEmpty && <span className="text-slate-600 font-mono text-[8px]">min:{min.toFixed(0)}{unit}</span>}
          <span className="theme-text-secondary bg-white/5 px-1.5 py-0.5 rounded font-mono">
            {isEmpty ? '--' : `avg:${avg.toFixed(0)}${unit}`}
          </span>
          {!isEmpty && <span className="text-slate-600 font-mono text-[8px]">max:{max.toFixed(0)}{unit}</span>}
        </div>
      </div>
      <div className="flex items-end justify-center relative" style={{ height: `${height}px` }}>
        {isEmpty ? (
          <span className="text-[10px] text-slate-700 italic">{isRunning ? loadingText : emptyText}</span>
        ) : (
          <>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[7px] text-slate-600 font-mono pointer-events-none" style={{ width: '30px' }}>
              <span>{max.toFixed(0)}</span>
              <span>{(max / 2).toFixed(0)}</span>
              <span>0</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-[calc(100%-35px)] ml-auto h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={areaPoints} fill={`url(#${gradientId})`} className="transition-all duration-1000 ease-out" />
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="transition-all duration-1000 ease-out group-hover:stroke-[2.5px]"
                style={{ filter: `drop-shadow(0 0 3px ${color}66)` }}
              />
            </svg>
          </>
        )}
      </div>
    </div>
  );
};

export default function ReportView({ t, reportData, requestLogs, liveStats, setView, config, results, activeCollectionId, activeCollection, sendRequests, isRunning, onStop, theme, activeWorkflowId, lastExecutedPayload, onSaveResponseToDoc }) {
  const [selectedLog, setSelectedLog] = useState(null); 
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'success' | 'error'
  const [elapsedTime, setElapsedTime] = useState(0);

  // Usa o payload executado para exibir no relatório (não reflete edições live do form)
  const execConfig = lastExecutedPayload || config;

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
    const resolvedUrl = resolveVariables(execConfig.url);
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
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${t.report.htmlTitle} - ${resolvedUrl}</title>
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
          <h1 class="title">${t.report.htmlHeading}</h1>
          <div class="meta">${t.report.htmlTarget}: <strong>${execConfig.method}</strong> ${resolvedUrl}</div>
          <div class="meta">${t.report.htmlExecutedAt}: ${reportDate}</div>
        </div>
        <div class="stats-grid">
          <div class="card"><div class="card-label">Total Requests</div><div class="card-value">${reportData?.totalRequests || 0}</div></div>
          <div class="card"><div class="card-label">${t.report.htmlAvgRps}</div><div class="card-value">${stats.rps}</div></div>
          <div className="card"><div class="card-label">${t.report.htmlExecTime}</div><div class="card-value">${reportData?.totalDuration?.toFixed(2) || 0}s</div></div>
          <div class="card"><div class="card-label">${t.report.htmlAvgTime}</div><div class="card-value">${stats.avg}ms</div></div>
          <div class="card"><div class="card-label">${t.report.htmlSuccessFailures}</div><div class="card-value">${reportData?.successCount || 0} / ${reportData?.errorCount || 0}</div></div>
          <div class="card">
            <div class="card-label">${t.report.htmlPercentiles}</div>
            <div class="percentiles">
              <span>P50: ${stats.p50}ms</span><span>P90: ${stats.p90}ms</span>
              <span>P95: ${stats.p95}ms</span><span>P99: ${stats.p99}ms</span>
            </div>
          </div>
        </div>
        <h2>${t.report.htmlExecutionLogs} ${requestLogs.length})</h2>
        <table>
          <thead>
            <tr><th>${t.report.htmlColTime}</th><th>${t.report.htmlColStatus}</th><th>${t.report.htmlColValidation}</th><th>${t.report.htmlColMethod}</th><th>${t.report.htmlColUrl}</th><th>${t.report.htmlColLatency}</th></tr>
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
    a.download = `report-${Date.now()}.html`;
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

    const getP = (p) => (latencies.length > 0 ? latencies[Math.max(0, Math.floor(latencies.length * p) - 1)] : 0);

    const p50 = getP(0.5);
    const p90 = getP(0.9);
    const p95 = getP(0.95);
    const p99 = getP(0.99);
    
    // RPS Médio: usa liveStats.total (contador real) dividido pelo tempo decorrido
    const currentDuration = isRunning ? elapsedTime : (reportData?.totalDuration || elapsedTime || execConfig.duration);
    const totalReqs = liveStats?.total || reportData?.totalRequests || requestLogs.length;
    const rps = currentDuration > 0.5 ? (totalReqs / currentDuration).toFixed(2) : "0.00";

    return { avg: (avg || 0).toFixed(2), p50: (p50 || 0).toFixed(2), p90: (p90 || 0).toFixed(2), p95: (p95 || 0).toFixed(2), p99: (p99 || 0).toFixed(2), rps };
  })();

  // Dados para os gráficos de tendência
  const trendData = (() => {
    if (!requestLogs || requestLogs.length < 2) return { reqTrend: [], errTrend: [], timeTrend: [] };

    // Itera em ordem cronológica (logs mais recentes estão no início)
    const chronologicalLogs = [...requestLogs].reverse();

    // Agrupa por timestamp (segundo)
    const groups = {};
    chronologicalLogs.forEach(log => {
      const time = log.timestamp;
      if (!groups[time]) groups[time] = { reqs: 0, errs: 0 };
      groups[time].reqs++;
      if (!log.success) groups[time].errs++;
    });

    const times = Object.keys(groups).sort();
    
    // Latência: downsampling para no máximo 60 pontos
    const rawLatencies = chronologicalLogs.map(l => l.responseTime).filter(l => l > 0);
    const maxPoints = 60;
    const sampledLatencies = rawLatencies.length <= maxPoints 
      ? rawLatencies 
      : Array.from({ length: maxPoints }, (_, i) => {
          const start = Math.floor(i * (rawLatencies.length / maxPoints));
          const end = Math.floor((i + 1) * (rawLatencies.length / maxPoints));
          const bucket = rawLatencies.slice(start, end);
          return bucket.reduce((a, b) => a + b, 0) / bucket.length;
        });

    return {
      reqTrend: times.map(t => groups[t].reqs),
      errTrend: times.map(t => groups[t].errs),
      timeTrend: sampledLatencies
    };
  })();

  const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie', 'proxy-authorization', 'token', 'access-token'];

  const redactHeaders = (headers, includeAuth) => {
    if (!headers || includeAuth) return headers;
    const redacted = {};
    Object.keys(headers).forEach(key => {
      redacted[key] = sensitiveHeaders.includes(key.toLowerCase()) ? "[REDACTED]" : headers[key];
    });
    return redacted;
  };

  const generateInspectedLogHTML = (log, includeAuth) => {
    const isDark = theme === 'dark';
    const colors = {
      bg: isDark ? '#0f172a' : '#ffffff',
      text: isDark ? '#e2e8f0' : '#1e293b',
      border: isDark ? '#334155' : '#e2e8f0',
      title: isDark ? '#f8fafc' : '#0f172a',
      meta: isDark ? '#94a3b8' : '#64748b',
      accent: '#3b82f6',
      req: '#3b82f6',
      res: '#10b981'
    };

    const reqHeaders = redactHeaders(log.requestHeaders, includeAuth);
    const resHeaders = redactHeaders(log.responseHeaders, includeAuth);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${t.report.inspectionTitle} - ${log.method} ${log.url}</title>
        <style>
          body { font-family: system-ui, sans-serif; background: ${colors.bg}; color: ${colors.text}; padding: 40px; line-height: 1.6; max-width: 1100px; margin: 0 auto; }
          .header { border-bottom: 3px solid ${colors.border}; padding-bottom: 20px; margin-bottom: 30px; }
          .status-row { display: flex; align-items: center; gap: 20px; font-size: 24px; font-weight: 900; }
          .ok { color: #10b981; }
          .error { color: #f43f5e; }
          .url-box { font-family: monospace; background: ${isDark ? '#1e293b' : '#f8fafc'}; padding: 12px; border-radius: 8px; border: 1px solid ${colors.border}; margin-top: 15px; font-size: 14px; word-break: break-all; }
          h2 { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${colors.meta}; margin-top: 40px; margin-bottom: 10px; border-bottom: 1px solid ${colors.border}; padding-bottom: 5px; }
          pre { background: #010409; color: #e6edf3; padding: 20px; border-radius: 12px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; border: 1px solid ${colors.border}; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          @media print { .no-print { display: none; } body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="status-row">
            <span class="${log.statusCode >= 200 && log.statusCode < 300 ? 'ok' : 'error'}">Status: ${log.statusCode || 'ERR'}</span>
            <span>${log.responseTime}ms</span>
          </div>
          <div class="url-box"><span style="color: ${colors.accent}; margin-right: 10px;">${log.method}</span>${log.url}</div>
          <div style="color: ${colors.meta}; font-size: 11px; margin-top: 10px; font-weight: bold; text-transform: uppercase;">TIMESTAMP: ${log.timestamp}</div>
        </div>
        ${!log.success ? `<div style="background: #f43f5e11; border: 1px solid #f43f5e33; padding: 15px; border-radius: 12px; color: #f43f5e; margin-bottom: 20px;"><strong>${t.report.validationFailed}:</strong> ${log.errorMessage}</div>` : ''}
        <div class="grid">
          <div><h2 style="color: ${colors.req}">Request Headers</h2><pre>${JSON.stringify(reqHeaders, null, 2)}</pre><h2>Request Body</h2><pre>${log.requestBody || "(Empty)"}</pre></div>
          <div><h2 style="color: ${colors.res}">Response Headers</h2><pre>${JSON.stringify(resHeaders, null, 2)}</pre><h2>Response Body</h2><pre>${log.responseBody || "(Empty)"}</pre></div>
        </div>
      </body>
      </html>`;
  };

  const handleExportInspectedHTML = () => {
    if (!selectedLog) return;
    const includeAuth = window.confirm(t.report.includeAuthPrompt);
    const blob = new Blob([generateInspectedLogHTML(selectedLog, includeAuth)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspect-${selectedLog.method}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportInspectedPDF = () => {
    if (!selectedLog) return;
    const includeAuth = window.confirm(t.report.includeAuthPrompt);
    const win = window.open('', '_blank');
    win.document.write(generateInspectedLogHTML(selectedLog, includeAuth));
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
      <div className="flex justify-between items-center border-b theme-border pb-4 gap-2 flex-wrap">
        <div className="flex gap-2">
          {isRunning && (
            <button
              onClick={onStop}
              className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg font-bold text-[10px] transition-all flex items-center gap-2 animate-pulse"
              title={t.report.stopTooltip}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              {t.report.stop}
            </button>
          )}
          <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-lg p-0.5 border theme-border">
            <button
              onClick={exportHTML}
              className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:text-blue-500 transition-colors flex items-center gap-1"
              title={t.report.exportHtml}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              HTML
            </button>
            <div className="w-px h-3 bg-white/5 self-center mx-1"></div>
            <button
              onClick={exportPDF}
              className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:text-rose-500 transition-colors flex items-center gap-1"
              title={t.report.exportPdf}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border theme-border overflow-hidden">
          <span className="label-base !mb-1 text-[9px] opacity-60">{t.report.method}</span>
          <span className={`font-black text-xs method-${(execConfig.method || 'multi').toLowerCase()}`}>{execConfig.method || (execConfig.requests ? 'AUTOMATION' : 'SCENARIO')}</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border theme-border overflow-hidden min-w-0">
          <span className="label-base !mb-1 text-[9px] opacity-60">{t.report.targetUrl}</span>
          <span className="theme-text-secondary font-mono text-[10px] truncate block" title={resolveVariables(execConfig.url)}>{execConfig.url ? resolveVariables(execConfig.url) : (execConfig.requests ? t.report.multiStep : t.report.multiScenario)}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="label-base !mb-1">{execConfig.mode === 'workers' ? (t.config?.workers || 'Workers') : t.report.planned}</span>
          <span className="text-slate-700 dark:theme-text font-bold">
            {execConfig.mode === 'workers' 
              ? (execConfig.workers || 10)
              : (execConfig.method === '' ? t.report.variesByStep : (
                execConfig.duration > 0 ? (
                  execConfig.rampUp > 0 && execConfig.rampUp < execConfig.duration 
                    ? (execConfig.totalRequests * (execConfig.duration - (execConfig.rampUp / 2)))
                    : execConfig.totalRequests * execConfig.duration
                ) : execConfig.totalRequests
              ))
            }
          </span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="label-base !mb-1">{t.report.duration}</span>
          <span className="text-slate-700 dark:theme-text font-bold">{execConfig.method === '' ? t.report.variesByStep : `${execConfig.duration}s`}</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="label-base !mb-1 text-emerald-600 dark:text-emerald-400">{t.report.realTime}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {isRunning 
              ? `${elapsedTime.toFixed(2)}s` 
              : (reportData?.totalDuration ? `${reportData.totalDuration.toFixed(2)}s` : `${elapsedTime.toFixed(2)}s`)
            }
          </span>
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] text-center">
          <span className="text-amber-500 text-[9px] font-black uppercase tracking-widest opacity-60">{t.report.avgRps}</span>
          <div className="text-2xl font-black text-amber-500 mt-1">{stats.rps} <span className="text-[10px]">r/s</span></div>
        </div>
        <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-[2rem] text-center">
          <span className="text-cyan-500 text-[9px] font-black uppercase tracking-widest opacity-60">{t.report.avgTime}</span>
          <div className="text-2xl font-black text-cyan-500 mt-1">{stats.avg} <span className="text-[10px]">ms</span></div>
        </div>
        <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-[2rem] text-center flex flex-col justify-center">
          <span className="text-purple-500 text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{t.report.percentiles}</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex justify-between border-b border-purple-500/5 pb-0.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase">P50</span>
              <span className="text-xs font-mono font-black theme-text">{stats.p50}<span className="text-[8px] ml-0.5 opacity-50">ms</span></span>
            </div>
            <div className="flex justify-between border-b border-purple-500/5 pb-0.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase">P90</span>
              <span className="text-xs font-mono font-black text-purple-400">{stats.p90}<span className="text-[8px] ml-0.5 opacity-50">ms</span></span>
            </div>
            <div className="flex justify-between border-b border-purple-500/10 pb-0.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase">P95</span>
              <span className="text-xs font-mono font-black text-purple-400">{stats.p95}<span className="text-[8px] ml-0.5 opacity-50">ms</span></span>
            </div>
            <div className="flex justify-between border-b border-purple-500/10 pb-0.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase">P99</span>
              <span className="text-xs font-mono font-black text-rose-400">{stats.p99}<span className="text-[8px] ml-0.5 opacity-50">ms</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de Tendência */}
      <div className="grid grid-cols-1 gap-4">
         <div className="grid grid-cols-2 gap-4">
            <MiniChart data={trendData.reqTrend} color="#3b82f6" label={t.report.chartThroughput} unit=" reqs" isRunning={isRunning} loadingText={t.report.capturing} emptyText={t.report.noData} />
            <MiniChart data={trendData.errTrend} color="#ef4444" label={t.report.chartErrors} unit=" errs" isRunning={isRunning} loadingText={t.report.capturing} emptyText={t.report.noData} />
         </div>
         <MiniChart data={trendData.timeTrend} color="#10b981" label={t.report.chartLatency} unit="ms" isRunning={isRunning} height={120} loadingText={t.report.capturing} emptyText={t.report.noData} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
          <span className="text-blue-500 text-[8px] font-black uppercase tracking-widest">{t.dashboard.itemsCount}</span>
          <div className="text-xl font-black text-blue-500 mt-1">{reportData?.totalRequests ?? liveStats?.total ?? 0}</div>
        </div>
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center">
          <span className="text-emerald-500 text-[8px] font-black uppercase tracking-widest">{t.report.success}</span>
          <div className="text-xl font-black text-emerald-500 mt-1">{reportData?.successCount ?? liveStats?.success ?? 0}</div>
        </div>
        <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
          <span className="text-rose-500 text-[8px] font-black uppercase tracking-widest">{t.report.failures}</span>
          <div className="text-xl font-black text-rose-500 mt-1">{reportData?.errorCount ?? liveStats?.errors ?? 0}</div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-2">
        <label className="label-base !mb-0">{t.report.requestsLabel}</label>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setLogFilter('all')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${logFilter === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.report.filterAll} ({counts.all})
          </button>
          <button 
            onClick={() => setLogFilter('success')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${logFilter === 'success' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-500'}`}
          >
            {t.report.filterSuccess} ({counts.success})
          </button>
          <button 
            onClick={() => setLogFilter('error')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${logFilter === 'error' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-500'}`}
          >
            {t.report.filterError} ({counts.error})
          </button>
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl p-1 font-mono text-xs text-slate-400 h-[300px] overflow-y-auto border border-slate-800 shadow-inner flex flex-col-reverse">
        {requestLogs.length === 0 && !reportData ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p>{t.report.firing}</p>
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
                <span className="flex-1 truncate text-slate-400 group-hover:theme-text">{log.url}</span>
                <span className="theme-text-secondary font-mono font-bold w-[70px] text-right">{log.responseTime}<span className="text-[9px] opacity-40 ml-0.5">ms</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold dark:text-white">{t.report.inspectionTitle}</h3>
                <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 gap-1">
                  {activeCollectionId && config.activeRequestId && (
                    <>
                      <button 
                        onClick={() => onSaveResponseToDoc(activeCollectionId, config.activeRequestId, selectedLog)} 
                        className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[9px] font-black text-amber-600 dark:text-amber-400 transition-all uppercase flex items-center gap-1" 
                        title={t.report.saveToDocTooltip}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        DOC
                      </button>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 self-center"></div>
                    </>
                  )}
                  <button onClick={handleExportInspectedHTML} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[9px] font-black text-indigo-600 dark:text-indigo-400 transition-all uppercase" title="HTML">HTML</button>
                  <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 self-center"></div>
                  <button onClick={handleExportInspectedPDF} className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[9px] font-black text-rose-600 dark:text-rose-400 transition-all uppercase" title="PDF">PDF</button>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-rose-500 transition-colors text-3xl p-2">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {!selectedLog.success && selectedLog.errorMessage && ( // Só mostra se houver erro e mensagem
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                  <svg className="w-5 h-5 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <div>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">{t.report.validationFailed}</p>
                    <p className="text-xs text-rose-500 dark:text-rose-500 font-mono mt-1">{selectedLog.errorMessage || t.report.validationDefaultMsg}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div><p className="label-base">Status</p><p className={`text-xl font-black ${selectedLog.statusCode >= 200 && selectedLog.statusCode < 300 ? 'text-emerald-500' : 'text-rose-500'}`}>{selectedLog.statusCode || 'ERROR'}</p></div>
                <div><p className="label-base">Time</p><p className="text-xl font-black dark:text-white">{selectedLog.responseTime}ms</p></div>
                <div className="col-span-2"><p className="label-base">Method & URL</p><p className="dark:theme-text font-bold truncate"><span className="text-blue-500 uppercase mr-2">{selectedLog.method}</span>{selectedLog.url}</p></div>
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
                          {JSON.stringify(redactHeaders(selectedLog.requestHeaders, false), null, 2)}
                        </pre>
                      </div>
                      {selectedLog.requestBody && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 mb-1">BODY</p>
                          <pre className="text-xs bg-slate-950 p-4 rounded-xl theme-text-secondary whitespace-pre-wrap border border-slate-800">{selectedLog.requestBody}</pre>
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
                          {JSON.stringify(redactHeaders(selectedLog.responseHeaders, false), null, 2)}
                        </pre>
                      </div>
                      {selectedLog.responseBody && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 mb-1">BODY</p>
                          <pre className="text-xs bg-slate-950 p-4 rounded-xl theme-text-secondary whitespace-pre-wrap border border-slate-800 max-h-[300px] overflow-y-auto">
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