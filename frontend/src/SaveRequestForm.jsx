import React from 'react';

export default function SaveRequestForm({ onSaveRequest, requestName, setRequestName, t }) {
  const handleSave = () => {
    if (!requestName.trim()) return;
    onSaveRequest(requestName);
    setRequestName('');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex-1 w-full">
        <label htmlFor="request-name" className="label-base">{t.documentation.requestName}</label>
        <input id="request-name" type="text" value={requestName} onChange={(e) => setRequestName(e.target.value)} className="input-base" placeholder={t.dashboard.placeholder} />
      </div>
      <button onClick={handleSave} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
        {t.common.save}
      </button>
    </div>
  );
}