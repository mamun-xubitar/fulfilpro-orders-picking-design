// Shell-skin tokens (Tailwind gray/blue/semantic) + a `.inv` override that reskins the same
// components with the Inventory violet tokens (app/globals.css L11-60) for concept C.
export const CSS = `
:root{
 --g50:#f9fafb;--g100:#f3f4f6;--g200:#e5e7eb;--g300:#d1d5db;--g400:#9ca3af;--g500:#6b7280;--g600:#4b5563;--g700:#374151;--g800:#1f2937;--g900:#111827;
 --b50:#eff6ff;--b100:#dbeafe;--b200:#bfdbfe;--b500:#3b82f6;--b600:#2563eb;--b700:#1d4ed8;
 --e50:#ecfdf5;--e100:#d1fae5;--e200:#a7f3d0;--e600:#059669;--e700:#047857;
 --a50:#fffbeb;--a100:#fef3c7;--a200:#fde68a;--a500:#f59e0b;--a600:#d97706;--a800:#92400e;
 --r50:#fef2f2;--r100:#fee2e2;--r200:#fecaca;--r500:#ef4444;--r600:#dc2626;--r700:#b91c1c;
 --p50:#f5f3ff;--p200:#ddd6fe;--p700:#6d28d9; --s50:#f0f9ff;--s200:#bae6fd;--s700:#0369a1;
 /* skin hooks */
 --st:#2563eb;--pri:#2563eb;--pri-h:#1d4ed8;--pri-soft:#eff6ff;--pri-ring:#bfdbfe;--pri-ink:#1d4ed8;
 --canvas:#f3f4f6;--surf:#fff;--surf-m:#f9fafb;--bd:#e5e7eb;--bd-s:#d1d5db;--div:#f3f4f6;
 --tx:#111827;--tx-b:#374151;--tx-m:#4b5563;--tx-s:#5b6472;--ctl-h:28px;--rad:8px;--rad-card:10px;
 --shadow:0 1px 2px 0 rgb(0 0 0/.05);
}
.inv{
 --pri:#5b3fd6;--pri-h:#4a2fbf;--pri-soft:#f1eef9;--pri-ring:#c9bdf7;--pri-ink:#4a2fbf;
 --canvas:#eeedf6;--surf:#fff;--surf-m:#f8f7fc;--bd:#cfcae3;--bd-s:#aea7cc;--div:#e6e2f2;
 --tx:#1d1a36;--tx-b:#35314f;--tx-m:#524e6e;--tx-s:#5c5876;--ctl-h:28px;--rad:7px;--rad-card:10px;
 --shadow:0 1px 3px rgb(91 63 214/.10),0 1px 2px rgb(91 63 214/.06);
 --sec-queue:#4338ca;--sec-detail:#6d28d9;--sec-pack:#0f766e;--sec-ful:#047857;--sec-act:#b45309;--sec-note:#0369a1;--sec-tool:#4d7c0f;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#e9edf3;color:var(--tx);-webkit-font-smoothing:antialiased;font-size:11.5px}
::selection{background:var(--pri-ring);color:var(--tx)}
svg.i{width:14px;height:14px;flex:none}svg.i18{width:18px;height:18px;flex:none}svg.i16{width:14px;height:14px;flex:none}svg.i12{width:11px;height:11px;flex:none}svg.i10{width:10px;height:10px;flex:none}
button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
button:focus-visible,.tab:focus-visible{outline:2px solid var(--pri);outline-offset:1px}
.tn{font-variant-numeric:tabular-nums}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px}
.muted{color:var(--tx-s)}.strong{font-weight:700;color:var(--tx)}
.thin{scrollbar-width:thin;scrollbar-color:var(--bd-s) transparent}

/* ---------- artboard (1280x800 = Tailwind xl) ---------- */
.art{width:1280px;height:800px;background:var(--canvas);border:1px solid var(--bd-s);border-radius:10px;overflow:hidden;display:flex;box-shadow:0 8px 26px rgb(15 23 42/.12);position:relative}
.sb{width:56px;background:#111827;flex:none;display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:3px}
.sb-top{width:36px;height:32px;display:flex;align-items:center;justify-content:center;color:#9ca3af;margin-bottom:6px}
.sb-i{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#9ca3af}
.sb-i.on{background:var(--b600);color:#fff}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.hd{height:46px;flex:none;background:#fff;border-bottom:1px solid var(--g200);display:flex;align-items:center;justify-content:space-between;padding:0 14px}
.hd-title{font-size:15px;display:flex;align-items:center;gap:7px;min-width:0}.hd-title b{font-weight:700;color:var(--g900)}
.hd-sep{color:var(--g300)}.hd-sub{color:var(--g500);font-size:13px}
.hd-right{display:flex;align-items:center;gap:9px}.hd-div{width:1px;height:20px;background:var(--g200)}
.hd-ic{position:relative;color:var(--g600);display:flex}
.badge{position:absolute;top:-6px;right:-7px;font-size:8.5px;font-style:normal;font-weight:700;color:#fff;background:var(--r600);border-radius:999px;padding:1px 4px;line-height:1.3}
.hd-user{font-size:12.5px;color:var(--g700);font-weight:600}
.avatar{width:26px;height:26px;border-radius:999px;background:var(--b600);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
.zoom{display:flex;align-items:center;border:1px solid var(--g300);border-radius:8px;overflow:hidden;background:#fff}
.zb{display:flex;align-items:center;gap:4px;padding:4px 7px;color:var(--g600)}.zb:hover{background:var(--g50)}
.zb-mid{border-left:1px solid var(--g200);border-right:1px solid var(--g200);background:var(--g50)}
.zpct{font-size:11px;font-weight:700;color:var(--g700);font-variant-numeric:tabular-nums;min-width:26px;text-align:center}
.zoomable{flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;background:var(--canvas)}
.zoomable>.page{flex:1;min-height:0}
.page{padding:8px;display:flex;flex-direction:column;gap:6px;min-height:0}

/* ---------- controls ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;border-radius:var(--rad);font-size:11px;font-weight:700;padding:0 9px;white-space:nowrap;border:1px solid transparent;height:var(--ctl-h);transition:background .15s,border-color .15s}
.btn.sm{height:24px;font-size:10.5px;padding:0 7px;border-radius:6px}
.btn.xs{height:20px;font-size:9.5px;padding:0 6px;border-radius:5px}
.btn.pri{background:var(--pri);color:#fff}.btn.pri:hover{background:var(--pri-h)}
.btn.ok{background:var(--e600);color:#fff}
.btn.ghost{border-color:var(--bd-s);color:var(--tx-b);background:var(--surf)}.btn.ghost:hover{background:var(--surf-m)}
.btn.soft{background:var(--pri-soft);color:var(--pri-ink);border-color:var(--pri-ring)}
.btn.dngr{border-color:var(--r200);background:var(--r50);color:var(--r700)}
.btn.warn{border-color:var(--a200);background:var(--a50);color:var(--a800)}
.btn.printed{border-color:var(--e200);background:var(--e50);color:var(--e700)}.btn.printed:hover{background:var(--e100)}
.btn.off{border-color:var(--bd);color:var(--g500);background:var(--surf-m);cursor:not-allowed}
.ib{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;color:var(--tx-s);flex:none;position:relative}
.ib:hover{background:var(--div);color:var(--tx)}
.ib.off{color:var(--g500)}
.ib.printed{color:var(--e700);background:var(--e50);box-shadow:inset 0 0 0 1px var(--e200)}.ib.printed:hover{background:var(--e100);color:var(--e700)}
.ib.printed::after{content:"";position:absolute;right:-2px;bottom:-2px;width:8px;height:8px;border-radius:50%;background:var(--e600) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M2.3 5.2l1.8 1.8 3.6-3.8' fill='none' stroke='%23fff' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/8px no-repeat;box-shadow:0 0 0 1.5px var(--surf)}
.ib.ro{cursor:default;width:20px;height:20px}
.ib .ct{position:absolute;top:-2px;right:-3px;background:var(--pri);color:#fff;font-size:8px;font-weight:700;border-radius:999px;padding:0 3.5px;line-height:12px;font-style:normal}
.ib .ct.red{background:var(--r600)}.ib .ct.amber{background:var(--a800)}
.srch{display:flex;align-items:center;gap:6px;height:var(--ctl-h);flex:none;width:360px;border:1px solid var(--bd-s);border-radius:var(--rad);background:var(--surf);padding:0 4px 0 8px;color:var(--tx-s)}
.srch:focus-within{border-color:var(--pri);box-shadow:0 0 0 2px var(--pri-ring)}
.srch .fld{display:inline-flex;align-items:center;gap:3px;background:var(--pri-soft);color:var(--pri-ink);border:1px solid var(--pri-ring);border-radius:5px;font-size:10px;font-weight:700;padding:1px 3px 1px 6px;white-space:nowrap}
.srch .ph{flex:1;color:var(--g500);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.srch kbd{font:700 9.5px Arial;color:var(--tx-s);border:1px solid var(--bd);border-bottom-width:2px;border-radius:4px;padding:0 4px;background:var(--surf-m)}
.fchip{display:inline-flex;align-items:center;gap:5px;height:var(--ctl-h);border:1px solid var(--bd-s);border-radius:var(--rad);padding:0 7px 0 8px;font-size:11px;background:var(--surf);color:var(--tx-b);white-space:nowrap}
.fchip .k{color:var(--tx-m);font-weight:400}.fchip b{font-weight:700;color:var(--tx)}.fchip svg{color:var(--g400)}
.fchip.on{background:var(--pri-soft);border-color:var(--pri-ring)}.fchip.on b{color:var(--pri-ink)}
.fchip.ro{background:var(--surf-m);border-style:dashed}
.rmv{display:inline-flex;align-items:center;gap:3px;height:20px;border-radius:999px;background:var(--pri-soft);border:1px solid var(--pri-ring);color:var(--pri-ink);font-size:10px;font-weight:700;padding:0 4px 0 7px}
.rmv svg{color:var(--pri-ink)}
.qtabs{display:flex;gap:2px;background:var(--div);border:1px solid var(--bd);border-radius:10px;padding:2px;flex:none}
.qt{display:flex;align-items:center;gap:6px;padding:0 10px;height:26px;border-radius:8px;font-size:11.5px;font-weight:700;color:var(--tx-m);white-space:nowrap}
.qt:hover{color:var(--tx)}
.qt.on{background:var(--surf);color:var(--tx);box-shadow:var(--shadow)}
.qn{font-size:10px;min-width:18px;text-align:center;padding:1px 5px;border-radius:999px;background:var(--bd);color:var(--tx-b);font-variant-numeric:tabular-nums}
.qt.on .qn{background:var(--pri);color:#fff}
.qt.hot .qn{background:var(--a100);color:var(--a800)}.qt.hot.on .qn{background:var(--a600);color:#fff}
.ck{width:13px;height:13px;border:1.5px solid var(--g400);border-radius:3px;flex:none;display:inline-block;background:#fff}
.ck.on{background:var(--pri);border-color:var(--pri);position:relative}
.ck.on::after{content:"";position:absolute;left:3.2px;top:.4px;width:3.5px;height:7px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.ck.mix{background:var(--pri);border-color:var(--pri);position:relative}.ck.mix::after{content:"";position:absolute;left:2px;top:4.5px;width:6px;height:2px;background:#fff}
.inp{border:1px solid var(--bd-s);border-radius:6px;padding:0 6px;font-size:11px;background:var(--surf);color:var(--tx);display:inline-flex;align-items:center;height:24px;white-space:nowrap}
.step{display:inline-flex;align-items:center;border:1px solid var(--bd-s);border-radius:7px;overflow:hidden;background:var(--surf);height:24px}
.step button{width:22px;height:100%;color:var(--tx-m);font-weight:700;font-size:13px;line-height:1}.step button:hover{background:var(--div)}
.step.dis{opacity:.5;background:var(--surf-m)}
.step span{min-width:24px;text-align:center;font-weight:700;font-variant-numeric:tabular-nums;border-left:1px solid var(--bd);border-right:1px solid var(--bd);line-height:22px;font-size:11.5px}

/* ---------- badges + product tile ---------- */
.bdg{display:inline-flex;align-items:center;gap:3px;height:16px;padding:0 6px;border-radius:999px;font-size:9.5px;font-weight:700;border:1px solid var(--bd);background:var(--surf-m);color:var(--tx-m);white-space:nowrap}
.bdg.bad{background:var(--r50);border-color:var(--r200);color:var(--r700)}
.bdg.warn{background:var(--a50);border-color:var(--a200);color:var(--a800)}
.bdg.ok{background:var(--e50);border-color:var(--e200);color:var(--e700)}
.bdg.info{background:var(--b50);border-color:var(--b200);color:var(--b700)}
.bdg.emb{background:var(--p50);border-color:var(--p200);color:var(--p700)}
.bdg.prt{background:var(--s50);border-color:var(--s200);color:var(--s700)}
.pt{display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:color-mix(in srgb,var(--pc) 13%,#fff);border:1px solid color-mix(in srgb,var(--pc) 22%,#fff);flex:none}
.store{display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:700;color:var(--tx-m);background:var(--surf-m);border:1px solid var(--bd);border-radius:5px;padding:0 5px;height:16px;white-space:nowrap}
.store i{width:6px;height:6px;border-radius:50%;display:inline-block}
.stack{display:inline-flex}.stack .pt{margin-left:-6px;border:1.5px solid var(--surf)}.stack .pt:first-child{margin-left:0}

/* ---------- round 2 ---------- */
.sw{display:inline-flex;align-items:center;gap:4px;color:var(--tx-m)}
.sw i{width:9px;height:9px;border-radius:50%;border:1px solid rgba(17,24,39,.35);display:inline-block;flex:none}
.shl{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;color:var(--pri-ink);flex:none;text-decoration:none}
.shl:hover{background:var(--pri-soft)}
.av-n{font-weight:700;color:var(--tx)}.av-n.bad{color:var(--r700)}.av-n.low{color:var(--a800)}
.pop{position:absolute;z-index:20;width:316px;background:#fff;border:1px solid var(--bd-s);border-radius:12px;box-shadow:0 18px 44px rgb(15 23 42/.28),0 3px 8px rgb(15 23 42/.12)}
.pop .caret{position:absolute;top:-7px;width:12px;height:12px;background:#fff;border-left:1px solid var(--bd-s);border-top:1px solid var(--bd-s);transform:rotate(45deg)}
.pop .caret.r{right:-7px;left:auto;border:0;border-right:1px solid var(--bd-s);border-bottom:1px solid var(--bd-s)}
.pop .ph2{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid var(--div)}
.pop .ph2 b{font-size:13px}.pop .fb{padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.pop .fr{display:flex;flex-direction:column;gap:3px}.pop .fr label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--tx-s)}
.pop .ft{display:flex;justify-content:flex-end;gap:6px;padding:9px 12px;border-top:1px solid var(--bd);background:var(--surf-m);border-radius:0 0 12px 12px}
/* ---------- stage track ---------- */
.trk{display:flex;align-items:center}
.nd{width:15px;height:15px;border-radius:50%;border:2px solid var(--g300);background:#fff;display:flex;align-items:center;justify-content:center;color:#fff;flex:none}
.nd svg{width:8px;height:8px;stroke-width:3.4}
.nd.done{background:var(--st);border-color:var(--st)}.nd.done.g{background:var(--e600);border-color:var(--e600)}
.nd.part{border-color:var(--a500);background:linear-gradient(90deg,var(--a500) 50%,#fff 50%)}
.cn{width:19px;height:2px;background:var(--g200);flex:none}.cn.done{background:var(--st)}.cn.g{background:var(--e600)}
.trk.lg .nd{width:20px;height:20px}.trk.lg .nd svg{width:11px;height:11px}.trk.lg .cn{width:26px}
.trk-l{display:flex;font-size:9px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:var(--tx-s)}
.pb{display:flex;align-items:center;gap:6px}.pbar{width:38px;height:4px;background:var(--bd);border-radius:2px;overflow:hidden}
.pbar i{display:block;height:100%;background:var(--st)}.pbar i.part{background:var(--a500)}.pbar i.done{background:var(--st)}

/* ---------- table ---------- */
.card{background:var(--surf);border:1px solid var(--bd);border-radius:var(--rad-card);box-shadow:var(--shadow);display:flex;flex-direction:column;min-width:0;min-height:0}
.thead{display:grid;grid-template-columns:var(--cols);gap:8px;align-items:center;padding:0 10px;height:26px;background:var(--surf-m);border-bottom:1px solid var(--bd);font-size:9.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--tx-s);flex:none;border-radius:var(--rad-card) var(--rad-card) 0 0}
.thead .srt{display:inline-flex;align-items:center;gap:3px}
.tbody{flex:1;min-height:0;overflow:hidden;position:relative}
.tr{display:grid;grid-template-columns:var(--cols);gap:8px;align-items:center;padding:0 10px;height:var(--rh,36px);border-bottom:1px solid var(--div);font-size:11.5px;color:var(--tx-b)}
.tr:hover{background:var(--surf-m)}
.tr.sel{background:var(--pri-soft)}
.tr.cx{color:var(--g400)}.tr.cx .ono{text-decoration:line-through;color:var(--g400)}
.tr.open{background:#fff;box-shadow:inset 0 0 0 1.5px var(--pri);border-bottom-color:var(--pri-ring)}
.ono{font-weight:700;color:var(--tx);font-variant-numeric:tabular-nums}
.cell{display:flex;align-items:center;gap:5px;min-width:0;white-space:nowrap}
.cell.col{flex-direction:column;align-items:flex-start;gap:1px;justify-content:center}
.ell{overflow:hidden;text-overflow:ellipsis;max-width:100%}
.acts{display:flex;align-items:center;justify-content:flex-end;gap:0}
.foot{display:flex;align-items:center;justify-content:space-between;padding:0 10px;height:28px;border-top:1px solid var(--bd);background:var(--surf-m);flex:none;font-size:10.5px;color:var(--tx-s);border-radius:0 0 var(--rad-card) var(--rad-card)}
.pager{display:flex;gap:2px}.pager span{min-width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--tx-m);border:1px solid transparent}
.pager .on{background:var(--pri);color:#fff}
.pgsz{height:20px;font:inherit;font-size:10.5px;font-weight:700;color:var(--tx-b);background:var(--surf);border:1px solid var(--bd-s);border-radius:5px;padding:0 2px;cursor:pointer}

/* keep rows clear of the floating bulk bar */
.tbody:has(.bulk),.sheet-body:has(.bulk){padding-bottom:70px}
/* ---------- bulk bar (floating = allowed heavy shadow) ---------- */
.bulk{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:#111827;color:#e5e7eb;border-radius:12px;padding:5px 6px 5px 12px;display:flex;align-items:center;gap:6px;box-shadow:0 12px 30px rgb(0 0 0/.28),0 2px 6px rgb(0 0 0/.2);font-size:11px;white-space:nowrap;z-index:5}
.bulk b{color:#fff;font-variant-numeric:tabular-nums}.bulk .sep{width:1px;height:18px;background:#374151;margin:0 2px}
.bulk .btn{height:26px}.bulk .btn.ghost{background:#1f2937;border-color:#374151;color:#e5e7eb}.bulk .btn.ghost:hover{background:#374151}
.bulk .x{color:#9ca3af}

/* ---------- approvals strip ---------- */
.appr{display:flex;align-items:center;gap:8px;background:var(--a50);border:1px solid var(--a200);color:var(--a800);border-radius:var(--rad);padding:0 6px 0 9px;height:30px;font-size:11px;flex:none}
.appr b{font-weight:700}.appr .sp{flex:1}
.appr .by{color:#b45309}

/* ---------- pack lines ---------- */
.ln{display:grid;grid-template-columns:var(--lcols);gap:var(--lgap,8px);align-items:center;padding:0 8px;min-height:var(--lh,36px);border-bottom:1px solid var(--div);font-size:11.5px}
.ln:last-child{border-bottom:0}
.ln.done{background:#f0fdf4}.ln.part{background:#fffbeb}
.lnh{display:grid;grid-template-columns:var(--lcols);gap:var(--lgap,8px);padding:0 8px;height:22px;align-items:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--tx-s);border-bottom:1px solid var(--bd);background:var(--surf-m)}
.bin{display:inline-flex;align-items:center;gap:3px;font:700 10px ui-monospace,Menlo,monospace;color:var(--tx-b);background:var(--div);border-radius:4px;padding:1px 5px}
.kv{display:grid;grid-template-columns:78px 1fr;gap:3px 8px;font-size:11px;align-items:baseline}
.kv dt{color:var(--tx-s);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.35px}.kv dd{color:var(--tx-b);min-width:0}
.sh{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 9px;height:26px;border-bottom:1px solid var(--div);flex:none}
.sh h4{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--tx-s);display:flex;align-items:center;gap:5px}
.hist{display:flex;align-items:center;justify-content:space-between;gap:6px;border:1px solid var(--bd);border-radius:7px;padding:3px 4px 3px 8px;background:var(--surf-m);font-size:10.5px}
.tabs{display:flex;gap:1px;border-bottom:1px solid var(--bd);padding:0 6px;flex:none}
.tab{font-size:10.5px;font-weight:700;color:var(--tx-s);padding:0 9px;height:30px;display:flex;align-items:center;gap:5px;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.tab.on{color:var(--pri-ink);border-bottom-color:var(--pri)}
.tab .qn{font-size:9px;padding:0 4px}
.lock{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--tx-s);font-weight:700}
.note-a{background:var(--a50);border:1px solid var(--a200);color:var(--a800);border-radius:7px;padding:4px 7px;font-size:10.5px;line-height:1.35}
.hr{height:1px;background:var(--div);flex:none}
`;
