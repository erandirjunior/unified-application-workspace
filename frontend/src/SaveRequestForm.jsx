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
    <div className="mb-6">
      <div className="flex-1 w-full">
        <label className="label-base">Request Name</label>
        <input type="text" value={requestName} onChange={(e) => setRequestName(e.target.value)} className="input-base" placeholder="Ex: Get Users API" />
      </div>
    </div>
  );
}