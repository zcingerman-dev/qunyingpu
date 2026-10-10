import {NetworkRoster,publishedChoices,safePortrait} from './network-roster.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Compress only selected portraits on the Host. Snapshots never contain a full
// personal asset library, and 36 candidate images fit the existing frame budget.
export async function roomPortrait(value){
 if(typeof value!=='string'||!(/^(?:data:image\/(?:png|jpeg|webp|gif);base64,)/.test(value)||/^\/studio\/media\/[a-f0-9]{64}$/.test(value)))return '';
 const image=new Image();image.src=value;try{await image.decode();}catch{return '';}
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=134;
 canvas.getContext('2d').drawImage(image,0,0,96,134);
 return safePortrait(canvas.toDataURL('image/jpeg',.65));
}
export class RoomRosterPanel{
 constructor(root,{onChange,mode,notice}){Object.assign(this,{root,onChange,mode,notice});this.pictures={};this.root.hidden=true;}
 async load(){
  const [index,catalog,runtime]=await Promise.all(['./network-roster-index.json','./play-catalog.json','../studio/api/runtime'].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error('房间将池资料读取失败');return r.json();}));
  this.roster=new NetworkRoster(index,catalog,runtime);this.root.hidden=false;
  this.root.innerHTML='<h3>房间将池</h3><p>使用当前模式可加载的全部三国武将。国战配对等模式限制仍然生效。</p><label><input type="checkbox" data-diy-enable> 添加已有DIY武将（默认关闭）</label><details data-diy-picker><summary>选择已发布DIY版本</summary><label>搜索DIY<input data-diy-search placeholder="输入武将名称"></label><div class="room-diy-choices"></div><p class="hint">仅Host执行技能代码。未发布或缺少有效代码的版本不能加入；客户端无需预先安装。</p></details><button data-roster-apply>应用将池变更</button><p class="hint" data-roster-status></p>';
  const choices=publishedChoices(runtime);
  this.root.querySelector('.room-diy-choices').innerHTML=choices.map(g=>`<label data-choice-name="${esc(g.name)}"><input type="checkbox" data-diy-id="${esc(g.id)}" ${g.error?'disabled':''}> ${esc(g.name)} · v${esc(g.version)} · ${esc(g.hp)}血${g.error?`<span class="hint"> · ${esc(g.error)}</span>`:''}</label>`).join('')||'<p>暂无已发布DIY武将。</p>';
  this.root.onchange=()=>{this.dirty=true;this.onChange(null);this.status('尚未应用；应用后所有玩家需重新Ready');};
  this.root.querySelector('[data-diy-search]').oninput=e=>{for(const row of this.root.querySelectorAll('[data-choice-name]'))row.hidden=!row.dataset.choiceName.toLowerCase().includes(e.target.value.toLowerCase());};
  this.root.querySelector('[data-roster-apply]').onclick=()=>this.apply();
  this.status('默认将池已应用；DIY关闭');
 }
 status(text){this.root.querySelector('[data-roster-status]').textContent=text;}
 lock(value){for(const c of this.root.querySelectorAll('input,button')){if(c.dataset.diyId&&publishedChoices(this.roster.runtime).find(g=>g.id===c.dataset.diyId)?.error)continue;c.disabled=value;}this.busy=value;}
 async apply(){
  if(this.busy||this.roster.frozen)return;
  this.lock(true);
  try{
   const enabled=this.root.querySelector('[data-diy-enable]').checked;
   const ids=[...this.root.querySelectorAll('[data-diy-id]:checked')].map(c=>c.dataset.diyId);
   const old={enabled:this.roster.enabled,selected:this.roster.selected};this.roster.configure(enabled,ids);
   try{
    for(const g of this.roster.prepare(this.mode()).studioRuntime.generals){if(!this.pictures[g.portrait])this.pictures[g.portrait]=await roomPortrait(this.roster.runtime.portraits?.[g.portrait]);}
    await this.onChange(this.roster.summary(this.mode()));
   }catch(e){this.roster.configure(old.enabled,old.selected);throw e;}
   this.dirty=false;this.status('将池已应用；所有玩家需重新Ready');
  }catch(e){this.notice(e.message);this.status('未应用：'+e.message);}
  finally{this.lock(false);this.onChange(null);}
 }
 freeze(){if(this.dirty)throw Error('请先应用将池变更');const config=this.roster.freeze(this.mode(),this.pictures);this.lock(true);this.status('本局将池已冻结');return config;}
}
