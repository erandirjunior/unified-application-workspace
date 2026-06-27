import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState(null);

  const showCustomToast = useCallback((message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  const showCustomConfirm = useCallback((message, callback) => {
    setConfirmMessage(message);
    setOnConfirmCallback(() => callback);
    setShowConfirmModal(true);
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage('');
        setToastType('success');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showCustomToast, showCustomConfirm }}>
      {children}

      {showToast && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-lg shadow-lg text-white flex items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-300 z-50
          ${toastType === 'success' ? 'bg-emerald-500' : toastType === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`}
        >
          {toastType === 'success' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          {toastType === 'error' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          {toastType === 'info' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          <span>{toastMessage}</span>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className="bg-[#111827] rounded-3xl w-full max-w-md shadow-2xl border border-[#161E31] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#161E31]">
              <h3 className="text-xl font-bold dark:text-white">Confirmação</h3>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="text-slate-400 hover:text-rose-500 transition-colors p-2 text-2xl"
              >&times;</button>
            </div>
            
            <div className="p-8 text-slate-700 dark:text-slate-300 text-lg">
              {confirmMessage}
            </div>

            <div className="p-6 bg-[#161E31] border-t border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  if (onConfirmCallback) {
                    onConfirmCallback();
                  }
                }}
                className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
              >
                Confirmar
              </button>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
