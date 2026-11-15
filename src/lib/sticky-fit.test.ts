import { describe, it, expect } from 'vitest';
import { exceedsViewport, STICKY_TOP_OFFSET_PX, STICKY_BOTTOM_GAP_PX } from './sticky-fit';

describe('exceedsViewport', () => {
  it('lets a panel that fits below the 80px offset stay pinned', () => {
    expect(exceedsViewport(600, 800)).toBe(false);
    const fits = 800 - STICKY_TOP_OFFSET_PX - STICKY_BOTTOM_GAP_PX;
    expect(exceedsViewport(fits, 800)).toBe(false);
  });

  it('releases a panel one pixel taller than the room it has', () => {
    expect(exceedsViewport(800 - STICKY_TOP_OFFSET_PX - STICKY_BOTTOM_GAP_PX + 1, 800)).toBe(true);
  });

  it('releases the compound interest panel (about 1,600px) in an 800px window but not in a 2,000px one', () => {
    expect(exceedsViewport(1608, 800)).toBe(true);
    expect(exceedsViewport(1608, 2000)).toBe(false);
  });

  it('releases every panel in a window shorter than its pinned offset', () => {
    expect(exceedsViewport(10, 90)).toBe(true);
  });
});
