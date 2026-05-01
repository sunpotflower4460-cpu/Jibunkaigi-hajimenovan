export type DiveToolId = 'settings' | 'records' | 'words' | 'notes' | 'outline';

const EVENT_PREFIX = 'jibunkaigi:dive-tool:';
export const CLOSE_DIVE_PANELS_EVENT = 'jibunkaigi:dive-tool:close-all';

export const getDiveToolEventName = (toolId: DiveToolId) => `${EVENT_PREFIX}${toolId}`;

const clickOpenPanelCloseButtons = () => {
  if (typeof document === 'undefined') return;
  const closeButtons = document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button[aria-label="閉じる"]');
  closeButtons.forEach(button => button.click());
};

export const closeDivePanels = () => {
  window.dispatchEvent(new CustomEvent(CLOSE_DIVE_PANELS_EVENT));
  window.setTimeout(clickOpenPanelCloseButtons, 0);
};

export const openDiveTool = (toolId: DiveToolId) => {
  closeDivePanels();
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(getDiveToolEventName(toolId)));
  }, 80);
};

export const subscribeDiveTool = (toolId: DiveToolId, callback: () => void) => {
  const eventName = getDiveToolEventName(toolId);
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
};

export const subscribeCloseDivePanels = (callback: () => void) => {
  window.addEventListener(CLOSE_DIVE_PANELS_EVENT, callback);
  return () => window.removeEventListener(CLOSE_DIVE_PANELS_EVENT, callback);
};
