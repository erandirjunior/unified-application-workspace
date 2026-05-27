import React, { useState, useEffect } from 'react';

export default function ServersView({ onBack, onSubViewChange }) {
  const [mocks, setMocks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [monitoringMock, setMonitoringMock] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentMock, setCurrentMock] = useState({
    name: '', path: '/', method: 'GET',
    response: { status: 200, body: '{}', headers: { 'Content-Type': 'application/json' }, isFile: false, fileName: '', fileContent: '' }, active: false,
    assertions: []
  });

  const API_BASE = "http://localhost:8080";

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
  };

  const deleteMock = async (id) => {
    await fetch(`${API_BASE}/manage-mocks?id=${id}`, { method: 'DELETE' });
    fetchMocks();
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
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate max-w-md">Monitoring: {monitoringMock.name}</h1>
              <p className="text-xs font-mono text-blue-500">[{monitoringMock.method}] http://localhost:8080/mock{monitoringMock.path}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Monitoring</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Requests Recebidas</h3>
            {logs.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs italic">
                Aguardando chamadas ao endpoint...
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
                  <div className="text-xs font-bold dark:text-slate-200 truncate">{log.method} {log.url}</div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 min-h-[400px]">
            {selectedLog ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Detalhes da Transação</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-1">Request Recebida</h4>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Headers</p>
                      <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-blue-300 overflow-x-auto border border-blue-900/30 font-mono">
                        {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                      </pre>
                    </div>
                    {selectedLog.requestBody && (
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Body</p>
                        <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-slate-300 whitespace-pre-wrap border border-slate-800 max-h-[150px] overflow-y-auto font-mono">
                          {selectedLog.requestBody}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-1">Resposta Enviada</h4>
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
                        <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-slate-300 whitespace-pre-wrap border border-slate-800 max-h-[300px] overflow-y-auto font-mono">
                          {selectedLog.responseBody}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                         <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                         <span className="text-[10px] font-bold text-blue-500">Arquivo Enviado</span>
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
                <p className="text-sm">Selecione uma requisição ao lado para inspecionar os detalhes da carga.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{isEditing ? (currentMock.id ? 'Editar Mock' : 'Novo Mock') : 'Mock Servers'}</h2>
        </div>
        {!isEditing && (
          <button 
            onClick={() => {
              setCurrentMock({ name: 'Novo Mock', path: '/api/v1/resource', method: 'GET', response: { status: 200, body: '{}', headers: { 'Content-Type': 'application/json' } }, assertions: [] });
              setIsEditing(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20"
          >
            + Criar Endpoint
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label-base">Nome Amigável</label>
              <input className="input-base" value={currentMock.name} onChange={e => setCurrentMock({...currentMock, name: e.target.value})} />
            </div>
            <div>
              <label className="label-base">Método</label>
              <select className="input-base" value={currentMock.method} onChange={e => setCurrentMock({...currentMock, method: e.target.value})}>
                <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option><option value="ALL">ANY METHOD</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="label-base">Path (use :param para dinâmico)</label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">/mock</span>
              <input className="input-base font-mono" value={currentMock.path} onChange={e => setCurrentMock({...currentMock, path: e.target.value})} placeholder="/users/:id" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1">
                <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest">Simular Resposta</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentMock({...currentMock, response: {...currentMock.response, isFile: false}})}
                    className={`text-[10px] px-2 py-0.5 rounded ${!currentMock.response.isFile ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                  >TEXTO/JSON</button>
                  <button 
                    onClick={() => setCurrentMock({...currentMock, response: {...currentMock.response, isFile: true}})}
                    className={`text-[10px] px-2 py-0.5 rounded ${currentMock.response.isFile ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                  >ARQUIVO</button>
                </div>
              </div>
              
              <div>
                <label className="label-base">HTTP Status</label>
                <input type="number" className="input-base" value={currentMock.response.status} onChange={e => setCurrentMock({...currentMock, response: {...currentMock.response, status: parseInt(e.target.value)}})} />
              </div>

              <div>
                <label className="label-base">{currentMock.response.isFile ? 'Upload do Arquivo' : 'Response Body (JSON/XML/Text)'}</label>
                {currentMock.response.isFile ? (
                  <div className="space-y-2">
                    <input type="file" onChange={handleFileChange} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                    {currentMock.response.fileName && (
                      <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {currentMock.response.fileName} (Pronto para servir)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea className="input-base font-mono text-xs min-h-[150px]" value={currentMock.response.body} onChange={e => setCurrentMock({...currentMock, response: {...currentMock.response, body: e.target.value}})} />
                    <p className="absolute bottom-2 right-2 text-[9px] text-slate-400 font-mono">Suporta {'{{variáveis}}'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest">Validar Entrada (Guard)</h3>
              <p className="text-[10px] text-slate-500">Se a requisição não atender a estes critérios, o servidor retornará 400 Bad Request.</p>
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
                  <input className="input-base !py-1 text-[10px]" placeholder="Valor Esperado" value={a.target} onChange={e => {
                    const newA = [...currentMock.assertions]; newA[i].target = e.target.value; setCurrentMock({...currentMock, assertions: newA});
                  }} />
                  <button onClick={() => setCurrentMock({...currentMock, assertions: currentMock.assertions.filter((_, idx) => idx !== i)})} className="text-rose-500">×</button>
                </div>
              ))}
              <button 
                onClick={() => setCurrentMock({...currentMock, assertions: [...currentMock.assertions, { source: 'header', property: 'Authorization', operator: '==', target: '' }]})}
                className="text-[10px] font-bold text-blue-500 hover:underline"
              >
                + Add Validação
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
            <button onClick={saveMock} className="px-8 py-2 bg-emerald-600 text-white rounded-xl font-bold">Salvar Mock</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {mocks.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-slate-400">
              Nenhum servidor mockado. Crie um para começar a simular APIs.
            </div>
          ) : (
            mocks.map(m => (
              <div key={m.id} className={`p-6 bg-white dark:bg-slate-800/40 border rounded-3xl flex justify-between items-center group transition-all ${m.active ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'}`}>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border block mb-1 ${
                      m.method === 'GET' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-blue-500 border-blue-500/20 bg-blue-500/5'
                    }`}>
                      {m.method}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{m.response.status}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {m.active && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                      <h3 className={`font-bold ${m.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{m.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-500 font-mono">http://localhost:8080/mock{m.path}</code>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(`http://localhost:8080/mock${m.path}`); alert("URL copiada!"); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 hover:text-blue-500"
                      >
                        Copiar URL
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleMockActive(m)}
                    className={`p-2 rounded-xl transition-all ${m.active ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}
                    title={m.active ? "Parar Servidor" : "Iniciar Servidor"}
                  >
                    {m.active ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <button 
                    onClick={() => { setMonitoringMock(m); setLogs([]); }}
                    className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
                    title="Monitorar Tráfego"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  </button>
                  <button 
                    onClick={() => { setCurrentMock(m); setIsEditing(true); }}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button 
                    onClick={() => deleteMock(m.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}