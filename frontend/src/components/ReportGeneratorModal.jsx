import React, { useState, useCallback } from 'react';
import DocPreview from './documentation/DocPreview';
import { generateDocHTML } from './documentation/exportUtils';

export default function ReportGeneratorModal({ collection, t, theme, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [orderedRequests, setOrderedRequests] = useState([]);
  const [reportTitle, setReportTitle] = useState(collection?.name || 'Documentação da API');
  const [draggedIdx, setDraggedIdx] = useState(null);

  // Extrai todas as requests (incluindo dentro de pastas) recursivamente
  const getAllRequests = useCallback((items) => {
    let reqs = [];
    if (!items) return reqs;
    items.forEach(item => {
      if (item.type === 'folder') {
        reqs = [...reqs, ...getAllRequests(item.requests || [])];
      } else {
        reqs.push(item);
      }
    });
    return reqs;
  }, []);

  const allRequests = getAllRequests(collection?.requests || []);

  const toggleRequest = (req) => {
    const isSelected = selectedIds.includes(req.id);
    if (isSelected) {
      setSelectedIds(prev => prev.filter(id => id !== req.id));
      setOrderedRequests(prev => prev.filter(r => r.id !== req.id));
    } else {
      setSelectedIds(prev => [...prev, req.id]);
      setOrderedRequests(prev => [...prev, { ...req, responses: Array.isArray(req.responses) ? req.responses.map(r => ({ ...r, bodyFields: Array.isArray(r.bodyFields) ? r.bodyFields : [] })) : [] }]);
    }
  };

  const selectAll = () => {
    const allIds = allRequests.map(r => r.id);
    setSelectedIds(allIds);
    setOrderedRequests(allRequests.map(r => ({ ...r, responses: Array.isArray(r.responses) ? r.responses.map(resp => ({ ...resp, bodyFields: Array.isArray(resp.bodyFields) ? resp.bodyFields : [] })) : [] })));
  };

  const deselectAll = () => {
    setSelectedIds([]);
    setOrderedRequests([]);
  };

  const moveItem = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= orderedRequests.length) return;
    const newList = [...orderedRequests];
    const [removed] = newList.splice(index, 1);
    newList.splice(newIndex, 0, removed);
    setOrderedRequests(newList);
    setSelectedIds(newList.map(r => r.id));
  };

  const handleDragStart = (index) => {
    setDraggedIdx(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const newList = [...orderedRequests];
    const [removed] = newList.splice(draggedIdx, 1);
    newList.splice(index, 0, removed);
    setOrderedRequests(newList);
    setSelectedIds(newList.map(r => r.id));
    setDraggedIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const activeEnv = collection?.environments?.find(e => e.id === collection.activeEnvironmentId);

  const exportHTML = () => {
    const html = generateDocHTML(orderedRequests, activeEnv, theme);
    // Injeta título customizado
    const finalHtml = html.replace('<title>Documentação Unificada</title>', `<title>${reportTitle}</title>`);
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const html = generateDocHTML(orderedRequests, activeEnv, theme);
    const finalHtml = html.replace('<title>Documentação Unificada</title>', `<title>${reportTitle}</title>`);
    const win = window.open('', '_blank');
    win.document.write(finalHtml);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const methodColors = {
    GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    POST: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  const methodStyles = {
    GET: 'method-get', POST: 'method-post', PUT: 'method-put',
    DELETE: 'method-delete', PATCH: 'method-patch', HEAD: 'method-head', OPTIONS: 'method-options'
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="h-14 border-b theme-border theme-elevated flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/30">
              {orderedRequests.length}
            </div>
            <input
              className="bg-transparent border-none outline-none text-lg font-black text-white placeholder:text-slate-600 w-64"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Título do Relatório..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportHTML}
            disabled={orderedRequests.length === 0}
            className="px-4 py-2 text-[10px] font-bold text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-2 bg-white/5 rounded-lg border theme-border disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            EXPORTAR HTML
          </button>
          <button
            onClick={exportPDF}
            disabled={orderedRequests.length === 0}
            className="px-4 py-2 text-[10px] font-bold text-slate-300 hover:text-rose-400 transition-colors flex items-center gap-2 bg-white/5 rounded-lg border theme-border disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            EXPORTAR PDF
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Seleção e Ordenação */}
        <div className="w-96 border-r theme-border flex flex-col theme-base">
          <div className="p-4 border-b theme-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selecionar Actions</h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors">Todas</button>
                <span className="text-slate-700">|</span>
                <button onClick={deselectAll} className="text-[9px] font-bold text-slate-500 hover:text-slate-300 transition-colors">Nenhuma</button>
              </div>
            </div>
            <p className="text-[10px] text-slate-600">{selectedIds.length} de {allRequests.length} selecionadas</p>
          </div>

          {/* Lista de todas as requests (para seleção) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {allRequests.map(req => (
              <div
                key={req.id}
                onClick={() => toggleRequest(req)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                  selectedIds.includes(req.id)
                    ? 'bg-blue-600/10 border-blue-500/30'
                    : 'border-transparent hover:bg-white/5'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                  selectedIds.includes(req.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-600'
                }`}>
                  {selectedIds.includes(req.id) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                  )}
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 ${methodColors[req.method] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                  {req.method}
                </span>
                <span className="text-xs font-medium text-slate-300 truncate">{req.name}</span>
              </div>
            ))}
          </div>

          {/* Lista ordenada (drag to reorder) */}
          {orderedRequests.length > 0 && (
            <div className="border-t theme-border">
              <div className="p-3 border-b theme-border">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ordem no Relatório</h3>
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {orderedRequests.map((req, index) => (
                  <div
                    key={req.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border theme-border group transition-all ${
                      draggedIdx === index ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <span className="text-[9px] font-black text-slate-600 w-5 text-center">{index + 1}</span>
                    <svg className="w-3 h-3 text-slate-600 cursor-grab shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                    <span className={`text-[8px] font-black px-1 py-0.5 rounded border shrink-0 ${methodColors[req.method] || ''}`}>{req.method}</span>
                    <span className="text-[10px] font-medium text-slate-400 truncate flex-1">{req.name}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button disabled={index === 0} onClick={() => moveItem(index, 'up')} className={`p-0.5 text-slate-500 hover:text-blue-400 ${index === 0 ? 'opacity-20' : ''}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5"/></svg>
                      </button>
                      <button disabled={index === orderedRequests.length - 1} onClick={() => moveItem(index, 'down')} className={`p-0.5 text-slate-500 hover:text-blue-400 ${index === orderedRequests.length - 1 ? 'opacity-20' : ''}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Painel Direito: Preview */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar theme-base">
          {orderedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <p className="text-sm font-medium">Selecione as actions para gerar o relatório</p>
              <p className="text-xs text-slate-600">As documentações serão exibidas aqui na ordem definida</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center border-b theme-border pb-6 mb-8">
                <h1 className="text-2xl font-black text-white">{reportTitle}</h1>
                <p className="text-xs text-slate-500 mt-2">{orderedRequests.length} endpoint{orderedRequests.length !== 1 ? 's' : ''} documentado{orderedRequests.length !== 1 ? 's' : ''}</p>
              </div>
              {orderedRequests.map((req, reqIdx) => (
                <DocPreview
                  key={req.id}
                  req={req}
                  reqIdx={reqIdx}
                  activeEnv={activeEnv}
                  methodStyles={methodStyles}
                  authExpanded={true}
                  setAuthExpanded={() => {}}
                  pathExpanded={true}
                  setPathExpanded={() => {}}
                  headersExpanded={true}
                  setHeadersExpanded={() => {}}
                  bodyExpanded={true}
                  setBodyExpanded={() => {}}
                  responsesExpanded={true}
                  handleToggleResponses={() => {}}
                  activeBodyParams={req.bodyParams || []}
                  copyToClipboard={(text) => navigator.clipboard.writeText(text)}
                  requestList={orderedRequests}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
