export type DiveToolId = 'settings' | 'records' | 'words' | 'notes' | 'outline';

const EVENT_PREFIX = 'jibunkaigi:dive-tool:';

const LEGACY_BUTTON_LABELS: Record<DiveToolId, string> = {
  settings: '設定を開く',
  records: '会議録を開く',
  words: '言葉の水面を開く',
  notes: 'どう思う？付箋を開く',
  outline: '輪郭を開く',
};

export const getDiveToolEventName = (toolId: DiveToolId) => `${EVENT_PREFIX}${toolId}`;

export const openDiveTool = (toolId: DiveToolId) => {
  window.dispatchEvent(new CustomEvent(getDiveToolEventName(toolId)));

  const legacyButton = document.querySelector<HTMLButtonElement>(`button[aria-label="${LEGACY_BUTTON_LABELS[toolId]}"]`);
  legacyButton?.click();
};

export const subscribeDiveTool = (toolId: DiveToolId, callback: () => void) => {
  const eventName = getDiveToolEventName(toolId);
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
};
