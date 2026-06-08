import React from 'react';
import ServersView from '../ServersView';
import SaveRequestForm from '../SaveRequestForm';

export default function MocksPanel({
  t,
  selectedMock,
  setSelectedMock,
  isEditingMock,
  setIsEditingMock,
  monitoringMock,
  setMonitoringMock,
  handleSaveMock,
  rightPanelSize,
  setRightPanelSize,
}) {
  if (!monitoringMock && !isEditingMock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-4">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.98 7.99 0 01-2.343 5.657z"/></svg>
        </div>
        <p className="text-sm">{t.mocks.selectMock}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Coluna 2: Editor de Mock */}
      {rightPanelSize !== 'maximized' && (
        <div className="flex-1 flex flex-col border-r theme-border theme-base overflow-hidden p-6 custom-scrollbar">
          {(isEditingMock || monitoringMock) && (
            <div className="max-w-[1100px] w-full mx-auto">
              {isEditingMock && (
              <SaveRequestForm 
                onSaveRequest={() => handleSaveMock()}
                requestName={selectedMock?.name || ''}
                setRequestName={(newName) => setSelectedMock({ ...selectedMock, name: newName })}
                method={selectedMock?.method}
                setMethod={(m) => setSelectedMock({ ...selectedMock, method: m })}
                onRun={async () => {
                  const activeMock = { ...selectedMock, active: true };
                  setSelectedMock(activeMock);
                  await handleSaveMock(activeMock, false, true);
                  setMonitoringMock(activeMock);
                }}
                onClose={() => setIsEditingMock(false)}
                t={t}
              />
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar max-w-[1100px] w-full mx-auto">
            <ServersView 
              t={t} 
              onBack={() => { setMonitoringMock(null); setIsEditingMock(false); }} 
              isEditing={isEditingMock}
              setIsEditing={setIsEditingMock}
              currentMock={selectedMock}
              setCurrentMock={setSelectedMock}
              monitoringMock={null}
              setMonitoringMock={setMonitoringMock}
              embedded={true}
            />
          </div>
        </div>
      )}

      {/* Coluna 3: Monitoramento Lateral */}
      <div className={`flex flex-col theme-surface transition-all duration-500 border-l theme-border overflow-hidden ${rightPanelSize === 'maximized' ? 'flex-1' : rightPanelSize === 'minimized' ? 'w-12' : 'w-[500px]'}`}>
        <div className={`p-6 border-b theme-border flex justify-between items-center theme-elevated ${rightPanelSize === 'minimized' ? 'flex-col !p-2 gap-4' : ''}`}>
          {rightPanelSize !== 'minimized' && (
            <h3 className="text-xs font-black theme-text uppercase tracking-widest flex items-center gap-2 truncate">
              <span className={`w-2 h-2 rounded-full ${monitoringMock ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`}></span>
              {t.mocks.monitoringLive}
            </h3>
          )}
          <div className="flex items-center gap-3">
            {rightPanelSize !== 'minimized' && monitoringMock && (
              <button 
                onClick={async () => {
                  const stoppedMock = { ...monitoringMock, active: false };
                  await handleSaveMock(stoppedMock, false);
                  setMonitoringMock(null);
                }}
                className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg font-bold text-[10px] transition-all flex items-center gap-2 uppercase tracking-widest hover:bg-rose-500 hover:text-white shrink-0"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                {t.mocks.stopMonitoring}
              </button>
            )}
            <div className={`flex gap-1 ${rightPanelSize === 'minimized' ? 'flex-col mt-auto' : ''}`}>
              <button onClick={() => setRightPanelSize(rightPanelSize === 'maximized' ? 'normal' : 'maximized')} className="p-2 text-slate-500 hover:theme-text-secondary hover:bg-white/5 rounded-lg transition-colors">
                {rightPanelSize === 'maximized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9h6m-6 6h6M4 4h16v16H4V4z"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4"/></svg>}
              </button>
              <button onClick={() => setRightPanelSize(rightPanelSize === 'minimized' ? 'normal' : 'minimized')} className="p-2 text-slate-500 hover:theme-text-secondary hover:bg-white/5 rounded-lg transition-colors">
                {rightPanelSize === 'minimized' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>}
              </button>
            </div>
            {rightPanelSize !== 'minimized' && monitoringMock && (
              <button onClick={() => setMonitoringMock(null)} className="text-slate-500 hover:text-white text-xl p-1 transition-colors">&times;</button>
            )}
          </div>
        </div>
        {monitoringMock && (
          <>
            {/* Campo para copiar Endpoint */}
            <div className={`px-6 py-3 theme-surface border-b theme-border flex items-center justify-between gap-3 ${rightPanelSize === 'minimized' ? 'hidden' : 'flex'}`}>
              <div className="flex-1 min-w-0 theme-base px-3 py-2 rounded-xl border theme-border flex items-center gap-2 overflow-hidden">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter shrink-0">Endpoint</span>
                <code className="text-[10px] text-slate-500 truncate font-mono">http://localhost:8080/mock{monitoringMock.path}</code>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`http://localhost:8080/mock${monitoringMock.path}`);
                  alert(t.mocks.urlCopied);
                }}
                className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-500/20 shadow-sm"
                title={t.mocks.copyUrl}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
            </div>
          </>
        )}
        <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${rightPanelSize === 'minimized' ? 'hidden' : 'block'}`}>
          {monitoringMock ? (
            <ServersView 
              t={t} 
              monitoringMock={monitoringMock}
              setMonitoringMock={setMonitoringMock}
              embedded={true}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic space-y-3 py-12">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c3.55 0 6.715 1.85 8.711 4.673l.036.052a2 2 0 010 2.274l-.036.052C18.715 17.15 15.55 19 12 19c-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <p className="text-xs">{t.mocks.startMonitoring}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
