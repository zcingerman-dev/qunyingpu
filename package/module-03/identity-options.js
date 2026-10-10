// Setup helpers only. Mode effects are enabled after their rules are verified.
(function(root){
 'use strict';
 const names={standard:'标准身份',lichu:'立储与内奸择途'};
 function active(settings){return settings.mode==='identity'&&settings.identityVariant==='lichu';}
 function name(settings){return settings.mode==='identity'?names[settings.identityVariant||'standard']||names.standard:null;}
 function roles(players,doubleNei){
  if(![8,9,10].includes(players))throw Error('立储与择途支持八至十人');
  const dual=players===10||doubleNei;
  const loyal=players===8?2:players===9?(dual?2:3):3;
  return ['zhu',...Array(loyal).fill('zhong'),...Array(players-1-loyal-(dual?2:1)).fill('fan'),...Array(dual?2:1).fill('nei')];
 }
 function validate(settings){
  const variant=settings.identityVariant??'standard';
  if(!Object.hasOwn(names,variant))throw Error('身份场玩法无效');
  if(!active(settings))return;
  roles(settings.players,settings.doubleNei);
  if(settings.doubleGeneral!==false)throw Error('立储与择途仅支持单将');
 }
 root.IdentityOptions={names,active,name,roles,validate};
})(globalThis);
