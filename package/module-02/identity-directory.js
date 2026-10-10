'use strict';
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WikiIdentity=api;
})(typeof window==='object'?window:globalThis,()=>{
 const labels={historical:'历史原型',fiction:'虚构人物',works:'其他作品'};
 const threeKingdomsWorld=world=>/三国|三國|汉末|漢末|魏晋|三国时期/.test(world||'');
 const category=(value,world)=>value==='pending'?'works':value==='other'?(threeKingdomsWorld(world)?'fiction':'works'):value;
 function prepare(base,network,state){
  const entries=[...base.entities,...state.customEntities].map(e=>({...e,...state.entities[e.id],aliases:[...(state.entities[e.id]?.aliases||e.aliases||[])],versionIds:[]}));
  const raw=new Map(entries.map(e=>[e.id,e])),links={...network.identityLinks};
  // Explicit personal corrections and version ownership take precedence over curated merges.
  for(const id of Object.keys(state.entities))delete links[id];
  for(const id of Object.values(state.identityOverrides))delete links[id];
  const canonical=id=>{const seen=new Set();while(links[id]&&raw.has(links[id])&&!seen.has(id)){seen.add(id);id=links[id];}return id;};
  for(const e of entries){e.category=category(e.category,e.world);if(!links[e.id])delete e.canonicalId;}
  for(const e of entries){const target=raw.get(canonical(e.id));if(target&&target!==e)target.aliases=[...new Set([...target.aliases,e.name,...e.aliases])];}
  const versions=[...base.versions,...state.customVersions].map(v=>{
   const original=v.originalEntityId||v.entityId;
   const target=state.identityOverrides[v.versionId]||network.versionIdentityLinks?.[v.versionId]||original;
   const entityId=canonical(target);return {...v,entityId};
  });
  for(const v of versions){const e=raw.get(v.entityId);if(e){e.versionIds.push(v.versionId);if(!e.portrait&&v.portraitPath)e.portrait=v.portraitPath;}}
  const map=new Map(entries.map(e=>[e.id,raw.get(canonical(e.id))]));
  const people=entries.filter(e=>canonical(e.id)===e.id);
  const records=[...base.relations.map(r=>({...r,...state.relations[r.id]})),...Object.values(state.relations).filter(r=>!base.relations.some(b=>b.id===r.id))];
  const byKey=new Map();
  for(const source of records){
   if(state.hiddenRelations.includes(source.id))continue;
   const r={...source,from:canonical(source.from),to:canonical(source.to),sources:[...(source.sources||[])],mergedIds:[source.id]};
   if(r.from===r.to)continue;
   const endpoints=r.symmetric?[r.from,r.to].sort():[r.from,r.to];
   const key=JSON.stringify([...endpoints,r.kind,r.symmetric,r.label,r.reverseLabel,r.evidenceType,r.workKey||'']);
   const prior=byKey.get(key);
   if(!prior){byKey.set(key,r);continue;}
   prior.mergedIds.push(r.id);prior.sources=[...new Map([...prior.sources,...r.sources].map(s=>[JSON.stringify(s),s])).values()];
   prior.note=[...new Set([prior.note,r.note].filter(Boolean))].join('\n');
   prior.citation=[...new Set([prior.citation,r.citation].filter(Boolean))].join('\n');
  }
  const groups=network.groups.map(g=>({...g,participants:[...new Map(g.participants.map(p=>({...p,personId:canonical(p.personId)})).map(p=>[p.personId+'|'+p.role,p])).values()]}));
  return {people,personMap:map,versions,relations:[...byKey.values()],groups,canonical};
 }
 return {labels,category,threeKingdomsWorld,prepare};
});
