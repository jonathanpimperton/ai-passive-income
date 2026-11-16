/**
 * Let go of a pinned sidebar that is taller than the window.
 *
 * The methodology pages (/how-we-calculate/<tool>/) pin their sidebar
 * (`lg:sticky lg:top-20`) so the "Try the calculator" link and the sources stay
 * in reach. A pinned element cannot show more than the window holds: when the
 * sidebar is taller, its last links (the worked-through guides, the data
 * sources) sit below the window edge and cannot be scrolled to until the end of
 * the page. Such a sidebar gains nothing from being pinned, so it is released
 * (CSS in global.css) until the window is tall enough.
 *
 * Opt-in: only elements marked `data-sticky-fit` are watched. The marker is set
 * on the element itself, so it must not be a React-managed element (hydration
 * would see an unexpected attribute); put it on a server-rendered wrapper.
 *
 * The calculator results panels carry the same `lg:sticky` classes but are not
 * watched: inside the tool page's overflow containers they have never pinned
 * (see ToolPageLayout), so there is nothing to release. Whether to restore
 * pinning there is a design decision, not made here.
 */

/** `lg:top-20`: the gap between the window's top edge and a pinned element. */
export const STICKY_TOP_OFFSET_PX = 80;
/** Breathing room under a pinned element. */
export const STICKY_BOTTOM_GAP_PX = 16;
/** Opt-in marker: watch this element. */
export const STICKY_FIT_ATTR = 'data-sticky-fit';
/** Set while the element is taller than the window; global.css makes it static. */
export const STICKY_RELEASED_ATTR = 'data-sticky-released';

/** True when a pinned element could not be shown whole inside the window. */
export function exceedsViewport(height: number, viewportHeight: number): boolean {
  return height > viewportHeight - STICKY_TOP_OFFSET_PX - STICKY_BOTTOM_GAP_PX;
}

/**
 * Keep every `[data-sticky-fit]` element pinned only while it fits the window.
 * Re-checked when an element's size changes and when the window is resized.
 * Returns a function that stops watching.
 */
export function watchStickyPanels(doc: Document = document, win: Window = window): () => void {
  const panels = Array.from(doc.querySelectorAll<HTMLElement>(`[${STICKY_FIT_ATTR}]`));
  if (panels.length === 0) return () => undefined;

  const update = () => {
    for (const panel of panels) {
      panel.toggleAttribute(STICKY_RELEASED_ATTR, exceedsViewport(panel.offsetHeight, win.innerHeight));
    }
  };

  const Observer = (win as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = typeof Observer === 'function' ? new Observer(update) : null;
  panels.forEach((p) => observer?.observe(p));
  win.addEventListener('resize', update, { passive: true });
  update();
  return () => {
    observer?.disconnect();
    win.removeEventListener('resize', update);
  };
}
