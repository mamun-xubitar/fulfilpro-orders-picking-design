// Reports every element inside .art whose content overflows its box (design intent: only .tbody/.lb may clip rows).
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const S = `<script>const o=[];const art=document.querySelector('.art');o.push('art '+art.scrollHeight+'x'+art.scrollWidth);
art.querySelectorAll('*').forEach(e=>{const v=e.scrollHeight-e.clientHeight,h=e.scrollWidth-e.clientWidth;if((v>1||h>1)&&e.clientHeight>0&&!(e instanceof SVGElement)){const cs=getComputedStyle(e);if(cs.display==='inline')return;o.push((e.className.toString()||e.tagName)+' v'+v+' h'+h+' "'+(e.textContent||'').trim().slice(0,28)+'"')}});document.title='@@'+o.slice(0,14).join(' || ')+'@@';</script>`;
for (const f of process.argv.slice(2)) {
  writeFileSync('/tmp/_o.html', readFileSync(f, 'utf8').replace('</body>', S + '</body>'));
  const dom = execSync('google-chrome --headless --disable-gpu --no-sandbox --window-size=1280,800 --virtual-time-budget=2000 --dump-dom file:///tmp/_o.html 2>/dev/null', { maxBuffer: 64e6 }).toString();
  console.log('== ' + f + '\n' + ((dom.match(/@@([\s\S]*?)@@/) || [])[1] || '').split(' || ').join('\n'));
}
