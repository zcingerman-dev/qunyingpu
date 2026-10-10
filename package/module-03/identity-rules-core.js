// Project rules confirmed on 2026-10-07. No character skill definitions are changed.
export const ruleIds={heir:'play_lichu_heir',feiyang:'play_lichu_feiyang',bahu:'play_lichu_bahu',wild:'play_lichu_wild_mark',ai:'_play_lichu_ai'};
export function successionActive(settings){return settings.mode==='identity'&&settings.identityVariant==='lichu';}
export function mayChooseRoute(round,living,actor){
 return round>=2&&actor?.alive&&actor.identity==='nei'&&living.filter(p=>p.alive).filter(p=>['zhu','zhong'].includes(p.identity)).length*2<living.filter(p=>p.alive).length;
}
export function identitySide(player){return ['zhu','zhong'].includes(player.identity)?'lord':player.identity==='fan'?'rebel':'independent:'+player.seat;}
export function identityWinner(players,lordSeat){
 const living=players.filter(p=>p.alive),lord=living.find(p=>p.seat===lordSeat);
 if(lord){return living.some(p=>['fan','nei','ye'].includes(p.identity))?null:'lord';}
 return living.length===1&&['nei','ye'].includes(living[0].identity)?'independent:'+living[0].seat:'rebel';
}
