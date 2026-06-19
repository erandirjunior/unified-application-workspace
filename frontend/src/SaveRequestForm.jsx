import React from 'react';

export default function SaveRequestForm({ onSaveRequest, requestName, setRequestName, method = 'GET', setMethod, onRun, onClose, t }) {
  const handleSave = () => {
    if (!requestName.trim()) return;
    onSaveRequest(requestName);
  };

  const methodStyles = { // Not used in this component, but kept for context if needed elsewhere
    GET: 'bg-[#0A2E22] text-[#00D084]',
    POST: 'bg-[#332200] text-[#FFB020]',
    PUT: 'bg-[#002A4E] text-[#3B82F6]',
    DELETE: 'bg-[#3B0B0B] text-[#EF4444]',
    PATCH: 'bg-[#2D004E] text-[#A78BFA]',
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[60px] items-center theme-elevated border theme-border rounded-xl px-4 shadow-lg overflow-hidden mb-5">
       {/* Action Name Input */}
       <div className="col-span-7">
         <input 
           className="w-full bg-transparent text-sm font-mono theme-text outline-none placeholder:text-slate-600" 
           value={requestName} 
           onChange={(e) => setRequestName(e.target.value)}
           placeholder={t?.config?.actionNamePlaceholder || "Nome da Action..."}
         />
       </div>

       {/* Action Buttons */}
       {onRun && (
         <div className="col-span-2">
           <button 
             onClick={onRun}
             className="w-full h-10 bg-[#7C5CFF] hover:brightness-110 text-white font-bold rounded-[10px] text-xs transition-all uppercase tracking-widest shadow-lg shadow-[#7C5CFF]/20"
           >
             {t?.config?.actions?.runBtn || "Run"}
           </button>
         </div>
       )}
       <div className="col-span-2">
         <button onClick={handleSave} className="w-full h-10 theme-surface border theme-border text-slate-400 hover:text-white font-bold rounded-[10px] text-xs transition-all uppercase tracking-widest">
           {t?.common?.save || "Save"}
         </button>
       </div>
        {onClose && (
          <div className="col-span-1 flex justify-center">
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-rose-500 transition-colors rounded-lg"
              title={t?.config?.closeAction || "Fechar Action"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
    </div>
  );
}