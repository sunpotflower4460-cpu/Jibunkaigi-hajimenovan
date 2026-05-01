import { useEffect } from 'react';

const findClosestCard = (element: Element) => {
  let current: Element | null = element;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const className = current.getAttribute('class') || '';
    if (
      className.includes('rounded')
      && (className.includes('border') || className.includes('bg-'))
      && !current.querySelector('button')
    ) {
      return current as HTMLElement;
    }
    current = current.parentElement;
  }
  return null;
};

const shouldHideText = (text: string) => {
  return text.includes('この初期版では')
    || text.includes('生成AIへの本接続')
    || text.includes('医療・診断・治療・カウンセリング・緊急対応')
    || text.includes('専門家の助言の代替');
};

const softenIntroLegalCards = () => {
  const bodyText = document.body.innerText || '';
  const isIntroVisible = bodyText.includes('会議をはじめる') && bodyText.includes('利用規約');
  if (!isIntroVisible) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const cards = new Set<HTMLElement>();

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent || '';
    if (!shouldHideText(text)) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const card = findClosestCard(parent);
    if (card) cards.add(card);
  }

  cards.forEach(card => {
    card.dataset.introLegalSoftHidden = 'true';
    card.setAttribute('aria-hidden', 'true');
  });
};

export const IntroLegalSoftener = () => {
  useEffect(() => {
    softenIntroLegalCards();
    const observer = new MutationObserver(() => softenIntroLegalCards());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
};
