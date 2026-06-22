import React, { useState, useEffect } from 'react';
import { API_BASE } from './utils/config';

export default function ServersView({ 
  onBack, onSubViewChange, t, 
  monitoringMock, setMonitoringMock, 
  isEditing, setIsEditing, 
  currentMock, setCurrentMock, 
  fetchMocksExternal,
  embedded = false
}) {
  const [mocks, setMocks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (isEditing || monitoringMock) {
      onSubViewChange?.(true, () => {
        setIsEditing(false);
        setMonitoringMock(null);
        setLogs([]);
        setSelectedLog(null);
      });
    } else {
      onSubViewChange?.(false, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, !!monitoringMock]);

  useEffect(() => {
    fetchMocks();
  }, []);

  useEffect(() => {
    if (!monitoringMock) return;
    
    const es = new EventSource(`${API_BASE}/mock-stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.mockId === monitoringMock.id) {
        setLogs(prev => [data, ...prev].slice(0, 100));
      }
    };
    return () => {
      es.close();
    };
  }, [monitoringMock]);

  const fetchMocks = async () => {
    try {
      const res = await fetch(`${API_BASE}/manage-mocks`);
      const data = await res.json();
      setMocks(data || []);
    } catch (e) { console.error("Erro ao buscar mocks", e); }
  };

  const toggleMockActive = async (mock) => {
    const updated = { ...mock, active: !mock.active };
    await fetch(`${API_BASE}/manage-mocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    fetchMocks();
  };

  const saveMock = async () => {
    await fetch(`${API_BASE}/manage-mocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentMock)
    });
    setIsEditing(false);
    fetchMocks();
    if (fetchMocksExternal) fetchMocksExternal();
  };

  const deleteMock = async (id) => {
    await fetch(`${API_BASE}/manage-mocks?id=${id}`, { method: 'DELETE' });
    fetchMocks();
    if (fetchMocksExternal) fetchMocksExternal();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (upload) => {
      setCurrentMock({
        ...currentMock,
        response: {
          ...currentMock.response,
          isFile: true,
          fileName: file.name,
          fileContent: upload.target.result.split(',')[1] // Remove o prefixo data:tipo/base64,
        }
      });
    };
    reader.readAsDataURL(file);
  };

  if (monitoringMock) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        {!embedded && (
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 theme-text truncate max-w-md">{t.mocks.monitoring} {monitoringMock.name}</h1>
                <p className="text-xs font-mono text-blue-500">[{monitoringMock.method}] {API_BASE}/mock{monitoringMock.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 ${embedded ? 'gap-4' : 'lg:grid-cols-3 gap-6'}`}>
          <div className={`${embedded ? '' : 'lg:col-span-1'} space-y-3 max-h-[600px] overflow-y-auto pr-2`}>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.mocks.requestsReceived}</h3>
            {logs.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs italic">
                {t.mocks.emptyLogs}
              </div>
            ) : (
              logs.map((log, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-blue-500/50 transition-all ${selectedLog === log ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${log.statusCode >= 400 ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'}`}>
                      {log.statusCode}
                    </span>
                  </div>
                  <div className="text-xs font-bold dark:theme-text truncate">{log.method} {log.url}</div>
                </div>
              ))
            )}
          </div>

          <div className={`${embedded ? '' : 'lg:col-span-2'} bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 min-h-[400px]`}>
            {selectedLog ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h3 className="text-sm font-black text-slate-900 theme-text uppercase tracking-widest">{t.mocks.transactionDetails}</h3>
                  <button onClick={() => setSelectedLog(null)} className="p-1 text-slate-500 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-1">{t.mocks.requestReceived}</h4>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Headers</p>
                      <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-blue-300 overflow-x-auto border border-blue-900/30 font-mono">
                        {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                      </pre>
                    </div>
                    {selectedLog.requestBody && (
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Body</p>
                        <pre className="text-[10px] bg-slate-950 p-3 rounded-xl theme-text-secondary whitespace-pre-wrap border border-slate-800 max-h-[150px] overflow-y-auto font-mono">
                          {selectedLog.requestBody}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-1">{t.mocks.responseSent}</h4>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Status Code</p>
                      <span className={`text-sm font-black ${selectedLog.statusCode >= 400 ? 'text-rose-500' : 'text-emerald-500'}`}>{selectedLog.statusCode}</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Headers</p>
                      <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-emerald-300 overflow-x-auto border border-emerald-900/30 font-mono">
                        {JSON.stringify(selectedLog.responseHeaders, null, 2)}
                      </pre>
                    </div>
                    {selectedLog.responseBody ? (
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Body</p>
                        <pre className="text-[10px] bg-slate-950 p-3 rounded-xl theme-text-secondary whitespace-pre-wrap border border-slate-800 max-h-[300px] overflow-y-auto font-mono">
                          {selectedLog.responseBody}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                         <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                         <span className="text-[10px] font-bold text-blue-500">{t.mocks.fileSent}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic space-y-4 py-20">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
                </div>
                <p className="text-sm">{t.mocks.selectToInspect}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
        <div className={`space-y-6 px-4 ${embedded ? '' : 'bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800'}`}>
          {!embedded && (
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 theme-text">{currentMock?.id ? t.mocks.editTitle : t.mocks.createTitle}</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-white text-2xl">&times;</button>
            </div>
          )}
          <div className="flex gap-4">
            <div className="w-36">
              <label htmlFor="mock-method" className="label-base">{t.config.method}</label>
              <select id="mock-method" className={`input-base !py-3.5 !px-5 font-bold text-base shadow-md rounded-xl cursor-pointer theme-elevated border-[#161E31] ${
                currentMock.method === 'GET' ? 'method-get' : 
                currentMock.method === 'POST' ? 'method-post' : 
                currentMock.method === 'PUT' ? 'method-put' : 
                currentMock.method === 'DELETE' ? 'method-delete' : ''
              }`} value={currentMock.method} onChange={e => setCurrentMock({...currentMock, method: e.target.value})}>
                <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option><option value="ALL">ANY METHOD</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="mock-path" className="label-base">{t.mocks.pathLabel}</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">/mock</span>
                <input className="input-base font-mono" value={currentMock.path} onChange={e => setCurrentMock({...currentMock, path: e.target.value})} placeholder="/users/:id" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1">
                <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest">{t.mocks.simulateResponse}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentMock({...currentMock, response: {...currentMock.response, isFile: false}})}
                    className={`text-[10px] px-2 py-0.5 rounded ${!currentMock.response.isFile ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                  >{t.mocks.typeText}</button>
                  <button 
                    onClick={() => setCurrentMock({...currentMock, response: {...currentMock.response, isFile: true}})}
                    className={`text-[10px] px-2 py-0.5 rounded ${currentMock.response.isFile ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                  >{t.mocks.typeFile}</button>
                </div>
              </div>
              
              <div>
                <label htmlFor="mock-status" className="label-base">{t.mocks.statusLabel}</label>
                <select id="mock-status" className="input-base" value={currentMock.response.status} onChange={e => setCurrentMock({...currentMock, response: {...currentMock.response, status: parseInt(e.target.value)}})}>
                  <optgroup label="1xx - Informational">
                    <option value="100">100 - Continue</option>
                    <option value="101">101 - Switching Protocols</option>
                    <option value="102">102 - Processing</option>
                  </optgroup>
                  <optgroup label="2xx - Success">
                    <option value="200">200 - OK</option>
                    <option value="201">201 - Created</option>
                    <option value="202">202 - Accepted</option>
                    <option value="203">203 - Non-Authoritative Information</option>
                    <option value="204">204 - No Content</option>
                    <option value="206">206 - Partial Content</option>
                  </optgroup>
                  <optgroup label="3xx - Redirection">
                    <option value="301">301 - Moved Permanently</option>
                    <option value="302">302 - Found</option>
                    <option value="303">303 - See Other</option>
                    <option value="304">304 - Not Modified</option>
                    <option value="307">307 - Temporary Redirect</option>
                    <option value="308">308 - Permanent Redirect</option>
                  </optgroup>
                  <optgroup label="4xx - Client Error">
                    <option value="400">400 - Bad Request</option>
                    <option value="401">401 - Unauthorized</option>
                    <option value="403">403 - Forbidden</option>
                    <option value="404">404 - Not Found</option>
                    <option value="405">405 - Method Not Allowed</option>
                    <option value="408">408 - Request Timeout</option>
                    <option value="409">409 - Conflict</option>
                    <option value="410">410 - Gone</option>
                    <option value="413">413 - Payload Too Large</option>
                    <option value="415">415 - Unsupported Media Type</option>
                    <option value="422">422 - Unprocessable Entity</option>
                    <option value="429">429 - Too Many Requests</option>
                  </optgroup>
                  <optgroup label="5xx - Server Error">
                    <option value="500">500 - Internal Server Error</option>
                    <option value="501">501 - Not Implemented</option>
                    <option value="502">502 - Bad Gateway</option>
                    <option value="503">503 - Service Unavailable</option>
                    <option value="504">504 - Gateway Timeout</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label htmlFor="mock-delay" className="label-base">{t.mocks?.delayLabel || 'Response Delay (ms)'}</label>
                <div className="flex items-center gap-2">
                  <input 
                    id="mock-delay"
                    type="number" 
                    min="0" 
                    className="input-base font-mono" 
                    value={currentMock.delay || 0} 
                    onChange={e => setCurrentMock({...currentMock, delay: parseInt(e.target.value) || 0})} 
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="mock-payload" className="label-base">{currentMock.response.isFile ? t.mocks.uploadLabel : t.mocks.bodyLabel}</label>
                {currentMock.response.isFile ? (
                  <div className="space-y-2">
                    <input id="mock-payload" type="file" onChange={handleFileChange} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                    {currentMock.response.fileName && (
                      <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {currentMock.response.fileName} ({t.mocks.readyToServe})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea id="mock-payload" className="input-base font-mono text-xs min-h-[150px]" value={currentMock.response.body} onChange={e => setCurrentMock({...currentMock, response: {...currentMock.response, body: e.target.value}})} />
                    <p className="absolute bottom-2 right-2 text-[9px] text-slate-400 font-mono">{t.mocks.supportsVars}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest">{t.mocks.validationTitle}</h3>
              <p className="text-[10px] text-slate-500">{t.mocks.validationSub}</p>
              {currentMock.assertions.map((a, i) => (
                <div key={i} className="flex gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <select className="input-base !py-1 text-[10px]" value={a.source} onChange={e => {
                    const newA = [...currentMock.assertions]; newA[i].source = e.target.value; setCurrentMock({...currentMock, assertions: newA});
                  }}>
                    <option value="header">Header</option><option value="body">Body</option>
                  </select>
                  <input className="input-base !py-1 text-[10px] font-mono" placeholder={a.source === 'body' ? '$.user.id' : 'Header-Name'} value={a.property} onChange={e => {
                    const newA = [...currentMock.assertions]; newA[i].property = e.target.value; setCurrentMock({...currentMock, assertions: newA});
                  }} />
                  <span className="text-slate-400 font-bold text-[10px]">==</span>
                  <input className="input-base !py-1 text-[10px]" placeholder={t.config?.assertionExpectedPlaceholder || "Valor Esperado"} value={a.target} onChange={e => {
                    const newA = [...currentMock.assertions]; newA[i].target = e.target.value; setCurrentMock({...currentMock, assertions: newA});
                  }} />
                  <button onClick={() => setCurrentMock({...currentMock, assertions: currentMock.assertions.filter((_, idx) => idx !== i)})} className="text-rose-500" title={t.collection?.tooltips?.delete || "Remover"}>×</button>
                </div>
              ))}
              <button 
                onClick={() => setCurrentMock({...currentMock, assertions: [...currentMock.assertions, { source: 'header', property: 'Authorization', operator: '==', target: '' }]})}
                className="text-[10px] font-bold text-blue-500 hover:underline"
              >
                {t.mocks.addValidation}
              </button>
            </div>
          </div>
          {!embedded && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-500 font-bold">{t.common.cancel}</button>
              <button onClick={saveMock} className="px-8 py-2 bg-emerald-600 text-white rounded-xl font-bold uppercase">{t.common.save}</button>
            </div>
          )}
        </div>
    );
  }

  return null; // O dashboard principal agora é a sidebar
}