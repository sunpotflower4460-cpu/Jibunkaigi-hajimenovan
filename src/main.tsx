import React from 'react';
import ReactDOM from 'react-dom/client';
import AppStable from './AppStable';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hydrateLocalStorageFromCloud, hydrateLocalStorageFromIndexedDb } from './services/storage';
import { installPageAutoScroll } from './utils/installPageAutoScroll';
import './index.css';

installPageAutoScroll();

const root = ReactDOM.createRoot(document.getElementById('root')!);

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AppStable />
      </ErrorBoundary>
    </React.StrictMode>,
  );
};

void hydrateLocalStorageFromIndexedDb()
  .then(hydrateLocalStorageFromCloud)
  .finally(renderApp);
