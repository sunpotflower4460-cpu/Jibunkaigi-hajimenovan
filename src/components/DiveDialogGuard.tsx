import { useEffect, useState } from 'react';

const getOpenDialogs = () => {
  if (typeof document === 'undefined') return [];
  const ariaDialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
  const overlayDialogs = Array.from(document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="inset-0"][class*="backdrop-blur"]'))
    .filter(element => element.offsetParent !== null || element.getBoundingClientRect().width > 0);
  return [...ariaDialogs, ...overlayDialogs];
};

export const DiveDialogGuard = () => {
  const [hasOpenDialog, setHasOpenDialog] = useState(false);

  useEffect(() => {
    const sync = () => {
      const open = getOpenDialogs().length > 0;
      setHasOpenDialog(open);
      document.documentElement.dataset.diveDialogOpen = open ? 'true' : 'false';
      document.body.dataset.diveDialogOpen = open ? 'true' : 'false';
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-modal', 'class', 'style'],
    });
    const interval = window.setInterval(sync, 1200);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      document.documentElement.dataset.diveDialogOpen = 'false';
      document.body.dataset.diveDialogOpen = 'false';
    };
  }, []);

  useEffect(() => {
    if (!hasOpenDialog) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [hasOpenDialog]);

  return null;
};
