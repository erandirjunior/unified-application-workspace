import React, { useState } from 'react';

export default function CollectionsView({ collections, onSelectRequest, onCreateCollection, onDeleteCollection, onReorderCollection }) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  const filteredCollections = collections.filter(col => 
    col.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-12">
      {/* Cabeçalho de Introdução */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Organize seus testes de carga em coleções profissionais.</p>
      </div>

      {/* Seção de Criação Destacada (Hero Section) */}
      <div className="mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: API de Pagamentos - Produção"
              className="input-base !bg-white dark:!bg-slate-900 !py-5 !px-8 text-xl shadow-inner border-slate-200 dark:border-slate-800"
            />
            <button 
              onClick={() => { if(name.trim()) { onCreateCollection(name); setName(''); } }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 rounded-2xl transition-all shadow-xl shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              Nova Coleção
            </button>
          </div>
        </div>

      {/* Barra de Busca e Filtro */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1 text-left">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Suas Coleções</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredCollections.length} pastas encontradas</p>
        </div>
        
        <div className="w-full md:w-96 relative group">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Pesquisar coleções..."
            className="input-base !py-3 shadow-sm !bg-slate-50 dark:!bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCollections.map(col => (
          <div key={col.id} onClick={() => onSelectRequest(col)} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all group relative flex flex-col cursor-pointer hover:border-blue-500/50">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                  {col.requests.length} Itens
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2 truncate pr-6" title={col.name}>{col.name}</h3>
              </div>
              <div className="flex flex-col gap-1 items-end opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onReorderCollection(col.id, 'up'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Subir">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onReorderCollection(col.id, 'down'); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors" title="Descer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDeleteCollection(col.id); }} className="text-slate-300 hover:text-rose-500 transition-colors p-1" title="Excluir Coleção">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => onSelectRequest(col)}
              className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:no-underline"
            >
              Gerenciar Coleção →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}