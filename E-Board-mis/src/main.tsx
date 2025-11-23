import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// Add this line if missing:
import './index.css';  // Or './main.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);