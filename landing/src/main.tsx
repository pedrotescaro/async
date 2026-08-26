import '@fontsource-variable/geist';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingApp } from './app';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Landing root was not found.');

createRoot(root).render(
  <StrictMode>
    <LandingApp />
  </StrictMode>
);
