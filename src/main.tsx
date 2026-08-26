import '@fontsource-variable/geist';
import 'highlight.js/styles/github-dark.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './styles/main.css';

const root = document.getElementById('root');
if (!root) throw new Error('ASYNC root element was not found.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
