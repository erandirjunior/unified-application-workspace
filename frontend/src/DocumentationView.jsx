import React, { useState, useCallback } from 'react';

const SectionHeader = ({ title, icon, isExpanded, onToggle }) => (
  <div 
    className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 cursor-pointer select-none group"
    onClick={onToggle}
  >
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{title}</h3>
    </div>
    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
  </div>
);

export default function DocumentationView({ 
  request: requestProp, requests = [], activeRequestId, onSelectForEdit,
  collection, onBack, onEdit, onRun, methodStyles, onClearBodyParams,
  bodyRawDoc, authDoc, updateHeader, updatePathParam, updateBodyParam, updateRequestInCollection, bodyParams, addHeader, addPathParam, removeHeader, removePathParam, updateField,
  updateResponse, addResponse, removeResponse,
  addResponseField, removeResponseField, updateResponseField, onUpdateGeneralDoc,
  addBodyParam, removeBodyParam, setBodyRawDoc, setAuthDoc,
  setUrl, setMethod, setDescription, setBodyRaw, setAuthType, setRequestName,
  isRunning, theme
}) {
  // Gerencia se recebemos uma lista ou uma única request para manter compatibilidade
  const baseList = requests.length > 0 ? requests : (requestProp ? [requestProp] : []);

  const requestList = baseList.map(r => {
    const item = (r.id === activeRequestId && requests.length > 0) ? { ...r, ...requestProp } : r;
    return {
      ...item,
      responses: Array.isArray(item.responses) 
        ? item.responses.map(resp => ({ ...resp, bodyFields: Array.isArray(resp.bodyFields) ? resp.bodyFields : [] })) 
        : []
    };
  });

  // Ensure the 'request' object always has 'responses' and 'bodyFields' as arrays
  const rawRequest = requestList.find(r => r.id === activeRequestId) || requestList[0] || {};
  const request = { ...rawRequest, 
    responses: Array.isArray(rawRequest.responses) ? rawRequest.responses.map(resp => ({ ...resp, bodyFields: Array.isArray(resp.bodyFields) ? resp.bodyFields : [] })) : [] 
  };
  
  const activeEnv = collection?.environments?.find(e => e.id === collection.activeEnvironmentId);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'editor'
  const isEditing = viewMode === 'editor';

  const [authExpanded, setAuthExpanded] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(false);
  const [headersExpanded, setHeadersExpanded] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [responsesExpanded, setResponsesExpanded] = useState(false);
  
  const renderMarkdown = (text) => {
    if (!text) return null;
    // Implementação básica de parser Markdown (Headers, Bold, Italic, Lists, Code, Links, Images)
    const html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b border-slate-200 dark:border-slate-800 pb-1 text-slate-900 dark:text-white">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black mt-8 mb-4 text-slate-900 dark:text-white">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-xl my-4 shadow-md border border-slate-200 dark:border-slate-800" />')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" class="text-blue-500 hover:underline">$1</a>')
      .replace(/`(.*?)`/gim, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs text-blue-600 dark:text-blue-400">$1</code>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-slate-700 dark:text-slate-300">$1</li>')
      .replace(/\n/gim, '<br />');

    return <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const handleToggleResponses = useCallback(() => {
    setResponsesExpanded(prev => !prev);
  }, []);

  const resolveVariables = (text) => {
    if (!text || !activeEnv) return text;
    let resolved = text;
    activeEnv.variables.forEach(v => {
      if (v.key) {
        const regex = new RegExp(`{{\\s*${v.key}\\s*}}`, 'g');
        resolved = resolved.replace(regex, v.value);
      }
    });
    return resolved;
  };

  const generateCurl = () => {
    const resolvedUrl = resolveVariables(request.url);
    let curl = `curl -X ${request.method} "${resolvedUrl}"`;
    
    (request.headers || []).forEach(h => {
      if (h.key) curl += ` \\\n  -H "${h.key}: ${resolveVariables(h.value)}"`;
    });

    if (request.bodyRaw && request.method !== 'GET') {
      curl += ` \\\n  -d '${request.bodyRaw.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const clearBodyParams = () => {
    const hasParams = request.bodyParams && request.bodyParams.length > 0;
    if (!hasParams) return;

    if (confirm("Isso removerá todas as descrições atuais da tabela para recriá-las. Continuar?")) {
      if (onClearBodyParams) {
        onClearBodyParams();
      } else {
        // Fallback caso a prop onClearBodyParams não exista: remove um por um
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
      // Adicione lógica para XML se desejar um beautifier de XML aqui
    } catch (e) {
      alert("Erro ao formatar: " + e.message);
    }
  };

  const syncFieldsFromRaw = () => {
    if (!request.bodyRaw) return;
    try {
      let discoveredFields = [];
      
      if (request.bodyType === 'json') {
        const parsed = JSON.parse(request.bodyRaw);
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

            // Determina o valor de exibição com segurança para evitar [object Object]
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

            // Se for um objeto, continua descendo para mapear as propriedades internas
            if (isObjectContainer) {
              flatten(val, path);
            }
          });
        };
        flatten(parsed);
        console.log("Discovered fields after flattening (JSON):", discoveredFields); // Debug log
      } else if (bodyType === 'xml') {
        const doc = new DOMParser().parseFromString(bodyRaw, "text/xml");
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
        console.log("Discovered fields after parsing (XML):", discoveredFields); // Debug log
      }

      // Usa diretamente a prop bodyParams que vem do estado do App.jsx
      const currentParams = bodyParams || [];
      // Conjunto para evitar adicionar a mesma chave nova duas vezes no mesmo loop
      const newlyAddedKeys = new Set();

      discoveredFields.forEach(field => {
        if (!field.key || field.key.trim() === '') return;
        const keyTrimmed = field.key.trim();
        
        const existingIndex = currentParams.findIndex(p => p.key && p.key.trim() === keyTrimmed);

        if (existingIndex >= 0) {
          // Atualiza campo existente
          updateBodyParam(existingIndex, 'type', field.type);
          updateBodyParam(existingIndex, 'value', field.value);
          updateBodyParam(existingIndex, 'docExample', field.docExample);
        } else if (!newlyAddedKeys.has(keyTrimmed)) {
          // Adiciona novo campo apenas se não foi processado neste loop
          newlyAddedKeys.add(keyTrimmed);
          addBodyParam(field);
        }
      });
    } catch (e) {
      alert("Não foi possível processar o corpo: " + e.message);
    }
  };

  const formatResponseBody = (responseIndex) => {
    const resp = request.responses[responseIndex];
    if (!resp || !resp.body) return;
    try {
      const parsed = JSON.parse(resp.body);
      updateResponse(responseIndex, 'body', JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert("Erro ao formatar JSON do corpo da resposta: " + e.message);
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
          else if (val === null) fieldType = 'object'; // Or 'null'
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

      // Atualiza os bodyFields para a resposta específica
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
      alert("Erro ao sincronizar campos do corpo da resposta: " + e.message);
    }
  };

  const generateDocHTML = (singleRequest = null) => {
    const targetRequests = singleRequest ? [singleRequest] : requestList;
    
    const isDark = theme === 'dark';
    const colors = {
      bg: isDark ? '#0f172a' : '#ffffff',
      text: isDark ? '#e2e8f0' : '#1e293b',
      border: isDark ? '#334155' : '#e2e8f0',
      title: isDark ? '#f8fafc' : '#0f172a',
      meta: isDark ? '#94a3b8' : '#64748b',
      tableHeader: isDark ? '#1e293b' : '#f1f5f9',
      mono: isDark ? '#3b82f6' : '#2563eb'
    };

    const tableStyle = `width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 11px;`;
    const thStyle = `text-align: left; background: ${colors.tableHeader}; padding: 8px; border: 1px solid ${colors.border}; color: ${colors.text}; text-transform: uppercase; font-size: 9px;`;
    const tdStyle = `padding: 8px; border: 1px solid ${colors.border}; vertical-align: top;`;
    const tableBodyFieldStyle = `width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px;`;
    const thBodyFieldStyle = `text-align: left; background: ${colors.tableHeader}; padding: 6px; border: 1px solid ${colors.border}; color: ${colors.text}; text-transform: uppercase; font-size: 8px;`;

    const renderStaticMarkdown = (text) => {
      if (!text) return "";
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.*$)/gim, `<h3 style="font-size: 16px; font-weight: 700; margin-top: 15px; color: ${colors.title}">$1</h3>`)
        .replace(/^## (.*$)/gim, `<h2 style="font-size: 18px; font-weight: 700; margin-top: 20px; border-bottom: 1px solid ${colors.border}; color: ${colors.title}">$1</h2>`)
        .replace(/^# (.*$)/gim, `<h1 style="font-size: 22px; font-weight: 900; margin-top: 25px; color: ${colors.title}">$1</h1>`)
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\)/gim, `<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; border: 1px solid ${colors.border};" />`)
        .replace(/\[(.*?)\]\((.*?)\)/gim, `<a href="$2" target="_blank" style="color: ${colors.mono}; text-decoration: underline;">$1</a>`)
        .replace(/`(.*?)`/gim, `<code style="background: ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>`)
        .replace(/^\- (.*$)/gim, '<li style="margin-left: 20px;">$1</li>')
        .replace(/\n/gim, '<br />');
    };

    const preambleHTML = collection?.generalDoc ? `
      <section style="margin-bottom: 50px; border-bottom: 2px solid ${colors.border}; padding-bottom: 30px;">
        <div style="font-size: 14px; line-height: 1.6; color: ${colors.text};">${renderStaticMarkdown(collection.generalDoc)}</div>
      </section>
    ` : '';

    const contentHTML = targetRequests.map(request => {
      const resolvedUrl = resolveVariables(request.url);
      return `
        <div style="margin-bottom: 80px; page-break-after: always;">
          <header style="border-bottom: 4px solid ${colors.mono}; padding-bottom: 10px;">
            <h1>${request.name}</h1>
            <div style="display: flex; align-items: center;">
              <span class="method ${request.method}">${request.method}</span>
              <span class="url">${resolvedUrl}</span>
            </div>
          </header>
          <section><h2>Descrição Geral</h2><div class="box">${request.description || 'Nenhuma descrição fornecida.'}</div></section>
          <section><h2>Autenticação</h2><div class="box"><strong>Tipo:</strong> ${request.authType === 'none' ? 'Sem Autenticação' : request.authType.toUpperCase()}<br/>${request.authDoc ? `<p style="margin-top: 10px;">${request.authDoc}</p>` : ''}</div></section>
          ${request.pathParams?.length ? `
          <section><h2>Path Parameters</h2><table style="${tableStyle}"><thead><tr><th style="${thStyle}">Parâmetro</th><th style="${thStyle}">Descrição</th><th style="${thStyle}">Obr.</th><th style="${thStyle}">Exemplo</th></tr></thead><tbody>
                ${request.pathParams.map(p => `<tr><td style="${tdStyle}" class="mono">${p.key}</td><td style="${tdStyle}">${p.docDescription || '-'}</td><td style="${tdStyle}">${p.docRequired ? 'Sim' : 'Não'}</td><td style="${tdStyle}" class="mono">${p.docExample || '-'}</td></tr>`).join('')}
              </tbody></table></section>` : ''}
          ${request.headers?.length ? `
          <section><h2>Headers</h2><table style="${tableStyle}"><thead><tr><th style="${thStyle}">Chave</th><th style="${thStyle}">Descrição</th><th style="${thStyle}">Obr.</th><th style="${thStyle}">Exemplo</th></tr></thead><tbody>
                ${request.headers.map(h => `<tr><td style="${tdStyle}" class="mono">${h.key}</td><td style="${tdStyle}">${h.docDescription || '-'}</td><td style="${tdStyle}">${h.docRequired ? 'Sim' : 'Não'}</td><td style="${tdStyle}" class="mono">${h.docExample || '-'}</td></tr>`).join('')}
              </tbody></table></section>` : ''}
          ${request.bodyType !== 'none' ? `
          <section><h2>Request Body (${request.bodyType.toUpperCase()})</h2>${request.bodyRawDoc ? `<div class="box" style="margin-bottom: 15px;">${request.bodyRawDoc}</div>` : ''}
            ${request.bodyParams?.length ? `
            <table style="${tableStyle}"><thead><tr><th style="${thStyle}">Campo</th><th style="${thStyle}">Tipo</th><th style="${thStyle}">Descrição</th><th style="${thStyle}">Obr.</th><th style="${thStyle}">Exemplo</th></tr></thead><tbody>
                ${request.bodyParams.map(p => `<tr><td style="${tdStyle}" class="mono">${p.key}</td><td style="${tdStyle}">${p.type}</td><td style="${tdStyle}">${p.docDescription || '-'}</td><td style="${tdStyle}">${p.docRequired ? 'Sim' : 'Não'}</td><td style="${tdStyle}" class="mono">${p.docExample || '-'}</td></tr>`).join('')}
              </tbody></table>` : ''}
            ${request.bodyRaw ? `<div style="margin-top: 15px;"><strong>Exemplo Raw:</strong><pre>${request.bodyRaw}</pre></div>` : ''}
          </section>` : ''}
          ${request.responses?.length ? `
          <section><h2>Exemplos de Respostas (Responses)</h2>
            ${(Array.isArray(request.responses) ? request.responses : []).map(resp => `
              <div style="margin-bottom: 20px; border: 1px solid ${colors.border}; border-radius: 8px; overflow: hidden;">
                <div style="background: ${colors.tableHeader}; padding: 8px 12px; border-bottom: 1px solid ${colors.border}; display: flex; align-items: center; gap: 10px;">
                  <span style="font-weight: 800; font-size: 11px; color: ${resp.statusCode?.startsWith('2') ? '#10b981' : '#ef4444'}">${resp.statusCode}</span>
                  <span style="font-size: 11px; font-weight: 700;">${resp.description || ''}</span>
                </div>
                ${resp.body ? `<pre style="margin: 0; border-radius: 0; border: none; font-size: 10px;">${resp.body}</pre>` : ''}
              </div>
              ${resp.bodyFields?.length ? `
              <h4 style="font-size: 10px; font-weight: 900; text-transform: uppercase; margin-top: 15px; margin-bottom: 5px; color: ${colors.text};">Campos do Corpo da Resposta</h4>
              <table style="${tableBodyFieldStyle}"><thead><tr><th style="${thBodyFieldStyle}">Campo</th><th style="${thBodyFieldStyle}">Tipo</th><th style="${thBodyFieldStyle}">Descrição</th><th style="${thBodyFieldStyle}">Obr.</th><th style="${thBodyFieldStyle}">Exemplo</th></tr></thead><tbody>
                    ${resp.bodyFields.map(p => `<tr>
                      <td style="${tdStyle}" class="mono">${p.key}</td>
                      <td style="${tdStyle}">${p.type}</td>
                      <td style="${tdStyle}">${p.docDescription || '-'}</td>
                      <td style="${tdStyle}">${p.docRequired ? 'Sim' : 'Não'}</td>
                      <td style="${tdStyle}" class="mono">${p.docExample || '-'}</td>
                    </tr>`).join('')}
                  </tbody></table>` : ''}
            `).join('')}
          </section>` : ''}
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Documentação Unificada</title><style>
      body { font-family: system-ui, sans-serif; color: ${colors.text}; background: ${colors.bg}; line-height: 1.5; padding: 40px; max-width: 900px; margin: 0 auto; }
      h1 { color: ${colors.title}; margin-bottom: 5px; font-size: 28px; font-weight: 800; }
      .method { display: inline-block; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 12px; border: 1px solid; margin-right: 10px; text-transform: uppercase; }
      .GET { color: #10b981; border-color: #10b98133; background: #10b98111; }
      .POST { color: #f59e0b; border-color: #f59e0b33; background: #f59e0b11; }
      .PUT { color: #3b82f6; border-color: #3b82f633; background: #3b82f611; }
      .DELETE { color: #ef4444; border-color: #ef444433; background: #ef444411; }
      .url { font-family: monospace; color: ${colors.meta}; font-size: 14px; }
      section { margin-top: 30px; }
      h2 { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid ${colors.border}; padding-bottom: 5px; margin-bottom: 10px; }
      .box { padding: 15px; border-radius: 8px; border: 1px solid ${colors.border}; background: ${isDark ? '#1e293b44' : '#f8fafc'}; font-size: 13px; white-space: pre-wrap; }
      .mono { font-family: monospace; color: ${colors.mono}; }
      pre { background: #0f172a; color: #cbd5e1; padding: 15px; border-radius: 8px; font-size: 11px; overflow-x: auto; }
      @media print { body { padding: 0; } .no-print { display: none; } }
    </style></head><body>${preambleHTML}${contentHTML}</body></html>`;
  };

  const exportDocHTML = () => {
    const blob = new Blob([generateDocHTML()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentacao-unificada-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDocPDF = () => {
    const win = window.open('', '_blank');
    win.document.write(generateDocHTML());
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* Header da Documentação */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">
                 {requestList.length}
               </div>
               <div>
                 <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate">
                   {isEditing ? "Editor de Documentação" : "Documentação Unificada"}
                 </h1>
                 <p className="text-slate-500 text-xs font-mono mt-1">
                   {requestList.length === 1 ? requestList[0].name : `${requestList.length} requisições selecionadas`}
                 </p>
               </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <button 
            onClick={() => updateRequestInCollection()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            ATUALIZAR REQUEST
          </button>
        )}

        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={exportDocHTML} className="px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1" title="Exportar HTML">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            HTML
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 self-center"></div>
          <button onClick={exportDocPDF} className="px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1" title="Imprimir ou Salvar PDF">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            PDF
          </button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            PREVIEW
          </button>
          <button 
            onClick={() => setViewMode('editor')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${viewMode === 'editor' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            EDITOR
          </button>
        </div>
      </div>

      {isEditing && requestList.length > 1 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase w-full mb-1">Selecione para editar:</span>
          {requestList.map(req => (
            <button 
              key={req.id}
              onClick={() => onSelectForEdit(req)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
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

      {/* Documentação Geral (Markdown) */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Documentação Geral</h3>
          </div>
          {isEditing && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Markdown Ativo</span>}
        </div>
        <div className="p-6">
          {isEditing ? (
            <textarea 
              className="input-base min-h-[150px] font-mono text-sm !bg-slate-50 dark:!bg-slate-950" 
              placeholder="Descreva informações globais da API, guia de autenticação, base URL, etc. (Suporta Markdown)"
              value={collection?.generalDoc || ''}
              onChange={(e) => onUpdateGeneralDoc(e.target.value)}
            />
          ) : (
            <div className="min-h-[60px]">
              {collection?.generalDoc ? renderMarkdown(collection.generalDoc) : <p className="text-slate-400 italic text-sm">Nenhuma documentação geral fornecida para esta coleção.</p>}
            </div>
          )}
        </div>
      </section>

      {requestList.map((req, reqIdx) => {
        // No modo editor, só mostramos os campos se for a request ativa
        const isTargetOfEdit = !isEditing || (activeRequestId === req.id);
        
        if (isEditing && !isTargetOfEdit) return null;

        // Prioriza o estado "vivo" (prop bodyParams) para a requisição ativa. Isso garante que o Preview
        // mostre as alterações feitas no Editor (sincronização ou manual) mesmo antes de salvar na coleção.
        const activeBodyParams = (req.id === activeRequestId) ? bodyParams : (req.bodyParams || []);

        return (
          <div key={req.id} className={`${!isEditing && reqIdx > 0 ? 'pt-12 border-t border-slate-200 dark:border-slate-800' : ''}`}>
            {!isEditing && (
              <div className="flex items-center gap-3 mb-8">
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${methodStyles[req.method]}`}>{req.method}</span>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">{req.name}</h2>
                <p className="text-[10px] font-mono text-slate-400 truncate flex-1">{req.url}</p>
              </div>
            )}
            
            {isEditing && (
              <div className="grid grid-cols-1 gap-4 mb-8">
                <div>
                  <label className="label-base">Nome da Requisição</label>
                  <input 
                    className="input-base text-lg font-bold" 
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
            )}

      <div className="space-y-12">
        {/* Descrição */}
        <section>
          <SectionHeader title="Documentação da URL" icon={<svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          {isEditing ? (
            <textarea 
              className="input-base min-h-[120px] font-sans text-sm" 
              placeholder="Escreva aqui uma visão geral do que este endpoint faz..."
                value={req.description}
              onChange={(e) => setDescription(e.target.value)}
            />
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                {req.description || "Nenhuma descrição fornecida."}
            </div>
          )}
        </section>

        {/* Segurança (Migrada para o fluxo principal para maximizar espaço horizontal) */}
        <section>
          <SectionHeader 
            title="Segurança & Autenticação" 
            icon={<svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>} 
            isExpanded={authExpanded}
            onToggle={() => setAuthExpanded(!authExpanded)}
          />
          {authExpanded && (
            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
              <div className="flex items-center gap-2 text-sm font-bold dark:text-slate-200">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                {isEditing ? (
                  <select className="input-base !py-1 !text-xs bg-transparent max-w-xs" value={req.authType} onChange={(e) => setAuthType(e.target.value)}>
                    <option value="none">Nenhum</option>
                    <option value="bearer">Bearer</option>
                    <option value="basic">Basic</option>
                    <option value="apikey">API Key</option>
                  </select>
                ) : (
                  req.authType === 'none' ? "Sem Autenticação" : req.authType.toUpperCase()
                )}
              </div>
              {isEditing ? (
                <textarea className="input-base text-[11px] min-h-[60px] mt-4" placeholder="Explique como obter as credenciais..." value={authDoc || ''} onChange={(e) => setAuthDoc(e.target.value)} />
              ) : req.authDoc && (
                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap mt-2">{authDoc}</p>
              )}
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
                    {isEditing && <th className="px-4 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(Array.isArray(req.pathParams) ? req.pathParams : []).map((p, i) => (
                    <tr key={i} className="dark:text-slate-300">
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={p.key} onChange={(e) => updatePathParam(i, 'key', e.target.value)} /> : <span className="font-mono text-indigo-500 break-all">{p.key || '-'}</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={p.value} onChange={(e) => updatePathParam(i, 'value', e.target.value)} /> : <span className="font-mono text-slate-400 break-all">{resolveVariables(p.value) || '-'}</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={p.docDescription} onChange={(e) => updatePathParam(i, 'docDescription', e.target.value)} /> : <span className="text-slate-500 italic text-xs whitespace-pre-wrap break-words">{p.docDescription || '-'}</span>}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        {isEditing ? <input type="checkbox" checked={p.docRequired} onChange={(e) => updatePathParam(i, 'docRequired', e.target.checked)} /> : (p.docRequired ? <span className="text-rose-500 font-bold">Sim</span> : 'Não')}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={p.docExample} onChange={(e) => updatePathParam(i, 'docExample', e.target.value)} /> : <code className="text-[10px] text-slate-400 break-all">{p.docExample || '-'}</code>}
                      </td>
                      {isEditing && (
                        <td className="px-4 py-3 text-center align-top">
                          <button onClick={() => removePathParam(i)} className="text-rose-500 hover:text-rose-700">×</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {isEditing && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => addPathParam()} className="text-xs font-bold text-indigo-500">+ ADICIONAR PATH PARAM</button>
                </div>
              )}
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
                    {isEditing && <th className="px-4 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(Array.isArray(req.headers) ? req.headers : []).map((h, i) => (
                    <tr key={i} className="dark:text-slate-300">
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} /> : <span className="font-mono text-blue-500 break-all">{h.key || '-'}</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} /> : <span className="font-mono text-slate-400 break-all">{resolveVariables(h.value) || '-'}</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={h.docDescription} onChange={(e) => updateHeader(i, 'docDescription', e.target.value)} /> : <span className="text-slate-500 italic text-xs whitespace-pre-wrap break-words">{h.docDescription || '-'}</span>}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        {isEditing ? <input type="checkbox" checked={h.docRequired} onChange={(e) => updateHeader(i, 'docRequired', e.target.checked)} /> : (h.docRequired ? <span className="text-rose-500 font-bold">Sim</span> : 'Não')}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={h.docExample} onChange={(e) => updateHeader(i, 'docExample', e.target.value)} /> : <code className="text-[10px] text-slate-400 break-all">{h.docExample || '-'}</code>}
                      </td>
                      {isEditing && (
                        <td className="px-4 py-3 text-center align-top">
                          <button onClick={() => removeHeader(i)} className="text-rose-500 hover:text-rose-700">×</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {isEditing && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={addHeader} className="text-xs font-bold text-blue-500">+ ADICIONAR HEADER</button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Body */}
        {req.bodyType !== 'none' && (
          <section>
            <SectionHeader 
              title={`Request Body (${req.bodyType})`} 
              icon={<svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>} 
              isExpanded={bodyExpanded}
              onToggle={() => setBodyExpanded(!bodyExpanded)}
            />
            {bodyExpanded && (
            <>
            {/* Documentação do Body Raw */}
            {['json', 'xml', 'text'].includes(req.bodyType) && (
              <div className="mb-4">
                {isEditing ? (
                  <textarea 
                    className="input-base text-xs min-h-[100px]" 
                    placeholder="Explique o schema ou campos importantes do corpo da requisição..."
                    value={bodyRawDoc}
                    onChange={(e) => setBodyRawDoc(e.target.value)}
                  />
                ) : bodyRawDoc && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                    {bodyRawDoc}
                  </div>
                )}
              </div>
            )}

            {/* Editor Técnico de Body Raw (Opcional no Editor) */}
            {isEditing && ['json', 'xml', 'text'].includes(req.bodyType) && (
               <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Editor Técnico (Body)</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={formatBody}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-600 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded uppercase transition-colors"
                      >
                        Formatar
                      </button>
                      <button 
                        onClick={clearBodyParams}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded uppercase transition-colors"
                      >
                        Limpar Tabela
                      </button>
                      <button 
                        onClick={syncFieldsFromRaw}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded uppercase transition-colors"
                        title="Sincroniza chaves do JSON/XML com a tabela de documentação"
                      >
                        Sincronizar ↓
                      </button>
                    </div>
                  </div>
                  <textarea 
                    className="input-base !bg-slate-950 !text-emerald-400 font-mono text-xs min-h-[150px]" 
                    value={req.bodyRaw} 
                    onChange={(e) => setBodyRaw(e.target.value)} 
                  />
               </div>
            )}

            {/* Exemplo de Body Raw no Preview */}
            {!isEditing && ['json', 'xml', 'text'].includes(req.bodyType) && (
              <div className="mb-6">
              <pre className="bg-slate-950 p-6 rounded-2xl text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800">
                {req.bodyRaw || "// Sem corpo definido"}
              </pre>
              <button 
                onClick={() => copyToClipboard(req.bodyRaw)}
                className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
            </div>
            )}

            {/* Tabela de Parâmetros / Campos (Agora disponível para todos os tipos de body) */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-3 w-[20%]">Campo / Chave</th>
                      <th className="px-4 py-3 w-[20%]">Valor / Tipo</th>
                      <th className="px-4 py-3 w-[35%]">Descrição</th>
                      <th className="px-4 py-3 w-16 text-center">Obr.</th>
                      <th className="px-4 py-3 w-[20%]">Exemplo</th>
                      {isEditing && <th className="px-4 py-3 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeBodyParams.map((p, i) => (
                      <tr key={i} className="dark:text-slate-300">
                        <td className="px-4 py-3 font-mono text-amber-500 break-all align-top">
                          {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={p.key} onChange={(e) => updateBodyParam(i, 'key', e.target.value)} /> : (p.key || '-')}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <select className="input-base !py-1 !px-1 text-[10px] w-14" value={p.type} onChange={(e) => updateBodyParam(i, 'type', e.target.value)}>
                                <option value="text">string</option>
                                <option value="int">int</option>
                                <option value="float">float</option>
                                <option value="array">array</option>
                                <option value="object">object</option>
                                <option value="bool">bool</option>
                                <option value="enum">enum</option>
                                <option value="file">file</option>
                                </select>
                              <input className="input-base !py-1 !px-2 text-xs" value={p.value} onChange={(e) => updateBodyParam(i, 'value', e.target.value)} />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{p.type || 'text'}</span>
                              <span className="text-xs break-all text-slate-600 dark:text-slate-300">{resolveVariables(p.value) || (p.type === 'object' ? '' : '-')}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {isEditing ? <textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={p.docDescription} onChange={(e) => updateBodyParam(i, 'docDescription', e.target.value)} /> : <span className="text-slate-500 text-xs whitespace-pre-wrap">{p.docDescription || '-'}</span>}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          {isEditing ? <input type="checkbox" checked={p.docRequired} onChange={(e) => updateBodyParam(i, 'docRequired', e.target.checked)} /> : (p.docRequired ? <span className="text-rose-500 font-bold">Sim</span> : 'Não')}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {isEditing ? <input className="input-base !py-1 !px-2 text-xs" value={p.docExample} onChange={(e) => updateBodyParam(i, 'docExample', e.target.value)} /> : <code className="text-[10px] text-slate-400 break-all">{p.docExample || '-'}</code>}
                        </td>
                        {isEditing && (
                          <td className="px-4 py-3 text-center align-top">
                            <button onClick={() => removeBodyParam(i)} className="text-rose-500 hover:text-rose-700">×</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {isEditing && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={addBodyParam} className="text-xs font-bold text-amber-500">+ ADICIONAR PARÂMETRO / CAMPO</button>
                  </div>
                )}
              </div>
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
            <div className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  {(Array.isArray(req.responses) ? req.responses : []).map((resp, i) => (
                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex gap-3">
                        <input className="input-base !w-24 font-bold text-center" placeholder="200" value={resp.statusCode} onChange={(e) => updateResponse(i, 'statusCode', e.target.value)} title="Código de Status HTTP"/>
                        <input className="input-base flex-1" placeholder="Descrição (ex: Usuário Criado)" value={resp.description} onChange={(e) => updateResponse(i, 'description', e.target.value)} />
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
                            Formatar
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); syncFieldsFromResponseBody(i); }}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded uppercase transition-colors"
                            title="Sincroniza chaves do JSON com a tabela de documentação"
                          >
                            Sincronizar ↓
                          </button>
                        </div>
                      </div>

                      {/* Tabela de Campos do Corpo da Resposta */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] whitespace-nowrap">
                            <tr>
                              <th className="px-4 py-3 w-[20%]">Campo / Chave</th>
                              <th className="px-4 py-3 w-[20%]">Tipo</th>
                              <th className="px-4 py-3 w-[35%]">Descrição</th>
                              <th className="px-4 py-3 w-16 text-center">Obr.</th>
                              <th className="px-4 py-3 w-[20%]">Exemplo</th>
                              <th className="px-4 py-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(Array.isArray(resp.bodyFields) ? resp.bodyFields : []).map((field, fieldIdx) => (
                              <tr key={fieldIdx} className="dark:text-slate-300">
                                <td className="px-4 py-3 font-mono text-purple-500 break-all align-top">
                                  <input className="input-base !py-1 !px-2 text-xs" value={field.key} onChange={(e) => updateResponseField(i, fieldIdx, 'key', e.target.value)} />
                                </td>
                                <td className="px-4 py-3 align-top">
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
                                <td className="px-4 py-3 align-top">
                                  <textarea className="input-base !py-1 !px-2 text-xs min-h-[32px]" value={field.docDescription} onChange={(e) => updateResponseField(i, fieldIdx, 'docDescription', e.target.value)} />
                                </td>
                                <td className="px-4 py-3 text-center align-top">
                                  <input type="checkbox" checked={field.docRequired} onChange={(e) => updateResponseField(i, fieldIdx, 'docRequired', e.target.checked)} />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input className="input-base !py-1 !px-2 text-xs" value={field.docExample} onChange={(e) => updateResponseField(i, fieldIdx, 'docExample', e.target.value)} />
                                </td>
                                <td className="px-4 py-3 text-center align-top">
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
                  <button onClick={(e) => { e.stopPropagation(); addResponse(); }} className="text-xs font-bold text-purple-500">+ ADICIONAR RESPOSTA</button>
                </div>
              ) : (
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
            </div>
          )}
        </section>
        </div>
      </div>
      );
    })}

      {/* Snippet cURL ao final da página */}
      {!isEditing && requestList.length === 1 && (
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Exemplo de Requisição (cURL)</h4>
          <button onClick={() => copyToClipboard(generateCurl())} className="text-blue-500 hover:text-blue-400 text-xs font-bold transition-colors">Copiar Comando</button>
        </div>
        <code className="text-[11px] font-mono text-blue-300 break-all whitespace-pre-wrap leading-relaxed">
          {generateCurl()}
        </code>
      </div>
      )}

      {isEditing && <p className="text-center text-xs text-emerald-500 font-bold animate-pulse">● Modo de Edição Ativo - Alterações são salvas automaticamente na coleção.</p>}

      {/* Dica Swagger */}
      <div className="text-center pt-12">
        <p className="text-[10px] text-slate-400 italic">Esta documentação é gerada automaticamente com base nas configurações da requisição e do ambiente ativo.</p>
      </div>
    </div>
  );
}