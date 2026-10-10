// Only presentation changes. The eternal tag remains available to native rules.
export function installPrivateCardTags({lib,game,get}) {
 const proto=lib.element.Card.prototype, native=proto.addGaintag;
 if(proto.playPrivateTagsInstalled)return;
 proto.playPrivateTagsInstalled=true;
 const prefix='eternal_dcfuyue_',tracked=new Set();
 const style=document.createElement('style');style.textContent='.play-private-fuyue[hidden]{display:none!important}';document.head.append(style);
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function refresh(){
  for(const card of tracked){for(const span of card.querySelectorAll('.play-private-fuyue'))span.hidden=!(get.owner(card)===game.me&&['h','s'].includes(get.position(card)));}
  for(const span of document.querySelectorAll('.play-private-fuyue')){const card=span.closest('.card');if(!tracked.has(card))span.hidden=true;}
 }
 proto.addGaintag=function(...args){
  const result=native.apply(this,args);
  if(this.gaintag?.some(t=>t.startsWith(prefix))){
   tracked.add(this);
   this.node.gaintag.innerHTML=this.gaintag.map(tag=>{
    let label=get.translation(tag);if(label===tag&&tag.startsWith('eternal_'))label=get.translation(tag.slice(8));
    return label==='invisible'?'':tag.startsWith(prefix)?`<span class="play-private-fuyue" hidden>${escape(label)}</span>`:label;
   }).filter(Boolean).join(' ');
   refresh();
  }
  return result;
 };
 // Reparenting cards and swapping the controlled hand happen before painting.
 const observer=new MutationObserver(refresh);observer.observe(document.body,{childList:true,subtree:true});
 for(const id of ['swapControl','swapPlayer'])if(typeof game[id]==='function'){
  const original=game[id];game[id]=function(...args){const result=original.apply(this,args);refresh();return result;};
 }
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 return {refresh};
}
export function privateFuLabels(card,get){
 return (card.gaintag||[]).filter(t=>t.startsWith('eternal_dcfuyue_')).map(t=>get.translation(t.slice(8)));
}
