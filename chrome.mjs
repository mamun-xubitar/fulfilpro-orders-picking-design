import { P, ic } from './chrome-base.mjs';
export { ic };

// extra icons used by the merged page (same 24px / 2px-stroke grammar as the app's lucide set)
Object.assign(P, {
  printer: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
  barcode: 'M4 5v14M8 5v14M12 5v14M16 5v14M20 5v14',
  scan: 'M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2M7 12h10',
  package: 'M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10l-8-4V7m8 4v10M4 7l8 4',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  alert: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  userLock: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z',
  sort: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  columns: 'M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4m0-16v16m0-16h6m-6 16h6m0-16h4a1 1 0 011 1v14a1 1 0 01-1 1h-4m0-16v16',
  layers: 'M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2m20 0l-3.45-6.9A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.1L2 12m20 0v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6',
  mapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  corner: 'M9 10l-5 5 5 5m-5-5h12a4 4 0 004-4V4',
  keyboard: 'M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm3 4h.01M11 10h.01M15 10h.01M8 14h8',
  history: 'M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8m0-5v5h5m4-1v5l4 2',
  chevUp: 'M5 15l7-7 7 7',
});

/** Authored garment silhouettes: one consistent fill grammar, tinted by the variant colour. */
const G = {
  tee: '<path d="M8 3L3 6.5 5.3 10 7.5 9v12h9V9l2.2 1L21 6.5 16 3c-.6 1.6-2.2 2.4-4 2.4S8.6 4.6 8 3z"/>',
  polo: '<path d="M8 3L3 6.5 5.3 10 7.5 9v12h9V9l2.2 1L21 6.5 16 3l-4 4.2L8 3z"/><path d="M12 7.2V12" stroke="rgba(255,255,255,.55)" stroke-width="1.3" fill="none"/>',
  hoodie: '<path d="M9 3c0 2.4 6 2.4 6 0l5 2.8 2 6.4-3 1V21H5v-7.8l-3-1 2-6.4L9 3z"/><path d="M12 7v5" stroke="rgba(255,255,255,.5)" stroke-width="1.3" fill="none"/>',
  cap: '<path d="M4 15c0-5 3.6-9 8-9s8 4 8 9H4z"/><path d="M3 16.2h18c0 1.8-4 2.6-9 2.6s-9-.8-9-2.6z"/>',
  bucket: '<path d="M6.5 12C6.5 6.5 9 4.5 12 4.5s5.5 2 5.5 7.5h-11z"/><path d="M3 14c0-1.6 4-2.4 9-2.4s9 .8 9 2.4c0 2-4 3-9 3s-9-1-9-3z"/>',
  visor: '<path d="M5 12V10.5C5 8.5 8 7 12 7s7 1.5 7 3.5V12H5z"/><path d="M3 14c0-1.3 4-2 9-2s9 .7 9 2c0 1.6-4 2.6-9 2.6S3 15.6 3 14z"/>',
  bag: '<path d="M4.5 9h15l.9 11.5H3.6L4.5 9z"/><path d="M9 9V7a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.8" fill="none"/>',
};
/** Product tile: tinted square + garment glyph in the variant colour. `n` is the size in px. */
export const tile = (kind, hex = '#1e3a8a', n = 26) =>
  `<span class="pt" style="width:${n}px;height:${n}px;--pc:${hex}"><svg viewBox="0 0 24 24" fill="${hex}" stroke="rgba(17,24,39,.28)" stroke-width=".7" stroke-linejoin="round" style="width:${Math.round(n * 0.72)}px;height:${Math.round(n * 0.72)}px">${G[kind]}</svg></span>`;

const NAV = {
  admin:  [['navOrders', 'Orders', 1], ['navDecoration', 'Decoration'], ['navBackInStock', 'Back in stock'], ['navTasks', 'Tasks'], ['chat', 'Messages'], ['navTracking', 'Tracking'], ['navStores', 'Stores'], ['cube', 'Inventory'], ['users', 'Users'], ['settings', 'Settings']],
  staff:  [['navOrders', 'Orders', 1], ['navBackInStock', 'Back in stock'], ['navTasks', 'Tasks'], ['chat', 'Messages'], ['navTracking', 'Tracking']],
  picker: [['navOrders', 'Pick & Pack', 1], ['navTasks', 'Tasks'], ['chat', 'Messages']],
};
export const sidebar = (role) => `
<aside class="sb">
  <div class="sb-top">${ic('menu', 'i18')}</div>
  ${NAV[role].map(([n, t, on]) => `<div class="sb-i${on ? ' on' : ''}" title="${t}">${ic(n, 'i18')}</div>`).join('')}
</aside>`;

export const zoomCluster = (pct = '100%') => `
<div class="zoom" role="group" aria-label="Page zoom">
  <button class="zb" data-z="-10" title="Zoom out (Ctrl -)" aria-label="Zoom out">${ic('zoomOut', 'i16')}</button>
  <button class="zb zb-mid" data-z="0" title="Reset zoom to 100% (Ctrl 0)" aria-label="Reset zoom">${ic('zoomReset', 'i16')}<span class="zpct">${pct}</span></button>
  <button class="zb" data-z="10" title="Zoom in (Ctrl +)" aria-label="Zoom in">${ic('zoomIn', 'i16')}</button>
</div>`;

const USER = { admin: ['Admin', 'A'], staff: ['Staff', 'S'], picker: ['Order Picker', 'P'] };
const TITLE = { admin: 'Orders', staff: 'Orders', picker: 'Pick & Pack' };
export const header = (role, sub) => `
<header class="hd">
  <div class="hd-title"><b>${TITLE[role]}</b>${sub ? `<span class="hd-sep">/</span><span class="hd-sub">${sub}</span>` : ''}</div>
  <div class="hd-right">
    ${zoomCluster()}
    <span class="hd-div"></span>
    <button class="hd-ic" title="Tasks">${ic('navTasks', 'i18')}<i class="badge red">3</i></button>
    <button class="hd-ic" title="Messages">${ic('chat', 'i18')}</button>
    <button class="hd-ic" title="Notifications">${ic('bell', 'i18')}<i class="badge red">5</i></button>
    <span class="hd-user">${USER[role][0]}</span><span class="avatar">${USER[role][1]}</span>
  </div>
</header>`;

/** One small script, shared by every artboard: zoom trio + Ctrl +/-/0, scoped per artboard. */
export const ZOOM_JS = `<script>
(function(){
  var cur=null;
  function set(art,v){if(!art)return;v=Math.max(50,Math.min(150,v));art.dataset.z=v;
    art.querySelectorAll('.zoomable').forEach(function(e){e.style.zoom=v+'%'});
    art.querySelectorAll('.zpct').forEach(function(p){p.textContent=v+'%'});}
  function val(art){return +(art.dataset.z||100)}
  document.addEventListener('mouseover',function(e){var a=e.target.closest&&e.target.closest('.art');if(a)cur=a});
  document.addEventListener('click',function(e){var t=e.target.closest('[data-vt]');if(t){var a2=t.closest('.art');a2.querySelectorAll('[data-vt]').forEach(function(x){x.classList.toggle('on',x===t)});a2.querySelectorAll('.view').forEach(function(v){v.style.display=v.dataset.view===t.dataset.vt?'flex':'none'});return;}
    var b=e.target.closest('[data-z]');if(!b)return;var a=b.closest('.art'),d=+b.dataset.z;set(a,d===0?100:val(a)+d);});
  document.addEventListener('keydown',function(e){if(!(e.ctrlKey||e.metaKey)||!cur)return;
    if(e.key==='-'||e.key==='_'){e.preventDefault();set(cur,val(cur)-10)}else if(e.key==='='||e.key==='+'){e.preventDefault();set(cur,val(cur)+10)}else if(e.key==='0'){e.preventDefault();set(cur,100)}});
})();
</script>`;
