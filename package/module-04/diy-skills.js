// Presentation metadata only. Never execute user code to render a skill description.
export function splitSkillText(text = '') {
 const lines = String(text).replace(/\r\n/g, '\n').split('\n');
 const headings = lines.map((line, i) => ({i, match:line.trim().match(/^([^\s:：。，；！？（）()\d]{1,20})([：:]?)$/)}))
  .filter(x => x.match && lines.slice(x.i+1).some(s => s.trim()));
 // Old free text is preserved as one block unless there are clear named headings.
 if (!headings.length || headings[0].i !== lines.findIndex(s=>s.trim()) ||
     !headings.some(x=>x.match[2]) && headings.length<2) return [{name:'', description:String(text), key:''}];
 return headings.map((x,i)=>({name:x.match[1], description:lines.slice(x.i+1,headings[i+1]?.i).join('\n').trim(), key:''}));
}
export function diySkills(general) {
 return Array.isArray(general.skills) && general.skills.length ? general.skills.map(s=>({...s})) : splitSkillText(general.description);
}
export function skillText(skills) {
 return skills.map(s=>(s.name.trim()?s.name.trim()+'：\n':'')+s.description.trim()).join('\n\n');
}
export function skillDetails(general) {
 if (general.skillDetails?.length) return general.skillDetails;
 const prefix=general.id?.startsWith('diy-')?'studio_'+general.id.replaceAll('-','_')+'_':'';
 return diySkills(general).map((s,i)=>({id:s.key?(prefix&&!s.key.startsWith('studio_')?prefix+s.key:s.key):'', name:s.name||`技能${i+1}`, description:s.description}));
}
export function mountSkillEditor(host, initial, escapeHTML) {
 let skills=initial.map(s=>({...s}));if(!skills.length)skills=[{name:'',description:'',key:''}];
 function collect(){for(const [i,row] of [...host.querySelectorAll('[data-skill-block]')].entries()){
  skills[i].name=row.querySelector('[data-skill-name]').value;
  skills[i].description=row.querySelector('[data-skill-description]').value;
 }return skills.map(s=>({...s}));}
 function paint(){host.innerHTML=skills.map((s,i)=>`<fieldset class="diy-skill-block" data-skill-block="${i}"><legend>技能${i+1}</legend><label>技能名称<input data-skill-name value="${escapeHTML(s.name)}" maxlength="100"></label><label>技能描述<textarea data-skill-description>${escapeHTML(s.description)}</textarea></label><div class="buttons"><button type="button" data-skill-move="${i}" data-offset="-1" ${i===0?'disabled':''}>上移</button><button type="button" data-skill-move="${i}" data-offset="1" ${i===skills.length-1?'disabled':''}>下移</button><button type="button" data-skill-remove="${i}" ${skills.length===1?'disabled':''}>删除本技能</button></div></fieldset>`).join('')+'<button type="button" data-skill-add>增加技能</button>';}
 host.onclick=e=>{const b=e.target.closest('[data-skill-add],[data-skill-remove],[data-skill-move]');if(!b)return;collect();
  if(b.hasAttribute('data-skill-add')){if(skills.length>=50)return;skills.push({name:'',description:'',key:''});}
  else if(b.hasAttribute('data-skill-remove')){const i=Number(b.dataset.skillRemove);if((skills[i].name||skills[i].description)&&!confirm('删除编辑区的这个技能？保存新版本前不会改变原武将。'))return;skills.splice(i,1);}
  else{const i=Number(b.dataset.skillMove),j=i+Number(b.dataset.offset);[skills[i],skills[j]]=[skills[j],skills[i]];}
  paint();};paint();return {collect};
}
