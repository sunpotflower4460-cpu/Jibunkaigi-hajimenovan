import React from 'react';
import ReactDOM from 'react-dom/client';
import AppStable from './AppStable';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppStable />
    </ErrorBoundary>
  </React.StrictMode>,
);
