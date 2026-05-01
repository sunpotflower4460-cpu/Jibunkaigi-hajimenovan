export type DiveToolId = 'settings' | 'records' | 'words' | 'notes' | 'outline';

const EVENT_PREFIX = 'jibunkaigi:dive-tool:';
export const CLOSE_DIVE_PANELS_EVENT = 'jibunkaigi:dive-tool:close-all';

export const getDiveToolEventName = (toolId: DiveToolId) => `${EVENT_PREFIX}${toolId}`;

export const closeDivePanels = () => {
  window.dispatchEvent(new CustomEvent(CLOSE_DIVE_PANELS_EVENT));
};

export const openDiveTool = (toolId: DiveToolId) => {
  closeDivePanels();
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(getDiveToolEventName(toolId)));
  }, 30);
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
