import React, { useState } from 'react';

export default function ConfigView({
  url, setUrl,
  method, setMethod,
  totalRequests, setTotalRequests,
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
  assertions = [], setAssertions,
  extractions = [], setExtractions,
  bodyRawDoc, setBodyRawDoc,
  authDoc, setAuthDoc,
  description,
  setDescription,
  isDescriptionOpen,
  setIsDescriptionOpen,
  updateRequestInCollection,
  activeRequestId,
  isScenarioMode,
  activeWorkflowId,
  isVarsModalOpen,
  setIsVarsModalOpen
}) {
  const [isAssertionsOpen, setIsAssertionsOpen] = useState(false);
  const [isExtractionsOpen, setIsExtractionsOpen] = useState(false);

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

          <input
            type="text"
            className="input-base"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com"
          />
        </div>
      </div>

      {/* Oculta parâmetros de carga se estivermos em modo Cenário ou Workflow */}
      {!isScenarioMode && !activeWorkflowId && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div>
            <label className="label-base">Requests por Segundo (RPS)</label>
            <input
              type="number"
              className="input-base"
              value={totalRequests}
              onChange={(e) => setTotalRequests(e.target.value)}
            />
          </div>

          <div>
            <label className="label-base">Duration</label>
            <input
              type="number"
              className="input-base"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div>
            <label className="label-base">Ramp-up</label>
            <input
              type="number"
              className="input-base"
              value={rampUp}
              onChange={(e) => setRampUp(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setIsVarsModalOpen(true)}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Variáveis
        </button>
      </div>

      {[
        { id: 'auth', title: 'Authentication', open: isAuthOpen, setOpen: setIsAuthOpen },
        { id: 'headers', title: 'Headers', open: isHeadersOpen, setOpen: setIsHeadersOpen },
        { id: 'body', title: 'Request Body', open: isBodyOpen, setOpen: setIsBodyOpen },
        { id: 'assertions', title: 'Assertions (Validations)', open: isAssertionsOpen, setOpen: setIsAssertionsOpen, color: 'indigo' },
        { id: 'extractions', title: 'Extract to Variable', open: isExtractionsOpen, setOpen: setIsExtractionsOpen, color: 'emerald' }
      ].map((sec) =>
        <div 
          key={sec.id} 
          className={`collapse-card ${sec.color === 'indigo' ? 'border-indigo-500/30' : sec.color === 'emerald' ? 'border-emerald-500/30' : ''}`}
        >

            <button
              className="collapse-trigger w-full text-left"
              onClick={() => sec.setOpen(!sec.open)}
            >
              <span className={`font-bold ${sec.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : sec.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-50'}`}>
                {sec.title}
              </span>

              <svg
                className={`w-4 h-4 transition-transform duration-300 ${
                  sec.open ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div
              className={`collapse-content ${
                sec.open ? 'show border-t border-slate-100 dark:border-slate-800' : ''
              }`}
            >
              <div className="collapse-inner">
                <div className={`p-5 ${sec.color === 'indigo' ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : sec.color === 'emerald' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-slate-50/50 dark:bg-slate-900/30'}`}>

                  {sec.id === 'headers' && (
                    <div className="space-y-3">
                      {headers.map((h, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex gap-2">
                            <input
                              className="input-base flex-1"
                              placeholder="Header Key"
                              value={h.key}
                              onChange={(e) => updateHeader(i, 'key', e.target.value)}
                            />

                            <input
                              className="input-base flex-1"
                              placeholder="Header Value"
                              value={h.value}
                              onChange={(e) => updateHeader(i, 'value', e.target.value)}
                            />

                            <button
                              className="text-rose-500 p-2"
                              onClick={() => removeHeader(i)}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={addHeader}
                      >
                        + ADD HEADER
                      </button>
                    </div>
                  )}

                  {sec.id === 'body' && (
                    <div className="space-y-4">
                      <select
                        className="input-base"
                        value={bodyType}
                        onChange={(e) => setBodyType(e.target.value)}
                      >
                        <option value="none">No Body</option>
                        <option value="json">JSON</option>
                        <option value="form-data">Form Data</option>
                        <option value="xml">XML</option>
                        <option value="text">Plain Text</option>
                      </select>

                      {bodyType !== 'none' && bodyType !== 'form-data' && (
                        <textarea
                          className="input-base font-mono text-xs min-h-[150px]"
                          placeholder={`Insira o corpo da requisição (${bodyType.toUpperCase()})...`}
                          value={bodyRaw}
                          onChange={(e) => setBodyRaw(e.target.value)}
                        />
                      )}

                      {bodyType === 'form-data' && (
                        <div className="space-y-3">
                          {bodyParams.map((p, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                className="input-base flex-1"
                                placeholder="Key"
                                value={p.key}
                                onChange={(e) => updateBodyParam(i, 'key', e.target.value)}
                              />
                              <input
                                className="input-base flex-1"
                                placeholder="Value"
                                value={p.value}
                                onChange={(e) => updateBodyParam(i, 'value', e.target.value)}
                              />
                              <button onClick={() => removeBodyParam(i)} className="text-rose-500 p-2">×</button>
                            </div>
                          ))}
                          <button
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={addBodyParam}
                          >
                            + ADD FORM PARAM
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {sec.id === 'assertions' && (
                    <div className="space-y-4">
                      {assertions.map((a, i) => (
                        <div key={i} className="flex flex-col gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex gap-2">
                            <select
                              className="input-base !py-1 !w-32"
                              value={a.source}
                              onChange={(e) => {
                                const newA = [...assertions];
                                newA[i].source = e.target.value;
                                setAssertions(newA);
                              }}
                            >
                              <option value="status">Status Code</option>
                              <option value="body">Body Content</option>
                              <option value="header">Header</option>
                            </select>
                            <select
                              className="input-base !py-1 !w-24"
                              value={a.operator}
                              onChange={(e) => {
                                const newA = [...assertions];
                                newA[i].operator = e.target.value;
                                setAssertions(newA);
                              }}
                            >
                              <option value="==">Equals</option>
                              <option value="!=">Not Equals</option>
                              <option value="contains">Contains</option>
                              <option value=">">&gt; (Greater)</option>
                              <option value=">=">&gt;= (Greater/Equal)</option>
                              <option value="<">&lt; (Less)</option>
                              <option value="<=">&lt;= (Less/Equal)</option>
                            </select>
                            <button onClick={() => setAssertions(assertions.filter((_, idx) => idx !== i))} className="text-rose-500 p-2 ml-auto">×</button>
                          </div>
                          <div className="flex gap-2">
                            {a.source !== 'status' && (
                              <input
                                className="input-base !py-1 flex-1"
                                placeholder={a.source === 'body' ? 'Campo/Path (ex: data.id)' : 'Nome do Header'}
                                value={a.property}
                                onChange={(e) => {
                                  const newA = [...assertions];
                                  newA[i].property = e.target.value;
                                  setAssertions(newA);
                                }}
                              />
                            )}
                            <input
                              className="input-base !py-1 flex-1"
                              placeholder="Valor Esperado"
                              value={a.target}
                              onChange={(e) => {
                                const newA = [...assertions];
                                newA[i].target = e.target.value;
                                setAssertions(newA);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setAssertions([...assertions, { source: 'status', property: '', operator: '==', target: '200' }])} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">+ ADD ASSERTION</button>
                    </div>
                  )}

                  {sec.id === 'extractions' && (
                    <div className="space-y-4">
                      {extractions.map((ex, i) => (
                        <div key={i} className="flex flex-col gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex gap-2">
                            <select className="input-base !py-1 !w-32" value={ex.source} onChange={(e) => { const newE = [...extractions]; newE[i].source = e.target.value; setExtractions(newE); }}>
                              <option value="body">Full Body</option>
                              <option value="header">Header</option>
                            </select>
                            <input className="input-base !py-1 flex-1" placeholder={ex.source === 'body' ? 'Campo/Path (ex: data.token)' : 'Nome do Header'} value={ex.property} onChange={(e) => { const newE = [...extractions]; newE[i].property = e.target.value; setExtractions(newE); }} />
                            <button onClick={() => setExtractions(extractions.filter((_, idx) => idx !== i))} className="text-rose-500 p-2 ml-auto">×</button>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Salvar em:</span>
                            <input className="input-base !py-1 font-mono text-emerald-500 flex-1" placeholder="Variable Name" value={ex.varName} onChange={(e) => { const newE = [...extractions]; newE[i].varName = e.target.value; setExtractions(newE); }} />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setExtractions([...extractions, { source: 'body', property: '', varName: 'my_var' }])} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">+ ADD EXTRACTION</button>
                      <p className="text-[10px] text-slate-500 italic mt-2">Dica: Use {`{{varName}}`} em outros passos para acessar o valor extraído.</p>
                    </div>
                  )}

                  {sec.id === 'auth' && (
                    <div className="space-y-4">

                      <select
                        className="input-base"
                        value={authType}
                        onChange={(e) => setAuthType(e.target.value)}
                      >
                        <option value="none">No Authentication</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="apikey">API Key</option>
                      </select>

                      <textarea
                        className="input-base text-xs min-h-[80px] mt-2"
                        placeholder="Descrição da Autenticação (opcional)"
                        value={authDoc}
                        onChange={(e) => setAuthDoc(e.target.value)}
                      />

                      {authType === 'bearer' && (
                        <input className="input-base" placeholder="Token" />
                      )}

                      {authType === 'basic' && (
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input-base" placeholder="Username" />
                          <input
                            className="input-base"
                            type="password"
                            placeholder="Password"
                          />
                        </div>
                      )}

                      {authType === 'apikey' && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className="input-base"
                            placeholder="Key (ex: X-API-Key)"
                          />

                          <input
                            className="input-base"
                            placeholder="Value"
                          />
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
      )}

      {isVarsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">

          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">

            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <div>
                  <h3 className="text-xl font-bold dark:text-white">
                    Variáveis Dinâmicas
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gere dados aleatórios em tempo real
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsVarsModalOpen(false)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-2 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[60vh]">

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Utilize a sintaxe{' '}
                <code className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">
                  {`{{variavel}}`}
                </code>{' '}
                em qualquer campo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { v: 'uuid', d: 'UUID v4 único por requisição' },
                  { v: 'timestamp', d: 'Unix Epoch (segundos)' },
                  { v: 'int:min:max', d: 'Inteiro' },
                  { v: 'float:min:max', d: 'Float' },
                  { v: 'string:len', d: 'String aleatória' },
                  { v: 'name', d: 'Nome aleatório real' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl"
                  >
                    <code className="text-blue-600 dark:text-blue-400 font-bold block mb-1">
                      {`{{${item.v}}}`}
                    </code>

                    <span className="text-[11px] text-slate-500 dark:text-slate-500">
                      {item.d}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">

              <button
                onClick={() => setIsVarsModalOpen(false)}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
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
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl"
          >
            {isScenarioMode ? 'Atualizar Passo' : 'Atualizar Request'}
          </button>
        )}

        {!isScenarioMode && (
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl"
            onClick={() => sendRequests()}
          >
            RUN REQUESTS
          </button>
        )}

      </div>
    </div>
  );
}