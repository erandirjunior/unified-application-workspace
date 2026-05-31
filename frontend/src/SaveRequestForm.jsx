import React, { useState, useEffect } from 'react';

export default function SaveRequestForm({ collections = [], onSaveRequest, requestName, setRequestName }) {
  const [targetCol, setTargetCol] = useState('');

  // Atualiza a coleção selecionada caso o array de coleções mude (ex: primeira carga ou nova coleção criada)
  useEffect(() => {
    if (collections.length > 0 && !targetCol) {
      setTargetCol(collections[0].id);
    }
  }, [collections, targetCol]);

  const handleSave = () => {
    if (!requestName.trim()) return;
    onSaveRequest(requestName, targetCol);
    setRequestName('');
  };

  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex-1 w-full">
        <label htmlFor="request-name" className="label-base">Request Name</label>
        <input id="request-name" type="text" value={requestName} onChange={(e) => setRequestName(e.target.value)} className="input-base" placeholder="Ex: Get Users API" />
      </div>
      <div className="w-full sm:w-64">
        <label htmlFor="target-collection" className="label-base">Coleção Alvo</label>
        <select 
          id="target-collection"
          value={targetCol} 
          onChange={(e) => setTargetCol(e.target.value)} 
          className="input-base"
        >
          {collections.map(col => (
            <option key={col.id} value={col.id}>{col.name}</option>
          ))}
        </select>
      </div>
      <button onClick={handleSave} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
        SALVAR NA COLEÇÃO
      </button>
    </div>
  );
}