let installed = false;

const getScrollTop = () => window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
const getViewportHeight = () => window.innerHeight || document.documentElement.clientHeight || 0;
const getPageHeight = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

export const installPageAutoScroll = () => {
  if (installed || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  installed = true;

  let previousHeight = getPageHeight();
  let scheduled = false;

  const maybeScrollToBottom = () => {
    if (scheduled) return;
    scheduled = true;

    window.requestAnimationFrame(() => {
      scheduled = false;
      const nextHeight = getPageHeight();
      const heightIncreased = nextHeight > previousHeight + 8;
      const wasNearBottom = getScrollTop() + getViewportHeight() >= previousHeight - 260;
      previousHeight = nextHeight;

      if (!heightIncreased || !wasNearBottom) return;

      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: getPageHeight(),
          behavior: 'smooth',
        });
      });
    });
  };

  const root = document.getElementById('root') || document.body;
  const observer = new MutationObserver(maybeScrollToBottom);
  observer.observe(root, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('resize', () => {
    previousHeight = getPageHeight();
  }, { passive: true });
};
