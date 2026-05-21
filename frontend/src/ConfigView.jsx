import React from 'react';

export default function ConfigView({
  url, setUrl,
  method, setMethod,
  threads, setThreads,
  duration, setDuration,
  rampUp, setRampUp,
  methodStyles,
  isHeadersOpen, setIsHeadersOpen,
  isBodyOpen, setIsBodyOpen,
  isAuthOpen, setIsAuthOpen,
  headers, addHeader, removeHeader, updateHeader,
  bodyType, setBodyType,
  bodyRaw, setBodyRaw,
  bodyParams, addBodyParam, removeBodyParam, updateBodyParam,
  authType, setAuthType,
  sendRequests,
  bodyRawDoc, setBodyRawDoc,
  authDoc, setAuthDoc,
  description,
  setDescription,
  isDescriptionOpen,
  setIsDescriptionOpen,
  updateRequestInCollection,
  activeRequestId,
  isVarsModalOpen,
  setIsVarsModalOpen
}) {
  return (
    <div className="animate-in fade-in duration-500">

      <div className="grid gap-4 mb-6 bg-slate-50/50 dark:bg-slate-900/30">
        <textarea 
        className="input-base min-h-[100px] font-sans text-sm" 
        placeholder="Adicione uma descrição detalhada para explicar o propósito desta requisição..."
        value={description} 
        onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-3">
          <label className="label-base">Method</label>
          <select 
            value={method} 
            onChange={(e) => setMethod(e.target.value)}
            className={`input-base font-bold ${methodStyles[method] || ''}`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div className="md:col-span-9">
          <div className="flex justify-between items-end">
            <label className="label-base">URL</label>
            
          </div>
          <input type="text" className="input-base" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div><label className="label-base">Threads</label><input type="number" className="input-base" value={threads} onChange={(e) => setThreads(e.target.value)} /></div>
        <div><label className="label-base">Duration</label><input type="number" className="input-base" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
        <div><label className="label-base">Ramp-up</label><input type="number" className="input-base" value={rampUp} onChange={(e) => setRampUp(e.target.value)} /></div>
      </div>
      <div className="flex justify-end">
          <button 
              onClick={() => setIsVarsModalOpen(true)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-1"
          >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Variáveis
          </button>
      </div>
      {/* Sections */}
      {[
        { id: 'auth', title: 'Authentication', open: isAuthOpen, setOpen: setIsAuthOpen },
        { id: 'headers', title: 'Headers', open: isHeadersOpen, setOpen: setIsHeadersOpen },
        { id: 'body', title: 'Request Body', open: isBodyOpen, setOpen: setIsBodyOpen }
      ].map((sec) => (
        
        <div key={sec.id} className="collapse-card">
          <button className="collapse-trigger w-full text-left" onClick={() => sec.setOpen(!sec.open)}>
            <span className="text-slate-900 dark:text-slate-50 font-bold">{sec.title}</span>
            <svg className={`w-4 h-4 transition-transform duration-300 ${sec.open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div className={`collapse-content ${sec.open ? 'show border-t border-slate-100 dark:border-slate-800' : ''}`}>
            <div className="collapse-inner">
              <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30">
                {sec.id === 'headers' && (
                  <div className="space-y-3">
                    {headers.map((h, i) => (
                      <div key={i} className="flex flex-col gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex gap-2">
                          <input className="input-base flex-1" placeholder="Header Key" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} />
                          <input className="input-base flex-1" placeholder="Header Value" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} />
                          <button className="text-rose-500 p-2" onClick={() => removeHeader(i)}>×</button>
                        </div>
                      </div>
                    ))}
                    <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline" onClick={addHeader}>+ ADD HEADER</button>
                  </div>
                )}
                {sec.id === 'body' && (
                  <div className="space-y-4">
                    <select className="input-base" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                      <option value="none">None</option>
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="text">Text/Plain</option>
                      <option value="form-data">Form Data</option>
                      <option value="urlencoded">Form URL Encoded</option>
                    </select>
                    {['json', 'xml', 'text'].includes(bodyType) && (
                      <>
                        <textarea className="input-base min-h-[150px] font-mono text-xs" value={bodyRaw} onChange={(e) => setBodyRaw(e.target.value)} placeholder={`Paste ${bodyType.toUpperCase()} content here...`} />
                      </>
                    )}
                    {bodyType === 'form-data' && (
                      <div className="space-y-3">
                        {bodyParams.map((p, i) => (
                          <div key={i} className="flex flex-col gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex gap-2 items-center">
                              <input className="input-base flex-1" placeholder="Key" value={p.key} onChange={(e) => updateBodyParam(i, 'key', e.target.value)} />
                              <select className="input-base !w-24 text-[10px]" value={p.type} onChange={(e) => updateBodyParam(i, 'type', e.target.value)}><option value="text">TEXT</option><option value="file">FILE</option></select>
                              {p.type === 'file' ? <input type="file" className="file-input-custom flex-1" onChange={(e) => updateBodyParam(i, 'value', e.target.files[0])} /> : <input className="input-base flex-1" placeholder="Value" value={p.value} onChange={(e) => updateBodyParam(i, 'value', e.target.value)} />}
                              <button className="text-rose-500 p-2" onClick={() => removeBodyParam(i)}>×</button>
                            </div>
                            <textarea className="input-base text-xs min-h-[60px]" placeholder="Descrição do Parâmetro (opcional)" value={p.docDescription} onChange={(e) => updateBodyParam(i, 'docDescription', e.target.value)} />
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <input type="checkbox" checked={p.docRequired} onChange={(e) => updateBodyParam(i, 'docRequired', e.target.checked)} className="form-checkbox" />
                                Obrigatório
                              </label>
                              <input className="input-base flex-1 text-xs" placeholder="Exemplo (opcional)" value={p.docExample} onChange={(e) => updateBodyParam(i, 'docExample', e.target.value)} />
                            </div>
                          </div>
                        ))}
                        <button className="text-xs font-bold text-blue-600 dark:text-blue-400" onClick={addBodyParam}>+ ADD PARAMETER</button>
                      </div>
                    )}
                    {bodyType === 'urlencoded' && (
                      <div className="space-y-3">
                        {bodyParams.map((p, i) => (
                          <div key={i} className="flex flex-col gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex gap-2 items-center">
                              <input className="input-base flex-1" placeholder="Key" value={p.key} onChange={(e) => updateBodyParam(i, 'key', e.target.value)} />
                              <input className="input-base flex-1" placeholder="Value" value={p.value} onChange={(e) => updateBodyParam(i, 'value', e.target.value)} />
                              <button className="text-rose-500 p-2" onClick={() => removeBodyParam(i)}>×</button>
                            </div>
                            <textarea className="input-base text-xs min-h-[60px]" placeholder="Descrição do Parâmetro (opcional)" value={p.docDescription} onChange={(e) => updateBodyParam(i, 'docDescription', e.target.value)} />
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <input type="checkbox" checked={p.docRequired} onChange={(e) => updateBodyParam(i, 'docRequired', e.target.checked)} className="form-checkbox" />
                                Obrigatório
                              </label>
                              <input className="input-base flex-1 text-xs" placeholder="Exemplo (opcional)" value={p.docExample} onChange={(e) => updateBodyParam(i, 'docExample', e.target.value)} />
                            </div>
                          </div>
                        ))}
                        <button className="text-xs font-bold text-blue-600 dark:text-blue-400" onClick={addBodyParam}>+ ADD PARAMETER</button>
                      </div>
                    )}
                  </div>
                )}
                {sec.id === 'auth' && (
                  <div className="space-y-4">
                    <select className="input-base" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                      <option value="none">No Authentication</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </select>
                    <textarea className="input-base text-xs min-h-[80px] mt-2" placeholder="Descrição da Autenticação (opcional)" value={authDoc} onChange={(e) => setAuthDoc(e.target.value)} />
                    {authType === 'bearer' && <input className="input-base" placeholder="Token" />}
                    {authType === 'basic' && <div className="grid grid-cols-2 gap-2"><input className="input-base" placeholder="Username" /><input className="input-base" type="password" placeholder="Password" /></div>}
                    {authType === 'apikey' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input-base" placeholder="Key (ex: X-API-Key)" />
                        <input className="input-base" placeholder="Value" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Modal de Variáveis Dinâmicas - Movido para ConfigView */}
      {isVarsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Variáveis Dinâmicas</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Gere dados aleatórios em tempo real</p>
                </div>
              </div>
              <button onClick={() => setIsVarsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 text-2xl">&times;</button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Utilize a sintaxe <code className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">{`{{variavel}}`}</code> em qualquer campo. O backend processará os valores únicos antes de cada disparo.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { v: 'uuid', d: 'UUID v4 único por requisição' },
                  { v: 'timestamp', d: 'Unix Epoch (segundos)' },
                  { v: 'int:min:max', d: 'Inteiro (Ex: {{int:10:50}})' },
                  { v: 'float:min:max', d: 'Float (Ex: {{float:1.5:5}})' },
                  { v: 'string:len', d: 'String (Ex: {{string:16}})' },
                  { v: 'name', d: 'Nome aleatório real' },
                  { v: 'tel:MASK', d: 'Tel (Ex: {{tel:(##) ####-####}})' },
                  { v: 'datetime:FORMAT', d: 'Data (Ex: YYYY-MM-DD)' },
                  { v: 'time:HH', d: 'Hora (Ex: HH:mm)' },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl hover:border-blue-500/30 transition-colors group">
                    <code className="text-blue-600 dark:text-blue-400 font-bold block mb-1 group-hover:scale-105 transition-transform origin-left">{`{{${item.v}}}`}</code>
                    <span className="text-[11px] text-slate-500 dark:text-slate-500">{item.d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setIsVarsModalOpen(false)}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-4 mt-6">
        {activeRequestId && (
          <button 
            onClick={() => updateRequestInCollection()}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Atualizar Request
          </button>
        )}
        
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all" onClick={() => sendRequests()}>
          RUN REQUESTS
        </button>
      </div>
    </div>
  );
}