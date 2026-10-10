import {defaultRoster,validateRoster,randomizeRoster} from './roster-rules.js';
// Host-only selection adapter. Reuses the existing runtime pool, pairing rules
// and native roster initializer. Private choices never enter the public roster.
export class NetworkSelection{
  constructor(data,settings,humanSeats,onApply){
    Object.assign(this,{data,settings,humanSeats,onApply});this.index=0;this.page=0;this.poolFilter='';this.revision=1;this.id='roster-'+crypto.randomUUID();this.refs=new Map();this.roster=defaultRoster(data.roles.length);this.roster.humanSeat=0;
    for(const seat of humanSeats)this.roster.seats[seat].method='manual';
  }
  get seat(){return this.humanSeats[this.index];}
  get candidates(){return this.poolFilter?this.data.pool.filter(v=>v.pool===this.poolFilter):this.data.pool;}
  prompt(){
    this.refs.clear();const chosen=this.roster.seats[this.seat].picks,perPage=36;
    const buttons=this.candidates.slice(this.page*perPage,(this.page+1)*perPage).map(v=>{const ref='general-'+v.key;this.refs.set(ref,v.key);return {ref,generalId:v.id,portrait:v.portraitPath,text:v.name+' · '+v.groups.join('/')+' · '+v.hp+'血',selected:chosen.includes(v.key)};});
    const controls=[['previous','上一页'],['next','下一页'],['confirm','确认选将']].map(([link,text])=>({ref:'roster-'+link,text,link}));
    const pools=[...new Set(this.data.pool.map(v=>v.pool).filter(Boolean))];
    const filters=[{ref:'roster-pool-',text:'全部三国武将',selected:!this.poolFilter},...pools.map(p=>({ref:'roster-pool-'+p,text:p,selected:p===this.poolFilter}))];
    return {id:this.id,revision:this.revision,seat:this.seat,event:'chooseCharacter',text:`选将：${this.data.double?'选择两名合法主副将':'选择一名武将'}；${this.candidates.length}个候选；第${this.page+1}/${Math.max(1,Math.ceil(this.candidates.length/perPage))}页`,cards:[],targets:[],buttons,controls,filters};
  }
  snapshot(){return {public:{round:0,phase:0,pile:0,discard:0,players:this.data.roles.map((identity,seat)=>({seat,name:'选将中',nameVisible:true,identity,identityVisible:identity==='zhu'||['single','doudizhu'].includes(this.settings.mode),hp:0,maxHp:0,alive:true,hand:0,equip:[],judges:[],printedSkills:[]}))},private:{},prompt:this.prompt()};}
  apply(packet){
    const a=packet.action;
    if(packet.seat!==this.seat)throw Error('该选择属于其他玩家');
    if(a.prompt!==this.id||a.revision!==this.revision)throw Error('选择已经变化，请使用最新提示');
    this.prompt();const picks=this.roster.seats[this.seat].picks;
    if(a.op==='button'){
      const key=this.refs.get(a.ref);if(!key)throw Error('引用不属于当前合法候选');
      if(picks.includes(key))picks.splice(picks.indexOf(key),1);else if(picks.length<(this.data.double?2:1))picks.push(key);else throw Error('已选齐武将，请先取消一个选择');
    }else if(a.op==='control'){
      if(a.ref.startsWith('roster-pool-')){const pool=a.ref.slice('roster-pool-'.length);if(pool&&!this.data.pool.some(v=>v.pool===pool))throw Error('引用不属于当前合法候选');this.poolFilter=pool;this.page=0;}
      else if(a.ref==='roster-next')this.page=Math.max(0,Math.min(Math.ceil(this.candidates.length/36)-1,this.page+1));
      else if(a.ref==='roster-previous')this.page=Math.max(0,this.page-1);
      else if(a.ref==='roster-confirm'){
        const trial={...this.roster,seats:[this.roster.seats[this.seat]]};
        const errors=validateRoster(this.data.pool,trial,{mode:this.settings.mode,double:this.data.double,separatism:this.settings.separatism});
        if(errors.length)throw Error(errors.join('；'));
        if(this.index+1===this.humanSeats.length){
          const roster=randomizeRoster(this.data.pool,this.roster,{mode:this.settings.mode,double:this.data.double,separatism:this.settings.separatism,roles:this.data.roles});
          const all=validateRoster(this.data.pool,roster,{mode:this.settings.mode,double:this.data.double,separatism:this.settings.separatism,roles:this.data.roles});
          if(all.length)throw Error(all.join('；'));this.onApply(roster);this.done=true;
        }
        this.index++;this.page=0;this.poolFilter='';
      }else throw Error('操作按钮已失效');
    }else throw Error('选将操作无效');
    this.revision++;
  }
}
