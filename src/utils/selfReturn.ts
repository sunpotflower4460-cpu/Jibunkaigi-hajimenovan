import type { StickyNoteKind } from '../types';

export type SelfReturnPayload = {
  sessionId?: string;
  kind?: StickyNoteKind;
  seedText?: string;
};

export const SELF_RETURN_EVENT = 'jibunkaigi:self-return-note';

export const openSelfReturnNote = (payload: SelfReturnPayload = {}) => {
  window.dispatchEvent(new CustomEvent<SelfReturnPayload>(SELF_RETURN_EVENT, { detail: payload }));
};

export const subscribeSelfReturnNote = (callback: (payload: SelfReturnPayload) => void) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<SelfReturnPayload>;
    callback(customEvent.detail || {});
  };
  window.addEventListener(SELF_RETURN_EVENT, handler);
  return () => window.removeEventListener(SELF_RETURN_EVENT, handler);
};
