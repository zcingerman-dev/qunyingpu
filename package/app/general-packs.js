// Shared readable names and read-only previews; engine IDs are never renamed.
(()=>{
 const names={mode_guozhan:'国战包',mode_single:'单挑包',play_custom:'我的 DIY',extra_generals:'额外武将·迁入扩展',bwiki202610:'2026.10 正式更新',bwiki202610test:'2026.10 测试服',bwiki202610gz:'2026.10 国战君主',standard:'标准包',shenhua:'神话再临',extra:'经典神将',yijiang:'一将成名',refresh:'界限突破',sp:'璀璨星河',sp2:'系列专属',newjiang:'新一将成名',onlyOL:'OL 专属',yingbian:'文德武备',clan:'门阀士族',huicui:'群英荟萃',xianding:'限定专属',mobile:'手杀包',shiji:'始计篇',sb:'谋攻篇',bingshi:'势包',tw:'外服包',collab:'联动包',old:'怀旧包',offline:'线下包',jsrg:'江山如故',sxrm:'蚀心入魔',sixiang:'四象封印',diy:'原包 DIY',key:'Key 联动'};
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let catalogPromise;
 const editions=()=>catalogPromise??=fetch('/app/general-platforms.json').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>({names:{}}));
 function packOf(v){return v.pool|| (v.family?'play_custom':v.scope?.startsWith('mode/guozhan')?'mode_guozhan':v.scope?.startsWith('mode/single')?'mode_single':v.scope?.split('/')[1]);}
 function group(rows,pack){const byName=new Map();for(const v of rows.filter(v=>packOf(v)===pack)){const n=String(v.name||v.id).trim();if(!byName.has(n))byName.set(n,[]);byName.get(n).push(v);}return [...byName].map(([name,versions])=>({name,versions}));}
 async function preview({rows,pack,onDetails,imageURL=v=>v.portraitPath||''}){
  const platform=await editions(),all=group(rows,pack),d=document.createElement('dialog');d.className='general-pack-preview';
  d.innerHTML=`<button class="close">关闭</button><h2>${escape(names[pack]||pack)} · 武将预览</h2><p class="pack-note">平台批注按已保存资料显示：十周年、OL、手杀共有时全部标注；无资料写“其他”。同名武将在此只列一次；预览不会改变已选将池。</p><input class="pack-search" aria-label="搜索包内武将" placeholder="武将姓名、拼音或首字母"><p class="pack-count"></p><div class="pack-general-grid"></div><button class="more">显示更多</button>`;
  document.body.append(d);let limit=48;
  const platforms=item=>{const set=new Set(platform.names[item.name]||[]);for(const v of item.versions){if(v.scope==='character/mobile')set.add('手杀');if(v.scope==='character/onlyOL')set.add('OL');for(const p of v.platforms||[])if(['十周年','OL','手杀'].includes(p))set.add(p);}return ['十周年','OL','手杀'].filter(p=>set.has(p)).join(' / ')||'其他';};
  function paint(){const q=d.querySelector('input').value.trim(),list=all.filter(x=>!q||(window.CharacterSearch?CharacterSearch.matches(q,[x.name],x.versions.map(v=>v.id).join(' ')):x.name.includes(q)));d.querySelector('.pack-count').textContent=`${list.length} 名武将`;d.querySelector('.more').hidden=limit>=list.length;
   d.querySelector('.pack-general-grid').innerHTML=list.slice(0,limit).map(x=>{const v=x.versions[0],picture=imageURL(v);return `<button class="pack-general-card" data-pack-general="${escape(x.name)}">${picture?`<img loading="lazy" src="${escape(picture)}" alt="${escape(x.name)}">`:''}<strong>${escape(x.name)}</strong><span class="pack-platform">${escape(platforms(x))}</span><small>查看技能</small></button>`;}).join('')||'<p>这个包暂无武将。</p>';}
  d.querySelector('.close').onclick=()=>d.close();d.onclose=()=>d.remove();d.querySelector('input').oninput=()=>{limit=48;paint();};d.querySelector('.more').onclick=()=>{limit+=48;paint();};d.querySelector('.pack-general-grid').onclick=e=>{const b=e.target.closest('[data-pack-general]');if(b)onDetails?.(all.find(x=>x.name===b.dataset.packGeneral).versions[0]);};paint();d.showModal();return d;
 }
 window.GeneralPacks={names,packOf,group,preview};
})();
