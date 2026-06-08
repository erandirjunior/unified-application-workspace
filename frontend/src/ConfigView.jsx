import React, { useState, useRef } from 'react';

export default function ConfigView({
  url, setUrl,
  t,
  method, setMethod,
  totalRequests, setTotalRequests,
  duration, setDuration,
  rampUp, setRampUp,
  methodStyles,
  headers, addHeader, removeHeader, updateHeader,
  bodyType, setBodyType,
  bodyRaw, setBodyRaw,
  bodyParams, addBodyParam, removeBodyParam, updateBodyParam,
  authType, setAuthType,
  authToken, setAuthToken, authUsername, setAuthUsername, authPassword, setAuthPassword, apiKeyName, setApiKeyName, apiKeyValue, setApiKeyValue,
  sendRequests,
  assertions = [], setAssertions,
  extractions = [], setExtractions,
  bodyRawDoc, setBodyRawDoc,
  authDoc, setAuthDoc,
  description,
  setDescription,
  updateRequestInCollection,
  activeRequestId,
  isScenarioMode,
  activeWorkflowId,
  isVarsModalOpen,
  setIsVarsModalOpen
}) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHeadersOpen, setIsHeadersOpen] = useState(false);
  const [isBodyOpen, setIsBodyOpen] = useState(false);
  const [isAssertionsOpen, setIsAssertionsOpen] = useState(false);
  const [isExtractionsOpen, setIsExtractionsOpen] = useState(false);
  const [isAuthOpen2, setIsAuthOpen2] = useState(false);
  const [isHeadersOpen2, setIsHeadersOpen2] = useState(false);
  const [isBodyOpen2, setIsBodyOpen2] = useState(false);
  const [isAssertionsOpen2, setIsAssertionsOpen2] = useState(false);

  // Ref para o input de arquivo oculto
  const fileInputRef = useRef(null);
  const [activeParamIndex, setActiveParamIndex] = useState(null);

  const handleFileButtonClick = (index) => {
    setActiveParamIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-[1100px] space-y-4">

      {/* Método e URL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-2 lg:col-span-2">
          <label className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">{t.config.method}</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`input-base !py-3.5 !px-5 font-bold text-base ${methodStyles[method] || ''} shadow-md rounded-xl cursor-pointer bg-[#161E31] border-[#161E31]`}
          >
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-10 lg:col-span-10">
          <label className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">{t.config.url}</label>
          <input
            type="text"
            className="input-base !py-3.5 !px-5 font-mono text-base shadow-md rounded-xl bg-[#161E31] border-[#161E31]"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com"
          />
        </div>
      </div>

      {/* Parâmetros de Carga */}
      {!isScenarioMode && (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-1">{t.config.rps}</label>
            <input type="number" className="input-base !py-3.5 !px-5 text-base font-semibold rounded-xl bg-[#111827] border-[#111827]" value={totalRequests} onChange={(e) => setTotalRequests(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-1">{t.config.duration}</label>
            <input type="number" className="input-base !py-3.5 !px-5 text-base font-semibold rounded-xl bg-[#111827] border-[#111827]" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-1">{t.config.rampUp}</label>
            <input type="number" className="input-base !py-3.5 !px-5 text-base font-semibold rounded-xl bg-[#111827] border-[#111827]" value={rampUp} onChange={(e) => setRampUp(e.target.value)} />
          </div>
        </div>
      )}

      {/* Botão de Variáveis Dinâmicas */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsVarsModalOpen(true)} // This button is for "Ambiente" (Environment)
          className="px-2 bg-[#161E31] text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 transition-colors rounded-xl shadow-md border border-slate-700"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {t.config.variables}
        </button>
      </div>

      {/* Seções Colapsáveis em Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 items-start">
        {[
          // Seção de Autenticação Original
          { id: 'auth', title: t.config.sections.auth, open: isAuthOpen, setOpen: setIsAuthOpen, colSpan: 'col-span-1' }, // Original Auth
          { id: 'headers', title: t.config.sections.headers, open: isHeadersOpen, setOpen: setIsHeadersOpen, colSpan: 'col-span-1' },
          { id: 'body', title: t.config.sections.body, open: isBodyOpen, setOpen: setIsBodyOpen, colSpan: 'col-span-1' },
          { id: 'assertions', title: t.config.sections.assertions, open: isAssertionsOpen, setOpen: setIsAssertionsOpen, color: 'indigo', colSpan: 'col-span-1' },
          { id: 'extractions', title: t.config.sections.extractions, open: isExtractionsOpen, setOpen: setIsExtractionsOpen, color: 'emerald', colSpan: 'col-span-full' }
        ].filter(sec => {
          if (sec.id === 'extractions') return activeWorkflowId;
          // Adiciona a segunda seção de autenticação apenas se a original estiver visível
          if (sec.id === 'auth' && activeWorkflowId) return false; // Hide original auth in workflow mode
          return true;
        }).map((sec) =>
          <div 
            key={sec.id} 
            className={`collapse-card !mb-0 shadow-lg overflow-hidden border border-slate-700 transition-all ${sec.colSpan} ${sec.color === 'indigo' ? 'ring-1 ring-indigo-500/20 border-indigo-500/30' : sec.color === 'emerald' ? 'ring-1 ring-emerald-500/20 border-emerald-500/30' : ''}`}
          >
            <button
              className="collapse-trigger w-full text-left !py-4 px-6 bg-[#161E31] flex justify-between items-center"
              onClick={() => sec.setOpen(!sec.open)}
            >
              <span className={`text-sm font-black uppercase tracking-widest ${sec.color === 'indigo' ? 'text-indigo-400' : sec.color === 'emerald' ? 'text-emerald-400' : sec.isDuplicate ? 'text-purple-400' : 'text-slate-200'}`}>
                {sec.title}
              </span>
                <svg
                  className={`w-3 h-3 transition-transform duration-300 ${
                    sec.open ? 'rotate-180' : ''
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              className={`collapse-content ${
                sec.open ? 'show border-t border-slate-100 dark:border-slate-800' : ''
              }`}
            >
              <div className="collapse-inner">
                <div className={`p-4 ${sec.color === 'indigo' ? 'bg-indigo-950/20' : sec.color === 'emerald' ? 'bg-emerald-950/20' : 'bg-[#111827]'}`}>
                    {sec.id === 'headers' && (
                      <div className="space-y-4">
                        {headers.map((h, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-3 bg-[#161E31] rounded-xl border border-slate-700 shadow-inner animate-in slide-in-from-left-2 duration-200"
                          >
                            <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg bg-[#111827] border-[#111827]" placeholder="Header Key" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} />
                            <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg bg-[#111827] border-[#111827]" placeholder="Value" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} />
                            <button className="text-slate-500 hover:text-rose-500 p-2 transition-colors" onClick={() => removeHeader(i)}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                        <button
                          className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider mt-3"
                          onClick={addHeader}
                        >
                          + ADICIONAR HEADER
                        </button>
                      </div>
                    )}

                  {sec.id === 'body' && (
                    <div className="space-y-4">
                      <select className="input-base !py-3.5 !px-5 text-base font-semibold shadow-md rounded-xl bg-[#161E31] border-[#161E31]" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                        <option value="none">Sem Corpo (None)</option>
                        <option value="json">JSON</option>
                        <option value="form-data">Form Data</option>
                        <option value="xml">XML</option>
                        <option value="text">Texto Simples</option>
                        <option value="form-urlencoded">Form URL Encoded</option>
                        <option value="file">Arquivo Binário</option>
                      </select>

                      {bodyType !== 'none' && !['form-data', 'form-urlencoded'].includes(bodyType) && (
                        <textarea // Simula um editor de código
                          className="input-base font-mono text-sm min-h-[300px] !bg-[#0B1020] !text-emerald-300 border-none shadow-xl p-6 rounded-2xl"
                          placeholder={`Insira o corpo da requisição (${bodyType.toUpperCase()})...`}
                          value={bodyRaw}
                          onChange={(e) => setBodyRaw(e.target.value)}
                        />
                      )}

                      {['form-data', 'form-urlencoded'].includes(bodyType) && (
                        <div className="space-y-4">
                          {bodyParams.map((p, i) => (
                            <div key={i} className="flex gap-3 items-center p-3 bg-[#161E31] rounded-xl border border-slate-700 shadow-inner">
                              {bodyType === 'form-data' && (
                                <div className="flex bg-[#111827] p-1 rounded-xl h-10 w-28 shrink-0 shadow-inner border border-slate-700">
                                  <button onClick={() => updateBodyParam(i, 'type', 'text')} className={`flex-1 text-xs font-black rounded-lg transition-all ${p.type !== 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'}`}>TXT</button>
                                  <button onClick={() => updateBodyParam(i, 'type', 'file')} className={`flex-1 text-xs font-black rounded-lg transition-all ${p.type === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'}`}>FILE</button>
                                </div>
                              )} 
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg bg-[#111827] border-[#111827] shadow-inner" placeholder="Key" value={p.key} onChange={(e) => updateBodyParam(i, 'key', e.target.value)} />
                              <div className="flex-1 flex gap-2">
                                <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg bg-[#111827] border-[#111827] shadow-inner" placeholder={p.type === 'file' ? "@caminho/do/arquivo" : "Value"} value={p.value} onChange={(e) => updateBodyParam(i, 'value', e.target.value)} />
                                {p.type === 'file' && ( // Botão de seleção de arquivo
                                  <button onClick={() => handleFileButtonClick(i)} className="px-4 bg-[#111827] border border-slate-700 rounded-lg hover:bg-blue-900/20 text-blue-500 transition-colors shadow-sm" title="Selecionar arquivo">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                  </button>
                                )}
                              </div>
                              <button onClick={() => removeBodyParam(i)} className="text-slate-500 hover:text-rose-500 p-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                          ))}
                          <input 
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file && activeParamIndex !== null) {
                                updateBodyParam(activeParamIndex, 'value', `@${file.name}`); // This will be sent to backend
                              }
                            }}
                          />

                          <button
                            className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider mt-3"
                            onClick={addBodyParam}
                          >
                            + ADICIONAR PARÂMETRO
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                    {sec.id === 'assertions' && (
                      <div className="space-y-2">
                        {assertions.map((a, i) => ( // Assertions card
                          <div key={i} className="flex flex-col">
                            <div className="flex gap-1">
                              <select className="input-base !py-2.5 !px-4 !w-36 text-sm font-bold rounded-lg bg-[#111827] border-[#111827]" value={a.source} onChange={(e) => { const newA = [...assertions]; newA[i].source = e.target.value; setAssertions(newA); }}>
                                <option value="status">Status Code</option>
                                <option value="body">Body Content</option>
                                <option value="header">Header</option>
                              </select>
                              <select className="input-base !py-2.5 !px-4 !w-32 text-sm font-bold rounded-lg bg-[#111827] border-[#111827]" value={a.operator} onChange={(e) => { const newA = [...assertions]; newA[i].operator = e.target.value; setAssertions(newA); }}>
                                <option value="==">Equals</option>
                                <option value="!=">Not Equals</option>
                                <option value="contains">Contains</option>
                                <option value="exists">Exists</option>
                                <option value="not_exists">Not Exists</option>
                                <option value=">">&gt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<">&lt;</option>
                                <option value="<=">&lt;=</option>
                              </select> 
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg bg-[#111827] border-[#111827] shadow-inner" placeholder={a.source === 'body' ? 'Path (ex: data.id)' : 'Header'} value={a.property} onChange={(e) => { const newA = [...assertions]; newA[i].property = e.target.value; setAssertions(newA); }} />
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg bg-[#111827] border-[#111827] shadow-inner" placeholder={a.operator === 'exists' || a.operator === 'not_exists' ? "N/A" : "Expected"} value={a.target} disabled={a.operator === 'exists' || a.operator === 'not_exists'} onChange={(e) => { const newA = [...assertions]; newA[i].target = e.target.value; setAssertions(newA); }} />
                              <button onClick={() => setAssertions(assertions.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-rose-500 p-2 ml-auto">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setAssertions([...assertions, { source: 'status', property: '', operator: '==', target: '200' }])} className="text-sm font-bold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-wider">+ ADICIONAR ASSERÇÃO</button>
                      </div>
                    )}

                    {sec.id === 'extractions' && (
                      <div className="space-y-4">
                        {extractions.map((ex, i) => ( // Extractions card
                          <div key={i} className="flex flex-col gap-3 p-3 bg-[#161E31] rounded-xl border border-slate-700 shadow-inner">
                            <div className="flex gap-3">
                              <select className="input-base !py-2.5 !px-4 !w-36 text-sm font-bold rounded-lg bg-[#111827] border-[#111827]" value={ex.source} onChange={(e) => { const newE = [...extractions]; newE[i].source = e.target.value; setExtractions(newE); }}>
                                <option value="body">Body</option>
                                <option value="header">Header</option>
                              </select>
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg bg-[#111827] border-[#111827]" placeholder={ex.source === 'body' ? 'Path (ex: token)' : 'Header'} value={ex.property} onChange={(e) => { const newE = [...extractions]; newE[i].property = e.target.value; setExtractions(newE); }} />
                              <button onClick={() => setExtractions(extractions.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-rose-500 p-2 ml-auto">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <div className="flex gap-3 items-center">
                              <span className="text-xs font-bold text-slate-400 uppercase">Salvar em:</span>
                              <input className="input-base !py-2.5 !px-4 font-mono text-emerald-400 text-sm flex-1 rounded-lg bg-[#111827] border-[#111827]" placeholder="Nome da Variável" value={ex.varName} onChange={(e) => { const newE = [...extractions]; newE[i].varName = e.target.value; setExtractions(newE); }} />
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setExtractions([...extractions, { source: 'body', property: '', varName: 'my_var' }])} className="text-sm font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-wider">+ ADICIONAR EXTRAÇÃO</button>
                      </div>
                    )}

                    {sec.id === 'auth' && (
                      <div className="space-y-4">
                        <select className="input-base !py-3.5 !px-5 text-base font-bold rounded-xl shadow-md bg-[#161E31] border-[#161E31]" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                          <option value="none">No Authentication</option>
                          <option value="bearer">Bearer Token</option>
                          <option value="basic">Basic Auth</option>
                          <option value="apikey">API Key</option>
                        </select>
                        <textarea className="input-base text-sm min-h-[80px] mt-2 rounded-xl shadow-inner bg-[#111827] border-[#111827]" placeholder="Auth Description (optional)" value={authDoc} onChange={(e) => setAuthDoc(e.target.value)} />
                        
                        {authType === 'bearer' && (
                          <input className="input-base !py-3.5 !px-5 text-base font-mono rounded-xl shadow-inner bg-[#111827] border-[#111827]" placeholder="Token (suporta {{vars}})" value={authToken || ''} onChange={(e) => setAuthToken(e.target.value)} />
                        )}
                        {authType === 'basic' && (
                          <div className="grid grid-cols-2 gap-3">
                            <input className="input-base !py-3.5 !px-5 text-base rounded-xl shadow-inner bg-[#111827] border-[#111827]" placeholder="Username" value={authUsername || ''} onChange={(e) => setAuthUsername(e.target.value)} />
                            <input className="input-base !py-3.5 !px-5 text-base rounded-xl shadow-inner bg-[#111827] border-[#111827]" type="password" placeholder="Password" value={authPassword || ''} onChange={(e) => setAuthPassword(e.target.value)} />
                          </div>
                        )}
                        {authType === 'apikey' && (
                          <div className="grid grid-cols-2 gap-2">
                            <input className="input-base !py-3.5 !px-5 text-base font-mono rounded-xl bg-[#111827] border-[#111827]" placeholder="Key (ex: X-API-Key)" value={apiKeyName || ''} onChange={(e) => setApiKeyName(e.target.value)} />
                            <input className="input-base !py-3.5 !px-5 text-base font-mono rounded-xl bg-[#111827] border-[#111827]" placeholder="Value" value={apiKeyValue || ''} onChange={(e) => setApiKeyValue(e.target.value)} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>

      {/* Modal de Variáveis Dinâmicas */}
      {isVarsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className="bg-[#111827] rounded-3xl w-full max-w-2xl shadow-2xl border border-[#161E31] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#161E31]">
              <h3 className="text-lg font-bold dark:text-white">{t.config.dynamicVars.title}</h3>
              <button onClick={() => setIsVarsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <p className="text-xs text-slate-500">{t.config.dynamicVars.usage}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[{ v: 'uuid', d: t.config.dynamicVars.uuid }, { v: 'timestamp', d: t.config.dynamicVars.timestamp }, { v: 'int:min:max', d: t.config.dynamicVars.int }, { v: 'float:min:max', d: t.config.dynamicVars.float }, { v: 'string:len', d: t.config.dynamicVars.string }, { v: 'name', d: t.config.dynamicVars.name }].map((item, i) => ( // Dynamic variables list
                  <div key={i} className="p-3 bg-[#161E31] border border-slate-700 rounded-xl">
                    <code className="text-blue-600 dark:text-blue-400 font-bold block text-xs">{`{{${item.v}}}`}</code>
                    <span className="text-[10px] text-slate-500">{item.d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-[#161E31] border-t border-slate-700 flex justify-end">
              <button onClick={() => setIsVarsModalOpen(false)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm">{t.config.done}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}