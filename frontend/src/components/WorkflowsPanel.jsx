import React from 'react';
import WorkflowEditorView from '../WorkflowEditorView';
import SaveRequestForm from '../SaveRequestForm';
import ConfigView from '../ConfigView';
import ReportView from '../ReportView';

export default function WorkflowsPanel({
  t,
  collection,
  editorProps,
  editingWorkflowId,
  setEditingWorkflowId,
  setActiveWorkflowId,
  setActiveStepIndex,
  setActiveSubIndex,
  onUpdateWorkflows,
  onRunRequest,
  onSelectRequest,
  rightPanelSize,
  setRightPanelSize,
  isRunning,
  reportData,
  requestLogs,
  sendRequests,
  stopTest,
  lastExecutedPayload,
  onSaveResponseToDoc,
}) {
  if (!editingWorkflowId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-4">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <p className="text-sm">{t.collection.selectWorkflow}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Coluna 2: Editor de Workflow */}
      {rightPanelSize !== 'maximized' && (
        <div className="flex-1 flex flex-col border-r theme-border theme-base overflow-hidden p-6 custom-scrollbar">
          {editorProps.activeStepIndex !== null ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6">
                <button 
                  onClick={() => {
                    setActiveStepIndex(null);
                    setActiveSubIndex(null);
                  }}
                  className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                  {t.config.actions.backToWork}
                </button>
              </div>
              <div className="max-w-[1100px] w-full mx-auto">
                <SaveRequestForm 
                  onSaveRequest={() => editorProps.updateRequestInCollection()}
                  requestName={editorProps.requestName}
                  setRequestName={editorProps.setRequestName}
                  method={editorProps.method}
                  setMethod={editorProps.setMethod}
                  onRun={null}
                  onClose={() => {
                    setActiveStepIndex(null);
                    setActiveSubIndex(null);
                  }}
                  t={t}
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto">
                <ConfigView {...editorProps} />
              </div>
            </div>
          ) : (
            <>
              <div className="max-w-[1100px] w-full mx-auto">
                <SaveRequestForm
                  onSaveRequest={() => {
                    const wf = collection.workflows?.find(f => f.id === editingWorkflowId);
                    if (wf) onUpdateWorkflows(collection.id, collection.workflows.map(w => w.id === wf.id ? wf : w));
                  }}
                  requestName={collection.workflows?.find(f => f.id === editingWorkflowId)?.name || ''}
                  setRequestName={(newName) => {
                    const wf = collection.workflows?.find(f => f.id === editingWorkflowId);
                    if (wf) onUpdateWorkflows(collection.id, collection.workflows.map(w => w.id === wf.id ? { ...w, name: newName } : w));
                  }}
                  onRun={() => {
                    const wf = collection.workflows?.find(f => f.id === editingWorkflowId);
                    if (wf) onRunRequest(wf.steps, editingWorkflowId, true);
                  }}
                  onClose={() => { setEditingWorkflowId(null); setActiveWorkflowId(null); }}
                  t={t}
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto">
                <WorkflowEditorView 
                  workflow={collection.workflows?.find(f => f.id === editingWorkflowId)}
                  collection={collection}
                  t={t}
                  onBack={() => {
                    setEditingWorkflowId(null);
                    setActiveWorkflowId(null);
                  }}
                  onUpdateWorkflow={(updatedWorkflow) => {
                    const newWorkflows = (collection.workflows || []).map(f => f.id === updatedWorkflow.id ? updatedWorkflow : f);
                    onUpdateWorkflows(collection.id, newWorkflows);
                  }}
                  onRun={(steps) => { 
                    onRunRequest(steps, editingWorkflowId, true); 
                  }}
                  onEditStep={(step, index, subIndex) => {
                    if (!step) return;
                    onSelectRequest(step, 'config', null, index, editingWorkflowId, subIndex);
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Coluna 3: Painel Lateral (Execução) */}
      <div className={`flex flex-col theme-surface transition-all duration-500 border-l theme-border ${rightPanelSize === 'maximized' ? 'flex-1' : rightPanelSize === 'minimized' ? 'w-12' : 'w-[450px]'}`}>
        <div className={`p-4 border-b theme-border shrink-0 flex items-center gap-3 ${rightPanelSize === 'minimized' ? 'flex-col !p-2' : ''}`}>
          {rightPanelSize !== 'minimized' && (
            <h3 className="flex-1 text-xs font-black theme-text uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {t.config.panels.execution}
              {isRunning && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>}
            </h3>
          )}
          <div className={`flex gap-1 ${rightPanelSize === 'minimized' ? 'flex-col mt-auto' : ''}`}>
            <button onClick={() => setRightPanelSize(rightPanelSize === 'maximized' ? 'normal' : 'maximized')} className="p-2 text-slate-500 hover:theme-text-secondary hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'maximized' ? 'Restaurar' : 'Maximizar'}>
              {rightPanelSize === 'maximized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9h6m-6 6h6M4 4h16v16H4V4z"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4"/></svg>}
            </button>
            <button onClick={() => setRightPanelSize(rightPanelSize === 'minimized' ? 'normal' : 'minimized')} className="p-2 text-slate-500 hover:theme-text-secondary hover:bg-white/5 rounded-lg transition-colors" title={rightPanelSize === 'minimized' ? 'Expandir' : 'Recolher'}>
              {rightPanelSize === 'minimized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 ${rightPanelSize === 'minimized' ? 'hidden' : 'block'}`}>
          <ReportView t={t} reportData={reportData} requestLogs={requestLogs} setView={() => {}} config={{ ...editorProps, body: editorProps.bodyRaw }} activeCollectionId={collection.id} activeCollection={collection} sendRequests={sendRequests} isRunning={isRunning} onStop={stopTest} lastExecutedPayload={lastExecutedPayload} onSaveResponseToDoc={onSaveResponseToDoc} theme={editorProps.theme} />
        </div>
      </div>
    </div>
  );
}
