/**
 * Renders markdown text to an HTML string for use in dangerouslySetInnerHTML (React preview).
 */
export function renderMarkdownToHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b border-slate-200 dark:border-slate-800 pb-1 text-slate-900 dark:text-white">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black mt-8 mb-4 text-slate-900 dark:text-white">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
    .replace(/!\[(.*?)\]\(\s*([^"'\s\)]+)(?:\s*(['"])(.*?)\3)?\s*\)/gim, (m, alt, url, q, title) => {
      return `<img src="${url}" alt="${alt}" ${title ? `title="${title}"` : ''} class="max-w-full h-auto rounded-xl my-4 shadow-md border border-slate-200 dark:border-slate-800" />`;
    })
    .replace(/\[(.*?)\]\(\s*([^"'\s\)]+)(?:\s*(['"])(.*?)\3)?\s*\)/gim, (m, text, url, q, title) => {
      return `<a href="${url}" ${title ? `title="${title}"` : ''} target="_blank" class="text-blue-500 hover:underline">${text}</a>`;
    })
    .replace(/`(.*?)`/gim, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs text-blue-600 dark:text-blue-400">$1</code>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-slate-700 dark:text-slate-300">$1</li>')
    .replace(/\n/gim, '<br />');
}

/**
 * Resolves environment variables in a text string.
 */
export function resolveVariables(text, activeEnv) {
  if (!text || !activeEnv) return text;
  let resolved = text;
  activeEnv.variables.forEach(v => {
    if (v.key) {
      const regex = new RegExp(`{{\\s*${v.key}\\s*}}`, 'g');
      resolved = resolved.replace(regex, v.value);
    }
  });
  return resolved;
}

/**
 * Generates a cURL command string from a request object.
 */
export function generateCurl(request, activeEnv) {
  const resolvedUrl = resolveVariables(request.url, activeEnv);
  let curl = `curl -X ${request.method} "${resolvedUrl}"`;
  
  (request.headers || []).forEach(h => {
    if (h.key) curl += ` \\\n  -H "${h.key}: ${resolveVariables(h.value, activeEnv)}"`;
  });

  if (request.bodyRaw && request.method !== 'GET') {
    curl += ` \\\n  -d '${request.bodyRaw.replace(/'/g, "'\\''")}'`;
  }
  return curl;
}

/**
 * Renders markdown text to static HTML (for export/PDF).
 */
function renderStaticMarkdown(text, colors, isDark) {
  if (!text) return "";
  return text
    .replace(/&/g, '&amp;')
    .replace(/^### (.*$)/gim, `<h3 style="font-size: 16px; font-weight: 700; margin-top: 15px; color: ${colors.title}">$1</h3>`)
    .replace(/^## (.*$)/gim, `<h2 style="font-size: 18px; font-weight: 700; margin-top: 20px; border-bottom: 1px solid ${colors.border}; color: ${colors.title}">$1</h2>`)
    .replace(/^# (.*$)/gim, `<h1 style="font-size: 22px; font-weight: 900; margin-top: 25px; color: ${colors.title}">$1</h1>`)
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/!\[(.*?)\]\(\s*([^"'\s\)]+)(?:\s*(['"])(.*?)\3)?\s*\)/gim, (m, alt, url, q, title) => {
      return `<img src="${url}" alt="${alt}" ${title ? `title="${title}"` : ''} style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; border: 1px solid ${colors.border};" />`;
    })
    .replace(/\[(.*?)\]\(\s*([^"'\s\)]+)(?:\s*(['"])(.*?)\3)?\s*\)/gim, (m, text, url, q, title) => {
      return `<a href="${url}" ${title ? `title="${title}"` : ''} target="_blank" style="color: ${colors.mono}; text-decoration: underline;">${text}</a>`;
    })
    .replace(/`(.*?)`/gim, `<code style="background: ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>`)
    .replace(/^\- (.*$)/gim, '<li style="margin-left: 20px;">$1</li>')
    .replace(/\n/gim, '<br />');
}

/**
 * Generates a full HTML document for export / PDF print.
 */
export function generateDocHTML(requestList, activeEnv, theme) {
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

  const preambleHTML = '';

  const contentHTML = requestList.map(request => {
    const resolvedUrl = resolveVariables(request.url, activeEnv);
    return `
      <div style="margin-bottom: 80px; page-break-after: always;">
        <section><div class="box">${renderStaticMarkdown(request.documentation, colors, isDark) || ''}</div></section>
        <header style="border-bottom: 4px solid ${colors.mono}; padding-bottom: 10px;">
          <h1>${request.name}</h1>
          <div style="display: flex; align-items: center;">
            <span class="method ${request.method}">${request.method}</span>
            <span class="url">${resolvedUrl}</span>
          </div>
        </header>
        <section><h2>Autenticação</h2><div class="box"><strong>Tipo:</strong> ${!request.authType || request.authType === 'none' ? 'Sem Autenticação' : request.authType.toUpperCase()}<br/>${request.authDoc ? `<div style="margin-top: 10px;">${renderStaticMarkdown(request.authDoc, colors, isDark)}</div>` : ''}</div></section>
        ${request.pathParams?.length ? `
        <section><h2>Path Parameters</h2><table style="${tableStyle}"><thead><tr><th style="${thStyle}">Parâmetro</th><th style="${thStyle}">Descrição</th><th style="${thStyle}">Obr.</th><th style="${thStyle}">Exemplo</th></tr></thead><tbody>
              ${request.pathParams.map(p => `<tr><td style="${tdStyle}" class="mono">${p.key}</td><td style="${tdStyle}">${p.docDescription || '-'}</td><td style="${tdStyle}">${p.docRequired ? 'Sim' : 'Não'}</td><td style="${tdStyle}" class="mono">${p.docExample || '-'}</td></tr>`).join('')}
            </tbody></table></section>` : ''}
        ${request.headers?.length ? `
        <section><h2>Headers</h2><table style="${tableStyle}"><thead><tr><th style="${thStyle}">Chave</th><th style="${thStyle}">Descrição</th><th style="${thStyle}">Obr.</th><th style="${thStyle}">Exemplo</th></tr></thead><tbody>
              ${request.headers.map(h => `<tr><td style="${tdStyle}" class="mono">${h.key}</td><td style="${tdStyle}">${h.docDescription || '-'}</td><td style="${tdStyle}">${h.docRequired ? 'Sim' : 'Não'}</td><td style="${tdStyle}" class="mono">${h.docExample || '-'}</td></tr>`).join('')}
            </tbody></table></section>` : ''}
        ${request.bodyType && request.bodyType !== 'none' ? `
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
    .box { font-size: 13px; }
    .mono { font-family: monospace; color: ${colors.mono}; }
    pre { background: #0f172a; color: #cbd5e1; padding: 15px; border-radius: 8px; font-size: 11px; overflow-x: auto; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style></head><body>${preambleHTML}${contentHTML}</body></html>`;
}
