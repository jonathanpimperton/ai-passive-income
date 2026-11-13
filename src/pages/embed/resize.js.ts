/**
 * /embed/resize.js — optional auto-height loader for CalcRun embeds (D6).
 *
 * A host page that includes this script lets each CalcRun iframe grow and
 * shrink to its content, so there is no double scrolling. Without it the
 * iframe keeps the snippet's fixed height and scrolls internally.
 *
 * Security: it only accepts messages whose origin equals the origin the
 * script itself was loaded from (www.calcrun.com in production), only
 * resizes the iframe that sent the message, and clamps the height. It reads
 * nothing from the host page and sends nothing anywhere.
 *
 * ES5 on purpose: it runs on arbitrary host sites.
 */
import type { APIRoute } from 'astro';

export const EMBED_RESIZE_JS = `/*! CalcRun embed auto-height. https://www.calcrun.com/embed/ */
(function () {
  if (window.__calcrunEmbedResize) return;
  window.__calcrunEmbedResize = true;
  var script = document.currentScript;
  var origin = 'https://www.calcrun.com';
  try { if (script && script.src) origin = new URL(script.src).origin; } catch (e) { /* keep default origin */ }
  window.addEventListener('message', function (event) {
    if (event.origin !== origin) return;
    var data = event.data;
    if (!data || data.type !== 'calcrun:height' || typeof data.height !== 'number' || !isFinite(data.height)) return;
    var frames = document.getElementsByTagName('iframe');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) {
        frames[i].style.height = Math.max(240, Math.min(Math.round(data.height), 12000)) + 'px';
        return;
      }
    }
  });
})();
`;

export const GET: APIRoute = () =>
  new Response(EMBED_RESIZE_JS, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
