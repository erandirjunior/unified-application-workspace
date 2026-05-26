import React, { useState } from 'react';

export default function WorkflowView({ collection, onUpdateWorkflows, onEditWorkflow, onRunWorkflow, onDeleteWorkflow }) {
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const workflows = collection.workflows || [];

  const handleAddWorkflow = () => {
    if (!newName.trim()) return;
    const newWorkflow = { id: Date.now().toString(), name: newName, description: '', steps: [] };
    onUpdateWorkflows(collection.id, [...workflows, newWorkflow]);
    setNewName('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Fluxos Inteligentes (Workflows)</h2>
        <button onClick={() => setIsCreating(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all">+ Novo Workflow</button>
      </div>

      {isCreating && (
        <div className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <input autoFocus className="input-base flex-1" placeholder="Nome do workflow..." value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button onClick={handleAddWorkflow} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs">Criar</button>
          <button onClick={() => setIsCreating(false)} className="text-slate-500 font-bold px-2">Cancelar</button>
        </div>
      )}

      <div className="grid gap-4">
        {workflows.map(workflow => (
          <div key={workflow.id} className="p-6 bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{workflow.name}</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black">{workflow.steps?.length || 0} Blocos de Execução</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onRunWorkflow(workflow.steps, workflow.id)} 
                  className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                </button>
                <button onClick={() => onEditWorkflow(workflow.id)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button 
                  onClick={() => onDeleteWorkflow(collection.id, workflow.id)} 
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}