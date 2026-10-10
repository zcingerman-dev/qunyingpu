import {lib,game,ui,get,ai,_status} from "../../../noname.js";
import translate from "./translate.js";
const skills = {
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6361; original skill djcjingmeng
'djcjingmeng':{//惊梦 每回合限一次，一名角色使用牌结算后，你可以将此牌对应的实体牌当刺【杀】对其使用，你与其于此牌结算期间视为拥有〖奸雄〗。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'useCardAfter',
        },
        usable:1,
        derivation:['jianxiong'],
        check(event,player){
            return get.attitude(player,event.player)<0;
        },
        prompt2(event,player){
            return '将'+get.translation(event.cards)+'当作刺【杀】对'+get.translation(event.player)+'使用';
        },
        filter(event,player,name){
            return event.cards.length;
        },
        async content(event,trigger,player){
            await player.addAdditionalSkills(event.name,get.info(event.name).derivation,true);
            await trigger.player.addAdditionalSkills(event.name,get.info(event.name).derivation,true);
            await player.useCard({name:'sha',nature:'stab'},trigger.cards,trigger.player,false);
            player.removeAdditionalSkills(event.name);
            trigger.player.removeAdditionalSkills(event.name);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6385; original skill djcchixiao
'djcchixiao':{//赤霄 你使用【杀】无视目标防具，你进入濒死状态时，你可以弃置一张点数不小于X的牌并回复1点体力（X为你上一次以此法弃置牌的点数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'dying',
        },
        intro:{
            content:'濒死时可弃置点数不小于#点的牌回复体力',
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard('hes',get.prompt(event.skill),'弃置一张'+(player.storage[event.skill]?('点数不小于'+player.storage[event.skill]+'的'):'')+'牌，并回复1点体力',(card,player)=>{
                return !player.storage[event.skill]||get.number(card)>=player.storage[event.skill];
            }).forResult();
        },
        async content(event,trigger,player){
            player.storage[event.name]=get.number(event.cards[0]);
            player.markSkill(event.name);
            await player.discard(event.cards[0]);
            await player.recover();
        },
        group:['djcchixiao_qinggang'],
        subSkill:{
            'qinggang':{
                audio:'djcchixiao',
                trigger:{
                    player:'useCardToPlayered',
                },
                filter(event){
                    return event.card.name=='sha';
                },
                forced:true,
                locked:false,
                firstDo:true,
                logTarget:'target',
                async content(event,trigger,player){
                    trigger.target.addTempSkill('qinggang2');
                    trigger.target.storage.qinggang2.add(trigger.card);
                    trigger.target.markSkill('qinggang2');
                },
                ai:{
                    'unequip_ai':true,
                    skillTagFilter(player,tag,arg){
                        if(arg&&arg.name=='sha')return true;
                        return false;
                    },
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6433; original skill djcjuesi
'djcjuesi':{//决死 每回合限一次，当你使用牌指定唯一目标后，你可以与其延时拼点，你与其均可重复此流程。然后依次结算拼点结果，赢的角色将拼点牌当不可响应的【杀】对对方使用。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardToPlayered',
        },
        usable:1,
        filter(event,player,name){
            return event.targets.length==1&&player.canCompare(event.target);
        },
        check(event,player){
            return get.attitude(player,event.target)<0;
        },
        async content(event,trigger,player){
            const comparisonEvents=[];
            let currentInitiator=player;
            let currentTarget=trigger.target;
            let shouldContinue=true;
        
            while(shouldContinue){
                const next=await currentInitiator.chooseToCompare(currentTarget).set('isDelay',true);
                comparisonEvents.push(next);
                if(currentInitiator.canCompare(currentTarget)){
                    const {result:{bool}}=await currentInitiator.chooseBool('是否与'+get.translation(currentTarget)+'继续延时拼点？').set('ai',()=>{
                        for(let card of _status.event.playerx.getCards('hs')){
                            const val=get.value(card);
                            if(get.number(card)>=10&&val<=6||get.number(card)>=8&&val<=3)return true;
                        };
                        return false;
                    }).set('playerx',currentInitiator);
                    if(bool)continue;
                    else{
                        if(currentTarget.canCompare(currentInitiator)){
                            const {result:{bool:targetBool}}=await currentTarget.chooseBool('是否与'+get.translation(currentInitiator)+'继续延时拼点？').set('ai',()=>{
                                for(let card of _status.event.playerx.getCards('hs')){
                                    const val=get.value(card);
                                    if(get.number(card)>=10&&val<=6||get.number(card)>=8&&val<=3)return true;
                                };
                                return false;
                            }).set('playerx',currentTarget);
                            if(targetBool)[currentInitiator,currentTarget]=[currentTarget,currentInitiator];
                            else shouldContinue=false;
                        }else shouldContinue=false;
                    };
                }else shouldContinue=false;
            };
            for(const eventx of comparisonEvents){
                const result=await game.createEvent('chooseToCompare',false).set('player',eventx.player).set('parentEvent',eventx).setContent('chooseToCompareEffect').forResult();
                if(result?.winner){
                    let loser=result.winner==player?trigger.target:player;
                    let cards=[result.player,result.target];
                    await result.winner.useCard({name:'sha'},cards,loser,false).set('oncard',card=>{
                        _status.event.directHit.addArray(game.players);
                    });
                };
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5907; original skill djcdengquan
'djcdengquan':{//登权 锁定技，你的手牌数发生变化后，你将手牌数超过手牌上限数量张手牌置于武将牌上，称之为“权”，然后你摸一张牌。你的手牌上限+X（X为你的“权”数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'loseAfter',
            global:['equipAfter','addJudgeAfter','gainAfter','loseAsyncAfter','addToExpansionAfter'],
        },
        marktext:'权',
        locked:true,
        intro:{
            name:'权',
            mark(dialog,storage,player){
                let cards=player.getExpansions('djcdengquan');
                if(player.isUnderControl(true))dialog.addAuto(cards);
                return '共有'+get.cnNumber(cards.length)+'张牌';
            },
            markcount:'expansion',
        },
        filter(event,player,name){
            if(event.getg&&event.getg(player)?.length&&player.countCards('hs')>player.getHandcardLimit())return true;
            return event.getl(player)?.hs?.length&&player.countCards('hs')>player.getHandcardLimit();
        },
        async cost(event,trigger,player){
            let num=player.countCards('hs')-player.getHandcardLimit();
            event.result=await player.chooseCard('hs',num,true,'你发动了〖'+get.skillTranslation(event.skill)+'〗','将'+get.cnNumber(num)+'张手牌置于武将牌上，称之为“权”').set('ai',(card)=>{
                return get.value(card);
            }).forResult();
        },
        async content(event,trigger,player){
            await player.addToExpansion(event.cards,'giveAuto',player).set('gaintag',[event.name]);
            await player.draw();
        },
        mod:{
            maxHandcard(player,num){
                return num+(player.getExpansions('djcdengquan').length||0);
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5944; original skill djcxiemou
'djcxiemou':{//挟谋 出牌阶段，你可以使用一张“权”并将手牌数摸至手牌上限。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        delay:false,
        trigger:{
            player:'useCardAfter',
        },
        silent:true,
        log:false,
        direct:true,
        locked:false,
        prompt:'使用一张“权”并将手牌数摸至体力上限',
        filter(event,player,name){
            if(event.name=='useCard')return event.skill=='djcxiemou_backup'&&player.countCards('hs')<player.getHandcardLimit();
            if(player.countCards('hs')>=player.getHandcardLimit()||!player.getExpansions('djcdengquan'))return false;
            return true;
        },
        async content(event,trigger,player){
            if(trigger&&trigger.name=='useCard'){
                await player.drawTo(player.getHandcardLimit());
                return;
            };
            let cards=player.getExpansions('djcdengquan');
            if(!cards.length)return;
            const evt=event.getParent(2);
            let copy_cards=cards.map(card=>{
                let cardx=ui.create.card();
                cardx.init(get.cardInfo(card));
                cardx._cardid=card.cardid;
                return cardx;
            });
            let cards_h=player.getCards('hs');
            game.broadcastAll((hs,cards,player)=>{
                let node=get.is.singleHandcard()?player.node.handcards1:player.node.handcards2;
                for(let card of hs)card.hide();
                for(let card of cards){
                    card.classList.add('glows');
                    card.addGaintag('djcxiemou_hs');
                    if(node.firstChild){
                    node.insertBefore(card,node.firstChild);
                    }else node.appendChild(card);
                };
                if(player==game.me)ui.updatehl();
            },cards_h,copy_cards,player);
            const result=await player.chooseCard('挟谋：选择要使用的牌',(card,player)=>{
                return get.event().cards.includes(card);
            },'s').set('cards',copy_cards.filter(card=>{
                if(player.hasSkill('aozhan')&&card.name=='tao'){
                    return(evt.filterCard({name:'sha',isCard:true,cards:[card],},evt.player,evt)||evt.filterCard({name:'shan',isCard:true,cards:[card],},evt.player,evt));
                };
                return evt.filterCard(card,evt.player,evt);
            })).set('ai',card=>{
                const evt=get.event().getParent(3),player=get.event().player;
                if(evt.type=='phase'&&!player.hasValueTarget(card,null,true))return 0;
                return 1;
            }).forResult();
            let card;
            if(result.bool){
                card=cards.find(card=>card.cardid===result.cards[0]._cardid);
            };
            const cards2=player.getCards('s',card=>card.hasGaintag('djcxiemou_hs'));
            if(player.isOnline2()){
                player.send((cards,player)=>{
                    cards.forEach(i=>i.delete());
                    if(player==game.me)ui.updatehl();
                },cards2,player);
            };
            cards2.forEach(i=>i.delete());
            if(player==game.me)ui.updatehl();
            game.broadcastAll((hs)=>{
                for(let card of hs)card.show();
            },cards_h);
            if(card){
                let name=card.name,
                aozhan=player.hasSkill('aozhan')&&name=='tao';
                if(aozhan){
                    name=evt.filterCard({name:'sha',isCard:true,cards:[card],},evt.player,evt)?'sha':'shan';
                };
                if(evt.name=='chooseToUse'){
                    game.broadcastAll((result,name)=>{
                        lib.skill.djcxiemou_backup.viewAs={name:name,cards:[result],isCard:true};
                    },card,name);
                    evt.set('_backupevent','djcxiemou_backup');
                    evt.set('openskilldialog','请选择'+get.translation(card)+'的目标');
                    evt.backup('djcxiemou_backup');
                };
            };
            evt.goto(0);
        },
        ai:{
            order:7,
            result:{
                player:1,
            },
        },
        subSkill:{
            'hs':{
            },
            'backup':{
                log:false,
                popname:true,
                precontent(){
                    player.logSkill('djcxiemou');
                    let name=event.result.card.name,cards=event.result.card.cards.slice(0);
                    event.result.cards=cards;
                    let rcard=cards[0],card;
                    if(rcard.name==name)card=get.autoViewAs(rcard);
                    else card=get.autoViewAs({name,isCard:true});
                    event.result.card=card;
                },
                filterCard:()=>false,
                selectCard:-1,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5512; original skill djcsuhan
'djcsuhan':{//溯憾 当你需要使用或打出一张伤害牌/非伤害牌时，你可观看牌堆顶的前X张牌(X为存活角色数且至多为5)。然后你可以将一张红色牌/黑色牌当作其中一张此牌使用或打出。若你本回合以此法使用或打出过与此牌牌名相同的牌，此技能本回合失效。
        audio:'ext:点绛唇/audio/skill:2',
        enable:['chooseToUse','chooseToRespond'],
        delay:false,
        hiddenCard:()=>true,
        showVCards(cards,player){
            let copy_cards=cards.map(card=>{
                let cardx=ui.create.card();
                cardx.init(get.cardInfo(card));
                cardx._cardid=card.cardid;
                return cardx;
            });
            let cards_h=player.getCards('hs');
            let hideHacard=(hs,cards,player)=>{
                let node=get.is.singleHandcard()?player.node.handcards1:player.node.handcards2;
                for(let card of hs)card.hide();
                for(let card of cards){
                    card.classList.add('glows');
                    card.addGaintag('djcsuhan');
                    if(node.firstChild){
                        node.insertBefore(card,node.firstChild);
                    }else node.appendChild(card);
                };
                if(player==game.me)ui.updatehl();/*{
                    if(!ui.handcards1Container||!ui.handcards2Container)return;
                    if(!ui.handcards1Container.childNodes.length)return;
                    let hs1=[],
                        hs2=[];
                    for(let i=0;i<ui.handcards1Container.firstChild.childElementCount;i++){
                        if(!ui.handcards1Container.firstChild.childNodes[i].classList.contains('removing')&&cards.includes(ui.handcards1Container.firstChild.childNodes[i])){
                            hs1.push(ui.handcards1Container.firstChild.childNodes[i]);
                        }
                    }
                    for(let i=0;i<ui.handcards2Container.firstChild.childElementCount;i++){
                        if(!ui.handcards2Container.firstChild.childNodes[i].classList.contains('removing')&&cards.includes(ui.handcards2Container.firstChild.childNodes[i])){
                            hs2.push(ui.handcards2Container.firstChild.childNodes[i]);
                        }
                    }
                    let offset1,
                        offset12=0;
                    if(!lib.config.fold_card){
                        offset1=112;
                        ui.handcards1Container.classList.add('scrollh');
                    }else{
                        offset1=Math.min(112,(ui.handcards1Container.offsetWidth-128)/(hs1.length-1));
                        if(hs1.length>1&&offset1<32){
                            offset1=32;
                            ui.handcards1Container.classList.add('scrollh');
                        }else{
                            ui.handcards1Container.classList.remove('scrollh');
                        }
                    }
                    if(offset1<100){
                        offset12=100-offset1;
                    }
                    for(let i=0;i<hs1.length;i++){
                        hs1[i].style.transform='translateX('+i*offset1+'px)';
                        hs1[i]._transform='translateX('+i*offset1+'px)';
                        ui.refresh(hs1[i]);
                        hs1[i].classList.remove('drawinghidden');
                        if(offset12>40){
                            offset12=90-hs1[i].node.info.offsetWidth;
                            hs1[i].node.info.querySelector('span').style.display='none';
                            if(hs1[i].node.name.classList.contains('long')){
                                hs1[i].node.name.style.transform='translateY(16px)scale(0.85)';
                                hs1[i].node.name.style.transformOrigin='top left';
                            }else{
                                hs1[i].node.name.style.transform='translateY(16px)';
                            }
                            hs1[i].node.info.style.transform='translateX(-'+offset12+'px)translateY(-3px)';
                        }else{
                            hs1[i].node.info.querySelector('span').style.display='';
                            hs1[i].node.name.style.transform='';
                            hs1[i].node.name.style.transformOrigin='';
                            hs1[i].node.info.style.transform='translateX(-'+offset12+'px)';
                        }
                    }
                    ui.handcards1Container.firstChild.style.width=offset1*(hs1.length-1)+118+'px';

                    let offset2,
                        offset22=0;
                    if(!lib.config.fold_card){
                        offset2=112;
                        ui.handcards2Container.classList.add('scrollh');
                    }else{
                        offset2=Math.min(112,(ui.handcards2Container.offsetWidth-128)/(hs2.length-1));
                        if(hs2.length>1&&offset2<32){
                            offset2=32;
                            ui.handcards2Container.classList.add('scrollh');
                        }else{
                            ui.handcards2Container.classList.remove('scrollh');
                        }
                    }
                    if(offset2<100){
                        offset22=100-offset2;
                    }
                    for(let i=0;i<hs2.length;i++){
                        hs2[i].style.transform='translateX('+i*offset2+'px)';
                        hs2[i]._transform='translateX('+i*offset2+'px)';
                        ui.refresh(hs2[i]);
                        hs2[i].classList.remove('drawinghidden');
                        if(offset22>40){
                            offset22=90-hs2[i].node.info.offsetWidth;
                            hs2[i].node.info.querySelector('span').style.display='none';
                            if(hs2[i].node.name.classList.contains('long')){
                                hs2[i].node.name.style.transform='translateY(16px)scale(0.85)';
                                hs2[i].node.name.style.transformOrigin='top left';
                            }else{
                                hs2[i].node.name.style.transform='translateY(16px)';
                            }
                            hs2[i].node.info.style.transform='translateX(-'+offset22+'px)translateY(-3px)';
                        }else{
                            hs2[i].node.info.querySelector('span').style.display='';
                            hs2[i].node.name.style.transform='';
                            hs2[i].node.name.style.transformOrigin='';
                            hs2[i].node.info.style.transform='translateX(-'+offset22+'px)';
                        }
                    }
                    ui.handcards2Container.firstChild.style.width=offset2*(hs2.length-1)+118+'px';
                };*/
            }
            hideHacard(cards_h,copy_cards,player);
        },
        prompt(){
            let num=Math.min(5,game.countPlayer());
            return '观看牌堆顶的'+get.cnNumber(num)+'张牌';
        },
        filter(event,player,name){
            if(!Array.isArray(event.djcsuhan_cards)||event.responded)return false;
            return lib.inpile.some(i=>event.filterCard(get.autoViewAs({
                name:i
            },'unsure'),player,event));
        },
        onChooseToRespond:(event)=>{
            if(game.online||!event.player.hasSkill('djcsuhan'))return;
            let cards=[];
            const num=Math.min(5,game.countPlayer());
            for(let i=0;i<num;i++){
                let card=ui.cardPile.childNodes[i];
                if(card)cards.push(card);
                else break;
            }
            event.set('djcsuhan_cards',cards);
        },
        onChooseToUse:(event)=>{
            if(game.online||!event.player.hasSkill('djcsuhan'))return;
            let cards=[];
            const num=Math.min(5,game.countPlayer());
            for(let i=0;i<num;i++){
                let card=ui.cardPile.childNodes[i];
                if(card)cards.push(card);
                else break;
            }
            event.set('djcsuhan_cards',cards);
        },
        chooseButton:{
            dialog(event,player){
                const cards=event.djcsuhan_cards||[];
                let dialog=ui.create.dialog('溯憾:选择你要使用的牌',cards,'hidden');
                dialog.forceDirect=true;
                return dialog;
            },
            check(button){
                const player=get.player();
                return player.getUseValue(button.link);
            },
            select(){
                return(get.event().djcsuhan_cards||[1]).length;
            },
            backup(links,player){
                const cards=links.slice(0);
                lib.skill.djcsuhan.showVCards(cards,player);
                get.event().set('custom_djcsuhan',{
                    add:{
                        ...get.event().custom.add
                    },
                    replace:{
                        ...get.event().custom.replace
                    }
                });
                get.event().set('restore_djcsuhan',get.event().restore);
                get.event().set('restore',function(){
                    this.restore_djcsuhan.apply(this,arguments);
                    this.restore=this.restore_djcsuhan;
                    if(get.event().custom_djcsuhan){
                        get.event().set('custom',get.event('custom_djcsuhan'));
                        delete get.event().custom_djcsuhan;
                    };
                    const player=get.player();
                    const cards2=player.getCards('s',card=>card.hasGaintag('djcsuhan'));
                    if(player.isOnline2()){
                        player.send((cards,player)=>{
                            cards.forEach(i=>i.delete());
                            if(player==game.me)ui.updatehl();
                        },cards2,player);
                    };
                    cards2.forEach(i=>i.delete());
                    if(player==game.me)ui.updatehl();
                    for(let card of player.getCards('hs'))card.show();
                });
                get.event().custom.add.card=function(){
                    const cards2=get.player().getCards('s',card=>card.hasGaintag('djcsuhan'));
                    if(ui.selected.cards.length==0&&cards2.length){
                        for(let card of player.getCards('hs',(card)=>!card.hasGaintag('djcsuhan')))card.hide();
                        let node=get.is.singleHandcard()?player.node.handcards1:player.node.handcards2;node.firstChild;
                        cards2.reverse().forEach(i=>{
                            if(node.firstChild){
                                node.insertBefore(i,node.firstChild);
                            }else node.appendChild(i);
                            i.show();
                        });
                        ui.updatehl();
                        for(let card of ui.selected.cards){
                            card.classList.add('selected');
                            card.updateTransform(true);
                        };
                        cards2.forEach(i=>i.show());
                    };
                };
                get.event().custom.replace.window=function(){
                    if(_status.event.skill&&_status.event.name=='chooseToUse'){
                        ui.click.cancel();
                    }else if(_status.event._checked){
                        game.uncheck();
                        game.check();
                    }
                    const player=get.player();
                    const cards2=player.getCards('s',card=>card.hasGaintag('djcsuhan'));
                    if(player.isOnline2()){
                        player.send((cards,player)=>{
                            cards.forEach(i=>i.delete());
                            if(player==game.me)ui.updatehl();
                        },cards2,player);
                    };
                    cards2.forEach(i=>i.delete());
                    if(player==game.me)ui.updatehl();
                    for(let card of player.getCards('hs'))card.show();
                    cards2.forEach(i=>i.delete());
                    if(get.event().custom_djcsuhan){
                        get.event().set('custom',get.event('custom_djcsuhan'));
                        delete get.event().custom_djcsuhan;
                    };
                };
                return{
                    log:false,
                    linksx:cards,
                    filterCardx:get.event().filterCard,
                    selectCard:2,
                    complexCard:true,
                    complexSelect:true,
                    position:'hes',
                    viewAs(cards,player){
                        if(cards.length>0){
                            const card=get.autoViewAs({
                                name:cards[0].name,
                                nature:cards[0].nature
                            },cards.length>1?[cards[1]]:'unsure');
                            if(get.event()?.skillDialog?.content?.childNodes)get.event().skillDialog.content.childNodes[0].innerHTML='将一张'+(get.tag({
                                name:card.name
                            },'damage')>=1?'红色':'黑色')+'牌当做'+(get.translation(card.nature)||'')+get.translation(card.name)+'使用或打出';
                            return card;
                        }else{
                            if(get.event()?.skillDialog?.content?.childNodes)get.event().skillDialog.content.childNodes[0].innerHTML='操作提示：先选择要转化的牌然后将一张牌当此牌使用';
                        };
                        return null;
                    },
                    filterCard(card,player,event){
                        if(!ui.selected.cards.length){
                            //if(player.storage['djcsuhan_use']&&player.storage['djcsuhan_use'].includes(card.name))return false;
                            return card.hasGaintag('djcsuhan')&&lib.skill.djcsuhan_backup.filterCardx(get.autoViewAs({
                                name:card.name,
                                nature:card.nature
                            },'unsure'),player,event);
                        }else{
                        if(card.hasGaintag('djcsuhan'))return false;
                            const cards2=player.getCards('s',card=>card.hasGaintag('djcsuhan'));
                            let node=get.is.singleHandcard()?player.node.handcards1:player.node.handcards2;
                            cards2.forEach(i=>{
                                i.hide();
                                node.appendChild(i);
                            });
                            ui.updatehl();
                            for(let card of ui.selected.cards){
                                card.classList.add('selected');
                                card.updateTransform(true);
                            };
                            for(let card of player.getCards('hs',(card)=>!card.hasGaintag('djcsuhan')))card.show();
                            let vcard=ui.selected.cards[0],
                                name=vcard.name,
                                nature=vcard.nature;
                            return lib.skill.djcsuhan_backup.filterCardx({
                                name:name,
                                nature:nature,
                                cards:[card]
                            },player,event)&&get.color(card)==(get.tag({
                                name:name
                            },'damage')>=1?'red':'black');
                        }

                    },
                    async precontent(event,trigger,player){
                        const cards2=player.getCards('s',card=>card.hasGaintag('djcsuhan'));
                        if(player.isOnline2()){
                            player.send((cards,player)=>{
                                cards.forEach(i=>i.delete());
                                if(player==game.me)ui.updatehl();
                            },cards2,player);
                        };
                        cards2.forEach(i=>i.delete());
                        if(player==game.me)ui.updatehl();
                        const skill=event.name.replace('pre_','').replace('_backup','');
                        const name=event.result.cards[0].name;
                        event.result.card=get.autoViewAs(event.result.cards[0]);
                        event.result.cards=event.result.cards.slice(1);
                        event.result.skill='djcsuhan_backup';
                        if(['sha','shan'].includes(event.result.card.name)){
                            let name=event.result.card.name=='shan'?'sha':'shan';
                            player.logSkill(skill+(event.result.cards[0].name==name?'_longdan':''));
                        }else player.logSkill(skill+(['huogong','wuxie'].includes(name)?'_'+name:''));
                        player.addTempSkill(skill+'_use');
                        if(!player.storage[skill+'_use'].includes(name))player.storage[skill+'_use'].push(name);
                        else player.tempBanSkill(skill);
                    },
                };
            },
            prompt(links,player){
                return '操作提示：先选择要转化的牌然后将一张牌当此牌使用';
            },
        },
        ai:{
            fireAttack:true,
            respondSha:true,
            respondShan:true,
            order:8,
            result:{
                player(player){
                    if(_status.event.dying)return get.attitude(player,_status.event.dying);
                    return 1;
                },
            },
        },
        subSkill:{
            backup:{},
            'use':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=[];
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
            },
            'huogong':{
                audio:'huoji',
            },
            'wuxie':{
                audio:'kanpo',
            },
            'longdan':{
                audio:'sblongdan',
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5875; original skill djcqiongzhi
'djcqiongzhi':{//穷志 每回合限一次，当你造成或受到伤害后，你可以令伤害来源用所有手牌替换牌堆顶的X张牌（X为存活角色数且至多为5）。然后你视为使用一张【兵临城下】。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
            player:'damageEnd',
        },
        usable:1,
        filter(event,player,name){
            return event.source&&event.source.countCards('hs');
        },
        check(event,player){
            let num=Math.min(5,game.countPlayer());
            if(event.source.countCards('hs')<num)return get.attitude(player,event.source)>0;
            return true;
        },
        prompt2(event,player){
            let num=Math.min(5,game.countPlayer());
            return '令'+get.translation(event.source)+'用所有手牌替换牌堆顶的'+get.cnNumber(num)+'张牌。然后你视为使用一张【兵临城下】';
        },
        async content(event,trigger,player){
            let num=Math.min(5,game.countPlayer());
            let cards=get.cards(num);
            game.cardsGotoOrdering(cards);
            let hs=trigger.source.getCards('hs');
            game.log(trigger.source,'将','#y'+get.cnNumber(hs.length)+'张手牌','置于了牌堆顶');
            await trigger.source.lose(hs,ui.cardPile).set('insert_card',true);
            await trigger.source.gain(cards,'draw');
            await player.chooseUseTarget({name:'binglinchengxiax',isCard:true},true,false);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6061; original skill djczhibei
'djczhibei':{//峙北 锁定技，你失去从牌堆顶或牌堆底摸到的所有手牌后，你从牌堆另一端摸两张牌。
        audio:'ext:点绛唇/audio/skill:2',
        forced:true,
        trigger:{
            player:'loseAfter',
            global:['equipAfter','addJudgeAfter','gainAfter','loseAsyncAfter','addToExpansionAfter'],
        },
        filter(event,player,name){
            let evt=event.getl(player);
            if(!evt||!evt.cards2||!evt.cards2.length)return false;
            if(event.name=='lose'){
                for(let i in event.gaintag_map){
                    if(event.gaintag_map[i].includes('djczhibei_bottom')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag('djczhibei_bottom')))==0)return true;
                    if(event.gaintag_map[i].includes('djczhibei_top')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag('djczhibei_top')))==0)return true;
                };
                return false;
            };
            return player.hasHistory('lose',evt=>{
                if(event!=evt.getParent())return false;
                for(let i in evt.gaintag_map){
                    if(evt.gaintag_map[i].includes('djczhibei_bottom')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag('djczhibei_bottom')))==0)return true;
                    if(evt.gaintag_map[i].includes('djczhibei_top')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag('djczhibei_top')))==0)return true;
                };
                return false;
            });
        },
        async content(event,trigger,player){
            let num1=0;
            let num2=0;
            if(trigger.name=='lose'){
                for(let i in trigger.gaintag_map){
                    if(trigger.gaintag_map[i].includes(event.name+'_top')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag(event.name+'_top')))==0)num1++;
                    if(trigger.gaintag_map[i].includes(event.name+'_bottom')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag(event.name+'_bottom')))==0)num2++;
                };
            }else player.getHistory('lose',evt=>{
                if(trigger!=evt.getParent())return false;
                for(let i in evt.gaintag_map){
                    if(evt.gaintag_map[i].includes(event.name+'_top')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag(event.name+'_top')))==0)num1++;
                    if(evt.gaintag_map[i].includes(event.name+'_bottom')&&player.countCards('hs',card=>(card.hasGaintag&&card.hasGaintag(event.name+'_bottom')))==0)num2++;
                };
            });
            if(num2>0)await player.draw(2)
            if(num1>0)await player.draw(2,'bottom');
        },
        mod:{
            aiOrder(player,card,num){
                if(get.itemtype(card)=='card'&&card.gaintag?.some(tag=>tag.startsWith('djczhibei')))return num+0.5;
            },
            aiValue(player,card,num){
                if(get.itemtype(card)=='card'&&card.gaintag?.some(tag=>tag.startsWith('djczhibei')))return num+0.5;
            },
            aiUseful(player,card,num){
                if(get.itemtype(card)=='card'&&card.gaintag?.some(tag=>tag.startsWith('djczhibei')))return num+0.5;
            },
        },
        ai:{
            effect:{
                player_use(card,player,target){
                    if(card.cards&&card.cards.some(i=>i.gaintag?.some(tag=>tag.startsWith('djczhibei'))))return [1,0.3];
                },
            },
        },
        group:['djczhibei_1'],
        subSkill:{
            '1':{
                trigger:{
                    player:'gainAfter',
                },
                popup:false,
                forced:true,
                init(player,skill){
                    game.broadcastAll((skill)=>{
                        lib.translate[skill.replace('_1','')+'_top']='顶·峙北';
                        lib.translate[skill.replace('_1','')+'_bottom']='底·峙北';
                    },skill);
                },
                filter(event,player,name){
                    return event.getParent().name=='draw'&&event.cards&&event.cards.length>0;
                },
                async content(event,trigger,player){
                    let evt=trigger.getParent();
    				if(evt.bottom)player.addGaintag(trigger.cards,event.name.replace('_1','')+'_bottom');
    				else player.addGaintag(trigger.cards,event.name.replace('_1','')+'_top');
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6148; original skill djcjianshi
'djcjianshi':{//渐势 当你不以此法使用或打出一张牌结算后，你可以将一张同类型的手牌置于牌堆顶并令一名角色选择一项:1.使用一张与此牌类型相同的牌并摸一张牌（计入次数）。2.令你本回合非锁定技失效并受到你对其造成的1点火属性伤害。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:['useCardAfter','respondAfter'],
        },
        filter(event,player,name){
            if(event.getParent(2).name=='djcjianshi')return false;
            return player.countCards('hs',card=>get.type2(card)==get.type2(event.card));
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCardTarget({
                prompt:get.prompt(event.skill),
                prompt2:'将一张'+get.translation(get.type2(_status.event.card))+'牌置于牌堆顶并令一名角色选择一项:1.使用一张'+get.translation(get.type2(_status.event.card))+'牌并摸一张牌。2.受到你对其造成的1点火属性伤害并令你本回合非锁定技失效',
                filterCard(card){
                    return get.type2(card)==get.type2(_status.event.card);
                },
                position:'hs',
                filterTarget:true,
                ai1(card){
                    return 6-get.useful(card);
                },
                ai2(target){
                    const player=get.player();
                    const trigger=get.event().getTrigger();
                    if(target==player&&player.countCards('hs',card=>{
                        if(!player.hasUseTarget(card))return false;
                        return get.type2(card)==get.type2(_status.event.card);
                    })>1)return 20;
                    if(!target.countCards('hs',card=>get.type2(card)==get.type2(_status.event.card)))return get.damageEffect(target,player,player,'fire');
                    return get.attitude(player,target)/(target.countCards('hs')+1.01)-0.5;
                },
            }).set('card',trigger.card).forResult();
        },
        async content(event,trigger,player){
            const target=event.targets[0];
            await player.lose(event.cards[0],ui.cardPile).set('insert_card',true);
            game.log(player,'将','#y一张手牌','置于了牌堆顶');
            const {result}=await target.chooseToUse({
                filterCard(card,player,event){
                    if(get.type2(card)!=get.type(_status.event.card)||get.itemtype(card)!='card'||get.position(card)!='h')return false;
                    return lib.filter.filterCard.apply(this,arguments)&&target.hasUseTarget(card,null,true);
                },
                prompt:'使用一张'+get.translation(get.type2(_status.event.card))+'牌并摸一张牌，或点取消受到'+get.translation(player)+'对你造成的1点火属性伤害并令其本回合非锁定技失效',
                addCount:true,
                ai1(card){
                    const player=get.player();
                    const source=get.event().getParent(2).player;
                    if(get.damageEffect(player,source,player,'fire')>=0)return 0;
                    return player.getUseValue(card);
                },
            }).set('card',trigger.card)
            if(result.bool)await target.draw();
            else{
                player.addTempSkill('fengyin');
                await target.damage('fire',player,'nocard');
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6208; original skill djcfenbeng
'djcfenbeng':{//分崩 每名角色的出牌阶段限一次，其可以将一张红色牌/黑色牌当作【乐不思蜀】/【兵粮寸断】对你使用，并令你回复1点体力/摸两张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'useCardAfter'
        },
        filter(event,player,name){
            return event.skill=='djcfenbeng_1'&&event.targets.includes(player)&&(event.card.name=='bingliang'||player.isDamaged());
        },
        forced:true,
        locked:false,
        async content(event,trigger,player){
            if(trigger.card.name=='lebu')await player.recover();
            else await player.draw(2);
        },
        global:['djcfenbeng_1'],
        subSkill:{
            'used':{
                charlotte:true,
                onremove:true,
            },
            '1':{
                enable:'phaseUse',
                prompt(){
                    const player=get.player();
                    const targets=game.filterPlayer((target)=>target.hasSkill('djcfenbeng')&&!player.getStorage('djcfenbeng_used').includes(target));
                    let str=get.translation(targets);
                    if(targets.length>1)str+='中的一名角色';
                    return '将一张红色牌/黑色牌当【乐不思蜀】/【兵粮寸断】对'+str+'使用';
                },
                position:'hes',
                viewAs(cards,player){
                    if(!cards.length)return null;
                    return get.autoViewAs({name:get.color(cards)=='red'?'lebu':'bingliang'},cards);
                },
                ai1:(card)=>{
                    let value=15-get.value(card);
                    return value;
                },
                ai2:(target)=>{
                    return get.attitude(get.player(),target);
                },
                filter(event,player){
                    return game.hasPlayer((target)=>target.hasSkill('djcfenbeng')&&!player.getStorage('djcfenbeng_used').includes(target))
                },
                filterCard:(card)=>{
                    return ['red','black'].includes(get.color(card));
                },
                filterTarget:(card,player,target)=>{
                    const uc=ui.selected.cards;
                    return target.hasSkill('djcfenbeng')&&!player.getStorage('djcfenbeng_used').includes(target)&&target.canAddJudge({name:get.color(uc)=='red'?'lebu':'bingliang',cards:[uc]});
                },
                async precontent(event,trigger,player){
                    player.addTempSkill('djcfenbeng_used',{global:'phaseUseBegin'});
                    game.tempData=event.result;
                    player.markAuto('djcfenbeng_used',event.result.targets);
                },
                ai:{
                order:15,
                player:(player,target)=>{
                    if(game.hasPlayer((target)=>target.hasSkill('djcfenbeng')&&get.attitude(player,target)>4))return 1000;
                    return 0;
                },
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6274; original skill djcjufen
'djcjufen':{//俱焚 当你成为其他角色使用【杀】或普通锦囊牌的目标后，你可以废除一个装备栏并令此牌对你无效。然后你横置或重置你与当前回合角色，并视为使用一张【火烧连营】。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            target:'useCardToTargeted',
        },
        filter(event,player,name){
            return player.hasEnabledSlot()&&event.player!=player&&event.card&&(event.card.name=='sha'||get.type(event.card)=='trick');
        },
        async cost(event,trigger,player){
            let list=[];
            for(let i=1;i<6;i++){
                if(player.hasEnabledSlot(i))list.push('equip'+i);
            };
            list.push('cancel2');
            const {result:{control}}=await player.chooseControl(list).set('prompt',get.prompt(event.skill)).set('prompt2','废除一个装备栏并令'+get.translation(trigger.card)+'对你无效，然后你横置或重置你与当前回合角色，并视为使用一张【火烧连营】').set('ai',()=>{
                let bool=lib.skill[event.skill].check(trigger,player);
                if(!bool)return 'cancel2';
                if(_status.event.list.includes('equip5'))return 'equip5';
                return _status.event.list.randomGet();
            }).set('list',list)
            if(control&&control!='cancel2'){
                let bool=true;
                event.result={bool,cost_data:{control}};
            };
        },
        check(event,player){
            if(event.getParent().excluded.includes(player))return false;
            if(get.attitude(player,event.player)>0||(player.hp<2&&!get.tag(event.card,'damage')))return false;
            let evt=event.getParent();
            let directHit=(evt.nowuxie&&get.type(event.card,'trick')==='trick')||(evt.directHit&&evt.directHit.includes(player))||(evt.customArgs&&evt.customArgs.default&&evt.customArgs.default.directHit2);
            if(get.tag(event.card,'respondSha')){
                if(directHit||player.countCards('hs',{name:'sha'})===0)return true;
            }else if(get.tag(event.card,'respondShan')){
                if(directHit||player.countCards('hs',{name:'shan'})===0)return true;
            }else if(get.tag(event.card,'damage')){
                if(event.card.name==='huogong')return event.player.countCards('hs')>4-player.hp-player.hujia;
                if(event.card.name==='shuiyanqijunx')return player.countCards('e')===0;
                return true;
            }else if(player.hp>2){
                if(event.card.name==='shunshou'||(event.card.name==='zhujinqiyuan'&&(event.card.yingbian||get.distance(event.player,player)<0)))return true;
            };
            return false;
        },
        async content(event,trigger,player){
            await player.disableEquip(event.cost_data.control);
            await trigger.getParent().excluded.add(player);
            await player.link();
            await _status.currentPhase.link();
            await player.chooseUseTarget({name:'huoshaolianying',isCard:true},true);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:6325; original skill djcboyun
'djcboyun':{//拨云 你的回合内/外，你可以将你判定区的所有牌当作【过河拆桥】/【无懈可击】使用。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'chooseToUse',
        prompt(){
            const player=get.player();
            return '将判定区的所有牌当作【'+(player==_status.currentPhase?'过河拆桥':'无懈可击')+'】使用或打出';
        },
        position:'j',
        filterCard:()=>true,
        selectCard:-1,
        check:card=>1,
        viewAs(cards,player){
            let card=get.autoViewAs({name:player==_status.currentPhase?'guohe':'wuxie'},player.getCards('j'));
            return card;
        },
        filter(event,player,name){
            return player.countCards('j');
        },
        hiddenCard(player,name){
            if(!player.countCards('j'))return false;
            if(name=='wuxie')return player!=_status.currentPhase;
            if(name=='guohe')return player==_status.currentPhase;
            return false;
        },
        ai:{
            order:8,
            skillTagFilter(player){
                return player.countCards('j');
            },
            result:{
                player:10,
            },
        },
    },
};
const block=skills;
export default skills;
