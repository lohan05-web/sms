import { useEffect } from 'react';

/**
 * Reveals elements marked with `data-reveal` as they scroll into view.
 *
 * The effect re-runs on every render so newly mounted route content is picked
 * up when navigating between public pages. When the visitor prefers reduced
 * motion (or IntersectionObserver is unavailable) everything is revealed
 * immediately so no content is ever hidden.
 */
export function useReveal(): void {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (nodes.length === 0) {
      return;
    }

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );

    nodes.forEach((node) => {
      if (node.classList.contains('is-revealed')) {
        return;
      }
      observer.observe(node);
    });

    return () => observer.disconnect();
  });
}
