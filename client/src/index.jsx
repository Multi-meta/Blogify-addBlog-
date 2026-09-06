// ============================================================
// index.jsx — React entry point
// Mounts the App component into the #root DOM node
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
