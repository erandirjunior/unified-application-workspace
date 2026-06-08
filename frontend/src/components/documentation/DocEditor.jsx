import React from 'react';
import SectionHeader from './SectionHeader';
import { HTTP_STATUS_CODES } from './constants';
import { renderMarkdownToHtml, resolveVariables } from './exportUtils';

export default function DocEditor({
  req,
  activeEnv,
  methodStyles,
  authExpanded, setAuthExpanded,
  pathExpanded, setPathExpanded,
  headersExpanded, setHeadersExpanded,
  bodyExpanded, setBodyExpanded,
  responsesExpanded, handleToggleResponses,
  activeBodyParams,
  // Mutation callbacks
  setDocumentation,
  setRequestName,
  setMethod,
  setUrl,
  setAuthType,
  setAuthDoc,
  setBodyType,
  setBodyRawDoc,
  setBodyRaw,
  updatePathParam, addPathParam, removePathParam,
  updateHeader, addHeader, removeHeader,
  updateBodyParam, addBodyParam, removeBodyParam,
  updateResponse, addResponse, removeResponse,
  addResponseField, removeResponseField, updateResponseField,
  updateField,
  // Utility actions
  formatBody,
  clearBodyParams,
  syncFieldsFromRaw,
  formatResponseBody,
  syncFieldsFromResponseBody,
  t,
}) {
  const renderMarkdown = (text) => {
    if (!text) return null;
    const html = renderMarkdownToHtml(text);
    return <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const moveResponse = (index, direction) => {
    const currentResponses = Array.isArray(req.responses) ? req.responses : [];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentResponses.length) return;
    const newResponses = [...currentResponses];
    const [removed] = newResponses.splice(index, 1);
    newResponses.splice(newIndex, 0, removed);
    updateField('responses', newResponses);
  };

  return (
    <div>
      {/* Documentação Geral */}
      <section className="mb-6">
        <SectionHeader title="Documentação Geral" icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <textarea 
          className="input-base min-h-[200px] font-sans text-sm !bg-slate-50 dark:!bg-slate-950" 
          placeholder="Descreva esta action detalhadamente (Suporta Markdown)..."
          value={req.documentation || ''}
          onChange={(e) => setDocumentation(e.target.value)}
        />
      </section>

      {/* Nome e URL */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        <div>
          <label className="label-base">Nome da Requisição</label>
          <input 
            className="input-base text-sm font-bold" 
            value={req.name} 
            onChange={(e) => setRequestName(e.target.value)} 
          />
        </div>
        <div className="flex gap-2">
          <select className={`input-base !w-32 font-bold border ${methodStyles[req.method]}`} value={req.method} onChange={(e) => setMethod(e.target.value)}>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="input-base font-mono" value={req.url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Segurança */}
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
                <select className="input-base !py-1 !text-xs bg-transparent max-w-xs" value={req.authType || 'none'} onChange={(e) => setAuthType(e.target.value)}>
                  <option value="none">Nenhum</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic</option>
                  <option value="apikey">API Key</option>
                </select>
              </div>
              <textarea className="input-base text-[11px] min-h-[60px] mt-4" placeholder="Explique como obter as credenciais..." value={req.authDoc || ''} onChange={(e) => setAuthDoc(e.target.value)} />
            </div>
          )}
        </section>

        {/* Path Parameters */}
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
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(Array.isArray(req.pathParams) ? req.pathParams : []).map((p, i) => (
                    <tr key={i} className="dark:text-slate-300">
                      <td className="px-4 py-3 align-top"><input className="input-base !py-1 !px-2 text-xs" value={p.key} onChange={(e) => updatePathParam(i, 'key', e.target.value)} /></td>
                      <td className="px-4 py-3 align-top"><input className="input-base !py-1 !px-2 text-xs" value={p.value} onChange={(e) => updatePathParam(i, 'value', e.target.value)} /></td>
                      <td className="px-4 py-3 align-top"><textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={p.docDescription} onChange={(e) => updatePathParam(i, 'docDescription', e.target.value)} /></td>
                      <td className="px-4 py-3 text-center align-top"><input type="checkbox" checked={p.docRequired} onChange={(e) => updatePathParam(i, 'docRequired', e.target.checked)} /></td>
                      <td className="px-4 py-3 align-top"><input className="input-base !py-1 !px-2 text-xs" value={p.docExample} onChange={(e) => updatePathParam(i, 'docExample', e.target.value)} /></td>
                      <td className="px-4 py-3 text-center align-top"><button onClick={() => removePathParam(i)} className="text-rose-500 hover:text-rose-700">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => addPathParam()} className="text-xs font-bold text-indigo-500">+ {t.documentation.pathParams.toUpperCase()}</button>
              </div>
            </div>
          )}
        </section>

        {/* Headers */}
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
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(Array.isArray(req.headers) ? req.headers : []).map((h, i) => (
                    <tr key={i} className="dark:text-slate-300">
                      <td className="px-4 py-3 align-top"><input className="input-base !py-1 !px-2 text-xs" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} /></td>
                      <td className="px-4 py-3 align-top"><input className="input-base !py-1 !px-2 text-xs" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} /></td>
                      <td className="px-4 py-3 align-top"><textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={h.docDescription} onChange={(e) => updateHeader(i, 'docDescription', e.target.value)} /></td>
                      <td className="px-4 py-3 text-center align-top"><input type="checkbox" checked={h.docRequired} onChange={(e) => updateHeader(i, 'docRequired', e.target.checked)} /></td>
                      <td className="px-4 py-3 align-top"><input className="input-base !py-1 !px-2 text-xs" value={h.docExample} onChange={(e) => updateHeader(i, 'docExample', e.target.value)} /></td>
                      <td className="px-4 py-3 text-center align-top"><button onClick={() => removeHeader(i)} className="text-rose-500 hover:text-rose-700">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button onClick={addHeader} className="text-xs font-bold text-blue-500">+ {t.config.sections.headers.toUpperCase()}</button>
              </div>
            </div>
          )}
        </section>

        {/* Request Body */}
        <section>
          <SectionHeader 
            title={`Request Body ${req.bodyType && req.bodyType !== 'none' ? `(${req.bodyType.toUpperCase()})` : ''}`} 
            icon={<svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>} 
            isExpanded={bodyExpanded}
            onToggle={() => setBodyExpanded(!bodyExpanded)}
          />
          {bodyExpanded && (
            <>
              <div className="mb-6">
                <label className="label-base">Configurar Tipo de Corpo</label>
                <select 
                  className="input-base" 
                  value={req.bodyType || 'none'} 
                  onChange={(e) => setBodyType(e.target.value)}
                >
                  <option value="none">Nenhum (Sem corpo)</option>
                  <option value="json">JSON</option>
                  <option value="form-data">Form Data</option>
                  <option value="xml">XML</option>
                  <option value="text">Plain Text (Texto)</option>
                  <option value="form-urlencoded">Form URL Encoded</option>
                  <option value="file">Arquivo Binário</option>
                </select>
              </div>

              {/* Documentação do Body Raw */}
              {req.bodyType !== 'none' && (
                <div className="mb-4">
                  <textarea 
                    className="input-base text-xs min-h-[100px]" 
                    placeholder="Explique o schema ou campos importantes do corpo da requisição..."
                    value={req.bodyRawDoc || ''} 
                    onChange={(e) => setBodyRawDoc(e.target.value)}
                  />
                </div>
              )}

              {/* Editor Técnico de Body Raw */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Editor Técnico (Body)</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={formatBody}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-600 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded uppercase transition-colors"
                    >
                      {t.documentation.preview}
                    </button>
                    <button 
                      onClick={clearBodyParams}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded uppercase transition-colors"
                    >
                      {t.common.cancel}
                    </button>
                    <button 
                      onClick={syncFieldsFromRaw}
                      className="text-[10px] font-bold text-blue-500 hover:text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded uppercase transition-colors"
                      title="Sincroniza chaves do JSON/XML com a tabela de documentação"
                    >
                      {t.common.next} ↓
                    </button>
                  </div>
                </div>
                <textarea 
                  className="input-base !bg-slate-950 !text-emerald-400 font-mono text-xs min-h-[150px]" 
                  value={req.bodyRaw} 
                  onChange={(e) => setBodyRaw(e.target.value)} 
                />
              </div>

              {/* Tabela de Parâmetros / Campos */}
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
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeBodyParams.map((p, i) => (
                        <tr key={i} className="dark:text-slate-300 text-xs">
                          <td className="px-3 py-2 font-mono text-amber-500 break-all align-top">
                            <input className="input-base !py-1 !px-2 text-xs" value={p.key} onChange={(e) => updateBodyParam(i, 'key', e.target.value)} />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex gap-1">
                              <select className="input-base !py-1 !px-1 text-[10px] w-14" value={p.type} onChange={(e) => updateBodyParam(i, 'type', e.target.value)}>
                                <option value="text">string</option>
                                <option value="int">integer</option>
                                <option value="float">float</option>
                                <option value="array">array</option>
                                <option value="object">object</option>
                                <option value="bool">bool</option>
                                <option value="enum">enum</option>
                                <option value="file">file</option>
                              </select>
                              <input className="input-base !py-1 !px-2 text-xs" value={p.value} onChange={(e) => updateBodyParam(i, 'value', e.target.value)} />
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={p.docDescription} onChange={(e) => updateBodyParam(i, 'docDescription', e.target.value)} />
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            <input type="checkbox" checked={p.docRequired} onChange={(e) => updateBodyParam(i, 'docRequired', e.target.checked)} />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input className="input-base !py-1 !px-2 text-xs" value={p.docExample} onChange={(e) => updateBodyParam(i, 'docExample', e.target.value)} />
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            <button onClick={() => removeBodyParam(i)} className="text-rose-500 hover:text-rose-700">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={addBodyParam} className="text-xs font-bold text-amber-500">+ {t.config.sections.body.toUpperCase()}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Responses Section */}
        <section>
          <SectionHeader 
            title="Exemplos de Respostas (Responses)" 
            icon={<svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>} 
            isExpanded={responsesExpanded}
            onToggle={handleToggleResponses}
          />
          {responsesExpanded && (
            <div className="space-y-6">
              <div className="space-y-4">
                {(Array.isArray(req.responses) ? req.responses : []).map((resp, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex gap-3 items-center">
                      <select 
                        className="input-base !w-32 font-bold text-center" 
                        value={resp.statusCode} 
                        onChange={(e) => updateResponse(i, 'statusCode', e.target.value)} 
                        title="Código de Status HTTP"
                      >
                        {HTTP_STATUS_CODES.map(status => <option key={status.code} value={status.code}>{status.code} - {status.description}</option>)}
                      </select>
                      <input className="input-base flex-1" placeholder="Descrição (ex: Usuário Criado)" value={resp.description} onChange={(e) => updateResponse(i, 'description', e.target.value)} />
                      <div className="flex gap-1">
                        <button 
                          disabled={i === 0}
                          onClick={(e) => { e.stopPropagation(); moveResponse(i, 'up'); }}
                          className={`p-1.5 text-slate-400 hover:text-blue-500 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${i === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5"/></svg>
                        </button>
                        <button 
                          disabled={i === (req.responses?.length - 1)}
                          onClick={(e) => { e.stopPropagation(); moveResponse(i, 'down'); }}
                          className={`p-1.5 text-slate-400 hover:text-blue-500 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${i === (req.responses?.length - 1) ? 'opacity-20 cursor-not-allowed' : ''}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg>
                        </button>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeResponse(i); }} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">×</button>
                    </div>
                    <div className="relative">
                      <textarea className="input-base font-mono text-xs min-h-[100px] !bg-slate-950 !text-blue-300" placeholder="Corpo da resposta (JSON, XML, etc.)... Use {{variáveis}} para exemplos dinâmicos." value={resp.body} onChange={(e) => updateResponse(i, 'body', e.target.value)} />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); formatResponseBody(i); }}
                          className="text-[10px] font-bold text-slate-400 hover:text-blue-500 border border-slate-700 px-2 py-0.5 rounded uppercase transition-colors"
                          title="Formatar JSON"
                        >
                          {t.documentation.preview}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); syncFieldsFromResponseBody(i); }}
                          className="text-[10px] font-bold text-blue-500 hover:text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded uppercase transition-colors"
                          title="Sincroniza chaves do JSON com a tabela de documentação"
                        >
                          {t.common.next} ↓
                        </button>
                      </div>
                    </div>

                    {/* Tabela de Campos do Corpo da Resposta */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] whitespace-nowrap">
                          <tr>
                            <th className="px-3 py-2 w-[20%]">Campo / Chave</th>
                            <th className="px-3 py-2 w-[20%]">Tipo</th>
                            <th className="px-3 py-2 w-[35%]">Descrição</th>
                            <th className="px-3 py-2 w-16 text-center">Obr.</th>
                            <th className="px-3 py-2 w-[20%]">Exemplo</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(Array.isArray(resp.bodyFields) ? resp.bodyFields : []).map((field, fieldIdx) => (
                            <tr key={fieldIdx} className="dark:text-slate-300 text-xs">
                              <td className="px-3 py-2 font-mono text-purple-500 break-all align-top">
                                <input className="input-base !py-1 !px-2 text-xs" value={field.key} onChange={(e) => updateResponseField(i, fieldIdx, 'key', e.target.value)} />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <select className="input-base !py-1 !px-1 text-[10px] w-full" value={field.type} onChange={(e) => updateResponseField(i, fieldIdx, 'type', e.target.value)}>
                                  <option value="text">string</option>
                                  <option value="int">int</option>
                                  <option value="float">float</option>
                                  <option value="array">array</option>
                                  <option value="object">object</option>
                                  <option value="bool">bool</option>
                                  <option value="enum">enum</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={field.docDescription} onChange={(e) => updateResponseField(i, fieldIdx, 'docDescription', e.target.value)} />
                              </td>
                              <td className="px-3 py-2 text-center align-top">
                                <input type="checkbox" checked={field.docRequired} onChange={(e) => updateResponseField(i, fieldIdx, 'docRequired', e.target.checked)} />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className="input-base !py-1 !px-2 text-xs" value={field.docExample} onChange={(e) => updateResponseField(i, fieldIdx, 'docExample', e.target.value)} />
                              </td>
                              <td className="px-3 py-2 text-center align-top">
                                <button onClick={(e) => { e.stopPropagation(); removeResponseField(i, fieldIdx); }} className="text-rose-500 hover:text-rose-700">×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={(e) => { e.stopPropagation(); addResponseField(i); }} className="text-xs font-bold text-purple-500">+ ADICIONAR CAMPO DE RESPOSTA</button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={(e) => { e.stopPropagation(); addResponse(req.responses); }} className="text-xs font-bold text-purple-500">+ ADICIONAR RESPOSTA</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
