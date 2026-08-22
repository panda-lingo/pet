import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@pandalingo/site/site.css';
import '@pandalingo/site/demo.css';
import '@pandalingo/site/gallery.css';
import '@pet/react/pet-ui.css';
import './panda.css';
import { App } from './App.js';

const host = document.getElementById('root');
if (!host) throw new Error('Solution A could not start: #root is missing from index.html.');

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
