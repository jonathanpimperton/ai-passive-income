/**
 * The pre-paint theme script, as a classic-script string for BaseLayout's
 * `<script is:inline>` head boot.
 *
 * It lives here (not inline in BaseLayout) so a unit test can run it against a
 * window whose storage throws, like a browser with site data blocked
 * (HOME-CHROME-18).
 *
 * Contract
 * - Runs after SAFE_STORAGE_INLINE_JS, which defines the global `calcrunStore`
 *   (every storage call there is try/catch guarded: blocked storage reads as
 *   "nothing stored").
 * - Sets `html.js`, then `data-theme` to "light" or "dark": a stored choice
 *   wins, otherwise the OS colour scheme. `data-theme` is never left unset and
 *   nothing here throws, whatever storage or matchMedia do.
 * - While there is no stored choice the page follows later OS changes and
 *   fires `calcrun:themechange` so the toggle buttons re-sync.
 * Keep it ES5 and dependency-free: it runs before anything else on the page.
 */
export const THEME_INLINE_JS =
  '(function(){var d=document.documentElement;d.classList.add("js");var mq=null;' +
  'try{mq=window.matchMedia("(prefers-color-scheme: dark)")}catch(e){mq=null}' +
  'function pick(){var t=calcrunStore.get("calcrun.theme");if(t==="dark"||t==="light")return t;return mq&&mq.matches?"dark":"light"}' +
  'd.setAttribute("data-theme",pick());' +
  'if(mq){var on=function(){if(calcrunStore.get("calcrun.theme"))return;d.setAttribute("data-theme",pick());' +
  // Old browsers without the Event constructor get the legacy createEvent path
  'try{window.dispatchEvent(new Event("calcrun:themechange"))}catch(e){var ev=document.createEvent("Event");ev.initEvent("calcrun:themechange",false,false);window.dispatchEvent(ev)}};' +
  'if(mq.addEventListener)mq.addEventListener("change",on);else if(mq.addListener)mq.addListener(on)}})();';
