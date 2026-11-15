/**
 * Let go of sticky results panels that are taller than the window.
 *
 * Calculators pin their results panel (`lg:sticky lg:top-20`) so the answer
 * stays beside the inputs. A panel taller than the window cannot show its lower
 * part while it is pinned, and the browser's scroll-into-view for keyboard focus
 * does not cope with a pinned element: Shift+Tab into the panel's last controls
 * (a long table, Export PDF) leaves the focused control off screen (WCAG 2.4.11
 * Focus Not Obscured, 2.4.7). A panel that does not fit gains nothing from being
 * pinned, so it is released (CSS in global.css) until the window is tall enough.
 *
 * The marker goes on the calculator's <astro-island> (or, outside an island, on
 * the panel itself), never on a React-managed element, so hydration never sees
 * an unexpected attribute.
 */

/** `lg:top-20` in the calculators: the gap between the window's top edge and a pinned panel. */
export const STICKY_TOP_OFFSET_PX = 80;
/** Breathing room under a pinned panel. */
export const STICKY_BOTTOM_GAP_PX = 16;
/** Marker attribute; global.css releases `.lg:sticky` panels inside it. */
export const STICKY_RELEASED_ATTR = 'data-sticky-released';

/** True when a pinned panel could not be shown whole inside the window. */
export function exceedsViewport(panelHeight: number, viewportHeight: number): boolean {
  return panelHeight > viewportHeight - STICKY_TOP_OFFSET_PX - STICKY_BOTTOM_GAP_PX;
}

/**
 * Keep every `.lg:sticky` panel on the page pinned only while it fits the window.
 * Re-checked when a panel's size changes (inputs, tabs, expanded tables) and when
 * the window is resized. Returns a function that stops watching.
 */
export function watchStickyPanels(doc: Document = document, win: Window = window): () => void {
  const panels = Array.from(doc.querySelectorAll<HTMLElement>('.lg\\:sticky'));
  if (panels.length === 0) return () => undefined;
  const marked = (panel: HTMLElement): HTMLElement => panel.closest<HTMLElement>('astro-island') ?? panel;

  const update = () => {
    const tall = new Set<HTMLElement>();
    for (const panel of panels) {
      if (exceedsViewport(panel.offsetHeight, win.innerHeight)) tall.add(marked(panel));
    }
    for (const target of new Set(panels.map(marked))) target.toggleAttribute(STICKY_RELEASED_ATTR, tall.has(target));
  };

  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(update) : null;
  panels.forEach((p) => observer?.observe(p));
  win.addEventListener('resize', update, { passive: true });
  update();
  return () => {
    observer?.disconnect();
    win.removeEventListener('resize', update);
  };
}
