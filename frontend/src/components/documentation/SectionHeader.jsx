import React from 'react';

export default function SectionHeader({ title, icon, isExpanded, onToggle }) {
  return (
    <div 
      className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 cursor-pointer select-none group"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{title}</h3>
      </div>
      <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
    </div>
  );
}
