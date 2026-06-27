import React, { useState, useCallback } from 'react';
import DocPreview from '../components/documentation/DocPreview';
import DocEditor from '../components/documentation/DocEditor';
import { generateDocHTML, resolveVariables } from '../components/documentation/exportUtils';

export default function DocumentationView({ 
  request: requestProp, requests = [], activeRequestId, onSelectForEdit, t,
  collection, onBack, onEdit, onRun, methodStyles, onClearBodyParams,
  bodyRawDoc, authDoc, updateHeader, updatePathParam, updateBodyParam, updateRequestInCollection, bodyParams, addHeader, addPathParam, removeHeader, removePathParam, updateField,
  updateResponse, addResponse, removeResponse, setDocumentation,
  addResponseField, removeResponseField, updateResponseField, onUpdateGeneralDoc,
  addBodyParam, removeBodyParam, setBodyRawDoc, setAuthDoc,
  setUrl, setMethod, setBodyRaw, setAuthType, setRequestName, setBodyType,
  isRunning, theme
}) {
  // Gerencia se recebemos uma lista ou uma única request para manter compatibilidade
  const baseList = requests.length > 0 ? [...requests] : (requestProp ? [requestProp] : []);

  // Garante que a requisição ativa esteja sempre na lista para evitar que a documentação fique travada em itens selecionados anteriormente
  if (activeRequestId && !baseList.some(r => String(r.id) === String(activeRequestId))) {
    baseList.unshift(requestProp);
  }

  const requestList = baseList.map(originalReq => {
    // Prioriza o requestProp (formulário) se o ID bater, garantindo reatividade imediata
    if (String(originalReq.id) !== String(activeRequestId)) return { ...originalReq, responses: Array.isArray(originalReq.responses) ? originalReq.responses : [] };

    // Mesclamos o original (coleção) com o form (draft)
    // Garantimos que as responses não sejam perdidas se o form ainda não as carregou
    const formResps = Array.isArray(requestProp.responses) ? requestProp.responses : [];
    const savedResps = Array.isArray(originalReq.responses) ? originalReq.responses : [];
    const finalResps = formResps.length > 0 ? formResps : savedResps;

    return { 
      ...originalReq, 
      ...requestProp, 
      id: originalReq.id,
      name: requestProp.requestName || originalReq.name, // Sincroniza o nome para o input
      responses: finalResps 
    };
  });
  const request = requestList.find(r => String(r.id) === String(activeRequestId)) || (activeRequestId ? requestList[0] : null) || {};
  
  const activeEnv = collection?.environments?.find(e => e.id === collection.activeEnvironmentId);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'editor'
  const isEditing = viewMode === 'editor';

  const [authExpanded, setAuthExpanded] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(false);
  const [headersExpanded, setHeadersExpanded] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [responsesExpanded, setResponsesExpanded] = useState(false);

  const handleToggleResponses = useCallback(() => {
    setResponsesExpanded(prev => !prev);
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(t.toasts.copySuccess);
  };

  const clearBodyParams = () => {
    const hasParams = request.bodyParams && request.bodyParams.length > 0;
    if (!hasParams) return;

    if (confirm(t.toasts.clearConfirm)) {
      if (onClearBodyParams) {
        onClearBodyParams();
      } else {
        for (let i = request.bodyParams.length - 1; i >= 0; i--) {
          removeBodyParam(i);
        }
      }
    }
  };

  const formatBody = () => {
    if (!request.bodyRaw) return;
    try {
      if (request.bodyType === 'json') {
        const parsed = JSON.parse(request.bodyRaw);
        setBodyRaw(JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      alert(t.toasts.formatError + e.message);
    }
  };

  const syncFieldsFromRaw = () => {
    if (!request.bodyRaw) return;
    try {
      let discoveredFields = [];
      
      if (request.bodyType === 'json') {
        const parsed = JSON.parse(request.bodyRaw || '{}');
        const flatten = (obj, prefix = '') => {
          Object.keys(obj).forEach(key => {
            const path = prefix ? `${prefix}.${key}` : key;
            const val = obj[key];
            
            let fieldType = 'text';
            if (Array.isArray(val)) fieldType = 'array';
            else if (val === null) fieldType = 'object';
            else if (typeof val === 'number') fieldType = Number.isInteger(val) ? 'int' : 'float';
            else if (typeof val === 'boolean') fieldType = 'bool';
            else if (typeof val === 'object') fieldType = 'object';

            const isObjectContainer = val && typeof val === 'object' && !Array.isArray(val);

            let displayValue = '';
            if (isObjectContainer || val === null) {
              displayValue = '';
            } else if (Array.isArray(val)) {
              displayValue = JSON.stringify(val);
            } else {
              displayValue = String(val);
            }

            discoveredFields.push({ 
              key: path, 
              type: fieldType, 
              value: displayValue,
              docRequired: false,
              docExample: displayValue,
              docDescription: ''
            });

            if (isObjectContainer) {
              flatten(val, path);
            }
          });
        };
        flatten(parsed);
      } else if (request.bodyType === 'xml') {
        const doc = new DOMParser().parseFromString(request.bodyRaw, "text/xml");
        const nodes = Array.from(doc.querySelectorAll('*')).filter(n => n.tagName !== 'parsererror');
        nodes.forEach(n => {
          if (n.children.length === 0 && n.textContent.trim() !== '') {
            discoveredFields.push({ 
              key: n.tagName, 
              type: 'text', 
              value: n.textContent,
              docRequired: false,
              docExample: n.textContent,
              docDescription: ''
            });
          }
        });
        console.log("Discovered fields after parsing (XML):", discoveredFields);
      } else if (request.bodyType === 'form-urlencoded') {
        const pairs = (request.bodyRaw || '').split('&'); 
        if (onClearBodyParams) {
          onClearBodyParams();
        } else {
          for (let i = (bodyParams || []).length - 1; i >= 0; i--) {
            removeBodyParam(i);
          }
        }

        pairs.forEach(pair => {
          const eqIndex = pair.indexOf('=');
          const key = eqIndex > -1 ? pair.substring(0, eqIndex) : pair;
          const value = eqIndex > -1 ? pair.substring(eqIndex + 1) : '';
          if (key) {
            discoveredFields.push({
              key: decodeURIComponent(key.replace(/\+/g, ' ')),
              type: 'text',
              value: decodeURIComponent(value.replace(/\+/g, ' ')),
              docRequired: false,
              docExample: value,
              docDescription: ''
            });
          }
        });
      }

      const currentParams = bodyParams || [];
      const newlyAddedKeys = new Set();

      discoveredFields.forEach(field => {
        if (!field.key || field.key.trim() === '') return;
        const keyTrimmed = field.key.trim();
        
        const existingIndex = currentParams.findIndex(p => p.key && p.key.trim() === keyTrimmed);

        if (existingIndex >= 0) {
          updateBodyParam(existingIndex, 'type', field.type);
          updateBodyParam(existingIndex, 'value', field.value);
          updateBodyParam(existingIndex, 'docExample', field.docExample);
        } else if (!newlyAddedKeys.has(keyTrimmed)) {
          newlyAddedKeys.add(keyTrimmed);
          addBodyParam(field);
        }
      });
    } catch (e) {
      alert(t.toasts.syncError + e.message);
    }
  };

  const formatResponseBody = (responseIndex) => {
    const resp = request.responses[responseIndex];
    if (!resp || !resp.body) return;
    try {
      const parsed = JSON.parse(resp.body);
      updateResponse(responseIndex, 'body', JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert(t.toasts.formatError + e.message);
    }
  };

  const syncFieldsFromResponseBody = (responseIndex) => {
    const resp = request.responses[responseIndex];
    if (!resp || !resp.body) return;

    try {
      let discoveredFields = [];
      const parsed = JSON.parse(resp.body);
      const flatten = (obj, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const path = prefix ? `${prefix}.${key}` : key;
          const val = obj[key];

          let fieldType = 'text';
          if (Array.isArray(val)) fieldType = 'array';
          else if (val === null) fieldType = 'object';
          else if (typeof val === 'number') fieldType = Number.isInteger(val) ? 'int' : 'float';
          else if (typeof val === 'boolean') fieldType = 'bool';
          else if (typeof val === 'object') fieldType = 'object';

          const isObjectContainer = val && typeof val === 'object' && !Array.isArray(val);

          let displayValue = '';
          if (isObjectContainer || val === null) {
            displayValue = '';
          } else if (Array.isArray(val)) {
            displayValue = JSON.stringify(val);
          } else {
            displayValue = String(val);
          }

          discoveredFields.push({
            key: path,
            type: fieldType,
            docRequired: false,
            docExample: displayValue,
            docDescription: ''
          });

          if (isObjectContainer) {
            flatten(val, path);
          }
        });
      };
      flatten(parsed);

      const currentBodyFields = resp.bodyFields || [];
      const newBodyFields = [...currentBodyFields];
      const newlyAddedKeys = new Set();

      discoveredFields.forEach(field => {
        if (!field.key || field.key.trim() === '') return;
        const keyTrimmed = field.key.trim();
        const existingIndex = newBodyFields.findIndex(p => p.key && p.key.trim() === keyTrimmed);
        if (existingIndex >= 0) { newBodyFields[existingIndex] = { ...newBodyFields[existingIndex], type: field.type, docExample: field.docExample }; }
        else if (!newlyAddedKeys.has(keyTrimmed)) { newlyAddedKeys.add(keyTrimmed); newBodyFields.push(field); }
      });
      updateResponse(responseIndex, 'bodyFields', newBodyFields);
    } catch (e) {
      alert(t.toasts.syncError + e.message);
    }
  };

  const exportDocHTML = () => {
    const blob = new Blob([generateDocHTML(requestList, activeEnv, theme)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentacao-unificada-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDocPDF = () => {
    const win = window.open('', '_blank');
    win.document.write(generateDocHTML(requestList, activeEnv, theme));
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
      {/* Header da Documentação */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-500/30">
                 {requestList.length}
               </div>
               <div>
                 <h1 className="text-lg font-black text-slate-900 dark:text-white truncate">
                   {isEditing ? t.documentation.editorTitle : t.documentation.title}
                 </h1>
                 <p className="text-slate-500 text-xs font-mono mt-1">
                   {requestList.length === 1 ? requestList[0].name : `${requestList.length} ${t.common.selected}`}
                 </p>
               </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <button 
            onClick={() => updateRequestInCollection()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            {t.documentation.updateBtn}
          </button>
        )}

        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={exportDocHTML} className="px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1" title={t.report.exportHtml}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            HTML
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center"></div>
          <button onClick={exportDocPDF} className="px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1" title={t.report.exportPdf}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            PDF
          </button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.documentation.preview}
          </button>
          <button 
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${viewMode === 'editor' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.documentation.editor}
          </button>
        </div>
      </div>

      {isEditing && requestList.length > 1 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
          <span className="text-[10px] font-black text-slate-500 uppercase w-full mb-1">{t.documentation.selectToEdit || 'Selecione para editar:'}</span>
          {requestList.map(req => (
            <button 
              key={req.id}
              onClick={() => onSelectForEdit(req)}
              className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all border ${
                activeRequestId === req.id 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800 hover:border-blue-500'
              }`}
            >
              {req.name}
            </button>
          ))}
        </div>
      )}

      {requestList.map((req, reqIdx) => {
        const isTargetOfEdit = !isEditing || (activeRequestId === req.id);
        if (isEditing && !isTargetOfEdit) return null;

        // Prioriza o estado "vivo" (prop bodyParams) para a requisição ativa.
        const activeBodyParams = (req.id === activeRequestId) ? bodyParams : (req.bodyParams || []);

        if (isEditing) {
          return (
            <DocEditor
              key={req.id}
              req={req}
              activeEnv={activeEnv}
              methodStyles={methodStyles}
              authExpanded={authExpanded} setAuthExpanded={setAuthExpanded}
              pathExpanded={pathExpanded} setPathExpanded={setPathExpanded}
              headersExpanded={headersExpanded} setHeadersExpanded={setHeadersExpanded}
              bodyExpanded={bodyExpanded} setBodyExpanded={setBodyExpanded}
              responsesExpanded={responsesExpanded} handleToggleResponses={handleToggleResponses}
              activeBodyParams={activeBodyParams}
              setDocumentation={setDocumentation}
              setRequestName={setRequestName}
              setMethod={setMethod}
              setUrl={setUrl}
              setAuthType={setAuthType}
              setAuthDoc={setAuthDoc}
              setBodyType={setBodyType}
              setBodyRawDoc={setBodyRawDoc}
              setBodyRaw={setBodyRaw}
              updatePathParam={updatePathParam} addPathParam={addPathParam} removePathParam={removePathParam}
              updateHeader={updateHeader} addHeader={addHeader} removeHeader={removeHeader}
              updateBodyParam={updateBodyParam} addBodyParam={addBodyParam} removeBodyParam={removeBodyParam}
              updateResponse={updateResponse} addResponse={addResponse} removeResponse={removeResponse}
              addResponseField={addResponseField} removeResponseField={removeResponseField} updateResponseField={updateResponseField}
              updateField={updateField}
              formatBody={formatBody}
              clearBodyParams={clearBodyParams}
              syncFieldsFromRaw={syncFieldsFromRaw}
              formatResponseBody={formatResponseBody}
              syncFieldsFromResponseBody={syncFieldsFromResponseBody}
              t={t}
            />
          );
        }

        return (
          <DocPreview
            key={req.id}
            req={req}
            reqIdx={reqIdx}
            activeEnv={activeEnv}
            methodStyles={methodStyles}
            authExpanded={authExpanded} setAuthExpanded={setAuthExpanded}
            pathExpanded={pathExpanded} setPathExpanded={setPathExpanded}
            headersExpanded={headersExpanded} setHeadersExpanded={setHeadersExpanded}
            bodyExpanded={bodyExpanded} setBodyExpanded={setBodyExpanded}
            responsesExpanded={responsesExpanded} handleToggleResponses={handleToggleResponses}
            activeBodyParams={activeBodyParams}
            copyToClipboard={copyToClipboard}
            requestList={requestList}
            t={t}
          />
        );
      })}

      {isEditing && <p className="text-center text-xs text-emerald-500 font-bold animate-pulse">{t.documentation.editModeActive || '● Modo de Edição Ativo - Alterações são salvas automaticamente na coleção.'}</p>}

      {/* Dica Swagger */}
      <div className="text-center pt-8">
        <p className="text-[10px] text-slate-400 italic">{t.documentation.autoGeneratedNote}</p>
      </div>
    </div>
  );
}
