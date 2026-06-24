import React, { useState } from 'react';
import SaveRequestForm from '../SaveRequestForm';
import ConfigView from '../ConfigView';
import DocumentationView from '../DocumentationView';
import ReportView from '../ReportView';
import ReportGeneratorModal from './ReportGeneratorModal';

export default function RequestsPanel({
  t,
  collection,
  editorProps,
  isEditingAction,
  rightPanelTab,
  setRightPanelTab,
  rightPanelSize,
  setRightPanelSize,
  isRunning,
  reportData,
  requestLogs,
  sendRequests,
  stopTest,
  lastExecutedPayload,
  onSaveResponseToDoc,
  docProps,
  onCloseRequestEditor,
}) {
  const [showReportModal, setShowReportModal] = useState(false);

  if (!isEditingAction) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-4">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
        </div>
        <p className="text-sm">{t.collection.exploreTitle || "Selecione uma Action para começar"}</p>
        
        {/* Botão Gerar Relatório */}
        <button
          onClick={() => setShowReportModal(true)}
          className="mt-6 px-6 py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-xs font-bold uppercase tracking-wider">{t.collection.actions?.unifiedDoc || 'Gerar Relatório de Documentação'}</span>
        </button>

        {showReportModal && (
          <ReportGeneratorModal
            collection={collection}
            t={t}
            theme={editorProps?.theme || 'dark'}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Coluna 2: Editor de Requisição */}
      {rightPanelSize !== 'maximized' && (
        <div className="flex-1 flex flex-col border-r theme-border theme-base overflow-hidden p-6 custom-scrollbar">
          <div className="max-w-[1100px] w-full mx-auto">
            <SaveRequestForm 
              onSaveRequest={editorProps.updateRequestInCollection}
              requestName={editorProps.requestName}
              setRequestName={editorProps.setRequestName}
              method={editorProps.method}
              setMethod={editorProps.setMethod}
              onRun={() => { setRightPanelTab('execution'); if (rightPanelSize === 'minimized') setRightPanelSize('normal'); editorProps.sendRequests(); }}
              onClose={onCloseRequestEditor}
              t={t}
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto px-4">
            <ConfigView {...editorProps} />
          </div>
        </div>
      )}

      {/* Coluna 3: Painel Lateral (Execução/Docs) */}
      <div className={`flex flex-col theme-surface transition-all duration-500 border-l theme-border ${rightPanelSize === 'maximized' ? 'flex-1' : rightPanelSize === 'minimized' ? 'w-12' : 'w-[clamp(350px,35%,500px)]'}`}>
        <div className={`p-4 border-b theme-border shrink-0 flex items-center gap-3 ${rightPanelSize === 'minimized' ? 'flex-col !p-2' : ''}`}>
          {rightPanelSize !== 'minimized' ? (
            <div className="flex flex-1 theme-base p-1 rounded-2xl border theme-border">
              <button onClick={() => setRightPanelTab('docs')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${rightPanelTab === 'docs' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-slate-500 hover:text-slate-400 hover:bg-white/[0.02]'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                {t.config.panels.documentation}
              </button>
              <button onClick={() => setRightPanelTab('execution')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${rightPanelTab === 'execution' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-slate-500 hover:text-slate-400 hover:bg-white/[0.02]'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                {t.config.panels.execution}
                {isRunning && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <button onClick={() => { setRightPanelTab('docs'); setRightPanelSize('normal'); }} className={`p-2 rounded-lg ${rightPanelTab === 'docs' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500'}`} title={t.config.panels.documentation}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </button>
              <button onClick={() => { setRightPanelTab('execution'); setRightPanelSize('normal'); }} className={`p-2 rounded-lg relative ${rightPanelTab === 'execution' ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500'}`} title={t.config.panels.execution}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                {isRunning && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.6)]"></span>}
              </button>
            </div>
          )}

          <div className={`flex gap-1 ${rightPanelSize === 'minimized' ? 'flex-col mt-auto' : ''}`}>
            <button onClick={() => setRightPanelSize(rightPanelSize === 'maximized' ? 'normal' : 'maximized')} className="p-2 text-slate-500 hover:theme-text-secondary hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'maximized' ? t.config.panels.restore : t.config.panels.maximize}>
              {rightPanelSize === 'maximized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9h6m-6 6h6M4 4h16v16H4V4z"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4"/></svg>}
            </button>
            <button onClick={() => setRightPanelSize(rightPanelSize === 'minimized' ? 'normal' : 'minimized')} className="p-2 text-slate-500 hover:theme-text-secondary hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'minimized' ? t.config.panels.expand : t.config.panels.collapse}>
              {rightPanelSize === 'minimized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </div>
        
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 ${rightPanelSize === 'minimized' ? 'hidden' : 'block'}`}>
          {rightPanelTab === 'docs' ? (
            <DocumentationView 
              key={editorProps.activeRequestId || 'empty'}
              {...docProps} 
              requests={[]} 
              t={t} 
              collection={collection} 
              onBack={() => setRightPanelTab('execution')} 
              methodStyles={editorProps.methodStyles} 
            />
          ) : (
            <ReportView t={t} reportData={reportData} requestLogs={requestLogs} setView={() => {}} config={{ ...editorProps, body: editorProps.bodyRaw }} activeCollectionId={collection.id} activeCollection={collection} sendRequests={sendRequests} isRunning={isRunning} onStop={stopTest} lastExecutedPayload={lastExecutedPayload} onSaveResponseToDoc={onSaveResponseToDoc} theme={editorProps.theme} />
          )}
        </div>
      </div>
    </div>
  );
}
