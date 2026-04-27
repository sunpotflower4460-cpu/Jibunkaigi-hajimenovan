import React from 'react';
import ReactDOM from 'react-dom/client';
import AppStable from './AppStable';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installPageAutoScroll } from './utils/installPageAutoScroll';
import './index.css';

installPageAutoScroll();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppStable />
    </ErrorBoundary>
  </React.StrictMode>,
);
