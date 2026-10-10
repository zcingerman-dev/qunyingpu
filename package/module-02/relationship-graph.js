'use strict';
(() => {
const styles = {
 family:{color:'#84725c',dash:'',label:'亲属'}, marriage:{color:'#b06a67',dash:'7 3',label:'婚姻'},
 service:{color:'#75927d',dash:'',label:'君臣与任职'}, friend:{color:'#217d77',dash:'',label:'好友 / 故交'},
 co_spouse:{color:'#ad608b',dash:'10 5',label:'同妻妾'}, title:{color:'#a87e2e',dash:'',double:true,label:'同称号 / 合称'},
 plot:{color:'#537da6',dash:'10 4 2 4',label:'著名情节'}, sworn:{color:'#b47d43',dash:'15 4',label:'结义'},
 pair:{color:'#8a7ea0',dash:'2 5',label:'包内搭配'}, substitute:{color:'#946d9a',dash:'3 4 8 4',label:'包内替换'},
 conflict:{color:'#ab5346',dash:'8 4 2 4',label:'冲突 / 诛杀'},support:{color:'#62847c',dash:'3 4',label:'援护 / 合作'},diplomacy:{color:'#56758e',dash:'14 5',label:'外交 / 册封'},
 custom:{color:'#70767e',dash:'6 5',label:'自定义'}
};
const groupEdges = groups => groups.flatMap(g => g.participants.map(p => ({id:g.id+':'+p.personId,from:p.personId,to:g.id,kind:g.kind,label:p.role,reverseLabel:p.role,evidenceType:g.evidenceType,workKey:g.workKey,symmetric:true,groupId:g.id})));
function matchesEvidence(record,filter){if(!filter)return true;if(filter==='television')return record.workKey==='new-three-kingdoms-2010'&&record.evidenceType==='literature';if(['novel','folklore'].includes(filter))return record.workKey===filter&&record.evidenceType==='literature';return record.evidenceType===filter;}
function evidenceText(record){if(record.evidenceType==='history')return '史籍记载';const works={novel:'三国演义',folklore:'民间创作','new-three-kingdoms-2010':'新三国'};return '虚构 · '+(record.evidenceType==='literature'?(works[record.workKey]||'作品情节'):record.evidenceType==='package'?'包体设定':'自定义');}
function project(center, relations, groups, depth=1, limit=30, groupLimit=12) {
 const people=new Set([center]), chosen=new Map(), candidates=new Set([center]), omittedGroups=new Set();let frontier=[center];
 for(let level=0;level<depth;level++){
  const next=[];const add=id=>{candidates.add(id);if(!people.has(id)&&people.size<limit){people.add(id);next.push(id);}};
  for(const id of frontier){
   for(const r of relations){if(r.from===id)add(r.to);else if(r.to===id)add(r.from);}
   for(const g of groups.filter(g=>g.participants.some(p=>p.personId===id))){
    if(!chosen.has(g.id)&&chosen.size>=groupLimit){omittedGroups.add(g.id);continue;}
    chosen.set(g.id,g);for(const p of g.participants)add(p.personId);
   }
  }frontier=next;
 }
 const hubs=[...chosen.values()];return {people:[...people],groups:hubs,edges:[...relations.filter(r=>people.has(r.from)&&people.has(r.to)&&(depth>1||r.from===center||r.to===center)),...groupEdges(hubs).filter(r=>people.has(r.from))],omittedPeople:[...candidates].filter(id=>!people.has(id)).length,omittedGroups:omittedGroups.size};
}
function shortestPath(from,to,relations,groups,max=6){
 const edges=[...relations,...groupEdges(groups)],adj=new Map();
 for(const r of edges){for(const [a,b,label] of [[r.from,r.to,r.label],[r.to,r.from,r.reverseLabel]]){if(!adj.has(a))adj.set(a,[]);adj.get(a).push({from:a,to:b,relation:r,label});}}
 const queue=[{id:from,path:[]}],seen=new Set([from]);
 for(let i=0;i<queue.length;i++){const current=queue[i];if(current.path.length>=max)continue;for(const step of adj.get(current.id)||[]){if(seen.has(step.to))continue;const path=[...current.path,step];if(step.to===to)return path;seen.add(step.to);queue.push({id:step.to,path});}}
 return null;
}
function parallelOffsets(edges){
 const pairs=new Map(),offsets=new Map();for(const e of edges){const key=[e.from,e.to].sort().join('|');if(!pairs.has(key))pairs.set(key,[]);pairs.get(key).push(e);}
 for(const list of pairs.values())list.sort((a,b)=>a.id.localeCompare(b.id)).forEach((e,i)=>offsets.set(e.id,(i-(list.length-1)/2)*32));return offsets;
}
function edgeGeometry(edge,positions,groupMap,center,focus,offset=0){
 const [first,last]=[edge.from,edge.to].sort(),a=positions.get(first),b=positions.get(last),dx=b[0]-a[0],dy=b[1]-a[1],dist=Math.hypot(dx,dy)||1,nx=-dy/dist,ny=dx/dist;
 const [sx,sy]=positions.get(edge.from),[ex,ey]=positions.get(edge.to),cx=(a[0]+b[0])/2+nx*offset,cy=(a[1]+b[1])/2+ny*offset;
 function clipped(x,y,tx,ty,id){const vx=tx-x,vy=ty-y,len=Math.hypot(vx,vy)||1;let r=id===center?44:34;if(groupMap.has(id))r=Math.min(72/(Math.abs(vx)/len||.001),30/(Math.abs(vy)/len||.001));return [x+vx/len*r,y+vy/len*r];}
 const start=clipped(sx,sy,cx,cy,edge.from),end=clipped(ex,ey,cx,cy,edge.to);
 return {path:shift=>`M${start[0]+nx*shift} ${start[1]+ny*shift} Q${cx+nx*shift} ${cy+ny*shift} ${end[0]+nx*shift} ${end[1]+ny*shift}`,label:[(start[0]+2*cx+end[0])/4,(start[1]+2*cy+end[1])/4-7]};
}
function create(options){
 const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg',svg=$('relation-svg');let zoom=1,pan=[0,0],rendered=null,scene=null;
 const layoutStorage='wiki-relationship-layouts-v1';let savedLayouts={};
 try{const stored=JSON.parse(localStorage.getItem(layoutStorage)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))savedLayouts=stored;}catch{}
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn,cls)=>{const b=node('button',text,cls);b.type='button';b.onclick=fn;return b;};
 const se=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
 const style=k=>styles[k]||styles.custom;
 const allGroups=()=>options.getGroups();
 const eligible=id=>options.isEligible?.(id)!==false;
 const allowedGroups=()=>allGroups().filter(g=>matchesEvidence(g,$('graph-evidence').value)&&(!$('graph-kind').value||g.kind===$('graph-kind').value)).map(g=>({...g,participants:g.participants.filter(p=>eligible(p.personId))})).filter(g=>g.participants.length>0);
 function transform(){if(rendered)rendered.setAttribute('transform',`translate(${480+pan[0]} ${330+pan[1]}) scale(${zoom}) translate(-480 -330)`);$('graph-zoom-value').textContent=Math.round(zoom*100)+'%';}
 function resetView(){zoom=1;pan=[0,0];transform();}
 function storeLayout(){if(!scene)return;savedLayouts[scene.key]={updated:Date.now(),positions:Object.fromEntries([...scene.positions].filter(([id])=>id!==scene.center))};const keys=Object.keys(savedLayouts).sort((a,b)=>(savedLayouts[b]?.updated||0)-(savedLayouts[a]?.updated||0));for(const key of keys.slice(100))delete savedLayouts[key];try{localStorage.setItem(layoutStorage,JSON.stringify(savedLayouts));}catch{}}
 function reset(){if(scene){delete savedLayouts[scene.key];try{localStorage.setItem(layoutStorage,JSON.stringify(savedLayouts));}catch{}for(const [id,p]of scene.defaults)scene.positions.set(id,[...p]);scene.update();}resetView();}
 $('graph-zoom-in').onclick=()=>{zoom=Math.min(2.5,zoom+0.2);transform();};$('graph-zoom-out').onclick=()=>{zoom=Math.max(0.6,zoom-0.2);transform();};$('graph-reset').onclick=reset;
 let drag=null,suppressClick=null;
 const pointer=(e,target)=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(target.getScreenCTM().inverse());};
 svg.addEventListener('pointerdown',e=>{
  if(e.button!==0||!scene)return;const item=e.target.closest('.graph-node');
  if(item){if(item.dataset.nodeId===scene.center)return;const start=pointer(e,rendered);drag={type:'node',id:item.dataset.nodeId,item,start,position:[...scene.positions.get(item.dataset.nodeId)],x:e.clientX,y:e.clientY,moved:false,pointerId:e.pointerId};}
  else{if(e.target.closest('.graph-edge-hit'))return;drag={type:'pan',start:pointer(e,svg),pan:[...pan],pointerId:e.pointerId};}
  if(drag.type==='pan')svg.setPointerCapture(e.pointerId);
 });
 svg.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  if(drag.type==='pan'){const p=pointer(e,svg);pan=[drag.pan[0]+p.x-drag.start.x,drag.pan[1]+p.y-drag.start.y];transform();return;}
  if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<4)return;
  if(!drag.moved)svg.setPointerCapture(e.pointerId);drag.moved=true;drag.item.classList.add('dragging');e.preventDefault();const p=pointer(e,rendered),isHub=scene.groupMap.has(drag.id),marginX=isHub?83:46,marginY=isHub?38:46;
  scene.positions.set(drag.id,[Math.max(marginX,Math.min(960-marginX,drag.position[0]+p.x-drag.start.x)),Math.max(marginY,Math.min(660-marginY,drag.position[1]+p.y-drag.start.y))]);scene.update();
 });
 function finishDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;if(drag.type==='node'){drag.item.classList.remove('dragging');if(drag.moved){suppressClick=e.type==='pointercancel'?null:{id:drag.id,until:Date.now()+350};storeLayout();}}if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);drag=null;}
 for(const name of ['pointerup','pointercancel'])svg.addEventListener(name,finishDrag);
 svg.addEventListener('click',e=>{const id=e.target.closest('.graph-node')?.dataset.nodeId;if(suppressClick&&Date.now()<suppressClick.until&&(id===suppressClick.id||e.target===svg)){e.preventDefault();e.stopPropagation();}suppressClick=null;},true);
 function openGroup(id){const g=allGroups().find(g=>g.id===id);if(!g)return;$('graph-kind').value=g.kind;if(!matchesEvidence(g,$('graph-evidence').value))$('graph-evidence').value='';refresh();$('graph-group').value=id;options.openGraph();render();}
 $('graph-group').onchange=()=>{render();$('path-result').replaceChildren();};
 function refresh(){
  const previous=$('graph-group').value;const first=node('option','按中心人物展开');first.value='';$('graph-group').replaceChildren(first);
  for(const [name,test]of [['共同称号',g=>g.kind==='title'],['三国演义与民间情节',g=>g.kind==='plot'&&g.workKey!=='new-three-kingdoms-2010'],['新三国 · 2010',g=>g.kind==='plot'&&g.workKey==='new-three-kingdoms-2010']]){const optgroup=node('optgroup');optgroup.label=name;for(const g of allowedGroups().filter(test)){const o=node('option',g.name);o.value=g.id;optgroup.append(o);}if(optgroup.children.length)$('graph-group').append(optgroup);}
  $('graph-group').value=[...$('graph-group').options].some(o=>o.value===previous)?previous:'';
 }
 function groupCard(g,center='',detailed=false){
  const card=node('article',undefined,'relation-row group-card');card.dataset.groupId=g.id;
  const title=node('div',undefined,'row-title');title.append(node('strong',g.name),node('span',evidenceText(g),'evidence '+g.evidenceType));card.append(title);
  const role=g.participants.find(p=>p.personId===center)?.role;if(role)card.append(node('p','此人物的作用：'+role,'group-role'));
  card.append(node('p',g.summary,'note'));if(g.note)card.append(node('p',g.note,'note'));
  const sources=node('div',undefined,'source-list');options.sourceLinks(g.sources,sources);card.append(sources);
  if(detailed){const list=node('ul',undefined,'participant-list');for(const p of g.participants){const person=options.getPerson(p.personId);const li=node('li');li.append(button(person?.name||p.personId,()=>options.selectPerson(p.personId),'person-link'),node('span',p.role));list.append(li);}card.append(list);}
  else card.append(button('展开'+(g.kind==='plot'?'情节':'称号'),()=>openGroup(g.id),'group-open'));
  return card;
 }
 function memberships(personId,container){if(!eligible(personId))return;for(const g of allGroups().filter(g=>g.participants.some(p=>p.personId===personId)))container.append(groupCard(g,personId));}
 function detailRelation(edge,center){$('graph-relations').replaceChildren(node('h3','选中关系'));if(edge.groupId){const g=allGroups().find(g=>g.id===edge.groupId);$('graph-relations').append(groupCard(g,edge.from,true));}else $('graph-relations').append(options.relationRow(edge,center===edge.to?center:edge.from));}
 function layout(ids,center,groups,edges){
  const hubs=new Set(groups.map(g=>g.id)), positions=new Map([[center,[480,330]]]);
  for(const isHub of [true,false]){const list=ids.filter(id=>id!==center&&hubs.has(id)===isHub);list.forEach((id,i)=>{const angle=-Math.PI/2+2*Math.PI*i/list.length;positions.set(id,[480+(isHub?170:370)*Math.cos(angle),330+(isHub?135:255)*Math.sin(angle)]);});}
  const half=id=>hubs.has(id)?[70,30]:id===center?[45,45]:[42,36];
  // Deterministic collision relaxation preserves a familiar overview after filtering.
  for(let step=0;step<280;step++){
   const forces=new Map(ids.map(id=>[id,[0,0]]));
   for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){
    const ia=ids[a],ib=ids[b],[ax,ay]=positions.get(ia),[bx,by]=positions.get(ib),[aw,ah]=half(ia),[bw,bh]=half(ib);
    const dx=bx-ax||0.1,dy=by-ay||0.1,dist=Math.hypot(dx,dy),force=Math.min(3,700/dist**2);
    let fx=dx/dist*force,fy=dy/dist*force;const ox=aw+bw+16-Math.abs(dx),oy=ah+bh+18-Math.abs(dy);
    if(ox>0&&oy>0){if(ox<oy)fx+=Math.sign(dx)*Math.min(5,ox*.2);else fy+=Math.sign(dy)*Math.min(5,oy*.2);}
    forces.get(ia)[0]-=fx;forces.get(ia)[1]-=fy;forces.get(ib)[0]+=fx;forces.get(ib)[1]+=fy;
   }
   for(const e of edges){const a=positions.get(e.from),b=positions.get(e.to),dx=b[0]-a[0],dy=b[1]-a[1],dist=Math.hypot(dx,dy)||1,f=(dist-(e.groupId?170:245))*.004;
    forces.get(e.from)[0]+=dx/dist*f;forces.get(e.from)[1]+=dy/dist*f;forces.get(e.to)[0]-=dx/dist*f;forces.get(e.to)[1]-=dy/dist*f;}
   for(const id of ids){if(id===center)continue;const p=positions.get(id),f=forces.get(id),[w,h]=half(id);p[0]=Math.max(w+15,Math.min(945-w,p[0]+f[0]));p[1]=Math.max(h+15,Math.min(645-h,p[1]+f[1]));}
  }return positions;
 }
 function render(){
  refresh();const center=options.resolveCenter(),focus=allowedGroups().find(g=>g.id===$('graph-group').value);
  if(!center&&!focus){scene=null;rendered=null;svg.replaceChildren();svg.dataset.center='';svg.dataset.people='0';svg.dataset.groups='0';$('graph-legend').replaceChildren();$('graph-relations').replaceChildren();$('graph-note').textContent='请从建议列表选择有效的中心人物；重名人物请选择完整出处。';return;}
  if(center&&!eligible(center)){scene=null;rendered=null;svg.replaceChildren();svg.dataset.center=center;svg.dataset.people='0';svg.dataset.groups='0';$('graph-legend').replaceChildren();$('graph-note').textContent='该人物仅保留简介，不纳入三国关系图谱及连接路径。';const p=options.getPerson(center);$('graph-relations').replaceChildren(node('h3',p?.name||'人物简介'),node('p',p?.note||'该人物不属于本次三国关系网。','note'),button('查看人物简介',()=>options.selectPerson(center)));return;}
  const direct=options.getRelations(),groups=allowedGroups();let model;
  if(focus)model={people:focus.participants.map(p=>p.personId),groups:[focus],edges:groupEdges([focus]),omittedPeople:0,omittedGroups:0};
  else model=project(center,direct,groups,Number($('graph-depth').value));
  const focusId=focus?.id||center,groupMap=new Map(model.groups.map(g=>[g.id,g])),ids=[...model.people,...groupMap.keys()],positions=layout(ids,focusId,model.groups,model.edges);
  const key=JSON.stringify([center,focus?.id||'',$('graph-evidence').value,$('graph-kind').value,$('graph-depth').value]),defaults=new Map([...positions].map(([id,p])=>[id,[...p]]));
  const saved=savedLayouts[key]?.positions;for(const id of ids){const p=saved?.[id];if(id!==center&&Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=15&&p[0]<=945&&p[1]>=15&&p[1]<=645)positions.set(id,[...p]);}
  svg.replaceChildren();svg.setAttribute('viewBox','0 0 960 660');svg.dataset.center=focusId;svg.dataset.people=String(model.people.length);svg.dataset.groups=String(model.groups.length);
  const defs=se('defs');for(const kind of new Set(model.edges.map(e=>e.kind))){const marker=se('marker',{id:'relation-arrow-'+kind,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto'});marker.append(se('path',{d:'M0 0L10 5L0 10Z',fill:style(kind).color}));defs.append(marker);}svg.append(defs);rendered=se('g',{class:'graph-content'});svg.append(rendered);resetView();
  const offsets=parallelOffsets(model.edges),edgeElements=new Map(),nodeElements=new Map();
  for(const edge of model.edges){
   const geometry=edgeGeometry(edge,positions,groupMap,center,focus,offsets.get(edge.id)||0),s=style(edge.kind),edgeGroup=se('g',{'data-relation-id':edge.id,'data-kind':edge.kind,'data-evidence':edge.evidenceType,class:'graph-edge-group'});
   for(const shift of s.double?[-2.3,2.3]:[0]){const p=se('path',{d:geometry.path(shift),'data-shift':shift,fill:'none',stroke:s.color,'stroke-width':s.double?1.5:edge.kind==='friend'?2.6:2,'stroke-dasharray':s.dash,class:'graph-edge'});if(!edge.symmetric)p.setAttribute('marker-end',`url(#relation-arrow-${edge.kind})`);edgeGroup.append(p);}
   const hit=se('path',{d:geometry.path(0),'data-shift':0,fill:'none',stroke:'transparent','stroke-width':14,class:'graph-edge-hit',role:'button',tabindex:0,'aria-label':s.label+'：'+edge.label});hit.onclick=()=>detailRelation(edge,center);hit.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();hit.onclick();}};
   const title=se('title');title.textContent=(options.getPerson(edge.from)?.name||groupMap.get(edge.from)?.name)+' — '+edge.label+' — '+(options.getPerson(edge.to)?.name||groupMap.get(edge.to)?.name)+' · '+evidenceText(edge);hit.append(title);edgeGroup.append(hit);
   const text=se('text',{x:geometry.label[0],y:geometry.label[1],'text-anchor':'middle',class:'edge-text'});text.textContent=(focus?edge.label+' · ':!edge.groupId?s.label+' · ':'')+(edge.evidenceType==='history'?'史籍':edge.workKey==='new-three-kingdoms-2010'?'虚构 · 新三国':'虚构');edgeGroup.append(text);rendered.append(edgeGroup);edgeElements.set(edge.id,edgeGroup);
  }
  for(const id of ids){
   const [x,y]=positions.get(id),g=groupMap.get(id),p=options.getPerson(id),name=g?.name||p?.name||id,type=g?.kind||'person';
   const item=se('g',{class:'graph-node '+type,role:'button',tabindex:0,'data-node-id':id,'data-node-type':type,'data-locked':id===center,'data-x':x,'data-y':y,'aria-label':g?'展开'+name:'以'+name+'为中心查看关系'});
   if(g){if(g.kind==='title')item.append(se('path',{d:`M${x-64} ${y-27}L${x+64} ${y-27}L${x+76} ${y}L${x+64} ${y+27}L${x-64} ${y+27}L${x-76} ${y}Z`,fill:'#f0e5c8',stroke:styles.title.color,'stroke-width':2}));else item.append(se('rect',{x:x-73,y:y-29,width:146,height:58,rx:12,fill:'#e7eef5',stroke:styles.plot.color,'stroke-width':2}));
    const lines=name.length>10?[name.slice(0,10),name.slice(10)]:[name];lines.forEach((line,i)=>{const t=se('text',{x,y:y+(lines.length===1?4:-4+i*17),'text-anchor':'middle',class:'hub-name'});t.textContent=line;item.append(t);});
   }else{item.append(se('circle',{cx:x,cy:y,r:id===center?43:33,fill:id===center?'#dfd1aa':p?.category==='other'?'#f2dfd3':'#edf0e5',stroke:id===center?'#a78140':'#8aa18c','stroke-width':2}));const t=se('text',{x,y:y+5,'text-anchor':'middle'});t.textContent=name.length>6?name.slice(0,5)+'…':name;item.append(t);}
   const title=se('title');title.textContent=name+(g?' · '+evidenceText(g):'')+(id===center?' · 当前人物位置固定':' · 拖动或用方向键调整位置');item.append(title);
   item.onclick=()=>{if(g)openGroup(id);else{$('graph-group').value='';options.setCenter(id);render();}};
   item.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();item.onclick();return;}const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();if(id===center||!scene)return;const p=scene.positions.get(id),step=e.shiftKey?30:10,mx=g?83:46,my=g?38:46;scene.positions.set(id,[Math.max(mx,Math.min(960-mx,p[0]+delta[0]*step)),Math.max(my,Math.min(660-my,p[1]+delta[1]*step))]);scene.update();storeLayout();}};
   item.onpointerenter=()=>{for(const path of rendered.querySelectorAll('.graph-edge-group')){const edge=model.edges.find(e=>e.id===path.dataset.relationId);path.classList.toggle('dimmed',edge.from!==id&&edge.to!==id);}};item.onpointerleave=()=>rendered.querySelectorAll('.dimmed').forEach(e=>e.classList.remove('dimmed'));rendered.append(item);nodeElements.set(id,{item,origin:[x,y]});
  }
  scene={key,center,positions,defaults,groupMap,update(){
   for(const [id,{item,origin}]of nodeElements){const [x,y]=positions.get(id);item.setAttribute('transform',`translate(${x-origin[0]} ${y-origin[1]})`);item.dataset.x=x;item.dataset.y=y;}
   for(const edge of model.edges){const g=edgeElements.get(edge.id),geometry=edgeGeometry(edge,positions,groupMap,center,focus,offsets.get(edge.id)||0);for(const p of g.querySelectorAll('path'))p.setAttribute('d',geometry.path(Number(p.dataset.shift)||0));const label=g.querySelector('.edge-text');if(label){label.setAttribute('x',geometry.label[0]);label.setAttribute('y',geometry.label[1]);}}
  }};
  const legend=$('graph-legend');legend.replaceChildren();for(const kind of new Set(model.edges.map(e=>e.kind))){const s=style(kind),sample=se('svg',{viewBox:'0 0 45 14','aria-hidden':'true'});for(const shift of s.double?[-2,2]:[0])sample.append(se('line',{x1:2,y1:7+shift,x2:43,y2:7+shift,stroke:s.color,'stroke-width':2,'stroke-dasharray':s.dash}));const b=button('',()=>{$('graph-kind').value=kind;render();$('path-result').replaceChildren();},'legend-item');b.append(sample,node('span',s.label));legend.append(b);}
  $('graph-note').textContent=(focus?'当前：'+focus.name:'中心：'+options.getPerson(center)?.name)+' · '+model.people.length+' 位人物 · '+model.groups.length+' 个称号 / 情节 · '+model.edges.length+' 条连线。'+(model.omittedPeople||model.omittedGroups?' 本次达到显示上限（30 人 / 12 节点）；还有至少 '+model.omittedPeople+' 位人物、'+model.omittedGroups+' 个节点，可用上方选择器逐个查看。':'')+' 点击人物继续展开，点击称号或情节查看全部成员；点击连线查看关系依据。';
  const side=$('graph-relations');side.replaceChildren(node('h3',focus?'成员与出处':'中心人物的关系'));
  if(focus)side.append(groupCard(focus,'',true));else{for(const g of groups.filter(g=>g.participants.some(p=>p.personId===center)))side.append(groupCard(g,center));for(const r of direct.filter(r=>r.from===center||r.to===center))side.append(options.relationRow(r,center));if(model.edges.length===0)side.append(node('p','当前筛选范围没有已录入关系。','detail-empty'));}
 }
 return {render,refresh,openGroup,memberships,allowedGroups,groupCard};
}
globalThis.RelationshipNetwork={styles,project,shortestPath,parallelOffsets,groupEdges,edgeGeometry,matchesEvidence,evidenceText,create};
})();
