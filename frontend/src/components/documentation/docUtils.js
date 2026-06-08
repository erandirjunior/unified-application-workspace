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

export function renderMarkdown(text) {
  if (!text) return null;
  const html = text
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

  return html;
}

export function renderStaticMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/gim, '<br />');
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert('Copiado para a área de transferência!');
}
