import React from 'react';
import ReactDOM from 'react-dom/client';
import AppStable from './AppStable';
import { CloudSaveStatusBadge } from './components/CloudSaveStatusBadge';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchCloudState, initCloudSave, isCloudSaveConfigured } from './services/cloud/firebaseCloud';
import { hydrateLocalStorageFromIndexedDb, loadState, restoreStateToLocalStores } from './services/storage';
import { installPageAutoScroll } from './utils/installPageAutoScroll';
import './index.css';

installPageAutoScroll();

const root = ReactDOM.createRoot(document.getElementById('root')!);

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AppStable />
        <CloudSaveStatusBadge />
      </ErrorBoundary>
    </React.StrictMode>,
  );
};

const hydrateBeforeRender = async () => {
  await hydrateLocalStorageFromIndexedDb();

  if (!isCloudSaveConfigured()) return;

  await initCloudSave();
  const cloudState = await fetchCloudState();
  const localState = loadState();

  if (cloudState && cloudState.savedAt > localState.savedAt) {
    restoreStateToLocalStores(cloudState);
  }
};

void hydrateBeforeRender().finally(renderApp);
