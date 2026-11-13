/**
 * NetWorthCalc: the markup the server renders must not depend on how many
 * times it has rendered before. The dev server renders every request, and the
 * static build renders /tools/.../net-worth/ and /embed/net-worth/, in one
 * process; row ids that came from a module-level counter differed from the
 * client's ("item-46-name" vs "item-1-name"), which made React report
 * "A tree hydrated but some attributes of the server rendered HTML didn't match".
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NetWorthCalc from './NetWorthCalc';

const render = () => renderToStaticMarkup(createElement(NetWorthCalc));
const ids = (html: string) => [...html.matchAll(/\sid="(item-[^"]+)"/g)].map((m) => m[1]);

describe('NetWorthCalc server markup is deterministic', () => {
  it('every render gives the same row ids, starting at item-1', () => {
    const first = render();
    const second = render();
    const third = render();
    expect(ids(first).slice(0, 2)).toEqual(['item-1-name', 'item-1-value']);
    expect(ids(second)).toEqual(ids(first));
    expect(ids(third)).toEqual(ids(first));
  });

  it('the default rows (5 assets + 4 liabilities) have unique, paired name and value ids', () => {
    const found = ids(render());
    expect(found).toHaveLength(9 * 2);
    expect(new Set(found).size).toBe(found.length);
    for (let n = 1; n <= 9; n++) {
      expect(found).toContain(`item-${n}-name`);
      expect(found).toContain(`item-${n}-value`);
    }
  });

  it('the whole markup is identical from render to render', () => {
    expect(render()).toBe(render());
  });
});
