// Injects a measuring script into each artboard and reports overflow per zone.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SCRIPT = `<script>
function r(el){const b=el.getBoundingClientRect();return Math.round(b.height);}
const out=[];
const art=document.querySelector('.art');
out.push('ART h='+r(art)+' scroll='+art.scrollHeight);
const body=document.querySelector('.body');
if(body) out.push('BODY h='+r(body)+' scroll='+body.scrollHeight+' OVER='+(body.scrollHeight-body.clientHeight));
document.querySelectorAll('.card,.tzone,.kpis,.drawer,.pad,.body>div').forEach((el,i)=>{
  const over=el.scrollHeight-el.clientHeight, wover=el.scrollWidth-el.clientWidth;
  if(over>1||wover>1){
    const t=(el.querySelector('h3,.case-t,b')||{}).textContent||el.className;
    out.push('#'+i+' ['+el.className.split(' ')[0]+'] "'+String(t).slice(0,34).trim()+'" h='+r(el)+' vOver='+over+' hOver='+wover);
  }
});
document.title='@@'+out.join(' || ')+'@@';
</script>`;

for (const f of process.argv.slice(2)) {
  const html = readFileSync(f, 'utf8').replace('</body>', SCRIPT + '</body>');
  writeFileSync('/tmp/_m.html', html);
  const dom = execSync(
    `google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars --window-size=1280,800 --virtual-time-budget=2000 --dump-dom file:///tmp/_m.html 2>/dev/null`,
    { maxBuffer: 64e6 }
  ).toString();
  const m = dom.match(/@@([\s\S]*?)@@/);
  console.log('\n=== ' + f + ' ===');
  console.log(m ? m[1].split(' || ').join('\n') : 'no measurement');
}
