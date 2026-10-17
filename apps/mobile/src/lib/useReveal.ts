/**
 * Marks elements with the `data-reveal` attribute as revealed on mount.
 *
 * React Native has no DOM, so this hook intentionally does nothing: newly
 * mounted screens simply render their final state right away.
 */
export function useReveal(): void {
  // Intentionally empty: React Native has no IntersectionObserver.
}
