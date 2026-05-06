import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// Add this line if missing:
import './index.css';  // Or './main.css'
import { SidebarProvider } from '@/components/layout/SidebarContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidebarProvider>        {/* ← add this */}
      <App />
    </SidebarProvider>       {/* ← and this */}
  </React.StrictMode>
);