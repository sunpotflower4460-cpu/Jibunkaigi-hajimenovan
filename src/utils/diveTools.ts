export type DiveToolId = 'settings' | 'records' | 'words' | 'notes' | 'outline';

const EVENT_PREFIX = 'jibunkaigi:dive-tool:';

export const getDiveToolEventName = (toolId: DiveToolId) => `${EVENT_PREFIX}${toolId}`;

export const openDiveTool = (toolId: DiveToolId) => {
  window.dispatchEvent(new CustomEvent(getDiveToolEventName(toolId)));
};

export const subscribeDiveTool = (toolId: DiveToolId, callback: () => void) => {
  const eventName = getDiveToolEventName(toolId);
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
};
