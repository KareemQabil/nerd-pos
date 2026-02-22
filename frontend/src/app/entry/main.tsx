import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from './bootstrap';
import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/glass.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing');
}

createRoot(container).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);
