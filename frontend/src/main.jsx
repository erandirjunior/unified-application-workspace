import React from 'react'
import ReactDOM from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { CollectionsProvider } from './contexts/CollectionsContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <ThemeProvider>
        <CollectionsProvider>
          <App />
        </CollectionsProvider>
      </ThemeProvider>
    </ToastProvider>
  </React.StrictMode>,
)
