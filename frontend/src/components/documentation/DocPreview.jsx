import React from 'react';
import SectionHeader from './SectionHeader';
import { renderMarkdownToHtml, resolveVariables, generateCurl } from './exportUtils';

export default function DocPreview({
  req,
  reqIdx,
  activeEnv,
  methodStyles,
  authExpanded, setAuthExpanded,
  pathExpanded, setPathExpanded,
  headersExpanded, setHeadersExpanded,
  bodyExpanded, setBodyExpanded,
  responsesExpanded, handleToggleResponses,
  activeBodyParams,
  copyToClipboard,
  requestList,
  t,
}) {
  const renderMarkdown = (text) => {
    if (!text) return null;
    const html = renderMarkdownToHtml(text);
    return <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const resolve = (text) => resolveVariables(text, activeEnv);

  return (
    <div className={`${reqIdx > 0 ? 'pt-8 border-t border-slate-200 dark:border-slate-800' : ''}`}>
      {/* Documentação Geral */}
      <section className="mb-6">
        <SectionHeader title="Documentação Geral" icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          {req.documentation ? renderMarkdown(req.documentation) : <p className="text-xs text-slate-400 italic">Nenhuma documentação detalhada adicionada.</p>}
        </div>
      </section>

      {/* Method + Name + URL */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${methodStyles[req.method]}`}>{req.method}</span>
        <h2 className="text-base font-black text-slate-800 dark:text-white truncate">{req.name}</h2>
        <p className="text-[10px] font-mono text-slate-400 truncate flex-1">{resolve(req.url)}</p>
      </div>

      <div className="space-y-6">
        {/* Segurança */}
        {(req.authType !== 'none' || req.authDoc) && (
          <section>
            <SectionHeader 
              title="Segurança & Autenticação" 
              icon={<svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>} 
              isExpanded={authExpanded}
              onToggle={() => setAuthExpanded(!authExpanded)}
            />
            {authExpanded && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="flex items-center gap-2 text-sm font-bold dark:text-slate-200">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  {!req.authType || req.authType === 'none' ? "Sem Autenticação" : req.authType.toUpperCase()}
                </div>
                {(req.authDoc || req.authToken || req.authUsername) && (
                  <div className="mt-4">
                    {renderMarkdown(req.authDoc)}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Path Parameters */}
        {req.pathParams && req.pathParams.length > 0 && (
          <section>
            <SectionHeader 
              title="Path Parameters" 
              icon={<svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>} 
              isExpanded={pathExpanded}
              onToggle={() => setPathExpanded(!pathExpanded)}
            />
            {pathExpanded && (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-3 w-[20%]">Parâmetro</th>
                      <th className="px-4 py-3 w-[25%]">Valor Técnico</th>
                      <th className="px-4 py-3 w-[30%]">Descrição</th>
                      <th className="px-4 py-3 w-16 text-center">Obr.</th>
                      <th className="px-4 py-3 w-[15%]">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(Array.isArray(req.pathParams) ? req.pathParams : []).map((p, i) => (
                      <tr key={i} className="dark:text-slate-300">
                        <td className="px-4 py-3 align-top"><span className="font-mono text-indigo-500 break-all">{p.key || '-'}</span></td>
                        <td className="px-4 py-3 align-top"><span className="font-mono text-slate-400 break-all">{resolve(p.value) || '-'}</span></td>
                        <td className="px-4 py-3 align-top"><span className="text-slate-500 italic text-xs whitespace-pre-wrap break-words">{p.docDescription || '-'}</span></td>
                        <td className="px-4 py-3 text-center align-top">{p.docRequired ? <span className="text-rose-500 font-bold">Sim</span> : 'Não'}</td>
                        <td className="px-4 py-3 align-top"><code className="text-[10px] text-slate-400 break-all">{p.docExample || '-'}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Headers */}
        {req.headers && req.headers.filter(h => h.key).length > 0 && (
          <section>
            <SectionHeader 
              title="Request Headers" 
              icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>} 
              isExpanded={headersExpanded}
              onToggle={() => setHeadersExpanded(!headersExpanded)}
            />
            {headersExpanded && (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-3 w-[20%]">Chave</th>
                      <th className="px-4 py-3 w-[25%]">Valor Técnico</th>
                      <th className="px-4 py-3 w-[30%]">Descrição / Comentário</th>
                      <th className="px-4 py-3 w-16 text-center">Obr.</th>
                      <th className="px-4 py-3 w-[15%]">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(Array.isArray(req.headers) ? req.headers : []).filter(h => h.key).map((h, i) => (
                      <tr key={i} className="dark:text-slate-300">
                        <td className="px-4 py-3 align-top"><span className="font-mono text-blue-500 break-all">{h.key || '-'}</span></td>
                        <td className="px-4 py-3 align-top"><span className="font-mono text-slate-400 break-all">{resolve(h.value) || '-'}</span></td>
                        <td className="px-4 py-3 align-top"><span className="text-slate-500 italic text-xs whitespace-pre-wrap break-words">{h.docDescription || '-'}</span></td>
                        <td className="px-4 py-3 text-center align-top">{h.docRequired ? <span className="text-rose-500 font-bold">Sim</span> : 'Não'}</td>
                        <td className="px-4 py-3 align-top"><code className="text-[10px] text-slate-400 break-all">{h.docExample || '-'}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Request Body */}
        {req.bodyType !== 'none' && (
          <section>
            <SectionHeader 
              title={`Request Body ${req.bodyType && req.bodyType !== 'none' ? `(${req.bodyType.toUpperCase()})` : ''}`} 
              icon={<svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>} 
              isExpanded={bodyExpanded}
              onToggle={() => setBodyExpanded(!bodyExpanded)}
            />
            {bodyExpanded && (
              <>
                {/* Documentação do Body Raw */}
                {req.bodyRawDoc && (
                  <div className="mb-4">
                    {renderMarkdown(req.bodyRawDoc)}
                  </div>
                )}

                {/* Exemplo de Body Raw */}
                {req.bodyRaw && (
                  <div className="mb-4 relative group">
                    <pre className="bg-slate-950 p-6 rounded-2xl text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800">
                      {req.bodyRaw}
                    </pre>
                    <button 
                      onClick={() => copyToClipboard(req.bodyRaw)}
                      className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </button>
                  </div>
                )}

                {/* Tabela de Parâmetros */}
                {req.bodyType !== 'none' && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] whitespace-nowrap">
                        <tr>
                          <th className="px-3 py-2 w-[20%]">Campo / Chave</th>
                          <th className="px-3 py-2 w-[20%]">Valor / Tipo</th>
                          <th className="px-3 py-2 w-[35%]">Descrição</th>
                          <th className="px-3 py-2 w-16 text-center">Obr.</th>
                          <th className="px-3 py-2 w-[20%]">Exemplo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeBodyParams.map((p, i) => (
                          <tr key={i} className="dark:text-slate-300 text-xs">
                            <td className="px-3 py-2 font-mono text-amber-500 break-all align-top">{p.key || '-'}</td>
                            <td className="px-3 py-2 align-top">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{p.type || 'text'}</span>
                                <span className="text-xs break-all text-slate-600 dark:text-slate-300">{resolve(p.value) || (p.type === 'object' ? '' : '-')}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top"><span className="text-slate-500 text-xs whitespace-pre-wrap">{p.docDescription || '-'}</span></td>
                            <td className="px-3 py-2 text-center align-top">{p.docRequired ? <span className="text-rose-500 font-bold">Sim</span> : 'Não'}</td>
                            <td className="px-3 py-2 align-top"><code className="text-[10px] text-slate-400 break-all">{p.docExample || '-'}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Responses Section */}
        <section>
          <SectionHeader 
            title="Exemplos de Respostas (Responses)" 
            icon={<svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>} 
            isExpanded={responsesExpanded}
            onToggle={handleToggleResponses}
          />
          {responsesExpanded && (
            <div className="space-y-4">
              {(Array.isArray(req.responses) ? req.responses : []).map((resp, i) => (
                <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${String(resp.statusCode || '').startsWith('2') ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-500 border-rose-500/20 bg-rose-500/5'}`}>
                      {resp.statusCode || '???'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{resp.description || 'Sem descrição'}</span>
                  </div>
                  {resp.body && (
                    <pre className="bg-slate-950 p-4 text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {resp.body}
                    </pre>
                  )}
                  
                  {/* Tabela de Dicionário de Dados no Preview */}
                  {Array.isArray(resp.bodyFields) && resp.bodyFields.length > 0 && (
                    <div className="p-4 bg-white dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dicionário de Dados da Resposta</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 font-bold uppercase text-[9px]">
                            <tr>
                              <th className="px-3 py-2 w-[25%]">Campo</th>
                              <th className="px-3 py-2 w-[15%]">Tipo</th>
                              <th className="px-3 py-2 w-[40%]">Descrição</th>
                              <th className="px-3 py-2 w-[20%]">Exemplo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {resp.bodyFields.map((f, fIdx) => (
                              <tr key={fIdx} className="text-slate-600 dark:text-slate-400">
                                <td className="px-3 py-2 font-mono text-purple-600 dark:text-purple-400 font-bold">{f.key}</td>
                                <td className="px-3 py-2 italic opacity-80">{f.type}</td>
                                <td className="px-3 py-2">{f.docDescription || '-'}</td>
                                <td className="px-3 py-2 font-mono text-[10px] opacity-70">{f.docExample || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(!Array.isArray(req.responses) || req.responses.length === 0) && (
                <p className="text-xs text-slate-400 italic">Nenhum exemplo de resposta documentado.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* cURL snippet at the end (only for single request) */}
      {requestList.length === 1 && (
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Exemplo de Requisição (cURL)</h4>
            <button onClick={() => copyToClipboard(generateCurl(req, activeEnv))} className="text-blue-500 hover:text-blue-400 text-xs font-bold transition-colors">Copiar Comando</button>
          </div>
          <code className="text-[11px] font-mono text-blue-300 break-all whitespace-pre-wrap leading-relaxed">
            {generateCurl(req, activeEnv)}
          </code>
        </div>
      )}
    </div>
  );
}
