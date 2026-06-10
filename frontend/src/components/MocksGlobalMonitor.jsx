import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL;

export default function MocksGlobalMonitor({ t, mocks: mocksProp, collection, fetchMocksList, handleSaveMock, onClose }) {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filterMockId, setFilterMockId] = useState('all');
  const [isConnected, setIsConnected] = useState(false);
  const [backendMocks, setBackendMocks] = useState([]);
  const esRef = useRef(null);

  // Extrai mocks das pastas locais da coleção (recursivo)
  const extractLocalMocks = (items) => {
    let result = [];
    if (!items) return result;
    items.forEach(item => {
      if (item.type === 'folder') {
        result = [...result, ...extractLocalMocks(item.requests || [])];
      } else if (item.id && item.path) {
        result.push(item);
      }
    });
    return result;
  };

  // Combina mocks do backend com mocks locais (sem duplicatas)
  const getAllMocks = () => {
    const localMocks = extractLocalMocks(collection?.mockFolders || []);
    const backendIds = new Set(backendMocks.map(m => m.id));
    const localOnly = localMocks.filter(m => !backendIds.has(m.id));
    return [...backendMocks, ...localOnly];
  };

  const mocks = getAllMocks();
  const activeMocks = mocks.filter(m => m.active);

  // Busca mocks do backend ao montar
  useEffect(() => {
    const fetchMocks = async () => {
      try {
        const res = await fetch(`${API_BASE}/manage-mocks`);
        const data = await res.json();
        setBackendMocks(data || []);
      } catch (e) {
        console.error('Error fetching mocks:', e);
      }
    };
    fetchMocks();
  }, []);

  // Sincroniza quando a prop muda
  useEffect(() => {
    if (mocksProp && mocksProp.length > 0) {
      setBackendMocks(mocksProp);
    }
  }, [mocksProp]);

  useEffect(() => {
    // Conecta ao stream global de mocks
    const es = new EventSource(`${API_BASE}/mock-stream`);
    esRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLogs(prev => [data, ...prev].slice(0, 200));
      } catch (err) {
        console.error('Error parsing mock stream:', err);
      }
    };
    es.onerror = () => setIsConnected(false);

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const refreshMocks = async () => {
    try {
      const res = await fetch(`${API_BASE}/manage-mocks`);
      const data = await res.json();
      setBackendMocks(data || []);
      if (fetchMocksList) fetchMocksList();
    } catch (e) {}
  };

  const activateAll = async () => {
    for (const mock of mocks) {
      if (!mock.active) {
        await fetch(`${API_BASE}/manage-mocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mock, active: true })
        });
      }
    }
    refreshMocks();
  };

  const deactivateAll = async () => {
    for (const mock of mocks) {
      if (mock.active) {
        await fetch(`${API_BASE}/manage-mocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mock, active: false })
        });
      }
    }
    refreshMocks();
    setLogs([]);
  };

  const toggleMock = async (mock) => {
    // Registra/atualiza o mock no backend (necessário caso seja um mock local que nunca foi salvo)
    await fetch(`${API_BASE}/manage-mocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mock, active: !mock.active })
    });
    refreshMocks();
  };

  const getMockName = (mockId) => {
    const mock = mocks.find(m => m.id === mockId);
    return mock?.name || 'Unknown';
  };

  const getMockMethod = (mockId) => {
    const mock = mocks.find(m => m.id === mockId);
    return mock?.method || '???';
  };

  const filteredLogs = filterMockId === 'all' ? logs : logs.filter(l => l.mockId === filterMockId);

  const methodColors = {
    GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    POST: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    ALL: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 border-b theme-border theme-elevated flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></span>
          <h2 className="text-xs font-black text-white uppercase tracking-widest">Mock Server Monitor</h2>
          <span className="text-[9px] text-slate-500 font-mono">{activeMocks.length} ativo{activeMocks.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={activateAll}
            className="px-3 py-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-wider"
          >
            Ativar Todos
          </button>
          <button
            onClick={deactivateAll}
            className="px-3 py-1.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500 hover:text-white transition-all uppercase tracking-wider"
          >
            Parar Todos
          </button>
          <button
            onClick={() => setLogs([])}
            className="px-3 py-1.5 text-[9px] font-bold text-slate-400 bg-white/5 border theme-border rounded-lg hover:text-white transition-all uppercase tracking-wider"
          >
            Limpar
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Mocks ativos + Feed */}
        <div className="w-80 border-r theme-border flex flex-col shrink-0">
          {/* Lista de mocks com toggles */}
          <div className="p-3 border-b theme-border space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Endpoints Registrados</h3>
            {mocks.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic">Nenhum mock registrado</p>
            ) : mocks.map(mock => (
              <div key={mock.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <button
                  onClick={() => toggleMock(mock)}
                  className={`w-8 h-4 rounded-full transition-all relative shrink-0 ${mock.active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow ${mock.active ? 'left-4.5' : 'left-0.5'}`} style={{ left: mock.active ? '18px' : '2px' }}></span>
                </button>
                <span className={`text-[8px] font-black px-1 py-0.5 rounded border shrink-0 ${methodColors[mock.method] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                  {mock.method}
                </span>
                <span className="text-[10px] font-medium text-slate-400 truncate flex-1" title={mock.path}>{mock.name}</span>
              </div>
            ))}
          </div>

          {/* Filtro */}
          <div className="p-3 border-b theme-border">
            <select
              value={filterMockId}
              onChange={(e) => setFilterMockId(e.target.value)}
              className="input-base !py-1.5 text-[10px] font-bold"
            >
              <option value="all">Todos os Mocks</option>
              {mocks.map(m => (
                <option key={m.id} value={m.id}>[{m.method}] {m.name}</option>
              ))}
            </select>
          </div>

          {/* Feed de Logs */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3 py-12">
                <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <p className="text-[10px] italic">Aguardando requests...</p>
              </div>
            ) : filteredLogs.map((log, i) => (
              <div
                key={i}
                onClick={() => setSelectedLog(log)}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                  selectedLog === log ? 'border-blue-500/50 bg-blue-500/10' : 'border-transparent hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[8px] font-mono text-slate-600">{log.timestamp}</span>
                  <span className={`text-[8px] font-black px-1 rounded ${log.statusCode >= 400 ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                    {log.statusCode}
                  </span>
                  <span className="text-[8px] font-bold text-slate-600 truncate flex-1">{getMockName(log.mockId)}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">{log.method} {log.url}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Painel Direito: Detalhes da transação */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {selectedLog ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b theme-border pb-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">{t.mocks?.transactionDetails || 'Detalhes da Transação'}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">{selectedLog.timestamp} • {getMockName(selectedLog.mockId)}</p>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-500/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-1">Request Recebido</h4>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${methodColors[selectedLog.method] || ''}`}>{selectedLog.method}</span>
                      <span className="text-xs font-mono text-slate-300">{selectedLog.url}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Headers</p>
                    <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-blue-300 overflow-x-auto border border-blue-900/30 font-mono max-h-40 overflow-y-auto">
                      {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                    </pre>
                  </div>
                  {selectedLog.requestBody && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Body</p>
                      <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-slate-300 whitespace-pre-wrap border border-slate-800 max-h-48 overflow-y-auto font-mono">
                        {selectedLog.requestBody}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Response */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-500/20 pb-1">Response Enviado</h4>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Status</p>
                    <span className={`text-lg font-black ${selectedLog.statusCode >= 400 ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedLog.statusCode}</span>
                  </div>
                  {selectedLog.responseHeaders && Object.keys(selectedLog.responseHeaders).length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Headers</p>
                      <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-emerald-300 overflow-x-auto border border-emerald-900/30 font-mono max-h-40 overflow-y-auto">
                        {JSON.stringify(selectedLog.responseHeaders, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.responseBody ? (
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Body</p>
                      <pre className="text-[10px] bg-slate-950 p-3 rounded-xl text-slate-300 whitespace-pre-wrap border border-slate-800 max-h-64 overflow-y-auto font-mono">
                        {selectedLog.responseBody}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                      <span className="text-[10px] font-bold text-blue-400">Arquivo binário enviado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c3.55 0 6.715 1.85 8.711 4.673l.036.052a2 2 0 010 2.274l-.036.052C18.715 17.15 15.55 19 12 19c-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <p className="text-sm font-medium">Selecione um log para inspecionar</p>
              <p className="text-xs text-slate-600">Clique em uma requisição à esquerda para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
