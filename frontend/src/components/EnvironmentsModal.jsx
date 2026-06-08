import React from 'react';

export default function EnvironmentsModal({
  collection,
  t,
  editingEnvId,
  setEditingEnvId,
  isRenamingEnv,
  setIsRenamingEnv,
  currentEnv,
  onClose,
  onAddEnvironment,
  onDeleteEnvironment,
  onUpdateEnvName,
  onAddVariable,
  onUpdateVariable,
  onRemoveVariable,
  onSetActiveEnvironment,
}) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
      <div className="theme-surface rounded-3xl w-full max-w-4xl shadow-2xl border theme-border flex flex-col h-[70vh]">
        <div className="p-6 border-b theme-border flex justify-between items-center">
          <h3 className="text-xl font-bold theme-text flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
            {t.collection.envModalTitle}
          </h3>
          <button onClick={onClose} className="theme-text-muted hover:text-rose-500 transition-colors text-2xl">&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar do Modal */}
          <div className="w-64 border-r theme-border theme-elevated p-4 space-y-2 overflow-y-auto">
            {(collection.environments || []).map(env => (
              <div 
                key={env.id}
                onClick={() => setEditingEnvId(env.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${editingEnvId === env.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-black/5 dark:hover:bg-white/5 theme-text-secondary'}`}
              >
                {isRenamingEnv === env.id ? (
                  <input 
                    autoFocus
                    className="bg-transparent border-none outline-none w-full font-bold"
                    defaultValue={env.name}
                    onBlur={(e) => onUpdateEnvName(env.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onUpdateEnvName(env.id, e.target.value)}
                  />
                ) : (
                  <span className="font-bold text-sm truncate">{env.name}</span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setIsRenamingEnv(env.id); }} className="p-1 hover:text-emerald-400" title={t.collection.envModal.renameEnv}><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteEnvironment(env.id); }} className="p-1 hover:text-rose-400" title={t.collection.envModal.deleteEnv}><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                </div>
              </div>
            ))}
            <button onClick={onAddEnvironment} className="w-full p-3 border-2 border-dashed theme-border rounded-xl theme-text-muted hover:text-blue-500 hover:border-blue-500 transition-all text-xs font-bold">{t.collection.envModal.newEnv}</button>
          </div>

          {/* Conteúdo de Variáveis */}
          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            {currentEnv ? (
              <>
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black theme-text-muted uppercase tracking-widest">{t.collection.envModal.varsTitle} {currentEnv.name}</h4>
                  <button onClick={onAddVariable} className="text-xs font-bold text-blue-500 hover:underline">{t.collection.envModal.addVar}</button>
                </div>
                <div className="space-y-3">
                  {(currentEnv.variables || []).map((v, i) => (
                    <div key={i} className="flex gap-3">
                      <input className="input-base flex-1 font-mono text-xs" placeholder={t.collection.envModal.placeholderKey} value={v.key} onChange={(e) => onUpdateVariable(i, 'key', e.target.value)} />
                      <input className="input-base flex-1 font-mono text-xs" placeholder={t.collection.envModal.placeholderValue} value={v.value} onChange={(e) => onUpdateVariable(i, 'value', e.target.value)} />
                      <button onClick={() => onRemoveVariable(i)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Remover Variável"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full theme-text-muted italic">{t.collection.envModal.selectEnv}</div>
            )}
          </div>
        </div>

        <div className="p-6 theme-elevated border-t theme-border flex justify-end">
          <button onClick={onClose} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">{t.collection.envModal.done}</button>
        </div>
      </div>
    </div>
  );
}
