import React from 'react';
import ReactDOM from 'react-dom/client';
import AppStable from './AppStable';
import { CloudSaveStatusBadge } from './components/CloudSaveStatusBadge';
import { ConferenceRecordPanel } from './components/ConferenceRecordPanel';
import { DiveToolsDock } from './components/DiveToolsDock';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingKeywordsPanel } from './components/FloatingKeywordsPanel';
import { MirrorAtmosphere } from './components/MirrorAtmosphere';
import { SettingsPanel } from './components/SettingsPanel';
import { StickyNotesPanel } from './components/StickyNotesPanel';
import { ThemeArchivePanel } from './components/ThemeArchivePanel';
import { fetchCloudState, initCloudSave, isCloudSaveConfigured } from './services/cloud/firebaseCloud';
import { hydrateLocalStorageFromIndexedDb, loadState, restoreStateToLocalStores } from './services/storage';
import { installPageAutoScroll } from './utils/installPageAutoScroll';
import './index.css';

installPageAutoScroll();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found. The HTML document may be corrupt.');
}

const root = ReactDOM.createRoot(rootElement);

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <MirrorAtmosphere />
        <AppStable />
        <CloudSaveStatusBadge />
        <SettingsPanel />
        <ConferenceRecordPanel />
        <FloatingKeywordsPanel />
        <StickyNotesPanel />
        <ThemeArchivePanel />
        <DiveToolsDock />
      </ErrorBoundary>
    </React.StrictMode>,
  );
};

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
};

const hydrateBeforeRender = async () => {
  await hydrateLocalStorageFromIndexedDb();

  if (!isCloudSaveConfigured()) return;

  try {
    await withTimeout(initCloudSave(), 6000);
    const cloudState = await withTimeout(fetchCloudState(), 6000);
    const localState = loadState();

    if (cloudState && cloudState.savedAt > localState.savedAt) {
      restoreStateToLocalStores(cloudState);
    }
  } catch {
    // Cloud hydration timed out or failed. Continue with local state.
  }
};

void hydrateBeforeRender().finally(renderApp);
