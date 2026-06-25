import React, { useState, useRef } from 'react';

export default function ConfigView({
  url, setUrl,
  t,
  method, setMethod,
  totalRequests, setTotalRequests,
  duration, setDuration,
  rampUp, setRampUp,
  captureBody, setCaptureBody,
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
            className={`input-base !py-3.5 !px-5 font-bold text-base ${methodStyles[method] || ''} shadow-md rounded-xl cursor-pointer theme-elevated`}
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
            className="input-base !py-3.5 !px-5 font-mono text-base shadow-md rounded-xl theme-elevated"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com"
          />
        </div>
      </div>

      {/* Parâmetros de Carga */}
      {!isScenarioMode && (
        <>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-1">{t.config.rps}</label>
            <input type="number" min="0" className="input-base !py-3.5 !px-5 text-base font-semibold rounded-xl theme-surface" value={totalRequests} onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setTotalRequests(v); }} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-1">{t.config.duration}</label>
            <input type="number" min="0" className="input-base !py-3.5 !px-5 text-base font-semibold rounded-xl theme-surface" value={duration} onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setDuration(v); }} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-1">{t.config.rampUp}</label>
            <input type="number" min="0" className="input-base !py-3.5 !px-5 text-base font-semibold rounded-xl theme-surface" value={rampUp} onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setRampUp(v); }} />
          </div>
        </div>
        {setCaptureBody && (
          <label className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl cursor-pointer hover:border-blue-500/50 transition-all mt-4">
            <input type="checkbox" checked={!!captureBody} onChange={(e) => setCaptureBody(e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500" />
            <div>
              <span className="text-xs font-bold theme-text">{t.config?.captureBody || 'Capturar body da resposta'}</span>
              <p className="text-[10px] text-slate-500">{t.config?.captureBodyDesc || 'Inclui o corpo da resposta nos logs (aumenta uso de memória em testes de carga)'}</p>
            </div>
          </label>
        )}
        </>
      )}

      {/* Botão de Variáveis Dinâmicas */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsVarsModalOpen(true)} // This button is for "Ambiente" (Environment)
          className="px-2 theme-elevated text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 transition-colors rounded-xl shadow-md border theme-border"
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
            className={`collapse-card !mb-0 shadow-lg overflow-hidden border theme-border transition-all ${sec.colSpan} ${sec.color === 'indigo' ? 'ring-1 ring-indigo-500/20 border-indigo-500/30' : sec.color === 'emerald' ? 'ring-1 ring-emerald-500/20 border-emerald-500/30' : ''}`}
          >
            <button
              className="collapse-trigger w-full text-left !py-4 px-6 theme-elevated flex justify-between items-center"
              onClick={() => sec.setOpen(!sec.open)}
            >
              <span className={`text-sm font-black uppercase tracking-widest ${sec.color === 'indigo' ? 'text-indigo-400' : sec.color === 'emerald' ? 'text-emerald-400' : sec.isDuplicate ? 'text-purple-400' : 'theme-text'}`}>
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
                <div className={`p-4 ${sec.color === 'indigo' ? 'bg-indigo-950/20' : sec.color === 'emerald' ? 'bg-emerald-950/20' : 'theme-surface'}`}>
                    {sec.id === 'headers' && (
                      <div className="space-y-4">
                        {headers.map((h, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-3 theme-elevated rounded-xl border theme-border shadow-inner animate-in slide-in-from-left-2 duration-200"
                          >
                            <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg theme-surface" placeholder={t.config.headerKeyPlaceholder} value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} />
                            <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg theme-surface" placeholder={t.config.valuePlaceholder} value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} />
                            <button className="text-slate-500 hover:text-rose-500 p-2 transition-colors" onClick={() => removeHeader(i)}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                        <button
                          className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider mt-3"
                          onClick={addHeader}
                        >
                          {t.config.addHeader}
                        </button>
                      </div>
                    )}

                  {sec.id === 'body' && (
                    <div className="space-y-4">
                      <select className="input-base !py-3.5 !px-5 text-base font-semibold shadow-md rounded-xl theme-elevated" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                        <option value="none">{t.config.bodyTypeNone}</option>
                        <option value="json">{t.config.bodyTypeJson}</option>
                        <option value="form-data">{t.config.bodyTypeFormData}</option>
                        <option value="xml">{t.config.bodyTypeXml}</option>
                        <option value="text">{t.config.bodyTypeText}</option>
                        <option value="form-urlencoded">{t.config.bodyTypeFormUrlEncoded}</option>
                        <option value="file">{t.config.bodyTypeFile}</option>
                      </select>

                      {bodyType !== 'none' && !['form-data', 'form-urlencoded'].includes(bodyType) && (
                        <textarea // Simula um editor de código
                          className="input-base font-mono text-sm min-h-[300px] !theme-base !text-emerald-300 border-none shadow-xl p-6 rounded-2xl"
                          placeholder={t.config.bodyPlaceholder.replace('{type}', bodyType.toUpperCase())}
                          value={bodyRaw}
                          onChange={(e) => setBodyRaw(e.target.value)}
                        />
                      )}

                      {['form-data', 'form-urlencoded'].includes(bodyType) && (
                        <div className="space-y-4">
                          {bodyParams.map((p, i) => (
                            <div key={i} className="flex gap-3 items-center p-3 theme-elevated rounded-xl border theme-border shadow-inner">
                              {bodyType === 'form-data' && (
                                <div className="flex theme-surface p-1 rounded-xl h-10 w-28 shrink-0 shadow-inner border theme-border">
                                  <button onClick={() => updateBodyParam(i, 'type', 'text')} className={`flex-1 text-xs font-black rounded-lg transition-all ${p.type !== 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'}`}>TXT</button>
                                  <button onClick={() => updateBodyParam(i, 'type', 'file')} className={`flex-1 text-xs font-black rounded-lg transition-all ${p.type === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'}`}>FILE</button>
                                </div>
                              )} 
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg theme-surface shadow-inner" placeholder={t.config.keyPlaceholder} value={p.key} onChange={(e) => updateBodyParam(i, 'key', e.target.value)} />
                              <div className="flex-1 flex gap-2">
                                <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg theme-surface shadow-inner" placeholder={p.type === 'file' ? t.config.filePathPlaceholder : t.config.valuePlaceholder} value={p.value} onChange={(e) => updateBodyParam(i, 'value', e.target.value)} />
                                {p.type === 'file' && ( // Botão de seleção de arquivo
                                  <button onClick={() => handleFileButtonClick(i)} className="px-4 theme-surface border theme-border rounded-lg hover:bg-blue-900/20 text-blue-500 transition-colors shadow-sm" title="Selecionar arquivo">
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
                            {t.config.addParam}
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
                              <select className="input-base !py-2.5 !px-4 !w-36 text-sm font-bold rounded-lg theme-surface" value={a.source} onChange={(e) => { const newA = [...assertions]; newA[i].source = e.target.value; setAssertions(newA); }}>
                                <option value="status">{t.config.assertionStatus}</option>
                                <option value="body">{t.config.assertionBody}</option>
                                <option value="header">{t.config.assertionHeader}</option>
                              </select>
                              <select className="input-base !py-2.5 !px-4 !w-32 text-sm font-bold rounded-lg theme-surface" value={a.operator} onChange={(e) => { const newA = [...assertions]; newA[i].operator = e.target.value; setAssertions(newA); }}>
                                <option value="==">{t.config.assertionEquals}</option>
                                <option value="!=">{t.config.assertionNotEquals}</option>
                                <option value="contains">{t.config.assertionContains}</option>
                                <option value="exists">{t.config.assertionExists}</option>
                                <option value="not_exists">{t.config.assertionNotExists}</option>
                                <option value=">">&gt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<">&lt;</option>
                                <option value="<=">&lt;=</option>
                              </select> 
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg theme-surface shadow-inner" placeholder={a.source === 'body' ? t.config.assertionPathPlaceholder : t.config.assertionHeaderPlaceholder} value={a.property} onChange={(e) => { const newA = [...assertions]; newA[i].property = e.target.value; setAssertions(newA); }} />
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg theme-surface shadow-inner" placeholder={a.operator === 'exists' || a.operator === 'not_exists' ? t.config.assertionNa : t.config.assertionExpectedPlaceholder} value={a.target} disabled={a.operator === 'exists' || a.operator === 'not_exists'} onChange={(e) => { const newA = [...assertions]; newA[i].target = e.target.value; setAssertions(newA); }} />
                              <button onClick={() => setAssertions(assertions.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-rose-500 p-2 ml-auto">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setAssertions([...assertions, { source: 'status', property: '', operator: '==', target: '200' }])} className="text-sm font-bold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-wider">{t.config.addAssertion}</button>
                      </div>
                    )}

                    {sec.id === 'extractions' && (
                      <div className="space-y-4">
                        {extractions.map((ex, i) => ( // Extractions card
                          <div key={i} className="flex flex-col gap-3 p-3 theme-elevated rounded-xl border theme-border shadow-inner">
                            <div className="flex gap-3">
                              <select className="input-base !py-2.5 !px-4 !w-36 text-sm font-bold rounded-lg theme-surface" value={ex.source} onChange={(e) => { const newE = [...extractions]; newE[i].source = e.target.value; setExtractions(newE); }}>
                                <option value="body">{t.config.extractionBody}</option>
                                <option value="header">{t.config.extractionHeader}</option>
                              </select>
                              <input className="input-base !py-2.5 !px-4 flex-1 text-sm font-mono rounded-lg theme-surface" placeholder={ex.source === 'body' ? t.config.extractionPathPlaceholder : t.config.extractionHeader} value={ex.property} onChange={(e) => { const newE = [...extractions]; newE[i].property = e.target.value; setExtractions(newE); }} />
                              <button onClick={() => setExtractions(extractions.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-rose-500 p-2 ml-auto">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <div className="flex gap-3 items-center">
                              <span className="text-xs font-bold text-slate-400 uppercase">{t.config.extractionSaveIn}</span>
                              <input className="input-base !py-2.5 !px-4 font-mono text-emerald-400 text-sm flex-1 rounded-lg theme-surface" placeholder={t.config.extractionVarPlaceholder} value={ex.varName} onChange={(e) => { const newE = [...extractions]; newE[i].varName = e.target.value; setExtractions(newE); }} />
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setExtractions([...extractions, { source: 'body', property: '', varName: 'my_var' }])} className="text-sm font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-wider">{t.config.addExtraction}</button>
                      </div>
                    )}

                    {sec.id === 'auth' && (
                      <div className="space-y-4">
                        <select className="input-base !py-3.5 !px-5 text-base font-bold rounded-xl shadow-md theme-elevated" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                          <option value="none">{t.config.authNone}</option>
                          <option value="bearer">{t.config.authBearer}</option>
                          <option value="basic">{t.config.authBasic}</option>
                          <option value="apikey">{t.config.authApiKey}</option>
                        </select>
                        <textarea className="input-base text-sm min-h-[80px] mt-2 rounded-xl shadow-inner theme-surface" placeholder={t.config.authDescPlaceholder} value={authDoc} onChange={(e) => setAuthDoc(e.target.value)} />
                        
                        {authType === 'bearer' && (
                          <input className="input-base !py-3.5 !px-5 text-base font-mono rounded-xl shadow-inner theme-surface" placeholder={t.config.authTokenPlaceholder} value={authToken || ''} onChange={(e) => setAuthToken(e.target.value)} />
                        )}
                        {authType === 'basic' && (
                          <div className="grid grid-cols-2 gap-3">
                            <input className="input-base !py-3.5 !px-5 text-base rounded-xl shadow-inner theme-surface" placeholder={t.config.authUsernamePlaceholder} value={authUsername || ''} onChange={(e) => setAuthUsername(e.target.value)} />
                            <input className="input-base !py-3.5 !px-5 text-base rounded-xl shadow-inner theme-surface" type="password" placeholder={t.config.authPasswordPlaceholder} value={authPassword || ''} onChange={(e) => setAuthPassword(e.target.value)} />
                          </div>
                        )}
                        {authType === 'apikey' && (
                          <div className="grid grid-cols-2 gap-2">
                            <input className="input-base !py-3.5 !px-5 text-base font-mono rounded-xl theme-surface" placeholder={t.config.authApiKeyPlaceholder} value={apiKeyName || ''} onChange={(e) => setApiKeyName(e.target.value)} />
                            <input className="input-base !py-3.5 !px-5 text-base font-mono rounded-xl theme-surface" placeholder={t.config.valuePlaceholder} value={apiKeyValue || ''} onChange={(e) => setApiKeyValue(e.target.value)} />
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
          <div className="theme-surface rounded-3xl w-full max-w-2xl shadow-2xl border border-[#161E31] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b theme-border flex justify-between items-center theme-elevated">
              <h3 className="text-lg font-bold theme-text">{t.config.dynamicVars.title}</h3>
              <button onClick={() => setIsVarsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <p className="text-xs text-slate-500">{t.config.dynamicVars.usage}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[{ v: 'uuid', d: t.config.dynamicVars.uuid }, { v: 'timestamp', d: t.config.dynamicVars.timestamp }, { v: 'int:min:max', d: t.config.dynamicVars.int }, { v: 'float:min:max', d: t.config.dynamicVars.float }, { v: 'string:len', d: t.config.dynamicVars.string }, { v: 'name', d: t.config.dynamicVars.name }].map((item, i) => ( // Dynamic variables list
                  <div key={i} className="p-3 theme-elevated border theme-border rounded-xl">
                    <code className="text-blue-600 dark:text-blue-400 font-bold block text-xs">{`{{${item.v}}}`}</code>
                    <span className="text-[10px] text-slate-500">{item.d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 theme-elevated border-t theme-border flex justify-end">
              <button onClick={() => setIsVarsModalOpen(false)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm">{t.config.done}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}