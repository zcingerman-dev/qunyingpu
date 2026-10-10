import {lib,game,ui,get,ai,_status} from "../../../noname.js";
import translate from "./translate.js";
const skills = {
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2765; original skill djcliejiang
'djcliejiang':{//猎疆 锁定技，游戏开始时或洗牌时，你将牌堆中的所有非伤害牌置入牌堆底。一名角色进入濒死状态时，你将牌堆底的X张牌置于牌堆顶（X为你的体力上限）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:['washCard','gameDrawAfter','dying'],
        },
        forced:true,
        async content(event,trigger,player){
            if(event.triggername=='dying'){
                await game.cardsGotoPile(get.bottomCards(player.maxHp),'insert');
                game.log(player,'将牌堆底的','#y'+get.cnNumber(player.maxHp)+'张牌','置于了牌堆顶');
            }else{
                await game.cardsGotoPile(Array.from(ui.cardPile.childNodes).flat().filter((card)=>(get.tag(card,'damage')||0)<1));
                game.log(player,'将牌堆中所有','#y'+'非伤害牌','置于了牌堆底');
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2781; original skill djcxiaxue
'djcxiaxue':{//狎谑 锁定技，牌堆底的X张牌始终对你可见（X为你的体力上限）。你可以将牌堆底的X张牌如手牌般使用或打出，然后若牌堆中有伤害牌，你失去1点体力上限并令你本局游戏计算与其他角色距离时-1。
        audio:'ext:点绛唇/audio/skill:2',
        forced:true,
        locked:true,
        mark:true,
        init:(player,skill)=>player.markSkill(skill),
        intro:{
            mark(dialog,storage,player){
                if(player.isUnderControl(true)&&ui.cardPile.childNodes.length){
                    let cards=[];
                    let num=ui.cardPile.childElementCount;
                    for(var i=1;i<=player.maxHp;i++){
                        cards.push(ui.cardPile.childNodes[num-i]);
                    };
                    dialog.addAuto(cards);
                    return '牌堆底的'+get.cnNumber(player.maxHp)+'张牌';
                };
                return '';
            },
        },
        group:['djcxiaxue_use','djcxiaxue_useResult','djcxiaxue_wuxie'],
        subSkill:{
            'dis':{
                charlotte:true,
                intro:{
                    content:'你与其他角色计算距离时-#',
                },
                mod:{
                    globalFrom(from,to,distance){
                        let distancenum=from.countMark('djcxiaxue_dis')||0;
                        return distance-distancenum;
                    },
                },
            },
            'wuxie':{
                trigger:{
                    global:['_wuxieBegin','_wuxieEnd'],
                },
                delay:false,
                direct:true,
                log:false,
                async content(event,trigger,player){
                    let deleteCards=player.getCards('s',(card)=>card.hasGaintag('djcxiaxue_hs'));
                    if(player.isOnline2()){
                        player.send((cards,player)=>{
                            cards.forEach(i=>i.delete());
                            if(player==game.me)ui.updatehl();
                        },deleteCards,player);
                    };
                    deleteCards.forEach(i=>i.delete());
                    if(player==game.me)ui.updatehl();
                    if(event.triggername=='_wuxieEnd')return;
                    let cards=[];
                    let cards_xs=[],cards_top=[],cards_bottom=[];
                    const num=player.maxHp;
                    cards_bottom=get.bottomCards(num,true);
                    cards.addArray(cards_bottom);
                    let copy_cards=cards.map(card=>{
                        let cardx=ui.create.card();
                        cardx.init(get.cardInfo(card));
                        cardx._cardid=card.cardid;
                        cardx._infoCard=card;
                        return cardx;
                    });
                    player.directgains(copy_cards);
                    for(let card of copy_cards){
                        let cardx=cards.find((cardx)=>cardx.cardid===card._cardid);
                        if(cardx)card.addGaintag('djcxiaxue_hs');
                    };
                },
            },
            'useResult':{
                trigger:{
                    player:['useCardBefore','respondBefore'],
                },
                silent:true,
                async content(event,trigger,player){
                    let deleteCards=player.getCards('s',(card)=>card.hasGaintag('djcxiaxue_hs'));
                    if(trigger.cards.some((card)=>card._infoCard)){
                        player.logSkill('djcxiaxue');
                        event.useSkillx=true;
                    };
                    const cards=trigger.cards.map((card)=>{
                        if(card._infoCard)return card._infoCard;
                        return card;
                    });
                    trigger.cards=cards;
                    trigger.card.cards=cards;
                    if(deleteCards.length){
                    if(player.isOnline2()){
                        player.send((cards,player)=>{
                            cards.forEach(i=>i.delete());
                            if(player==game.me)ui.updatehl();
                        },deleteCards,player);
                    };
                    deleteCards.forEach(i=>i.delete());
                    if(player==game.me)ui.updatehl();
                    }
                    if(event.useSkillx){
                        if(Array.from(ui.cardPile.childNodes).flat().some((card)=>(get.tag(card,'damage')||0)>=1)){
                            await player.loseMaxHp();
                            player.addMark('djcxiaxue_dis',1,false);
                            player.addSkill('djcxiaxue_dis');
                        };
                    };
                },
            },
            'use':{
                enable:['chooseToUse','chooseToRespond'],
                hiddenCard(player,name){
                    return lib.inpile.includes(name);
                },
                filter(event,player){
                    return event.type!='wuxie';
                },
                delay:false,
                direct:true,
                log:false,
                async content(event,trigger,player){
                    let deleteCards=player.getCards('s',(card)=>card.hasGaintag('djcxiaxue_hs'));
                    if(deleteCards.length){
                        if(player.isOnline2()){
                            player.send((cards,player)=>{
                                cards.forEach(i=>i.delete());
                                if(player==game.me)ui.updatehl();
                            },deleteCards,player);
                        };
                        deleteCards.forEach(i=>i.delete());
                        if(player==game.me)ui.updatehl();
                    }else{
                        if(!event.getParent(2).djcxiaxue_delete){
                            const next=game.createEvent('djcxiaxue_delete',false).set('player',player).setContent(async function(event,trigger,player){
                                let deleteCards=player.getCards('s',(card)=>card.hasGaintag('djcxiaxue_hs'));
                                if(deleteCards.length){
                                    if(player.isOnline2()){
                                        player.send((cards,player)=>{
                                            cards.forEach(i=>i.delete());
                                            if(player==game.me)ui.updatehl();
                                        },deleteCards,player);
                                    };
                                    deleteCards.forEach(i=>i.delete());
                                    if(player==game.me)ui.updatehl();
                                };
                                event.getParent().djcxiaxue_delete=false;
                            });
                            event.next.remove(next);
                            event.getParent(2).after.push(next);
                            event.getParent(2).djcxiaxue_delete=true;
                        };
                        let cards=[];
                        let cards_xs=[],cards_top=[],cards_bottom=[];
                        const num=player.maxHp;
                        cards.addArray(cards_top);
                        cards_bottom=get.bottomCards(num,true);
                        cards.addArray(cards_bottom);
                        let copy_cards=cards.map(card=>{
                            let cardx=ui.create.card();
                            cardx.init(get.cardInfo(card));
                            cardx._cardid=card.cardid;
                            cardx._infoCard=card;
                            return cardx;
                        });
                        player.directgains(copy_cards);
                        for(let card of copy_cards){
                            let cardx=cards.find((cardx)=>cardx.cardid===card._cardid);
                        if(cardx)card.addGaintag('djcxiaxue_hs');
                        };
                    };
                    event.getParent(2).goto(0);
                },
            },
            'hs':{},
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2955; original skill djcshouli
'djcshouli':{//狩骊 当你使用牌指定目标后/造成伤害时，若你的手牌中没有与此牌牌名不同的牌，你可以令其本回合非锁定技失效/伤害值+1。然后你摸X张牌（X为你的手牌数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardToPlayered',
            source:'damageBegin1',
        },
        filter(event,player,name){
            if(name=='useCardToPlayered'&&event.getParent().triggeredTargets3.length>1)return false;
            return event.card&&!player.getCards('hs').filter(card=>{return card.name!=event.card.name}).length;
        },
        prompt2(event,player,name){
            let str='令';
            if(name=='useCardToPlayered'){
                for(let i=0;i<event.targets.length;i++){
                    if(i!=0)str+=',';
                    str+=get.translation(event.targets[i].name);
                };
                str+='的非锁定技本回合失效';
            }else str+='你对'+get.translation(event.player)+'造成的伤害+1';
            return str+'，然后你摸'+get.cnNumber(player.countCards('hs'))+'张牌';
        },
        async content(event,trigger,player){
            if(event.triggername=='useCardToPlayered'){
                for(let target of trigger.targets){
                    target.addTempSkill('fengyin');
                };
            }else trigger.num++;
            await player.draw(player.countCards('hs'));
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1440; original skill djclongliu
'djclongliu':{//笼流 锁定技，你展示过的牌所在区域发生变动时，你摸一张牌。然后你可以将此牌置于你的武将牌上，并于回合结束时获得之。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:['loseAfter','equipAfter','addJudgeAfter','gainAfter','loseAsyncAfter','addToExpansionAfter','cardsDiscardAfter','cardsGotoOrderingAfter','cardsGotoPileAfter'],
        },
        filter(event,player){
            if(['addToExpansion','cardsDiscard','cardsGotoOrdering','cardsGotoPile','gain','equip','addJudge'].includes(event.name)){
                return event.cards.some((card)=>player.getStorage('djclongliu').includes(card));
            }else{
                let cards=[];
                game.filterPlayer2((target)=>{
                    const evt=event.getl(target);
                    if(evt&&evt.cards)cards.addArray(evt.cards);
                });
                return cards.some((card)=>player.getStorage('djclongliu').includes(card));
            };
        },
        forced:true,
        async content(event,trigger,player){
            let cards=[];
            if(['addToExpansion','cardsDiscard','cardsGotoOrdering','cardsGotoPile','gain','equip','addJudge'].includes(trigger.name))cards=trigger.cards;
            else{
                game.filterPlayer2((target)=>{
                    const evt=trigger.getl(target);
                    if(evt&&evt.cards)cards.addArray(evt.cards);
                });
            };
            if(trigger.name=='gain')trigger.player.addGaintag(cards.filter((card)=>player.getStorage('djclongliu').includes(card)),'djclongliu');
            await player.draw();
            const onGain=cards.filter((card)=>{
                if(get.owner(card)==player&&get.position(card)=='x'&&card.hasGaintag('djclongliu_banned'))return false;
                return player.getStorage('djclongliu').includes(card)
            });
            if(!onGain.length)return;
            if(trigger.name=='gain'&&trigger.getParent().name=='djclongliu_banned'&&trigger.getParent().player==player)return;
            if(trigger.getParent().name=='muniu_skill')trigger.getParent().cards.removeArray(onGain);
            const {result}=await player.chooseBool('笼流：是否将'+get.translation(onGain)+'置于武将牌上，并于本回合结束时获得之？');
            if(!result.bool)return;
            let noSource=[];
            let Source={};
            for(let card of onGain){
                let owner=get.owner(card,'judge');
                if(owner){
                    let id=owner.playerid;
                    if(!Source[id])Source[id]=[];
                    Source[id].add(card);
                }else noSource.add(card);
            };
            if(noSource.length)player.$gain2(noSource);
            for(let target of game.filterPlayer2().sortBySeat()){
                let id=target.playerid;
                if(Source[id])target.$give(Source[id],player);
            };
            player.addSkill('djclongliu_banned');
            await player.addToExpansion(onGain).set('gaintag',['djclongliu_banned']);
        },
        group:['djclongliu_gaintag'],
        subSkill:{
            'banned':{
                trigger:{
                    global:['phaseBefore','phaseAfter'],
                },
                forced:true,
                silent:true,
                marktext:'流',
                intro:{
                    markcount:'expansion',
                    content:'expansion',
                },
                async content(event,trigger,player){
                    player.removeSkill(event.name);
                    let cards=player.getExpansions('djclongliu_banned');
                    if(cards.length)player.gain(cards,'give',player);
                },
            },
            'gaintag':{
                trigger:{
                    player:'showCardsEnd',
                },
                forced:true,
                silent:true,
                async content(event,trigger,player){
                    player.markAuto('djclongliu',trigger.cards);
                    player.addGaintag(trigger.cards,'djclongliu');
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1528; original skill djcqingtianx
'djcqingtianx':{//清天 限定技，每轮开始时，你可以展示至多X张手牌（X为游戏轮数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'roundStart',
        },
        filter(event,player,name){
            return player.countCards('hs');
        },
        limited:true,
        skillAnimation:true,
        animationColor:'orange',
        async cost(event,trigger,player){
            const num=Math.max(1,(game.roundNumber||0));
            const {result}=await player.chooseCard(get.prompt('djcqingtianx'),'展示至多'+get.cnNumber(num)+'张手牌','hs',[1,num]);
            event.result=result;
        },
        async content(event,trigger,player){
            player.awakenSkill(event.name);
            await player.showCards(event.cards,get.skillTranslation(event.name));
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3525; original skill djclongyuan
'djclongyuan':{//龙渊 锁定技，你始终视为装备你手牌区每种类型唯一的装备牌。若你未以此法视为装备牌，你视为拥有〖绝境〗。
        audio:'ext:点绛唇/audio/skill:1',
        trigger:{
            player:['loseAfter','enbaleEquipEnd','disableEquipEnd'],
            global:['loseAsyncAfter','equipAfter','addToExpansionAfter','gainAfter','addJudgeAfter','gameStart'],
        },
        filter(event,player,name){
            const bool1=event.getg&&event.getg(player)?.length;
            const bool2=event.getl&&event.getl(player)?.hs?.length;
            return ['enbaleEquipEnd','disableEquipEnd','gameStart'].includes(name)||bool1||bool2;
        },
        mark:true,
        direct:true,
        locked:true,
        derivation:['xinjuejing'],
        intro:{
            markcount:'expansion',
            mark(dialog,storage,player){
                const equips=player.getCards('hs',{type:'equip'});
                const cards=equips.filter(card=>{
                    const type=get.subtype(card);
                    return !equips.some(c=>c!==card&&get.subtype(c)===type);
                });
                if(!cards.length)return '绝境中，仍存有一线生机！';
                dialog.addText('当前视为装备');
                dialog.addSmall([cards,'vcard']);
            },
        },
        async content(event,trigger,player){
            if(!player.storage[event.name])player.storage[event.name]=[];
            const equips=player.getCards('hs',{type:'equip'});
            const cards=equips.filter(card=>{
                const type=get.subtype(card);
                return !equips.some(c=>c!==card&&get.subtype(c)===type);
            });
            if(!cards.length){
                player.addAdditionalSkill(event.name,['xinjuejing']);
            }else{
                player.addAdditionalSkill(event.name,cards.map(card=>lib.card[card.name]?.skills||[]).flat());
            };
            function getArraySame(array1,array2){
                if(array1.length!=array2.length)return false;
                for(let obj of array1){
                    if(!array2.includes(obj))return false;
                };
                return true;
            }
            if(!getArraySame(player.storage[event.name],cards))player.logSkill(event.name);
            player.storage[event.name]=cards;
        },
        onremove(player,skill){
            player.removeAdditionalSkill(skill);
        },
        mod:{
            globalFrom(from,to,distance){
                return distance+from.getStorage('djclongyuan').reduce((sum,card)=>sum+(lib.card[card.name]?.distance?.globalFrom||0),0);
            },
            globalTo(from,to,distance){
                return distance+to.getStorage('djclongyuan').reduce((sum,card)=>sum+(lib.card[card.name]?.distance?.globalTo||0),0);
            },
            attackRange(from,distance){
                return distance-from.getStorage('djclongyuan').reduce((sum,card)=>sum+(lib.card[card.name]?.distance?.attackFrom||0),0);
            },
            attackTo(from,to,distance){
                return distance+to.getStorage('djclongyuan').reduce((sum,card)=>sum+(lib.card[card.name]?.distance?.attackTo||0),0);
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3593; original skill djcjiejiang
'djcjiejiang':{//截江 每回合限一次，当你成为一名角色使用伤害牌的目标后，你可以展示一张装备牌并取消此牌的所有目标。若如此做，此牌视为【闪】直至你受到伤害。
        audio:'ext:点绛唇/audio/skill:1',
        trigger:{
            target:'useCardToTargeted',
        },
        usable:1,
        filter(event,player,name){
            if(!player.countCards('hs',{type:'equip'}))return false;
            return get.tag(event.card,'damage')>=1;
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard('hs',get.prompt(event.skill),'展示一张装备牌并取消'+get.translation(event.cards)+'的所有目标',(card)=>{
                return get.type(card)=='equip';
            }).set('ai',card=>{
                return 6-get.useful(card);
            }).forResult();
        },
        async content(event,trigger,player){
            await player.showCards(event.cards,get.skillTranslation(event.name));
            player.addGaintag(event.cards,event.name);
            player.when({player:'damageBegin4'}).then(()=>{
                player.removeGaintag(skill,player.getCards('hs'));
            }).vars({skill:event.name});
            trigger.targets.length=0;
            trigger.all_excluded=true;
        },
        mod:{
            cardname(card,player){
                if(card.hasGaintag('djcjiejiang'))return 'shan';
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3625; original skill djcjinglan
'djcjinglan':{//惊澜 你可以将你的牌以如下规则使用或打出：基本牌：【杀】或【无懈可击】；锦囊牌：【酒】或【出其不意】；装备牌：【桃】或【火烧连营】。你以此法使用或打出牌时，本回合内你此类型的所有手牌均视为此牌，若此时是你的回合，改为所有角色。
        audio:'ext:点绛唇/audio/skill:2',
        enable:['chooseToUse','chooseToRespond'],
        getList(){
            return {
                'basic':['sha','wuxie'],
                'trick':['jiu','chuqibuyi'],
                'equip':['tao','huoshaolianying'],
            };
        },
        filter(event,player){
            const list=Object.values(get.info('djcjinglan').getList()).flat();
            return get.inpileVCardList(info=>{
                if(!list.includes(info[2]))return false;
                return list.some(name=>{
                    return ['basic','trick','equip'].some(type=>player.countCards('hs',card=>{
                        return get.info('djcjinglan').getList()[type].includes(name)&&get.type2(card,player)==type;
                    }));
                });
            }).some(card=>player.hasCard(cardx=>event.filterCard({name:card[2],nature:card[3],cards:[cardx]},player,event),'hes'));
        },
        chooseButton:{
            dialog(event,player){
                const list=Object.values(get.info('djcjinglan').getList()).flat().filter(name=>{
                    return ['basic','trick','equip'].some(type=>player.countCards('hs',card=>{
                        return get.info('djcjinglan').getList()[type].includes(name)&&get.type2(card,player)==type;
                    }));
                });
                const dialog=ui.create.dialog('惊澜',[list,'vcard']);
                dialog.direct=true;
                return dialog;
            },
            filter(button,player){
                var evt=_status.event.getParent();
                return evt.filterCard({
                    name:button.link[2],
                },player,evt);
            },
            check(button){
                return get.player().getUseValue({name:button.link[2],});
            },
            backup(links){
                return {
                    viewAs:{
                        name:links[0][2],
                        nature:links[0][3],
                    },
                    filterCard(card){
                        const player=get.player();
                        return get.info('djcjinglan').getList()[get.type2(card)]?.includes(get.card()?.name);
                    },
                    check(card){
                        return 7-get.value(card);
                    },
                    position:'hes',
                    log:false,
                    async precontent(event,trigger,player){
                        player.logSkill('djcjinglan');
                        const name=event.result.card.name;
                        const type=['basic','trick','equip']
                            .find(info=>{
                                return get.info('djcjinglan').getList()[info].includes(name)
                            });
                        if(!type)return;
                        for(const target of game.filterPlayer()){
                            if(_status.currentPhase !=player&&target !=player)continue;
                            target.addTempSkill('djcjinglan_effect');
                            if(target.getStorage('djcjinglan_effect').some(info=>info[0]==type)){
                                let list=target
                                    .getStorage('djcjinglan_effect')
                                    .find(info=>info[0]==type);
                                list[1]=name;
                            }else target.markAuto('djcjinglan_effect',[[type,name]]);
                        };
                    },
                }
            },
            prompt(links){
                const name=links[0][2];
                const type=['basic','trick','equip'].find(info=>{
                    return get.info('djcjinglan').getList()[info].includes(name);
                });
                return `你可以将一张${get.translation(type)}牌当做`+get.translation(links[0][2])+`使用或打出`;
            },
        },
        hiddenCard(player,name){
            if(!Object.values(get.info('djcjinglan').getList()).flat().includes(name))return false;
            const type=['basic','trick','equip']
                .find(info=>{
                    return get.info('djcjinglan').getList()[info].includes(name);
                });
            return player.hasCard(cardx=>get.type2(cardx)==type,'hes');
        },
        ai:{
            order(item,player){
                const list=Object.values(get.info('djcjinglan').getList()).flat().map(name=>get.order({ name:name }));
                return Math.max(...list)+0.2;
            },
            result:{
                player(player){
                    if(_status.event.dying)return get.attitude(player,_status.event.dying);
                    return 1;
                },
            },
        },
        subSkill:{
            'backup':{},
            'effect':{
                charlotte:true,
                onremove:true,
                mod:{
                    cardname(card,player){
                        const storage=player.getStorage('djcjinglan_effect');
                        if(!storage.length)return;
                        const list=storage.find(info=>get.type(card,'trick',false)==info[0]);
                        if(list)return list[1];
                    },
                },
                mark:true,
                intro:{
                    content(storage,player){
                        return storage?.reduce((sum,list)=>sum+'<li>'+get.translation(list)+'<br>','');
                    },
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4065; original skill djcyuanmou
'djcyuanmou':{//渊谋 当你获得牌后，你可以将等量张牌当作此次获得牌中的一张牌使用。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'gainAfter',
            global:'loseAsyncAfter',
        },
        filter(event,player,name){
            return event.getg(player).length&&player.countCards('hes')>=event.getg(player).length;
        },
        async cost(event,trigger,player){
            const {result}=await player.chooseButton([get.prompt(event.skill),'将'+get.cnNumber(trigger.getg(player).length)+'张牌当做以下一张牌使用',[trigger.getg(player),'vcard']]).set('filterButton',button=>{
                return player.hasUseTarget(button.link);
            }).set('ai',button=>{
                return get.value(button.link)-2*trigger.getg(player).length;
            })
            if(result&&result.bool){
                event.result={
                    bool:true,
                    cost_data:{
                        link:result.links[0],
                    },
                };
            };
        },
        async content(event,trigger,player){
            const card=get.autoViewAs(event.cost_data.link);
            const name=`${event.name}_backup`;
            const num=trigger.getg(player).length;
            game.broadcastAll((name,card,num)=>{
                lib.skill[name].viewAs=card;
                lib.skill[name].selectCard=num;
            },name,card,num);
            const next=player.chooseToUse();
            next.set('openskilldialog',`将${get.cnNumber(trigger.getg(player).length)}张牌当${get.translation(card)}使用`);
            next.set('norestore',true);
            next.set('_backupevent',name);
            next.set('custom',{
                add:{},
                replace:{
                    window(){}
                },
            });
            next.backup(name);
            const {result}=await next;
        },
        subSkill:{
            'backup':{
                filterCard(card){
                    return get.itemtype(card)=='card';
                },
                position:'hes',
                popname:true,
                log:false,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4121; original skill djczhiquan
'djczhiquan':{//制权 一名角色一次性失去至少两张牌后，你可以将其中一张牌置入你的武将牌上，并于回合结束获得之。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:['loseAfter','equipAfter','addJudgeAfter','gainAfter','loseAsyncAfter','addToExpansionAfter'],
        },
        filter(event,player,name){
            for(let target of game.players){
                const evt=event.getl(target);
                if(evt&&evt.cards2&&evt.cards2.length>1)return true;
            };
            return false;
        },
        async cost(event,trigger,player){
            const evt=trigger.getl(trigger.player);
            const {result}=await player.chooseButton([get.prompt(event.skill),'将其中一张牌置于武将牌上，并于回合结束获得之',[evt.cards2,'vcard']]);
            if(result&&result.bool){
                event.result={
                    bool:true,
                    cost_data:{
                        link:result.links[0],
                    },
                };
            };
        },
        async content(event,trigger,player){
            await player.addToExpansion(event.cost_data.link,'giveAuto',player).set('gaintag',[event.name+'_1']);
            player.addSkill(event.name+'_1');
        },
        subSkill:{
            '1':{
                trigger:{
                    global:'phaseEnd',
                },
                forced:true,
                async content(event,trigger,player){
                    let cards=player.getExpansions(event.name);
                    if(cards.length)player.gain(cards,'draw');
                    player.removeSkill(event.name);
                },
                intro:{
                    mark(dialog,storage,player){
                        let cards=player.getExpansions('djczhiquan_1');
                        if(player.isUnderControl(true))dialog.addAuto(cards);
                        return '共有'+get.cnNumber(cards.length)+'张牌';
                    },
                    markcount:'expansion',
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4171; original skill djcbatu
'djcbatu':{//霸图 每回合限一次，当你成为牌的目标或使用牌指定目标后，你可以令此牌额外指定至多X名角色（X为你的体力值），然后若此牌的目标数大于你的手牌数，你令此牌不可被响应且伤害值-1。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            target:'useCardToTargeted',
            player:'useCardToPlayered',
        },
        usable:1,
        filter(event,player,name){
            if(player.hp<=0)return false;
            if(get.type(event.card)!='basic'&&get.type(event.card)!='trick')return false;
            if(name=='useCardToTargeted'&&event.player==player)return false;
            if(name=='useCardToPlayered'&&event.getParent().triggeredTargets3.length>1)return false;
            return game.hasPlayer(target=>{
                return !event.targets.includes(target)&&lib.filter.targetEnabled2(event.card,event.player,target);
            });
        },
        async cost(event,trigger,player){
            event.result=await player.chooseTarget([1,player.hp],get.prompt(event.skill),'令'+get.translation(trigger.card)+'额外指定至多'+get.cnNumber(player.hp)+'名角色，然后若'+get.translation(trigger.card)+'的目标数大于'+get.cnNumber(player.countCards('hs'))+'，你令此牌不可被响应且伤害值-1',(card,player,target)=>{
                return !trigger.targets.includes(target)&&lib.filter.targetEnabled2(trigger.card,trigger.player,target);
            }).set('ai',target=>{
                const player=get.player();
                return get.effect(target,trigger.card,player,player);
            }).forResult();
        },
        async content(event,trigger,player){
            await trigger.targets.addArray(event.targets);
            if(trigger.targets.length>player.countCards('hs')){
                trigger.player.addTempSkill(event.name+'_damage');
                trigger.player.storage[event.name+'_damage']=trigger.card;
                trigger.player.when({player:'useCardAfter'}).filter(evt=>{
                    return evt.card==trigger.card;
                }).then(()=>{
                    player.removeSkill(skill);
                }).vars({skill:event.name+'_damage'});
                trigger.getParent().directHit.addArray(game.players);
            };
        },
        subSkill:{
            'damage':{
                charlotte:true,
                direct:true,
                trigger:{
                    source:'damageBegin1',
                },
                filter(event,player,name){
                    return event.card&&event.card==player.storage['djcbatu_damage'];
                },
                async content(event,trigger,player){
                    trigger.num--;
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:474; original skill djcxukuang
'djcxukuang':{//虚诳 出牌阶段，你可以将一种花色的所有手牌当作一张【无中生有】使用。若如此做，你令〖虚诳〗失效直到一名角色使用一张此花色的牌结算后。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        direct:true,
        delay:false,
        filter(event,player,name){
            return!player.hasSkill('djcxukuang_blocker')&&player.countCards('hs');
        },
        async content(event,trigger,player){
            let suits=[];
            for(let suit of lib.suit){
                if(player.countCards('hs',{suit:suit}))suits.push(suit);
            };
            if(!suits.length)return;
            const {result}=await player.chooseControl(suits,'cancel').set('prompt',get.prompt(event.name)).set('prompt2','将一种花色的所有牌当作【无中生有】使用').set('ai',()=>{
                const player=get.player();
                let num='infinity';
                let choose;
                for(let suit of _status.event.suits){
                    if(player.countCards('hs',{suit:suit})>=num)continue;
                    num=player.countCards('hs',{suit:suit});
                    choose=suit;
                };
                return choose;
            }).set('suits',suits);
            if(result.control&&result.control!='cancel2'){
                await player.logSkill(event.name);
                let cards=[];
                for(let card of player.getCards('hs')){
                    if(get.suit(card)==result.control)cards.push(card);
                };
                await player.chooseUseTarget({name:'wuzhong'},cards,true);
                player.addSkill(event.name+'_blocker');
                player.storage[event.name+'_blocker']=result.control;
                player.markSkill(event.name+'_blocker');
            };
        },
        ai:{
            order:3,
            result:{
                player:1,
            },
        },
        subSkill:{
            'blocker':{
                charlotte:true,
                mark:true,
                onremove(player,skill){
                    delete player.storage[skill];
                },
                trigger:{
                    global:'useCardAfter',
                },
                intro:{
                    content(storage,player,skill){
                        if(player.isUnderControl(true))return get.translation(storage);
                        return get.skillTranslation(skill)+'不可使用';
                    },
                    onunmark:true,
                },
                direct:true,
                filter(event,player,name){
                    return get.suit(event.card)==player.storage['djcxukuang_blocker'];
                },
                async content(event,trigger,player){
                    player.removeSkill(event.name);
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:544; original skill djclianfu
'djclianfu':{//连伏 每轮每种牌名限一次，结束阶段，你可以记录一个未被记录的基本牌或锦囊牌牌名。一名其他角色使用牌时，你可以移除一个与此牌牌名相同的记录并令此牌失效，然后你摸一张牌并可以发动〖连伏〗。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseJieshuBegin',
        },
        prompt2(event,player){
            return '记录一个本轮未记录且未被记录的牌名';
        },
        filter(event,player,name){
            let list=[];
            for(let name of lib.inpile){
                if(player.storage['djclianfu_use']&&player.storage['djclianfu_use'].includes(name)||player.storage['djclianfu_used']&&player.storage['djclianfu_used'].includes(name))continue;
                let type=get.type2(name);
                if(type=='basic'||type=='trick'){
                    let card={name:name};
                    list.push([type,'',name]);
                };
            };
            return list.length;
        },
        intro:{
            content(storage,player,skill){
                let str='';
                if(player.storage[skill+'_use']&&player.storage[skill+'_use'].length)str+='本轮已记录过的牌名:'+get.translation(player.storage[skill+'_use']);
                if(player.storage[skill+'_use']&&player.storage[skill+'_use'].length&&player.storage[skill+'_used']&&player.storage[skill+'_used'].length)str+='<br>';
                if(player.storage[skill+'_used']&&player.storage[skill+'_used'].length)str+='可连伏的牌名:'+get.translation(player.storage[skill+'_used']);
                if(player.isUnderControl(true))return str;
                return '波谲云诡，难知如阴。';
            },
            onunmark:true,
        },
        async content(event,trigger,player){
            player.addTempSkill(event.name+'_use',{global:'roundStart'});
            player.addSkill(event.name+'_used');
            let list=[];
            for(let name of lib.inpile){
                if(player.storage[event.name+'_use']&&player.storage[event.name+'_use'].includes(name)||player.storage[event.name+'_used']&&player.storage[event.name+'_used'].includes(name))continue;
                let type=get.type2(name);
                if(type=='basic'||type=='trick'){
                    let card={name:name};
                    list.push([type,'',name]);
                };
            };
            if(list.length){
                const {result}=await player.chooseButton([get.skillTranslation(event.name),'选择你要记录的牌名',[list,'vcard']]).set('ai',(button)=>{
                    let rand=_status.event.rand;
                    switch(button.link[2]){
                        case 'sha':
                            return 5+rand[1];
                        case 'tao':
                            return 4+rand[2];
                        case 'lebu':
                            return 3+rand[3];
                        case 'shan':
                            return 4.5+rand[4];
                        case 'wuzhong':
                            return 4+rand[5];
                        case 'shunshou':
                        return 3+rand[6];
                        case 'nanman':
                            return 2+rand[7];
                        case 'wanjian':
                            return 2+rand[8];
                        default:
                            return rand[0];
                    };
                }).set('rand',[Math.random(),Math.random(),Math.random(),Math.random(),Math.random(),Math.random(),Math.random(),Math.random(),Math.random()]);
                if(result.bool){
                    player.storage[event.name+'_use'].push(result.links[0][2]);
                    player.storage[event.name+'_used'].push(result.links[0][2]);
                    player.markSkill(event.name);
                };
            };
        },
        subSkill:{
            'use':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=[];
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
            },
            'used':{
                audio:'djclianfu',
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=[];
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
                trigger:{
                    global:'useCard',
                },
                filter(event,player,name){
                    return player.storage['djclianfu_used'].includes(event.card.name)&&event.player!=player;
                },
                logTarget:'player',
                check(event,player){
                    return get.attitude(player,event.player)<0;
                },
                prompt2(event,player){
                    let str='令'+get.translation(event.player);
                    if(event.targets&&event.targets.length){
                        str+='对'+get.translation(event.targets);
                    };
                    str+='使用的'+get.translation(event.card)+'失效';
                    return str;
                },
                async content(event,trigger,player){
                    let str=get.translation(trigger.player);
                    if(trigger.targets&&trigger.targets.length){
                        str+='对'+get.translation(trigger.targets);
                    };
                    str+='使用的'+get.translation(trigger.card)+'失效了';
                    player.storage[event.name].remove(trigger.card.name);
                    trigger.targets.length=0;
                    trigger.all_excluded=true;
                    let list=[];
                    for(let name of lib.inpile){
                        if(player.storage[event.name.replace('_used','')+'_use']&&player.storage[event.name.replace('_used','')+'_use'].includes(name)||player.storage[event.name]&&player.storage[event.name].includes(name))continue;
                        let type=get.type2(name);
                        if(type=='basic'||type=='trick'){
                            let card={name:name};
                            list.push([type,'',name]);
                        };
                    };
                    await player.draw();
                    if(list.length){
                        const {result:{bool}}=await player.chooseBool(get.prompt('djclianfu'));
                        if(bool)await player.useResult({skill:event.name.replace('_used',''),player:player},event);
                    };
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2673; original skill djcdingce
'djcdingce':{//定策 当你成为伤害牌的目标后，你可以将一张手牌当作任意延时锦囊牌对自己使用。若如此做，你选择一名其他角色并摸X张牌（X为其体力上限，且至多为5），此牌结算后，若你未响应过此牌，你可以交给其至多等同于你的体力上限张牌，否则你将手牌数弃至X。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            target:'useCardToTargeted',
        },
        filter(event,player,name){
            let list=[];
            for(let card of lib.inpile){
                if(get.type(card)=='delay'&&!player.hasJudge(card))list.push([get.type(card),'',card]);
            };
            if(!player.countCards('hs')||!list.length)return false;
            return get.tag(event.card,'damage')>=1;
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard('hs',get.prompt(event.skill),'将一张手牌当作任意延时锦囊牌对自己使用').set('ai',card=>{
                return 6-get.useful(card);
            }).forResult();
        },
        async content(event,trigger,player){
            let list=[];
            for(let card of lib.inpile){
                if(get.type(card)=='delay'&&!player.hasJudge(card))list.push([get.type(card),'',card]);
            };
            const {result:{bool,links}}=await player.chooseButton([get.skillTranslation(event.name),'选择将'+get.translation(event.cards)+'转化为的牌，并对你使用',[list,'vcard']],true).set('ai',(button)=>{
                 const player=get.player();
                 return player.getUseValue(button.link)||1;
            });
            if(bool){
                await player.useCard(event.cards,{name:links[0][2]},player,true);
                const {result:{bool,targets}}=await player.chooseTarget(true,'选择一名其他角色，摸等同于其体力上限张牌',(card,player,target)=>{
                    return target!=player;
                });
                if(bool){
                    const target=targets[0];
                    const {result}=await player.draw(Math.min(target.maxHp,5));
                    player.when({global:'useCardAfter'}).filter(evt=>{
                        return evt.card==trigger.card;
                    }).then(()=>{
                        if(player.hasHistory('useCard',evt=>{
                            return evt.respondTo&&evt.respondTo[1]==statusCard;
                        })||player.hasHistory('respond',evt=>{
                            return evt.respondTo&&evt.respondTo[1]==statusCard;
                        })){
                            const num=player.countCards('hs')-Math.min(target.maxHp,5);
                            if(num>0)player.chooseToDiscard(num,true).set('prompt','〖'+get.skillTranslation(skill)+'〗:弃置'+get.cnNumber(num)+'张牌');
                        }else{
                            player.chooseToGive(target,'hs',[1,player.maxHp]).set('prompt','〖'+get.skillTranslation(skill)+'〗:交给'+get.translation(target)+'至多'+get.cnNumber(player.maxHp)+'张牌').set('ai',card=>{
                                if(get.attitude(player,_status.event.target)>0)return get.value(card);
                                return 0;
                            }).set('target',target);
                        };
                    }).vars({statusCard:trigger.card,target:target,skill:event.name});
                };
            };
        },
        ai:{
            effect:{
                target(card,player,target){
                    let list=[];
                    for(let card of lib.inpile){
                        if(get.type(card)=='delay'&&!target.hasJudge(card))list.push([get.type(card),'',card]);
                    };
                    if(get.tag(card,'damage')&&list.length){
                        if(!target.hasFriend())return;
                        let num=1;
                        if(get.attitude(player,target)>0){
                            if(player.needsToDiscard())num=0.7;
                            else num=0.5;
                        };
                        if(target.hp>=4)return [1,num*2];
                        if(target.hp==3)return [1,num*1.5];
                        if(target.hp==2)return [1,num*0.5];
                    };
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2750; original skill djctianzhi
'djctianzhi':{//天智 你的判定牌生效后，你可以使用之。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'judgeEnd',
        },
        filter(event,player,name){
            return player.hasUseTarget(event.result.card);
        },
        frequent:true,
        async content(event,trigger,player){
            await player.chooseUseTarget(trigger.result.card,true);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1694; original skill djcleihu
'djcleihu':{//类虎 出牌阶段每项限一次，你可以将任意张手牌当作任意基本牌/普通锦囊牌对距离1以内的等量名角色使用。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        locked:false,
        filter(event,player,name){
            if(!player.countCards('hes')||player.getStorage('djcleihu_used').length>1)return false;
            return get.inpileVCardList(info=>{
                const name=info[2],nature=info[3],type=get.type(name),infox=get.info({name:name});
                if(type!='basic'&&type!='trick')return false;
                if(player.getStorage('djcleihu_used').includes(type))return false;
                return game.hasPlayer(target=>{
                    return get.distance(player,target)<=1&&player.canUse({name:name,nature:nature,storage:{djcleihu:true}},target);
                });
            }).some(card=>event.filterCard({name:card[2],nature:card[3],storage:{djcleihu:true}},player,event));
        },
        chooseButton:{
            dialog(event,player){
                const list=get.inpileVCardList(info=>{
                    const name=info[2],nature=info[3],type=get.type(name),infox=get.info({name:name});
                    if(type!='basic'&&type!='trick')return false;
                    if(player.getStorage('djcleihu_used').includes(type))return false;
                    return game.hasPlayer(target=>{
                        return get.distance(player,target)<=1&&player.canUse({name:name,nature:nature,storage:{djcleihu:true}},target);
                    });
                }).filter(card=>event.filterCard({name:card[2],nature:card[3],storage:{djcleihu:true}},player,event));
                return ui.create.dialog(get.skillTranslation('djcleihu'),'选择你要使用的牌',[list,'vcard']);
            },
            check(button){
                return get.player().getUseValue({
                    name:button.link[2],
                    nature:button.link[3]
                });
            },
            backup(links,player){
                return{
                    position:'hs',
                    ignoreMod:true,
                    log:false,
                    filterCard:true,
                    addCount:false,
                    viewAs:{
                        name:links[0][2],
                        nature:links[0][3],
                    },
                    filterTarget(card,player,target){
                        if(get.distance(player,target)>1)return false;
                        return lib.filter.filterTarget(card,player,target);
                    },
                    selectTarget(){
                        return ui.selected.cards.length;
                    },
                    selectCard(){
                        const player=get.player(),
                            num=game.filterPlayer(target=>{
                                if(get.distance(player,target)>1)return false;
                                return lib.filter.filterTarget(get.card(),player,target);
                            }).length;
                        return [1,num];
                    },
                    ai1(card){
                        return 6-get.value(card);
                    },
                    async precontent(event,trigger,player){
                        player.logSkill('djcleihu');
                        player.addTempSkill('djcleihu_used','phaseUseAfter');
                        player.markAuto('djcleihu_used',[get.type(event.result.card)]);
                    },
                };
            },
            prompt(links,player){
                return '你可以将任意张手牌当作'+(get.translation(links[0][3])||'')+'【'+get.translation(links[0][2])+'】'+'对距离1以内的等量名角色使用';
            },
        },
        mod:{
            cardUsable(card,player,num){
                if(card.storage?.djcleihu)return Infinity;
            },
        },
        ai:{
            order(){
                const player=get.player();
                if(player&&get.event().type=='phase'){
                    let list=get.inpileVCardList(info=>{
                        const name=info[2],nature=info[3],type=get.type(name),infox=get.info({name:name});
                        if(type!='basic'&&type!='trick')return false;
                        if(player.getStorage('djcleihu_used').includes(type))return false;
                        return game.hasPlayer(target=>{
                            return get.distance(player,target)<=1&&player.canUse({name:name,nature:nature,storage:{djcleihu:true}},target);
                        });
                    }).map(card=>{return{name:card[2],nature:card[3],storage:{djcleihu:true}}}).filter(card=>player.getUseValue(card,true,true)>0);
                    if(!list.length)return 0;
                    list.sort((a,b)=>{
                        const getNum=function(card){
                            if(get.info('xunshi').isXunshi(card))return get.effect(game.filterPlayer(target=>{
                                return player.canUse(card,target,true,true);
                            }).sort((a,b)=>get.effect(b,card,player,player)-get.effect(a,card,player,player))[0],card,player,player);
                            return player.getUseValue(card,true,true);
                        };
                        return(getNum(b)||0)-(getNum(a)||0);
                    });
                    return get.order(list[0],player)*0.99;
                };
                return 1;
            },
            result:{
                player:1,
            },
        },
        subSkill:{
            'used':{
                charlotte:true,
                onremove:true,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1809; original skill djcchongzhen
'djcchongzhen':{//冲阵 锁定技，你参与计算距离时+1。你成为非锦囊牌的目标后/造成伤害后，你本轮参与计算距离时-1/+1。一名角色因此进入你距离1以内时，你获得其一张手牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            target:'useCardToTargeted',
            source:'damageSource',
        },
        forced:true,
        filter(event,player,name){
            return name=='damageSource'||get.type(event.card)!='trick';
        },
        mark:true,
        intro:{
            content(storage,player){
                const num=player.storage['djcchongzhen_use']?player.storage['djcchongzhen_use']+1:1;
                return '参与计算距离'+(num>=0?'+':'')+num;
            },
            markcount(storage,player){
                const num=player.storage['djcchongzhen_use']?player.storage['djcchongzhen_use']+1:1;
                return num;
            },
        },
        async content(event,trigger,player){
            const untargets=game.filterPlayer(target=>{
                return get.distance(player,target)>1;
            });
            player.addTempSkill(event.name+'_use','roundStart');
            player.storage[event.name+'_use']+=(event.triggername=='damageSource'?1:-1);
            player.syncStorage(`${event.name}_use`);
            player.markSkill(event.name);
            const targets=game.filterPlayer(target=>{
                return get.distance(player,target)<=1&&untargets.includes(target)&&target.countGainableCards(player,'hs');
            });
            if(targets.length)await player.gainMultiple(targets);
        },
        mod:{
            aiOrder(player,card,num){
                if(get.is.attackingMount(card,false))return num/5;
            },
            globalFrom(from,to,distance){
                let distancenum=from.storage['djcchongzhen_use']||0;
                return distance+(distancenum+1);
            },
            globalTo(from,to,distance){
                let distancenum=to.storage['djcchongzhen_use']||0;
                return distance+(distancenum+1);
            },
        },
        subSkill:{
            'use':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=0;
                },
                onremove(player,skill){
                    delete player.storage[skill];
                    player.markSkill(skill.replace('_use',''));
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4658; original skill djcchimou
'djcchimou':{//持谋 锁定技，游戏开始时，你创造游戏牌堆存在的每种普通锦囊牌，并依次置入你武将牌上，称之为“策”。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'phaseBefore',
            player:'enterGame',
        },
        filter(event,player,name){
            return event.name!='phase'||game.phaseNumber==0;
        },
        forced:true,
        marktext:'策',
        intro:{
            name:'策',
            mark(dialog,storage,player){
                let cards=player.getExpansions('djcchimou');
                dialog.addAuto(cards);
                return '共有'+get.cnNumber(cards.length)+'张牌';
            },
            markcount:'expansion',
        },
        async content(event,trigger,player){
            let banList=[];
            let cards=[];
            let num=0;
            for(let name of lib.inpile){
                if(get.type(name)!='trick'||banList.includes(name))continue;
                if(num<13)num++;
                banList.push(name);
                const card=game.createCard(name,['heart','spade','diamond','club'].randomGet(),num);
                cards.push(card);
            };
            if(cards.length)await player.addToExpansion(cards.reverse(),'giveAuto',player).set('gaintag',[event.name]);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4692; original skill djcxunjie
'djcxunjie':{//殉节 转换技，准备阶段或你进入濒死状态时，你可以阳：获得/阴：使用一张“策”并将体力值回复至1。若此时是你的出牌阶段，你视为使用一张此牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:['phaseZhunbeiBegin','dying'],
        },
        mark:true,
        marktext:'☯',
        filter(event,player,name){
            return player.getExpansions('djcchimou');
        },
        zhuanhuanji(player,skill){
            player.storage[skill]=!player.storage[skill];
            player.changeSkin({characterName:'fhq_xunyou'},'fhq_xunyou'+(player.storage[skill]?'_shadow':''));
        },
        intro:{
            content(storage,player,skill){
                return(!storage?'获得':'使用')+'一张“策”并将体力值回复至1';
            },
        },
        async cost(event,trigger,player){
            const storage=player.storage[event.skill];
            const {result:{bool,links}}=await player.chooseButton([get.prompt(event.skill),(!storage?'获得':'使用')+'一张“策”并将体力值回复至1',player.getExpansions('djcchimou')]).set('filterButton',button=>{
                if(storage)return player.hasUseTarget(button.link);
                return true;
            }).set('ai',(button)=>{
                const player=get.player();
                return player.getUseValue(button.link)||1;
            });
            if(bool)event.result={bool,cost_data:{links}};
        },
        async content(event,trigger,player){
            const storage=player.storage[event.name];
            player.changeZhuanhuanji(event.name);
            const card=event.cost_data.links[0];
            if(!storage){
                await player.gain(card,'gain2');
                await player.recoverTo(1);
            }else{
                const {result}=await player.chooseUseTarget(card,true);
                if(result.bool)await player.recoverTo(1);
            };
            if(player.isPhaseUsing()){
                await player.chooseUseTarget({name:card.name,isCard:true},true);
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4738; original skill djcdinglun
'djcdinglun':{//定论 你使用牌后，若你有与此牌牌名相同的“策”，你可以摸一张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardEnd',
        },
        prompt2:'摸一张牌',
        frequent:true,
        filter(event,player,name){
            if(!player.getExpansions('djcchimou'))return false;
            for(let card of player.getExpansions('djcchimou')){
                if(card.name==event.card.name)return true;
            };
            return false;
        },
        async content(event,trigger,player){
            await player.draw();
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4327; original skill djclongxiang
'djclongxiang':{//龙骧 锁定技，你使用转化牌无距离限制。你使用转化牌时，你令其他角色本回合不能使用或打出此牌对应实体牌包含花色的牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCard',
        },
        forced:true,
        filter(event,player,name){
            return !event.card.isCard;
        },
        async content(event,trigger,player){
            let targets=game.countPlayer(target=>{
                if(target!=player){
                    target.addTempSkill(event.name+'_ban');
                    let suits=[];
                    for(let card of trigger.cards){
                        if(!suits.includes(get.suit(card)))suits.push(get.suit(card));
                    };
                    target.markAuto(event.name+'_ban',suits);
                };
            });
        },
        mod:{
            targetInRange(card){
                if(!card.isCard)return true;
            },
        },
        subSkill:{
            'ban':{
                onremove:true,
                charlotte:true,
                mod:{
                    cardEnabled(card,player){
                        if(player.getStorage('djclongxiang_ban').includes(get.suit(card)))return false;
                    },
                    cardRespondable(card,player){
                        if(player.getStorage('djclongxiang_ban').includes(get.suit(card)))return false;
                    },
                    cardSavable(card,player){
                        if(player.getStorage('djclongxiang_ban').includes(get.suit(card)))return false;
                    },
                },
                mark:true,
                intro:{
                    content:'本回合内不能使用或打出$牌',
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4375; original skill djcyanyue
'djcyanyue':{//偃月 准备阶段开始/出牌阶段结束时，你可以将手牌数调整至你的体力上限。然后你可以将X张牌当作牌名字数为X的基本牌或普通锦囊牌使用（X为你摸或弃置的牌数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:['phaseZhunbeiBegin','phaseUseEnd'],
        },
        prompt2:'将手牌数调整至体力上限',
        filter(event,player,name){
            return player.countCards('hs')!=player.maxHp;
        },
        async content(event,trigger,player){
            let num=player.maxHp-player.countCards('hs');
            if(num>0)await player.draw(num);
            else player.chooseToDiscard('hs',-num);
            if(num<0)num=-num;
            let list=[];
            for(let name of lib.inpile){
                const type=get.type(name);
                if(type=='basic'||type=='trick'){
                    if(get.cardNameLength(name)!=num)continue;
                    list.push({name:name});
                    if(name=='sha'){
                        for(let nature of lib.inpile_nature){
                            list.push({name:name,nature:nature});
                        };
                    };
                };
            };
            if(num==4&&!lib.inpile.includes('shuiyanqijunx'))list.push({name:'shuiyanqijunx'});
            if(!list.length)return;
            const {result:{bool,links}}=await player.chooseButton([get.skillTranslation(event.name),'将'+get.cnNumber(num)+'张牌当做以下一张牌使用',[list,'vcard']]).set('filterButton',button=>{
                return player.hasUseTarget(button.link);
            }).set('ai',button=>{
                return get.value(button.link);
            });
            if(bool){
                const card=get.autoViewAs(links[0]);
                const name=`${event.name}_backup`;
                game.broadcastAll((name,card,num)=>{
                    lib.skill[name].viewAs=card;
                    lib.skill[name].selectCard=num;
                },name,card,num);
                const next=player.chooseToUse();
                next.set('openskilldialog',`将${get.cnNumber(num)}张牌当${get.translation(card)}使用`);
                next.set('norestore',true);
                next.set('_backupevent',name);
                next.set('custom',{
                    add:{},
                    replace:{
                        window(){}
                    },
                });
                next.backup(name);
                const {result}=await next;
            };
        },
        subSkill:{
            'backup':{
                filterCard(card){
                    return get.itemtype(card)=='card';
                },
                position:'hes',
                popname:true,
                log:false,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4441; original skill djcguanri
'djcguanri':{//贯日 当你不以此法使用牌对其他角色造成伤害后，你可以将一张与此牌颜色相同的牌当【杀】对其使用。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
        },
        filter(event,player,name){
            return event.card&&player.countCards('hes',{color:get.color(event.card)})&&player.canUse('sha',event.player,false)&&event.player!=player&&event.getParent(3).name!='djcguanri';
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard('hes',get.prompt(event.skill),'将一张'+get.translation(get.color(trigger.card))+'牌当【杀】对'+get.translation(trigger.player)+'使用',(card)=>get.color(card)==get.color(trigger.card)).set('ai',(card)=>{
                const player=get.player();
                return get.attitude(player,trigger.player)<0;
            }).forResult();
        },
        async content(event,trigger,player){
            await player.useCard({name:'sha'},event.cards,trigger.player,false);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4561; original skill djcxiandan
'djcxiandan':{//衔胆 一名角色的判定阶段开始时，你可以令其观看的你的手牌。然后你可以将至多三张花色不同的牌置于牌堆顶，并令其从【兵粮寸断】，【闪电】，【乐不思蜀】中选择等量项进行判定。然后每有一项判定未中，你令其摸两张牌，否则你获得一张♥K【毒】并视为使用一张冰【杀】。
        audio:'ext:点绛唇/audio/skill:2',
        getList:['bingliang','shandian','lebu'],
        trigger:{
            global:'phaseJudgeBegin',
        },
        filter(event,player){
            return player.countCards('hes');
        },
        logTarget:'player',
        check(event,player){
            const att=get.attitude(player,event.player);
            if(event.player==player)return true;
            if(att>0){
                if(event.player.hasSkillTag('rejudge'))return true;
            }
            return true;
        },
        async content(event,trigger,player){
            const target=trigger.player;
            if(player.countCards('hs')&&target!=player)await target.viewHandcards(player);
            const {result:{bool,cards}}=await player.chooseCard('hes',[1,3],true,`将至多三张花色不同的牌置于牌堆顶，并令${get.translation(target)}从【兵粮寸断】，【闪电】，【乐不思蜀】中选择等量项进行判定。`).set('filterCard',(card,player)=>{
                return !ui.selected.cards.some(cardx=>get.suit(cardx,player)==get.suit(card,player));
            }).set('complexCard',true).set('ai',card=>{
                const trigger=get.event().getTrigger();
                if(trigger.player==player){
                    if(get.suit(card)=='spade')return 0;
                    if(ui.selected.cards.length>0)return 0;
                    return 8-get.value(card);
                };
                return 6-get.value(card);
            });
            if(bool){
                game.log(player,'将',cards.length,'张牌置于牌堆顶');
                await player.lose(cards,ui.cardPile,'insert');
                const list=lib.skill.djcxiandan.getList;
                const result2=await target.chooseButton([`衔胆：请选择${get.cnNumber(cards.length)}个延时锦囊并依次进行判定`,[list,'vcard']],cards.length,true).set('source',player).set('num',cards.length).set('ai',button=>{
                    const {player,num,source}=get.event();
                    const cards=Array.from(ui.cardPile.childNodes).flat().slice(0,3);
                    const suits=[['club'],['diamond','club','heart'],['heart']];
                    const effect=Array(3).fill(1);
                    if(player==source){
                        for(var i=0;i<3;i++){
                            if(suits[i].includes(get.suit(cards[i])))effect[i]+=(suits[i].length>1?2.2:5.6);
                        };
                        return effect[lib.skill.djcxiandan.getList.indexOf(button.link[2])]
                    };
                    return get.info({ name:button.link[2] }).ai.result.target(player,player);
                }).forResult();
                if(result2?.links.length){
                    let returnList=[];
                    const links=result2.links;
                    for(let i=0;i<links.length;i++){
                        const next=target.executeDelayCardEffect(links[i][2]);
                        await next;
                        if(game.getGlobalHistory('everything',evt=>{
                            return evt.name=='judge'&&evt.player==target&&evt.getParent()==next&&evt.result?.bool}).length){
                            returnList.push('draw');
                        }else if(game.getGlobalHistory('everything',evt=>{
                            return evt.name=='judge'&&evt.player==target&&evt.getParent()==next&&!evt.result?.bool}).length){
                            returnList.push('sha');
                        };
                    };
                    for(let type of returnList){
                        if(type=='draw')await target.draw(2);
                        else{
                            const du=game.createCard('du','heart',13);
                            if(du)await player.gain(du,'gain2');
                            const sha=new lib.element.VCard({name:'sha',nature:'ice'});
                            if(player.hasUseTarget(sha,true,false))await player.chooseUseTarget(sha,true,false);
                        };
                    };
                };
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4637; original skill djcguming
'djcguming':{//孤鸣 当你的体力值发生变化后，若你的手牌牌名均相同，你可以展示所有手牌并摸等量张牌。
        audio:'ext:点绛唇/audio/skill:1',
        trigger:{
            player:'changeHp',
        },
        prompt2:'展示所有手牌并摸等量张牌',
        filter(event,player,name){
            if(!player.countCards('hs'))return false;
            const cards=player.getCards('hs');
            for(let card of cards){
                if(card.name!=cards[0].name)return false;
            };
            return true;
        },
        async content(event,trigger,player){
            await player.showCards(player.getCards('hs'),get.skillTranslation(event.name));
            await player.draw(player.countCards('hs'));
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4229; original skill djcshouyin
'djcshouyin':{//授印 当你一回合使用或打出第X张牌时，若你本局游戏未使用或打出过与此牌牌名相同的牌，你可以令X号位角色回复1点体力（若其未受伤，则改为加1点体力上限）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:['useCard','respond'],
        },
        mark:true,
        seatRelated:true,
        intro:{
            content(storage,player,skill){
                const usedCards=[...new Set([...player.getAllHistory('useCard').map(evt=>evt.card.name),...player.getAllHistory('respond').map(evt=>evt.card.name)])];
                return '已使用或打出过的牌：'+(usedCards.length?usedCards.map(get.translation).join('，'):'无');

            },
        },
        prompt2(event,player){
            const num=player.getHistory('useCard').length+player.getHistory('respond').length;
            const target=game.filterPlayer(target=>{
                return target.getSeatNum()==num;
            });
            return '令'+get.translation(target)+(target[0].isDamaged()?'回复1点体力':'增加1点体力上限');
        },
        check(event,player){
            const num=player.getHistory('useCard').length+player.getHistory('respond').length;
            const target=game.filterPlayer(target=>{
                return target.getSeatNum()==num;
            });
            return get.attitude(player,event.player)>0;
        },
        filter(event,player,name){
            if(player.getAllHistory('useCard',evt=>{
                return evt!=event&&evt.card.name==event.card.name;
            }).length||player.getAllHistory('respond',evt=>{
                return evt!=event&&evt.card.name==event.card.name;
            }).length)return false;
            const num=player.getHistory('useCard').length+player.getHistory('respond').length;
            return game.hasPlayer(target=>{
                return target.getSeatNum()==num;
            });
        },
        async content(event,trigger,player){
            const num=player.getHistory('useCard').length+player.getHistory('respond').length;
            const targets=game.filterPlayer(target=>{
                return target.getSeatNum()==num;
            });
            for(let target of targets){
                if(target.isDamaged())await player.recover();
                else await target.gainMaxHp();
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4279; original skill djctongpao
'djctongpao':{//同袍 你或你攻击范围内的一名角色受到伤害后，你可以使用一张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'damageEnd',
        },
        filter(event,player,name){
            return player.inRange(event.player)||event.player==player;
        },
        direct:true,
        async content(event,trigger,player){
            const {result}=await player.chooseToUse({
                filterCard(card,player,event){
                    if(get.itemtype(card)!='card'||(get.position(card)!='h'&&get.position(card)!='s'))return false;
                    return lib.filter.filterCard.apply(this,arguments);
                },
                prompt:get.prompt(event.name),
                prompt2:'使用一张手牌',
                addCount:false,
                ai1(card){
                    return get.order(card);
                },
            }).set('logSkill',event.name);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4303; original skill djcshimeng
'djcshimeng':{//誓盟 一名其他角色的准备阶段开始时，你可以令其观看你的手牌，并获得其中至多X张牌，然后你观看其手牌并获得至多等量张牌（X为你的体力上限）。你以此法获得红色牌后，你摸一张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'phaseZhunbeiBegin',
        },
        filter(event,player,name){
            return event.player!=player&&player.countCards('hs');
        },
        logTarget:'player',
        async content(event,trigger,player){
            const num=get.attitude(trigger.player,player)>0?0:-6;
            const {result:{bool,cards}}=await trigger.player.gainPlayerCard(player,'hs',[1,player.hp],true,'visible').set('ai',button=>{
                return get.value(button.link)+_status.event.num;
            }).set('num',num);
            if(bool){
                const {result}=await player.gainPlayerCard(trigger.player,'hs',[1,cards.length],true,'visible');
                if(result.bool){
                    if(result.cards.some(card=>get.color(card)=='red'))await player.draw();
                };
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1998; original skill djcfeijun
'djcfeijun':{//飞军 出牌阶段限一次，你可以获得一名角色区域内的一张牌。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        usable:1,
        filter(event,player,name){
            return game.hasPlayer(target=>get.info('djcfeijun').filterTarget(null,player,target));
        },
        filterTarget(card,player,target){
            return target.countGainableCards(player,'hej');
        },
        async content(event,trigger,player){
            await player.gainPlayerCard(event.targets[0],'hej',true);
        },
        ai:{
            order:6,
            result:{
                player:10,
                target:-2,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2019; original skill djcjuguan
'djcjuguan':{//据关 锁定技，当你造成/受到伤害后，若你未受伤/已受伤，你获得2点护甲。然后你须选择一项：1.失去1点体力。2.失去1点体力上限。3.失去〖据关〗并摸两张牌。若你与上次选择的选项不同，你摸两张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
            player:'damageEnd',
        },
        filter(event,player,name){
            if(name=='damageSource')return !player.getDamagedHp();
            return player.getDamagedHp();
        },
        forced:true,
        mark:true,
        intro:{
            name:'上次选择选项',
            content(storage,player,skill){
                return storage?storage:'无';
            },
            markcount(){
                return 0;
            },
        },
        async content(event,trigger,player){
            await player.changeHujia(2,null,true);
            const list=['失去1点体力','失去1点体力上限','失去〖'+get.skillTranslation(event.name)+'〗并摸两张牌']
            const {result}=await player.chooseControl(list).set('prompt',get.skillTranslation(event.name)+':请选择一项').set('ai',()=>{
                const player=get.player();
                const list=_status.event.list;
                if(player.isHealthy())return player.maxHp<=2?list[2]:list[0];
                return list[1];
            }).set('list',list);
            switch(result.control){
                case '失去1点体力':
                    await player.loseHp();
                    break;
                case '失去1点体力上限':
                    await player.loseMaxHp();
                    break;
                default:
                    await player.removeSkills([event.name]);
                    await player.draw(2);
                    break;
            };
            if(!player.storage[event.name]||result.control!=player.storage[event.name]){
                player.storage[event.name]=result.control;
                await player.draw(2);
            };
            await player.markSkill(event.name);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2987; original skill djcjinjie
'djcjinjie':{//尽节 锁定技，若你处于横置状态，你视为拥有〖无言〗，否则你视为拥有〖自书〗。
        audio:'ext:点绛唇/audio/skill:2',
        locked:true,
        derivation:['zishu','xinwuyan'],
        changeLink(player,skill){
            player.removeAdditionalSkill(skill);
            if(!player.isLinked()){
                player.addAdditionalSkill(skill,get.info(skill).derivation[0]);
                player.when({player:'linkAfter'}).filter(evt=>{
                    return player.isLinked();
                }).then(()=>{
                    lib.skill[skill].changeLink(player,skill);
                }).vars({skill:skill});
            }else{
                player.addAdditionalSkill(skill,get.info(skill).derivation[1]);
                player.when({player:'linkAfter'}).filter(evt=>{
                    return !player.isLinked();
                }).then(()=>{
                    lib.skill[skill].changeLink(player,skill);
                }).vars({skill:skill});
            };
        },
        init(player,skill){
            lib.skill[skill].changeLink(player,skill);
        },
        onremove(player,skill){
            player.removeAdditionalSkill(skill);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3016; original skill djcbowang
'djcbowang':{//博望 当你使用牌指定唯一目标后，你可以令其横置。然后你选择一张本轮此法未使用过的普通锦囊牌令其视为使用之。此牌结算后，你令其弃置X张牌（X为此牌指定的目标数，若其弃置牌的数量小于X，你弃置两张牌），然后若此牌的目标包括其，你对其造成1点火属性伤害并令其摸一张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardToPlayered',
        },
        filter(event,player,name){
            return event.targets.length==1&&!event.targets[0].isLinked();
        },
        logTarget:'target',
        prompt2(event,player,name){
            return '令'+get.translation(event.targets[0])+'横置，并令其视为使用一张本轮此法未使用过的普通锦囊牌，然后令其弃置等同于此牌指定目标数量张牌。若此牌的目标包含其，你对其造成1点火属性伤害并令其摸一张牌';
        },
        async content(event,trigger,player){
            const target=trigger.targets[0];
            player.addTempSkill(event.name+'_use','roundStart');
            await target.link();
            let cards=[];
            for(let card of lib.inpile){
                if(!player.storage[event.name+'_use'].includes(card)&&get.type(card)=='trick'&&lib.filter.cardUsable({name:card},target,event.getParent('chooseToUse'))&&game.hasPlayer(target=>{
                    return target.canUse(card,target);
                }))cards.push([get.type(card),'',card]);
            };
            if(cards.length){
                const {result:{bool,links}}=await player.chooseButton(true,[get.skillTranslation(event.name),'选择一张令'+get.translation(target)+'视为使用的牌，然后其弃置等同于此牌指定目标数量张的牌',[cards,'vcard']]).set('ai',(button)=>{
                    const player=get.player();
                    if(player.countCards('hs',{name:'sha'})>1)return player.getUseValue(button.link)||1;
                    return 0;
                });
                if(bool){
                    player.storage[event.name+'_use'].push(links[0][2])
                    const {result}=await target.chooseUseTarget({name:links[0][2],isCard:true},true,false);
                    if(result.bool){
                        const {result:{bool,cards}}=await target.chooseToDiscard(result.targets.length,'hes',true).set('prompt','〖'+get.skillTranslation(event.name)+'〗:弃置'+get.cnNumber(result.targets.length)+'张牌');
                        if(bool&&result.targets.length-cards.length>0)await player.chooseToDiscard(2,'hes',true).set('prompt','〖'+get.skillTranslation(event.name)+'〗:弃置两张牌');
                        if(result.targets.includes(target)){
                            await target.damage('nocard','fire');
                            await target.draw();
                        };
                    };
                };
            };
        },
        subSkill:{
            'use':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=[];
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4460; original skill djcleming
'djcleming':{//勒铭 准备阶段，你可摸至多体力上限张牌。若如此做，回合结束时，若X小于Y，你失去Y-X点体力，否则你回复1点体力并摸Y张牌（X为你本回合内造成的伤害值之和，Y为你以此法摸牌数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseZhunbeiBegin',
        },
        async cost(event,trigger,player){
            const {result}=await player.chooseNumbers(get.prompt(event.skill),[{prompt:'请选择你要摸的牌数',min:1,max:player.maxHp}]).set('processAI',()=>{
                const player=get.player();
                return [player.maxHp];
            });
            if(result&&result.numbers){
                event.result={
                    bool:true,
                    cost_data:{
                        number:result.numbers[0],
                    },
                };
            };
        },
        async content(event,trigger,player){
            const num=event.cost_data.number;
            await player.draw(num);
            player.when({player:'phaseAfter'}).then(()=>{
                let num=0;
                player.getHistory('sourceDamage',evt=>{
                    num+=evt.num;
                });
                if(num<numx)player.loseHp(numx-num);
                else{
                    player.recover();
                    player.draw(numx);
                };
            }).vars({numx:num});
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4495; original skill djcyanchen
'djcyanchen':{//燕嗔 当你造成/受到伤害后，若受伤角色/伤害来源不为你，你可以令伤害来源受到等量点无来源伤害，并令其回复1点体力。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'damageEnd',
            source:'damageSource',
        },
        filter(event,player,name){
            if(event.source==player&&event.player==player)return false;
            return event.source&&event.source.isIn();
        },
        prompt2(event,player,name){
            return '令'+get.translation(event.source)+'受到'+event.num+'点无来源伤害，并令其回复1点体力';
        },
        async content(event,trigger,player){
            await trigger.source.damage(trigger.num,'nosource');
            await trigger.source.recover();
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4513; original skill djcduanqiao
'djcduanqiao':{//断桥 出牌阶段限一次或你的体力值回复至上限后，你可以失去一半体力值（向上取整），并视为对一名角色使用等量张【杀】。你脱离濒死后，此技能视为未发动过。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        trigger:{
            player:'recoverEnd',
        },
        filter(event,player,name){
            if(!game.hasPlayer(target=>lib.skill.djcduanqiao.filterTarget(null,player,target)))return false;
            if(name!='recoverEnd')return !player.hasSkill('djcduanqiao_block');
            return !player.getDamagedHp();
        },
        filterTarget(card,player,target){
            return player.canUse({name:'sha',isCard:true},target);
        },
        async cost(event,trigger,player){
            let num=Math.ceil(player.hp/2);
            event.result=await player.chooseTarget(get.prompt(event.skill),'对一名角色使用'+num+'张【杀】',(card,player,target)=>{
                return lib.skill[event.skill].filterTarget(card,player,target);
            }).set('ai',target=>{
                const player=get.player();
                return get.effect(target,{name:'sha'},player,player);
            }).forResult();
        },
        async content(event,trigger,player){
            if(event.triggername!='recoverEnd')await player.addTempSkill(event.name+'_block');
            let num=Math.ceil(player.hp/2);
            await player.loseHp(num);
            do{
                if(!event.targets[0].isIn())break;
                await player.useCard({name:'sha',isCard:true},event.targets[0],false)
                num--;
            }while(num>0);
        },
        subSkill:{
            'block':{
                trigger:{
                    player:'dyingAfter',
                },
                forced:true,
                charlotte:true,
                async content(event,trigger,player){
                    player.removeSkill(event.name);
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1871; original skill djcbeiding
'djcbeiding':{//北定 你使用牌结算后，若你手牌中没有与此牌花色相同的牌，你可以视为使用无距离限制的【酒】【杀】并令目标获得你的一个其他技能。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardAfter',
        },
        filter(event,player,name){
            if(!lib.suit.includes(get.suit(event.card)))return false;
            return !player.countCards('hs',{suit:get.suit(event.card)});
        },
        async cost(event,trigger,player){
            const list=[['feiyang','飞扬'],['bahu','跋扈']];
            let skills=player.getSkills(null,false,false).filter(skill=>{
                if(skill=='djcbeiding')return false;
                if(list.some(text=>skill.includes(text[0])&&get.translation(skill)==text[1]))return true;
                const info=get.info(skill);
                return !info||!info.charlotte;
            });
            event.result=await player.chooseTarget(get.prompt(event.skill),'视为使用无距离限制的【酒】【杀】并令目标获得你的一个其他技能',(card,player,target)=>{
                if(!player.canUse('sha',target,false))return false;
                for(let skill of _status.event.skills){
                    if(!target.hasSkill(skill))return true;
                };
                return false;
            }).set('ai',(target)=>{
                return get.effect(target,{name:'sha'},player,player);
            }).set('skills',skills).forResult();
        },
        async content(event,trigger,player){
            const list=[['feiyang','飞扬'],['bahu','跋扈']];
            let skills=player.getSkills(null,false,false).filter(skill=>{
                if(skill=='djcbeiding'||event.targets[0].hasSkill(skill))return false;
                if(list.some(text=>skill.includes(text[0])&&get.translation(skill)==text[1]))return true;
                const info=get.info(skill);
                return !info||!info.charlotte;
            });
            await player.chooseUseTarget({name:'jiu',isCard:true},true);
            await player.useCard(false,event.targets[0],{name:'sha',isCard:true,},'noai');
            skills=player.getSkills(null,false,false).filter(skill=>{
                if(skill=='djcbeiding'||event.targets[0].hasSkill(skill))return false;
                if(list.some(text=>skill.includes(text[0])&&get.translation(skill)==text[1]))return true;
                const info=get.info(skill);
                return !info||!info.charlotte;
            });
            if(event.targets[0].isIn()&&skills.length){
                const {result}=await player.chooseControl(skills).set('prompt','你对'+get.translation(event.targets[0])+'发动了〖'+get.skillTranslation(event.name)+'〗').set('prompt2','请选择要令其获得的技能');
                if(result.control){
                    await event.targets[0].addSkills([result.control]);
                };
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1922; original skill djcbutian
'djcbutian':{//补天 锁定技，你即将造成的大于1点的伤害均改为令目标受到X次1点无来源伤害（X为伤害值）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageBefore',
        },
        forced:true,
        filter(event,player,name){
            return event.num>1;
        },
        async content(event,trigger,player){
            let num=trigger.num;
            trigger.cancel();
            for(let i=0;trigger.num>i;i++){
                trigger.player.damage('nosource');
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1939; original skill djcjielv
'djcjielv':{//竭虑 锁定技，当你造成或受到伤害后，你失去首个技能。然后回合结束后，你依次获得最后以此法失去的技能。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'damageEnd',
            source:'damageSource',
        },
        forced:true,
        async content(event,trigger,player){
            const list=[['feiyang','飞扬'],['bahu','跋扈']];
            let skills=player.getSkills(null,false,false).filter(skill=>list.some(text=>skill.includes(text[0])&&get.translation(skill)===text[1])||!get.info(skill)?.charlotte);
            player.addTempSkill(event.name+'_addSkill');
            player.storage[event.name+'_addSkill'].push(skills[0]);
            await player.removeSkills([skills[0]]);
            player.markSkill(event.name+'_addSkill');
        },
        subSkill:{
            'addSkill':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=[];
                },
                intro:{
                    markcount:false,
                    content(storage,player,skill){
                        let str='已失去技能:';
                        for(let skilld of player.storage[skill]){
                            str+=' '+get.skillTranslation(skilld);
                        };
                        return str;
                    },
                },
                onremove(player,skill){
                    let skills=player.storage[skill].reverse();
                    player.addSkills(skills);
                    delete player.storage[skill];
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1978; original skill djcjincui
'djcjincui':{//尽瘁 锁定技，结束阶段，你受到1点无来源伤害。一名其他角色受到无来源伤害结算后，你摸1张牌。你受到有来源的伤害结算后，你摸X张牌（X为你的技能数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseJieshuBegin',
            global:'damageAfter',
        },
        forced:true,
        filter(event,player,name){
            if(name=='phaseJieshuBegin')return true;
            return event.player!=player&&!event.source||event.player==player&&event.source;
        },
        async content(event,trigger,player){
            const list=[['feiyang','飞扬'],['bahu','跋扈']];
            let skills=target.getSkills(null,false,false).filter(skill=>list.some(text=>skill.includes(text[0])&&get.translation(skill)===text[1])||!get.info(skill)?.charlotte);
            if(event.triggername=='phaseJieshuBegin')await player.damage('nosource');
            else await player.draw(trigger.player==player?skills.length:1);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1304; original skill djccuihuo
'djccuihuo':{//淬火 你可以横置或重置并将X张牌当作以下第X张牌使用或打出：1.火【杀】。2.【桃】。3.【铁索连环】。（X为场上体力值与你相同的角色数）。
        audio:'ext:点绛唇/audio/skill:2',
        enable:['chooseToUse','chooseToRespond'],
        prompt(){
            const player=get.player();
            let num=game.filterPlayer(target=>{
                return target.hp==player.hp;
            }).length;
            let map={1:'sha',2:'tao',3:'tiesuo'};
            return(player.isLinked()?'重':'横')+'置武将牌并将'+num+'张牌当作【'+(num==1?'火':'')+get.translation(map[num])+'】使用或打出';
        },
        position:'hes',
        filterCard:()=>true,
        viewAs(cards,player){
            let map={1:'sha',2:'tao',3:'tiesuo'};
            if(!cards.length)return null;
            let num=game.filterPlayer(target=>{
                return target.hp==player.hp;
            }).length;
            let card=get.autoViewAs({name:map[num],nature:(num==1?'fire':null)});
            return card;
        },
        check(card){
            return 9-get.value(card);
        },
        filter(event,player,name){
            let num=game.filterPlayer(target=>{
                return target.hp==player.hp;
            }).length;
            if(num>3)return false;
            let map={1:'sha',2:'tao',3:'tiesuo'};
            let card=get.autoViewAs({name:map[num],nature:(num==1?'fire':null)},'unsure');
            return event.filterCard(card,player,event)&&num<=Math.min(3,player.countCards('hes'));
        },
        selectCard(){
            const player=get.player();
            return game.filterPlayer(target=>{
                return target.hp==player.hp;
            }).length;
        },
        hiddenCard(player,name){
            let num=game.filterPlayer(target=>{
                return target.hp==player.hp;
            }).length;
            if(player.countCards('hes')<num)return false;
            if(name=='sha')return num==1;
            if(name=='tao')return num==2
            if(name=='tiesuo')return num==3;
            return false;
        },
        async precontent(event,trigger,player){
            await player.link();
        },
        ai:{
            order:8,
            skillTagFilter(player,tag){
                let num=game.filterPlayer(target=>{
                    return target.hp==player.hp;
                }).length;
                if(num>Math.min(3,player.countCards('hes')))return false;
            },
            result:{
                player(player){
                    if(_status.event.dying)return get.attitude(player,_status.event.dying);
                    return 1;
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1373; original skill djcliange
'djcliange':{//链舸 每回合限一次，一名角色即将受到伤害时，你可以对自己造成1点火属性伤害并将此伤害转移给一名横置状态与其不同的角色。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'damageBegin4',
        },
        usable:1,
        filter(event,player,name){
            return game.hasPlayer(target=>{
                if(event.player.isLinked())return !target.isLinked();
                return target.isLinked();
            });
        },
        async cost(event,trigger,player){
            event.result=await player.chooseTarget(get.prompt(event.skill),'对自己造成1点火属性伤害并将'+get.translation(trigger.player)+'受到的'+trigger.num+'点'+(trigger.nature?get.translation(trigger.nature):'无')+'属性伤害转移给一名'+(trigger.player.isLinked()?'未横置':'已横置')+'的角色',(card,player,target)=>{
                if(_status.event.player2.isLinked())return !target.isLinked();
                return target.isLinked();
            }).set('ai',(target)=>{
                const player=get.player();
                if(get.attitude(player,_status.event.player2)<=0)return false;
                const att=get.attitude(player,target);
                const trigger=_status.event.getTrigger();
                let da=0;
                if(player.hp==1)da=10;
                if(trigger.num>1){
                    if(target.maxHp>5&&target.hp>1)return-att/10+da;
                    return-att+da;
                };
                const eff=get.damageEffect(target,trigger.source,target,trigger.nature);
                if(att==0)return 0.1+da;
                if(eff>=0&&trigger.num==1)return att+da;
                if(target.hp==target.maxHp)return-att+da;
                if(target.hp==1){
                    if(target.maxHp<=4&&!target.hasSkillTag('maixie')){
                        if(target.maxHp<=3)return-att+da;
                        return-att/2+da;
                    };
                return da;
                };
                if(target.hp==target.maxHp-1){
                    if(target.hp>2||target.hasSkillTag('maixie'))return att/5+da;
                    if(att>0)return 0.02+da;
                    return 0.05+da;
                };
                return att/2+da;
            }).set('player2',trigger.player).forResult();
        },
        async content(event,trigger,player){
            await player.damage('fire','nocard');
            trigger.player=event.targets[0];
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1424; original skill djcfenjian
'djcfenjian':{//焚舰 锁定技，一名角色受到传导伤害时，你摸一张牌并令此伤害+1。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'damageBegin1',
        },
        filter(event,player,name){
            return !event.notLink();
        },
        forced:true,
        async content(event,trigger,player){
            await player.draw();
            trigger.num++;
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:371; original skill djcliaoyi
'djcliaoyi':{//燎熠 转换技，出牌阶段限X+1次（X为你本回合失去的牌的次数除以4，向下取整）。你可以视为使用一张：阳，【火攻】；阴，无次数限制的火【杀】。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        delay:false,
        mark:true,
        marktext:'☯',
        zhuanhuanji(player,skill){
            player.storage[skill]=!player.storage[skill];
            player.changeSkin({characterName:'fhq_luxun'},'fhq_luxun'+(player.storage[skill]?'_shadow':''));
        },
        prompt(){
            const player=get.player();
            if(!player.storage['djcliaoyi'])return '是否视为使用一张【火攻】';
            return '是否视为使用一张无次数限制的火【杀】';
        },
        usable(skill,player){
            return Math.floor(player.getHistory('lose',evt=>evt.cards2&&evt.cards2.length).length/4)+1;
        },
        intro:{
            content(storage,player,skill){
                let str='本回合使用次数:'+(player.getStat().skill.djcliaoyi||0)+'/'+(Math.floor(player.getHistory('lose',evt=>evt.cards2&&evt.cards2.length).length/4)+1||0)+'<br>增加需失去牌次数:'+(4-player.getHistory('lose',evt=>evt.cards2&&evt.cards2.length).length%4);
                if(!storage)str+='<br>下一次使用牌：【火攻】';
                else str+='<br>下一次使用牌：火【杀】';
                if(player.isUnderControl(true))return str;
                return storage?'阴':'阳';
            },
        },
        async content(event,trigger,player){
            let card=player.storage[event.name]?{name:'sha',isCard:true,nature:'fire'}:{name:'huogong',isCard:true};
            await player.chooseUseTarget(card,true,false);
            player.changeZhuanhuanji(event.name);
        },
        ai:{
            order:10,
            result:{
                player(player){
                    if(player.storage['djcliaoyi']){
                        if(game.hasPlayer(target=>{
                            return player.canUse({name:'sha',nature:'fire'},target)&&get.effect(target,{name:'sha',nature:'fire'},player,player)>0;
                        }))return 1;
                        return 0;
                    };
                    return 1
                },
            },
            
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:419; original skill djclianying
'djclianying':{//连营 当你使用一张牌后，若你的手牌中没有与此牌类型相同的牌，你可以将至少一张牌置于武将牌上并摸一张牌，若如此做，本回合结束时，你获得武将牌上的所有牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardEnd'
        },
        filter(event,player,name){
            for(let card of player.getCards('hs')){
                if(get.type2(card)==get.type2(event.card))return false;
            };
            return player.countCards('hs');
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard([1,player.countCards('hs')],'hs',get.prompt(event.skill),'将至少一张手牌置于武将牌上并摸一张牌').set('ai',card=>{
                if(!player.isPhaseUsing()){
                    if(ui.selected.cards&&ui.selected.cards.length==1)return 0;
                    return 10-get.value(card)
                }else{
                    if(card.name=='sha'&&player.getCardUsable('sha')==0)return 20;
                    if(card.name=='jiu'&&player.getCardUsable('jiu')==0)return 20;
                    if(game.hasPlayer(target=>{
                        return player.canUse(card,target)&&get.effect(target,card,player,player)>0;
                    }))return 0;
                    return 20;
                };
            }).forResult();
        },
        async content(event,trigger,player){
            await player.addToExpansion(event.cards,'giveAuto',player).set('gaintag',[event.name+'_1']);
            player.addSkill(event.name+'_1');
            await player.draw();
        },
        subSkill:{
            '1':{
                trigger:{
                    global:'phaseEnd',
                },
                forced:true,
                async content(event,trigger,player){
                    let cards=player.getExpansions(event.name);
                    if(cards.length)player.gain(cards,'draw');
                    player.removeSkill(event.name);
                },
                intro:{
                    mark(dialog,storage,player){
                        let cards=player.getExpansions('djclianying_1');
                        if(player.isUnderControl(true))dialog.addAuto(cards);
                        return '共有'+get.cnNumber(cards.length)+'张牌';
                    },
                    markcount:'expansion',
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3879; original skill djcsanyuan
'djcsanyuan':{//三垣 转换技，天：一名角色的判定区因判定失去牌/判定牌生效后，你可以获得此牌；地：一名角色装备牌后，你可以移动其他角色场上一张牌。人：一名角色于弃牌阶段弃置牌时，你可以获得之。
        audio:'ext:点绛唇/audio/skill:4',
        trigger:{
            global:['judgeEnd','equipEnd','loseAfter','loseAsyncAfter'],
        },
        init(player,skill){
            player.storage[skill]=0;
        },
        prompt2(event,player){
            const storage=player.storage['djcsanyuan'];
            return ['一名角色的判定区因判定失去牌/判定牌生效后，你可以获得此牌','一名角色装备牌后，你可以移动其他角色场上一张牌','一名角色于弃牌阶段弃置牌时，你可以获得之'][storage];
        },
        filter(event,player,name){
            switch(player.storage['djcsanyuan']){
                case 2:
                    if(!['loseAfter','loseAsyncAfter'].includes(name))return false;
                    if(event.type!='discard'||event.getlx===false||event.getParent('phaseDiscard').player!=event.player)return false;
                    const evt=event.getl(event.player);
                    return evt&&evt.cards2.filterInD('d').length>0;
                break;
                case 1:
                    if(!player.canMoveCard()||name!='equipEnd')return false;
                    return game.hasPlayer(target=>{
                        return target!=event.player&&target.countCards('ej');
                    });
                break;
                default:
                    if(name!='judgeEnd')return false;
                    return event.card||event.result.card;
                break;
            };
        },
        mark:true,
        marktext:'☯',
        zhuanhuanji(player,skill){
            player.addTempSkill(skill+'_use');
            player.storage[skill+'_use']++;
            player.markSkill(skill+'_use');
            player.storage[skill]=[1,2,0][player.storage[skill]];
        },
        intro:{
            content(storage,player,skill){
                return ['一名角色的判定区因判定失去牌/判定牌生效后，你可以获得此牌','一名角色装备牌后，你可以移动其他角色场上一张牌','一名角色于弃牌阶段弃置牌时，你可以获得之'][storage];
            },
        },
        async content(event,trigger,player){
            let num=player.storage['djcsanyuan'];
            await player.changeZhuanhuanji(event.name);
            switch(num){
                case 2:
                    await player.gain(trigger.getl(trigger.player).cards2.filterInD('d'),'gain2');
                break;
                case 1:
                    await player.moveCard(game.filterPlayer(target=>target!=trigger.player));
                break;
                default:
                    if(trigger.card){
                        await player.gain(trigger.card,'gain2');
                    }else{
                        await player.gain(trigger.result.card,'gain2');
                    };
                break;
            };
        },
        subSkill:{
            'use':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=0;
                },
                intro:{
                    content:'本回合已转换过#次',
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3958; original skill djcxuanji
'djcxuanji':{//璇玑 当你成为牌的目标后，若此牌为：基本牌：你可以摸一张牌；锦囊牌：你可以将一张非基本牌当任意未以此法使用过的锦囊牌使用；装备牌：你可以转换〖三垣〗的状态。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            target:'useCardToTargeted',
        },
        filter(event,player){
            if(!['basic','trick','equip'].includes(get.type2(event.card)))return false;
            return get.type2(event.card)!='trick'||(player.hasCard((card)=>_status.connectMode?true:get.type(card)!='basic','hes')&&lib.inpile.some((name)=>{
                return get.type2(name)=='trick'&&!player.hasAllHistory('useCard',(evt)=>evt.card.name==name&&evt.skill=='djcxuanji_backup')&&player.hasUseTarget(name);
            }));
        },
        async cost(event,trigger,player){
            if(get.type2(trigger.card)!='trick'){
                event.result=await player.chooseBool(get.prompt(event.skill),get.type2(trigger.card)=='basic'?'摸一张牌':'转换〖三垣〗的阴阳状态').forResult();
            }else{
                    const {result}=await player.chooseButton([get.prompt(event.skill),'将一张非基本牌当做....',[lib.inpile.filter((i)=>{
                    return get.type2(i)=='trick'&&!player.hasAllHistory('useCard',(evt)=>evt.card.name==i&&evt.skill=='djcxuanji_backup')&&player.hasUseTarget(i);
                }).map((i)=>[get.type2(i),'',i]),'vcard']]);
                if(result&&result.bool){
                    event.result={
                        bool:true,
                        cost_data:{
                            link:result.links[0][2],
                        },
                    };
                };
            };
        },
        async content(event,trigger,player){
            if(get.type2(trigger.card)!='trick'){
                if(get.type2(trigger.card)=='basic'){
                    await player.draw();
                }else{
                    player.changeZhuanhuanji('djcsanyuan');
                };
            }else{
                const card=get.autoViewAs({name:event.cost_data.link});
                const name=`${event.name}_backup`;
                game.broadcastAll((name,card)=>{
                    lib.skill[name].viewAs=card;
                },name,card);
                const next=player.chooseToUse();
                next.set('openskilldialog',`璇玑：将一张非基本牌当${get.translation(card)}使用`);
                next.set('norestore',true);
                next.set('_backupevent',name);
                next.set('custom',{
                    add:{},
                    replace:{ 
                        window(){}
                    },
                });
                next.backup(name);
                const {result}=await next;
            };
        },
        subSkill:{
            'backup':{
                filterCard(card){
                    return get.itemtype(card)=='card'&&get.type(card)!='basic';
                },
                selectCard:1,
                position:'hes',
                popname:true,
                log:false,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4025; original skill djctianshu
'djctianshu':{//天枢 你转换过三次〖三垣〗的回合结束后，你可以进行一次判定，若结果为：黑色：你可以对至多X名角色造成1点雷属性伤害（X为你的体力值）；红色：你从牌堆获得每种类型的牌各一张。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'phaseEnd',
        },
        filter(event,player){
            return player.storage.djcsanyuan_use&&player.storage.djcsanyuan_use>=3;
        },
        prompt2:'进行一次判定，若结果为：黑色：你可以对至多X名角色造成1点雷属性伤害（X为你的体力值）；<br>红色：你从牌堆获得每种类型的牌各一张。',
        async content(event,trigger,player){
            const judgeEvent=player.judge();
            judgeEvent.judge2=result=>result.bool;
            const {result:{color}}=await judgeEvent;
            if(color=='black'){
                const {result:{bool,targets}}=await player.chooseTarget([1,player.getHp()],'对至多'+player.hp+'名角色造成1点雷属性伤害').set('ai',target=>{
                    const player=get.player();
                    return get.damageEffect(target,player,player,'thunder');
                });
                if(bool){
                    for(const target of targets){
                        await target.damage('thunder');
                    };
                };
            }else{
                var list=['basic','equip','trick'],cards=[];
                for(var i of list){
                    var card=get.cardPile2(function(card){
                        return get.type(card)==i;
                    });
                    if(card)cards.push(card);
                };
                if(cards.length)await player.gain(cards,'gain2');
            };
        },
        ai:{
            combo:'djcsanyuan',
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:891; original skill djcxuwang
'djcxuwang':{//酗妄 出牌阶段，你可以选择一名其他角色区域内的一张牌。然后其对你使用对应实体牌为此牌的【杀】。然后若此【杀】对你造成过伤害，你视为使用一张无次数限制的【酒】。你以此法选择其手牌区内的牌时，若其手牌数不大于你，你从牌堆获得一张【杀】并令此技能本回合失效。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        prompt:'选择一名其他角色，将其区域内的一张牌当作【杀】对你使用',
        locked:false,
        logTarget:'target',
        filter(event,player,name){
            return game.hasPlayer(target=>{
                return target.countCards('hej')&&target!=player;
            });
        },
        filterTarget(card,player,target){
            return target!=player&&target.countCards('hej',card=>{
                const sha=get.autoViewAs({name:'sha'},[card]);
                return target.canUse(sha,player,false,false);
            });
        },
        async content(event,trigger,player){
            const target=event.targets[0];
            const {result:{bool,cards}}=await player.choosePlayerCard(target,'hej',true).set('ai',button=>{
                const player=get.player();
                const target=get.event().getParent().targets[0];
                const sha=get.autoViewAs({name:'sha'},[button.link]);
                let val=get.buttonValue(button);
                val+=get.effect(player,sha,target,player);
                if(get.position(button.link)=='h'){
                    if(target.countCards('e'))return 0;
                    if(target.getCards('hs')>=player.countCards('hs'))val+=1.2;
                };
                if(get.attitude(player,get.owner(button.link))>0)return-val;
                return val;
            });
            if(bool){
                if(get.position(cards[0])=='h'&&target.countCards('hs')<=player.countCards('hs')){
                    const card=get.cardPile2(cardx=>{
                        return cardx.name=='sha';
                    });
                    if(card)await player.gain(card,'gain2');
                    player.tempBanSkill(event.name);
                };
                const sha=get.autoViewAs({name:'sha'},cards);
                if(target.canUse(sha,player,false,false)){
                    await target.useCard(sha,cards,player,false);
                    if(player.hasHistory('damage',evt=>{
                        return evt.getParent(3)==event;
                    }))await player.useCard({name:'jiu',isCard:true},player,false);
                };
            };
        },
        mod:{
            aiOrder(player,card,num){
                if(card.name=='jiu')return 1.1;
                if(card.name=='sha')return 1;
            },
        },
        ai:{
            order:2,
            expose:0.6,
            threaten:0.5,
            result:{
                target(player,target){
                    let eff=0;
                    if(get.effect(player,{name:'sha'},target,player)<=0)eff-=5;
                    if(player.hasShan())eff-=-2;
                    eff-=target.countCards('ej');
                    if(target.countCards('hs')<player.countCards('hs'))eff-=-2;
                    return eff;
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:962; original skill djcnigang
'djcnigang':{//逆纲 锁定技，①每轮每名角色限一次，一名角色受到大于1的伤害后，你对其上家及下家造成1点伤害。②手牌数小于你的角色对你造成伤害+1。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'damageEnd',
            player:'damageBegin1',
        },
        forced:true,
        filter(event,player,name){
            if(name=='damageBegin1')return event.source&&event.source.countCards('hs')<player.countCards('hs');
            return event.num>1&&(!player.storage['djcnigang_use']||!player.storage['djcnigang_use'].includes(event.player));
        },
        async content(event,trigger,player){
            if(event.triggername=='damageBegin1'){
                trigger.num++;
            }else{
                player.addTempSkill(event.name+'_use','roundStart');
                player.storage[event.name+'_use'].push(trigger.player);
                await trigger.player.getPrevious().damage('nocard');
                if(trigger.player.getNext()!=trigger.player.getPrevious())await trigger.player.getNext().damage('nocard');
            };
        },
        subSkill:{
            'use':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=[];
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2411; original skill djcfenyue
'djcfenyue':{//奋钺 出牌阶段开始时，你可以摸X张牌（X为你的体力上限-本轮你发动〖奋钺〗的次数）。若如此做，此阶段结束后，若你造成过伤害，你弃置所有手牌并执行一个额外的出牌阶段。否则你将手牌数摸至体力上限。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseUseBegin',
        },
        filter(event,player){
            let num=player.getRoundHistory('useSkill',evt=>{
                return evt.skill=='djcfenyue';
            }).length;
            return num<=player.maxHp;
        },
        prompt2(event,player){
            let num=player.getRoundHistory('useSkill',evt=>{
                return evt.skill=='djcfenyue';
            }).length;
            return '摸'+(player.maxHp-num)+'张牌,然后若此阶段结束后，你于此阶段造成过伤害，你弃置所有手牌并执行一个额外的出牌阶段，否则你将手牌摸至体力上限';
        },
        intro:{
            content(storage,player){
                let num=player.getRoundHistory('useSkill',evt=>{
                    return evt.skill=='djcfenyue';
                }).length;
                return '本轮已发动'+num+'次';
            },
        },
        async content(event,trigger,player){
            player.markSkill(event.name);
            let num=player.getRoundHistory('useSkill',evt=>{
                return evt.skill==event.name;
            }).length-1;
            await player.draw(player.maxHp-num);
            player.when({player:'phaseUseAfter'}).then(()=>{
                if(player.getHistory('sourceDamage',evt=>{
                    return evt.getParent('phaseUse')==triggerr;
                }).length){
                    player.discard(player.getCards('hs'));
                    let next=player.phaseUse();
                    event.next.remove(next);
                    trigger.next.push(next);
                }else player.drawTo(player.maxHp);
            }).vars({triggerr:trigger})
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3072; original skill djcshizhan
'djcshizhan':{//势斩 出牌阶段，若你手牌中红色牌与黑色牌的数量相同，你可以交给一名其他角色一张牌并视为对其使用一张不可被响应的【杀】。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        discard:false,
        lose:false,
        prompt:'交给一名其他角色一张牌并视为对其使用一张不可被响应的【杀】',
        filter(event,player,name){
            return player.countCards('hs')&&player.countCards('hs',{color:'black'})==player.countCards('hs',{color:'red'})&&game.hasPlayer(target=>get.info('djcshizhan').filterTarget(null,player,target));
        },
        filterTarget(card,player,target){
            return player.canUse('sha',target,false)&&target!=player;
        },
        filterCard:true,
        async content(event,trigger,player){
            await player.give(event.cards,event.targets[0]);
            await player.useCard({name:'sha',isCard:true},event.targets[0],false).set('oncard',card=>{
                _status.event.directHit.addArray(game.players);
            });
        },
        ai:{
            order:10,
            result:{
                player:10,
                target(player,target){
                    return get.effect(target,{name:'sha'},player,player)>0?-1:0;
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3101; original skill djcyangwei
'djcyangwei':{//扬威 锁定技，当你对其他角色造成伤害，或受到其他角色造成的伤害后，若其手牌数不大于你，你与其各摸一张牌，否则你将手牌数摸至与其相同并令此技能本回合失效。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
            player:'damageEnd',
        },
        filter(event,player,name){
            if(name=='damageSource')return event.player!=player;
            return event.source!=player;
        },
        forced:true,
        async content(event,trigger,player){
            let target=trigger.player==player?trigger.source:trigger.player;
            if(target.countCards('hs')<=player.countCards('hs'))await game.asyncDraw([player,target]);
            else{
                await player.drawTo(target.countCards('hs'))
                await player.tempBanSkill(event.name);
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:263; original skill djcjianshu
'djcjianshu':{//间书 一名角色的准备阶段，你可以展示一张【杀】，并令其视为使用一张与此【杀】属性相同的【杀】。若如此做，本回合的结束阶段，你可以视为使用其本回合使用过的一张基本牌或普通锦囊牌使用。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'phaseZhunbeiBegin',
        },
        logTarget:'player',
        filter(event,player,name){
            return player.countCards('hs',{name:'sha'});
        },
        check(event,player){
            return get.attitude(player,event.player)>0;
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard('hs',get.prompt(event.skill),'展示一张【杀】，并令'+get.translation(trigger.player)+'视为使用之',(card,player)=>{
                return card.name=='sha';
            }).set('ai',(card)=>{
                const player=get.player();
                if(get.attitude(player,trigger.player)>0)return game.hasPlayer(target=>{
                    return trigger.player.canUse({name:'sha',isCard:true,nature:card.nature},target,true,true);
                });
                return!game.hasPlayer(target=>{
                    return get.attitude(player,target)>0&&trigger.player.canUse({name:'sha',nature:card.nature},target,true,true);
                });
            }).forResult();
        },
        async content(event,trigger,player){
            await player.showCards(event.cards[0],get.skillTranslation(event.name));
            if(game.hasPlayer((target)=>{
                return trigger.player.canUse({name:event.cards[0].name,nature:event.cards[0].nature},target);
            }))await trigger.player.chooseUseTarget({name:event.cards[0].name,isCard:true,nature:event.cards[0].nature},true,false);
            trigger.player.when({player:'phaseJieshuBegin'}).then(()=>{
                if(play.isIn()){
                    let list=[];
                    player.getHistory('useCard',evt=>{
                        if((get.type(evt.card)=='trick'||get.type(evt.card)=='basic')&&game.hasPlayer(target=>{
                            return play.canUse(evt.card,target,false);
                        })){
                            let bool=true;
                            let obj={name:evt.card.name,nature:evt.card.nature};
                            for(let key of list){
                                if(JSON.stringify(obj)===JSON.stringify(key)){
                                    bool=false;
                                    break;
                                };
                            };
                            if(bool)list.push(obj);
                        };
                    });
                    if(list.length)play.chooseButton([get.skillTranslation(skill),'视为使用以下一张牌',[list,'vcard']]).set('ai',(button)=>{
                        const player=get.player();
                        if(player.countCards('hs',{name:'sha'})>1)return player.getUseValue(button.link)||1;
                        return 0;
                    });
                };
            }).then(()=>{
                if(result.bool){
                    play.chooseUseTarget({name:result.links[0].name,nature:result.links[0].nature},true);
                    play.logSkill(skill);
                };
            }).vars({play:player,skill:event.name});
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:325; original skill djcweimu
'djcweimu':{//帷幕 锁定技，其他角色于回合内使用的第一张牌无法指定你为目标。
        audio:'ext:点绛唇/audio/skill:2',
        init:(player,skill)=>{
            if(game.online)return;
            if(game.phaseNumber==0){
                player.unmarkSkill('djcweimu');
                player.addTempSkill('djcweimu_Void','phaseBefore');
            }else if(_status.currentPhase&&_status.currentPhase!=player&&_status.currentPhase.hasHistory('useCard',()=>true)){
                player.addTempSkill('djcweimu_Void');
                player.unmarkSkill('djcweimu');
            }else player.markSkill('djcweimu');
        },
        trigger:{
            global:'useCard1',
        },
        intro:{
            content(storage,player,skill){
                if(player==_status.currentPhase||!_status.currentPhase)return '无效果';
                let name=get.translation(_status.currentPhase);
                return '不能成为'+name+'使用牌的目标';
            },
        },
        forced:true,
        filter(event,player,name){
            return event.player==_status.currentPhase&&!player.hasSkill('djcweimu_Void')&&event.player!=player;
        },
        async content(event,trigger,player){
            player.addTempSkill('djcweimu_Void');
            player.unmarkSkill('djcweimu');
        },
        mod:{
            targetEnabled(card,player,target){
                if(player!=target&&player==_status.currentPhase&&!target.hasSkill('djcweimu_Void'))return false;
            },
        },
        subSkill:{
            'Void':{
                charlotte:true,
                onremove:(player)=>{
                    if(game.online)return;
                    player.markSkill('djcweimu');
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3754; original skill djcjuece
'djcjuece':{//绝策 出牌阶段限一次，你可以指定一个不为【杀】的牌名，并销毁弃牌堆，场上，其他角色手牌中所有牌名与此牌名相同的牌，然后你将等量张【杀】添加至牌堆底。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        direct:true,
        filter(event,player,name){
            return !player.hasSkill('djcjuece_block');
        },
        async content(event,trigger,player){
            let list=[];
            for(let name of lib.inpile){
                if(name!='sha')list.push(name);
            };
            const{result:{bool,links}}=await player.chooseButton([get.skillTranslation(event.name),'选择你要移除的牌名',[list,'vcard']]).set('ai',(button)=>{
                const player=get.player();
                return 5-player.getUseValue(button.link)||1;
            }).set('complexSelect',true);
            if(bool){
                player.logSkill(event.name);
                player.addTempSkill(event.name+'_block');
                let removeCards=[];
                const cards=['discardPile'].map(pos=>Array.from(ui[pos].childNodes)).flat();
                const filter=card=>card.name==links[0][2];
                const cardx=cards.filter(filter);
                if(cardx.length){
                    await game.cardsGotoSpecial(cardx);
                    game.log(cardx,'被移出了游戏');
                    removeCards.addArray(cardx);
                }
                for(const target of game.filterPlayer()){
                    if(target==player)continue;
                    const sishis=target.getCards('hej',filter);
                    if(sishis.length){
                        target.$throw(sishis);
                        game.log(sishis,'被移出了游戏');
                        await target.lose(sishis,ui.special);
                        removeCards.addArray(sishis);
                    };
                }
                var cardsx=[];
                for(let card of removeCards){
                    cardsx.push(game.createCard2('sha',['spade','club','diamond','heart'].randomGet(),Math.floor(Math.random()*13)+1));
                };
                if(cardsx.length){
                    await game.cardsGotoPile(cardsx);
                    game.log(player,'将#y',cardsx.length,'张【杀】置于了牌堆底');
                };
            };
        },
        subSkill:{
            'block':{
                charlotte:true,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3808; original skill djcfencheng
'djcfencheng':{//焚城 结束阶段，你可以对本回合不因使用失去过牌的所有角色造成1点火属性伤害。然后你可以弃置X张牌令此效果额外结算一次（X为以此法受到伤害的角色数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseJieshuBegin',
        },
        logTarget(event,player){
            return game.filterPlayer(target=>{
                return target.getHistory('lose',evt=>{
                    return evt.cards2&&evt.cards2.length>0&&evt.getParent().name!=='useCard';
                }).length>0
            });
        },
        prompt2(event,player){
            const num=game.filterPlayer(target=>{
                return target.getHistory('lose',evt=>{
                    return evt.cards2&&evt.cards2.length>0&&evt.getParent().name!=='useCard';
                }).length>0
            }).length;
            return '对这些角色造成1点火属性伤害，然后你可以弃置'+num+'张牌再次对本回合不因使用失去过牌的所有角色造成1点火属性伤害';
        },
        filter(event,player,name){
            return game.hasPlayer(target=>{
                return target.getHistory('lose',evt=>{
                    return evt.cards2&&evt.cards2.length>0&&evt.getParent().name!=='useCard';
                }).length>0
            });
        },
        async content(event,trigger,player){
            if(event.targets){
                for(const target of event.targets){
                    await target.damage('fire');
                };
                if(player.countCards('hes')>=event.targets.length){
                    const {result:{bool,cards}}=await player.chooseToDiscard('hes',event.targets.length,get.prompt(event.name)).set('prompt2','弃置'+event.targets.length+'张牌，然后对本回合不因使用失去过牌的所有角色造成1点火属性伤害');
                    if(bool){
                        let targetss=game.filterPlayer((target)=>{
                            return target.getHistory('lose',evt=>{
                                return evt.cards2&&evt.cards2.length>0&&evt.getParent().name!=='useCard';
                            }).length>0
                        });
                        for(const target of targetss){
                            await target.damage('fire');
                        };
                    };
                };
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3856; original skill djcfuzhen
'djcfuzhen':{//伏鸩 限定技，每轮结束时，你可以展示牌堆底的一张牌，若此牌为【杀】，你使用之并令你的下家执行包括此句的〖伏鸩〗。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'roundEnd',
        },
        limited:true,
        skillAnimation:true,
        animationColor:'orange',
        async content(event,trigger,player){
            player.awakenSkill(event.name);
            let target=player;
            let card;
            do{
                card=get.bottomCards()[0];
                game.cardsGotoOrdering(card);
                target.showCards(card);
                if(card.name=='sha')await target.chooseUseTarget(card,true,false);
                target=target.getNext();
            }while(card.name=='sha');
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2456; original skill djcshangchen
'djcshangchen':{//上陈 回合结束时，你可以令一名体力值不小于你的其他角色执行一个额外的阶段并记录之（准备阶段和结束阶段除外）。若如此做，其下个回合结束后，你进行一个依次执行所有记录过阶段的回合。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseJieshuAfter',
        },
        async cost(event,trigger,player){
            event.result=await player.chooseTarget(get.prompt(event.skill),'令一名体力值不小于你的其他角色执行一个额外阶段并记录之',(card,player,target)=>{
                return target!=player&&target.hp>=player.hp;
            }).set('ai',(target)=>{
                const player=get.player();
                if(target.countCards('hs')-target.getHandcardLimit()>4)return-get.attitude(player,target);
                return get.attitude(player,target);
            }).forResult();
        },
        async content(event,trigger,player){
        game.log(event.targets)
            let target=event.targets[0];
            let map={};
            let list=['phaseJudge','phaseDraw','phaseUse','phaseDiscard'];
            let choose=[];
            for(let phase of list){
                let cn=get.translation(phase);
                map[cn]=phase;
                choose.push(cn);
            };
            const {result}=await player.chooseButton(['〖'+get.skillTranslation(event.name)+'〗:选择令'+get.translation(target)+'执行的阶段',[choose,'tdnodes']],1,true).set('ai',(button)=>{
                const player=get.player();
                if(get.attitude(player,target)>=0){
                    if(target.countCards('hs')<=2&&button.link=='摸牌阶段')return 2;
                    else if(button.link=='出牌阶段')return 2;
                    return 1;
                }else if(button.link=='弃牌阶段')return 2;
                return 1;
            });
            if(result.bool){
                player.addSkill(event.name+'_use');
                player.storage[event.name+'_use'].push(map[result.links[0]]);
                player.markSkill(event.name+'_use');
                let next=target[map[result.links[0]]]();
                event.next.remove(next);
                trigger.next.push(next);
                target.when({player:'phaseAfter'}).then(()=>{
                    if(playerx.isAlive()&&playerx.storage[skill]){
                        playerx.insertPhase().set('phaseList',playerx.storage[skill]);
                    };
                }).vars({playerx:player,skill:event.name+'_use'});
            };
        },
        subSkill:{
            'use':{
                charlotte:true,
                mark:true,
                intro:{
                    name:'已记录的阶段',
                    content(storage,player){
                        return get.translation(storage);
                    },
                    markcount(){
                        return 0;
                    },
                },
                init(player,skill){
                    player.storage[skill]=[];
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2526; original skill djckanluan
'djckanluan':{//堪乱 每阶段限一次，你可以视为使用或打出一张本阶段被使用过的或本回合未被使用过的基本牌，然后你获得一张♠A【毒】。
        audio:'ext:点绛唇/audio/skill:2',
        enable:['chooseToUse','chooseToRespond'],
        onChooseToUse(event){
            const phase=event.getParent('phase');
            if(!phase.phaseList)return;
            let phaseName=false;
            for(let i of phase.phaseList){
                if(event.getParent(i.split('|')[0]).player){
                    phaseName=event.getParent(i.split('|')[0]);
                    break;
                };
            };
            if(!phaseName)return;
            const PhaseHistory=game.getGlobalHistory('everything',(evt)=>['useCard','respond'].includes(evt.name));
            let vcard=lib.inpile.filter((name)=>get.type(name)=='basic');
            vcard=vcard.filter((name)=>{
                if(!PhaseHistory.some((evt)=>evt.card.name==name))return true;
                if(PhaseHistory.some((evt)=>{
                    if(evt.getParent(phaseName.name)!=phaseName)return false;
                    if(evt.card.name==name)return true;
                }))return true;
                return false;
            });
            event.set('djckanluan',vcard);
        },
        onChooseToRespond(event){
            const phase=event.getParent('phase');
            if(!phase.phaseList)return;
            let phaseName=false;
            for(let i of phase.phaseList){
                if(event.getParent(i.split('|')[0]).player){
                    phaseName=event.getParent(i.split('|')[0]);
                    break;
                };
            };
            if(!phaseName)return;
            const PhaseHistory=game.getGlobalHistory('everything',(evt)=>['useCard','respond'].includes(evt.name));
            let vcard=lib.inpile.filter((name)=>get.type(name)=='basic');
            vcard=vcard.filter((name)=>{
                if(!PhaseHistory.some((evt)=>evt.card.name==name))return true;
                if(PhaseHistory.some((evt)=>{
                    if(evt.getParent(phaseName.name)!=phaseName)return false;
                    if(evt.card.name==name)return true;
                }))return true;
                return false;
            });
            event.set('djckanluan',vcard);
        },
        filter(event,player){
            if(player.hasSkill('djckanluan_used'))return false;
            const vcard=event?.djckanluan||[];
            for(let name of vcard){
                if(name=='sha'){
                    for(let nature of lib.inpile_nature){
                        if(event.filterCard(get.autoViewAs({name:name,nature:nature,isCard:true}),player,event))return true;
                    };
                };
                if(event.filterCard(get.autoViewAs({name:name,isCard:true}),player,event))return true;
            };
            return false;
        },
        chooseButton:{
            dialog(event,player){
                const vcard=event.djckanluan;
                let list=[];
                for(let name of vcard){
                    if(event.filterCard(get.autoViewAs({name:name,isCard:true}),player,event))list.push([get.type2(name),'',name]);
                    if(name=='sha'){
                        for(let nature of lib.inpile_nature){
                            if(event.filterCard(get.autoViewAs({name:name,nature:nature,isCard:true}),player,event))list.push([get.type2(name),'',name,nature]);
                        };
                    };
                };
                return ui.create.dialog('堪乱',[list,'vcard']);
            },
            check(button){
                if(_status.event.getParent().type!='phase')return 1;
                const player=get.player();
                if(['wugu','zhulu_card','yiyi','lulitongxin','lianjunshengyan','diaohulishan'].includes(button.link[2]))return 0;
                return player.getUseValue({
                    name:button.link[2],
                    nature:button.link[3],
                });
            },
            backup(links,player){
                return {
                    filterCard:()=>false,
                    selectCard:-1,
                    audio:'djckanluan',
                    popname:true,
                    viewAs:{
                        name:links[0][2],
                        nature:links[0][3],
                    },
                    precontent(){
                        player.addTempSkill('djckanluan_used','phaseChange');
                        player.when(['useCardEnd','respondEnd']).filter((evt)=>evt.skill=='djckanluan_backup').then(()=>{
                            player.gain(game.createCard('du','spade',1),'gain2');
                        }).translation('堪乱').popup(false);
                    },
                };
            },
            prompt(links,player){
            return '选择'+(get.translation(links[0][3])||'')+get.translation(links[0][2])+'的目标';
            },
        },
        hiddenCard(player,name){
            if(!lib.inpile.includes(name))return false;
            let type=get.type2(name);
            return type=='basic';
        },
        subSkill:{
            'backup':{
            },
            'used':{
                charlotte:true,
                mark:true,
                intro:{
                    content:'本阶段已发动',
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2650; original skill djczhengnian
'djczhengnian':{//正念 当你使用基本牌指定目标后，你可以弃置至多X张♠牌，并令此牌基础数值增加等量值（X为你已损失的体力值，且至少为1）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardToPlayered',
        },
        filter(event,player,name){
            return get.type(event.card)=='basic';
        },
        async cost(event,trigger,player){
            const num=Math.max(player.getDamagedHp(),1)
            event.result=await player.chooseCard('hs',[1,num],get.prompt(event.skill),'弃置至多'+num+'张黑桃手牌并令'+get.translation(trigger.card)+'的基础数值增加等量值',(card,player)=>{
                return get.suit(card)=='spade';
            }).set('ai',(card)=>{
                return 6-get.useful(card);
            }).forResult();
        },
        async content(event,trigger,player){
            await player.discard(event.cards);
            trigger.getParent().baseDamage+=event.cards.length;
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:997; original skill djchuaji
'djchuaji':{//画戟 出牌阶段限一次，你可以与一名其他角色同时弃置至少一张手牌。然后你与其之中手牌数少的一方视为对另一方使用一张【杀】。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        usable:1,
        filter(event,player,name){
            if(!player.countDiscardableCards(player,'hs'))return false;
            return game.hasPlayer(target=>get.info('djchuaji').filterTarget(null,player,target));
        },
        filterTarget(card,player,target){
            return target!=player&&target.countCards('hs');
        },
        async content(event,trigger,player){
            const target=event.targets[0];
            event.list=[player];
            event.cards0=[];
            event.cards1=[];
            if(target.countDiscardableCards(target,'hs')>0){
                event.list.push(target);
            };
            if(!event.isMine()&&!event.isOnline())game.delayx();
            const result=await player.chooseCardOL(event.list,'hs',true,[1,Infinity],`${get.skillTranslation(event.name)}：弃置至少一张手牌，然后若你的手牌数小于对方，你视为对其使用【杀】`,(card,player,target)=>{
                    return lib.filter.cardDiscardable(card,player,'djchuaji');
                }).set('ai',card=>{
                    let evt=_status.event.getParent(2);
                    let source=evt.player;
                    let player=get.player();
                    let target=evt.list[1];
                    if(!target)return-player.getUseValue(card);
                    if(player==source){
                        let total=0;
                        let need=0;
                        target.countCards('hs',card=>{
                            if(lib.filter.cardDiscardable(card,target,'djchuaji')&&get.useful(card)<5)need+=target.countCards('hes');
                        });
                        total+=ui.selected.cards.length;
                        if(total>=need||player.countCards('hs')-(ui.selected.cards.filter(i=>get.position(i)=='h').length)<need)return 0;
                        let val=6;
                        if(target.hp<=2&&get.effect(target,{name:'sha',isCard:true},source,target)>0)val+=2;
                        if(player.hasSkill('djcfeijiang')&&player.canUse({name:'sha'},target,true,false))val+=1.5;
                        if(target.countCards('hes',card=>get.value(card)<5)>=3)val-=3;
                        return val-player.getUseValue(card);
                    };
                    if(ui.selected.cards.length>1&&player.countCards('hs')-(ui.selected.cards.filter(i=>get.position(i)=='h').length)<=source.countCards('hs')-(target.countDiscardableCards(player,'e')?1:2))return 0;
                    if(player.getHp()+player.countCards('hs',card=>player.canSaveCard(card,player))<=1&&get.effect(target,{name:'sha',isCard:true},source,target)<0)return 10-get.value(card);
                    return 5-get.value(card);
                }).forResult();
            let lose_list=[];
            let cards=[];
            for(let i=0;i<result.length;i++){
                let target=event.list[i];
                let cards2=result[i].cards;
                cards.push(cards2);
                event['cards'+i]=cards2;
                event.cards=cards;
                lose_list.push([target,cards2]);
            };
            await game.loseAsync({lose_list:lose_list}).setContent('discardMultiple');
            if(player.countCards('hs')==target.countCards('hs'))return;
            const useCardToPlayer=player.countCards('hs')>target.countCards('hs')?target:player;
            const useCardToTarget=player.countCards('hs')>target.countCards('hs')?player:target;
            await useCardToPlayer.useCard({name:'sha',isCard:true},useCardToTarget,false);
        },
        ai:{
            order(){
                const player=get.player();
                if(!player.countCards('hs',card=>get.tag(card,'multitarget')||get.type2(card)=='trick'))return 4.01;
                if(player.countCards('hs',{name:'shan'})>1)return 3;
                return 2;
            },
            result:{
                target(player,target){
                    if(player.countCards('hs',card=>{
                        return player.hasUseTarget(card)&&get.tag(card,'multitarget');
                    }))return 0;
                    let eff=0;
                    if(player.needsToDiscard())eff-=player.needsToDiscard();
                    if(get.effect(player,{name:'sha',isCard:true},target,player)>=0)eff-=1;
                    return-target.countCards('hs')-player.countCards('hs');
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1079; original skill djcfeijiang
'djcfeijiang':{//飞将 锁定技，当你使用牌指定唯一目标后，你将手牌数摸/弃至与其相同。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardToPlayered',
        },
        forced:true,
        filter(event,player,name){
            return event.targets.length==1&&player.countCards('hs')!=event.target.countCards('hs');
        },
        async content(event,trigger,player){
            const target=trigger.target;
            if(target.countCards('hs')>=player.countCards('hs')){
                await player.drawTo(target.countCards('hs'));
            }else if(player.countCards('hs')){
                await player.chooseToDiscard('hs',true,player.countCards('hs')-target.countCards('hs'));
            };
        },
        mod:{
            aiOrder(player,card,num){
                if(player.isMinHp())return;
                if(!get.tag(card,'multitarget')){
                    return num/5;
                };
                if(get.type(card)==='equip')return num+5;
            },
        },
        ai:{
            pretao:true,
            nokeep:true,
            halfneg:true,
            effect:{
                player(card,player,target){
                    if((!card.isCard||!card.cards)&&get.itemtype(card)!='card')return;
                    if(!target||player==target||player.countCards('hs')==target.countCards('hs'))return;
                    let targets=[];
                    let evt=_status.event.getParent('useCard');
                    targets.addArray(ui.selected.targets);
                    if(evt&&evt.card==card)targets.addArray(evt.targets);
                    if(targets.length>1)return;
                    let info=get.info(card);
                    if(!info||info.notarget||!info.filterTarget)return;
                    let range;
                    let select=get.copy(info.selectTarget);
                    let filter;
                    if(select===undefined)range=[1,1];
                    else if(typeof select==='number')range=[select,select];
                    else if(get.itemtype(select)==='select')range=select;
                    else if(typeof select==='function')range=select(card,player);
                    if(info.singleCard)range=[1,1];
                    game.checkMod(card,player,range,'selectTarget',player);
                    if(range[1]<-1)range=[1,1];
                    else if(range[0]<0){
                        if(info.filterTarget===true)filter=game.players.length;
                        else filter=game.countPlayer(target=>{
                            return info.filterTarget(card,player,target);
                        });
                        range=[filter,filter];
                    };
                    if(range&&range[0]>1&&range[1]>1)return 1.01;
                    let dif=target.countCards('hs')-player.countCards('hs');
                    if(dif>0)return [1,dif*0.3];
                    return [1,dif*0.1];
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1550; original skill djcposhi
'djcposhi':{//破势 当你使用伤害牌指定目标后，你可以用一张手牌与所有目标拼点，并依次结算拼点结果。若你没赢：此牌对其造成的伤害+1。若其没赢：你令其不可响应此牌且此牌不计入出牌阶段使用次数限制。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardToPlayered',
        },
        filter(event,player,name){
            if(event.getParent().triggeredTargets3.length>1)return false;
            let bool=false;
            for(let target of event.targets){
                if(player.canCompare(target))bool=true;
            };
            if(!bool)return false;
            return get.tag(event.card,'damage')>=1;
        },
        content(){
            let targets=[];
            for(let target of trigger.targets){
                if(player.canCompare(target))targets.push(target);
            };
            player.chooseToCompare(targets).callback=lib.skill[event.name].callback;
        },
        callback(){
            let trigger=event.getParent(5);
            if(event.winner!=player){
                target.addTempSkill('djcposhi_adddamage');
                lib.skill['djcposhi_adddamage'].addCardDamage(target,trigger.card);
            };
            if(event.winner!=target){
                event.getParent(6).directHit.addArray([target]);
                if(trigger.addCount!==false){
                    trigger.addCount=false;
                    player.getStat().card[trigger.card.name]--;
                };
            };
        },
        subSkill:{
            'adddamage':{
                trigger:{
                    player:'damageBegin3',
                },
                filter(event,player,name){
                    const info=player.storage.djcposhi_adddamage;
                    if(!event.card||!Array.isArray(info))return false;
                    for(let obj of info){
                        if(obj.card===event.card)return true;
                    };
                    return false;
                },
                onremove:true,
                silent:true,
                popup:false,
                forced:true,
                charlotte:true,
                async content(event,trigger,player){
                    let num=0;
                    for(let obj of player.storage.djcposhi_adddamage){
                        if(obj.card===trigger.card){
                            num=obj.num;
                            break;
                        };
                    };
                    trigger.num+=num;
                },
                addCardDamage(target,card,num=1){
                    if(!target.storage.djcposhi_adddamage)target.storage.djcposhi_adddamage=[];
                    let find;
                    for(let obj of target.storage.djcposhi_adddamage){
                        if(obj.card===card){
                            obj.num+=num;
                            find=true;
                            break;
                        };
                    };
                    if(!find)target.storage.djcposhi_adddamage.push({card,num:1});
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1628; original skill djcjiaozi
'djcjiaozi':{//骄姿 锁定技，当你的拼点牌亮出后，你令你的点数+[0]。你参与的拼点结算后，若你赢/没赢，你令[]中的数值-1/+1。你对手牌数不小于你的角色造成伤害后，你摸X张牌并重置〖骄姿〗（X为[]内数字的绝对值）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
            player:['compare','compareMultipleAfter'],
        },
        mark:true,
        forced:true,
        init(player,skill){
            player.storage[skill]=0;
        },
        intro:{
            content(storage,player){
                if(storage<0)return '拼点牌点数'+storage;
                return '拼点牌点数+'+storage;
            },
        },
        filter(event,player,name){
            if(name=='damageSource')return event.player.countCards('hs')>=player.countCards('hs');
            return true;
        },
        async content(event,trigger,player){
            if(!player.storage[event.name])player.storage[event.name]=0;
            let num=player.storage[event.name];
            switch(event.triggername){
                case 'damageSource':
                    let drawNum=num<0?-num:num;
                    await player.draw(drawNum);
                    player.storage[event.name]=0;
                    game.log(player,'重置了',event.name,'记录');
                    break;
                case 'compare':
                    let cardNum=trigger.num1;
                    if(cardNum+num>13)num=13-cardNum;
                    if(cardNum+num<1)num=cardNum-1;
                    trigger.num1+=num;
                    let str='的拼点牌点数';
                    game.log(player,str,(num>=0?'+':''),num);
                    player.popup((num>=0?'+':'')+num);
                    break;
                default:
                    if(player==trigger.player){
                        if(trigger.num1>trigger.num2){
                            player.storage[event.name]--;
                            game.log(player,event.name,'记录-1');
                        }else{
                            player.storage[event.name]++;
                            game.log(player,event.name,'记录+1');
                        };
                    }else{
                        if(trigger.num1<trigger.num2){
                            player.storage[event.name]++;
                            game.log(player,event.name,'记录+1');
                        }
                        else{
                            player.storage[event.name]--;
                            game.log(player,event.name,'记录-1');
                        };
                    };
                    break;
            };
            player.markSkill(event.name);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:684; original skill djcxiongwei
'djcxiongwei':{//凶威 你使用牌对一名角色造成伤害后，若其没有“暴戾”，你可以将此牌置于其武将牌上，称之为“暴戾”，否则你获得其武将牌上的一张“暴戾”，并令其回复1点体力。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
        },
        direct:true,
        filter(event,player,name){
            if(!event.player.isIn()||!event.cards||get.itemtype(event.cards)!='cards'||get.position(event.card,true)!='o')return false;
            return event.player.getExpansions('djcxiongwei_use').length>0||event.cards.length&&get.position(event.cards[0],true)=='o';
        },
        check(event,player){
            return get.attitude(player,event.player)<=0;
        },
        async content(event,trigger,player){
            if(trigger.player.getExpansions(event.name+'_use').length>0){
                player.logSkill(event.name,trigger.player);
                let cards;
                if(trigger.player.getExpansions(event.name+'_use').length==1){
                    cards=trigger.player.getExpansions(event.name+'_use');
                    await player.gain(cards,'gain2');
                }else{
                    const {result}=await player.chooseButton([get.skillTranslation(event.name),'选择获得一张“暴戾”',trigger.player.getExpansions(event.name+'_use')],true).set('ai',(button)=>{
                        const player=get.player();
                        return player.getUseValue(button.link)||1;
                    });
                    if(result.bool){
                        cards=result.links[0];
                        await player.gain(cards,'gain2');
                    };
                };
                await trigger.player.recover();
            }else{
                const {result}=await player.chooseBool((get.prompt(event.name)),'将'+get.translation(trigger.cards)+'置于'+get.translation(trigger.player)+'的武将牌上');
                if(result.bool){
                    player.logSkill(event.name,trigger.player);
                    game.log(player,'将',trigger.cards,'放在了',trigger.player,'的武将牌上');
                    await trigger.player.addToExpansion(trigger.cards,'gain2').set('gaintag',[event.name+'_use']);
                };
            };
        },
        subSkill:{
            'use':{
                marktext:'暴戾',
                intro:{
                    name:'暴戾',
                    mark(dialog,storage,player){
                        let cards=player.getExpansions('djcxiongwei_use');
                        dialog.addAuto(cards);
                    },
                    markcount:'expansion',
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:738; original skill djcranye
'djcranye':{//燃业 锁定技，你使用牌对有“暴戾”的角色造成伤害+1。有“暴戾”的角色无法响应你使用的牌。你使用【杀】的额定次数+X（X为场上有“暴戾”的角色数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageBegin2',
            player:'useCard',
        },
        forced:true,
        filter(event,player,name){
            if(name=='damageBegin2')return event.player.getExpansions('djcxiongwei_use').length>0&&event.cards;
            return event.card&&(get.type(event.card)=='trick'||(get.type(event.card)=='basic'&&!['shan','tao','jiu','du'].includes(event.card.name)))&&game.hasPlayer(target=>{
                return target.getExpansions('djcxiongwei_use').length>0;
            });
        },
        async content(event,trigger,player){
            if(event.triggername=='damageBegin2')trigger.num++;
            else trigger.directHit.addArray(game.filterPlayer(target=>{
                return target.getExpansions('djcxiongwei_use').length>0;
            }));
        },
        mod:{
            cardUsable(card,player,num){
                if(card.name=='sha')return num+(game.filterPlayer(target=>{
                    return target.getExpansions('djcxiongwei_use').length>0;
                }).length);
            },
        },
        ai:{
            'directHit_ai':true,
            skillTagFilter(player,tag,arg){
                return arg.target.getExpansions('djcxiongwei_use').length>0;
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:771; original skill djcliyan
'djcliyan':{//戾延 每回合限一次，一名角色进入濒死状态时，你可以令其回复1点体力，并令当前回合角色摸两张牌。一名角色脱离濒死状态后，你可以视为对其使用一张【杀】，并令当前回合角色本回合非锁定技失效。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:['dying','dyingAfter'],
        },
        usable:1,
        filter(event,player,name){
            return event.player.isIn();
        },
        logTarget:'player',
        prompt2(event,player,name){
            return name=='dying'?'令'+get.translation(event.player)+'回复1点体力，然后令当前回合角色摸两张牌':'视为对'+get.translation(event.player)+'使用一张【杀】，然后令当前回合角色本回合非锁定技失效';
        },
        check(event,player,name){
            if(name=='dying')return get.attitude(player,event.player)>0;
            return get.attitude(player,event.player)<=0;
        },
        async content(event,trigger,player){
            if(event.triggername=='dying'){
                await trigger.player.recover();
                if(_status.currentPhase)await _status.currentPhase.draw(2);
            }else{
                await player.useCard({name:'sha',isCard:true},trigger.player,false);
                if(_status.currentPhase)_status.currentPhase.addTempSkill('fengyin');
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1147; original skill djcjuao
'djcjuao':{//据傲 一名其他角色的出牌阶段开始时，你可以与其拼点，若你：赢，你获得其拼点牌并可以使用你的拼点牌；没赢，其视为对你使用一张计入次数限制的【杀】。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'phaseUseBegin',
        },
        filter(event,player,name){
            return player.countCards('hs')&&player.canCompare(event.player)&&event.player!=player;
        },
        check(event,player){
            return get.attitude(player,event.player)<0;
        },
        logTarget:'player',
        prompt2(event,player){
            return '与其拼点，若你：赢，你获得其拼点牌并可以使用你的拼点牌；没赢，其视为对你使用一张计入次数限制的【杀】';
        },
        async content(event,trigger,player){
            const {result}=await player.chooseToCompare(trigger.player);
            if(result.bool){
                let cards=[result.player,result.target].filterInD('d');
                await player.gain(cards[1],'gain2');
                if(player.hasUseTarget(cards[0]))await player.chooseUseTarget(cards[0],false);
            }else await trigger.player.useCard({name:'sha',isCard:true},player);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:1171; original skill djczikuang
'djczikuang':{//姿狂 当你进入濒死状态时，你可以展示牌堆顶的X张牌（X为你本轮手牌数发生过变化的阶段数）。你依次使用其中的伤害牌并获得其余牌中点数最大的一张牌。然后若你以此法使用的牌造成过伤害，你将体力值回复至1点。
        audio:'ext:点绛唇/audio/skill:2',
        intro:{
            content:'本轮已有#个阶段发生过手牌数变化',
        },
        trigger:{
            player:'dying',
        },
        prompt2(event,player,name){
            let evts=[];
            const historylose=player.getRoundHistory('lose'),historygain=player.getRoundHistory('gain');
            historylose.forEach((evt)=>{
                let evtx;
                if(lib.phaseName.some((name)=>{
                    if(evt.getParent(name).player!=undefined){
                        evtx=evt.getParent(name);
                        return true;
                    }else return false;
                })&&evt.hs&&evt.hs.length>=1&&!evts.includes(evt))evts.add(evtx);
            });
            historygain.forEach((evt)=>{
                let evtx;
                if(lib.phaseName.some((name)=>{
                    if(evt.getParent(name).player!=undefined){
                        evtx=evt.getParent(name);
                        return true;
                    }else return false;
                })&&!evts.includes(evt))evts.add(evtx);
            });
            const count=evts.length;
            return '展示牌堆顶的'+get.cnNumber(count)+'张牌并依次使用其中的伤害牌并获得其余牌中点数唯一最大的一张。然后若你以此法使用的牌造成过伤害，你将体力值回复至1点';
        },
        filter(event,player){
            const historylose=player.getRoundHistory('lose'),historygain=player.getRoundHistory('gain');
            return historylose.some((evt)=>{
                return lib.phaseName.some((name)=>evt.getParent(name).player!=undefined)&&evt.hs&&evt.hs.length>=1;
            })||historygain.some((evt)=>{
                return lib.phaseName.some((name)=>evt.getParent(name).player!=undefined);
            });
        },
        async content(event,trigger,player){
            let evts=[];
            const historylose=player.getRoundHistory('lose'),historygain=player.getRoundHistory('gain');
            historylose.forEach((evt)=>{
                let evtx;
                if(lib.phaseName.some((name)=>{
                    if(evt.getParent(name).player!=undefined){
                        evtx=evt.getParent(name);
                        return true;
                    }else return false;
                })&&evt.hs&&evt.hs.length>=1&&!evts.includes(evt))evts.add(evtx);
            });
            historygain.forEach((evt)=>{
                let evtx;
                if(lib.phaseName.some((name)=>{
                    if(evt.getParent(name).player!=undefined){
                        evtx=evt.getParent(name);
                        return true;
                    }else return false;
                })&&!evts.includes(evt))evts.add(evtx);
            });
            const count=evts.length;
            let cards=get.cards(count);
            await game.cardsGotoOrdering(cards);
            await player.showCards(cards,get.skillTranslation(event.name));
            cards.reverse();
            for(let i=0;i<cards.length;i++){
                let result={bool:false};
                const card=cards[i];
                if(get.tag(card,'damage')>=1&&player.hasUseTarget(card)){
                    result=await player.chooseUseTarget(card,true).forResult();
                };
                if(result.bool)cards.splice(i--,1);
            };
            if(cards.length){
                let maxNumber=Math.max(...cards.map(card=>get.number(card)));
                let cardx=cards.filter(card=>get.number(card)===maxNumber).randomGets(1);
                await player.gain(cardx,'gain2');
                await game.cardsGotoPile(cards.filter(card=>!cardx.includes(card)),'insert');
            };
            if(player.hasHistory('sourceDamage',(evt)=>evt.getParent(4)==event)&&player.hp<1){
                await player.recoverTo(1);
            };
        },
        group:['djczikuang_mark'],
        subSkill:{
            'mark':{
                trigger:{
                    global:'roundStart',
                    player:['loseAfter','gainAfter'],
                },
                silent:true,
                filter(event,player){
                    return event.name!='lose'||(event.hs&&event.hs.length>=1);
                },
                async content(event,trigger,player){
                    if(trigger.name=='roundStart'){
                        player.unmarkSkill(event.name.replace('_mark',''));
                        delete player.storage[event.name.replace('_mark','')];
                        return;
                    };
                    const old_count=player.storage[event.name.replace('_mark','')]||0;
                    let evts=[];
                    const historylose=player.getRoundHistory('lose'),historygain=player.getRoundHistory('gain');
                    historylose.forEach((evt)=>{
                        let evtx;
                        if(lib.phaseName.some((name)=>{
                            if(evt.getParent(name).player!=undefined){
                                evtx=evt.getParent(name);
                                return true;
                            }else return false;
                        })&&evt.hs&&evt.hs.length>=1&&!evts.includes(evt))evts.add(evtx);
                    });
                    historygain.forEach((evt)=>{
                        let evtx;
                        if(lib.phaseName.some((name)=>{
                            if(evt.getParent(name).player!=undefined){
                                evtx=evt.getParent(name);
                                return true;
                            }else return false;
                        })&&!evts.includes(evt))evts.add(evtx);
                    });
                    const count=evts.length;
                    if(count!=old_count){
                        player.storage[event.name.replace('_mark','')]=count;
                        player.markSkill(event.name.replace('_mark',''));
                    };
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3200; original skill djcjinghuan
'djcjinghuan':{//镜幻 锁定技，你的普通锦囊牌均视为【幻符】且不计入手牌上限。
        audio:'ext:点绛唇/audio/skill:1',
        trigger:{
            player:'phaseDiscardBegin',
        },
        derivation:['djchuanfu'],
        firstDo:true,
        forced:true,
        async content(event,trigger,player){
            trigger.audioed=true;
        },
        mod:{
            suit(card){
                const info=lib.card[card.name];
                if(get.position(card)!='h')return;
                if(info&&info.type=='trick')return 'none';
            },
            cardname(card,player){
                const info=lib.card[card.name];
                if(get.position(card)!='h')return;
                if(info&&info.type=='trick')return 'djchuanfu';
            },
            ignoredHandcard(card,player){
                if(get.name(card)=='djchuanfu')return true;
                if(get.type(card)=='trick')return true;
            },
            cardDiscardable(card,player,name){
                if(name=='phaseDiscard'&&get.name(card)=='djchuanfu')return false;
                if(name=='phaseDiscard'&&get.type(card)=='trick')return false;
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3232; original skill djcchanyuan
'djcchanyuan':{//缠怨 你使用牌结算后，你可以展示一张手牌，并为展示牌的额定目标额外添加此牌的目标为强制目标。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardAfter',
        },
        locked:false,
        filter(event,player){
            return event.targets?.length;
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard(get.prompt2(event.skill).replace('你使用牌结算后，你可以','').replace('此牌的目标',get.translation(trigger.targets))).set('ai',card=>{
                return 1+Math.random();
            }).forResult();
        },
        async content(event,trigger,player){
            await player.showCards(event.cards);
            const card=event.cards[0];
            const targets=trigger.targets;
            if(!card.storage.djcchanyuan)card.storage.djcchanyuan=[];
            card.storage.djcchanyuan.addArray(targets.map(i=>i.playerid));
            lib.skill.djcchanyuan.broadcast(card);
            game.log(player,'为',card,'的额定目标额外添加',targets,'为强制目标');
            const skill='djcchanyuan_effect';
            let tag=card.gaintag?.find(tag=>tag.startsWith(skill));
            if(tag)player.removeGaintag(tag,[card]);
            const targets2=game.filterPlayer(target=>{
                return card.storage.djcchanyuan.includes(target.playerid);
            });
            tag=`${skill}${get.translation(targets2)}`;
            if(!lib.skill[tag]){
                game.broadcastAll((tag,str)=>{
                    lib.skill[tag]={};
                    lib.translate[tag]=str;
                },tag,tag.slice(skill.length));
            }
            player.addGaintag([card],tag);
        },
        broadcast(card){
            game.broadcast((card,storage)=>{
                card.storage=storage;
            },card,card.storage);
        },
        mod:{
            targetEnabled(card,player,target){
                if(get.type(card,null,false)=='equip')return;
                if(!Array.isArray(card.storage?.djcchanyuan))return;
                if(card.storage?.djcchanyuan.includes(target.playerid))return true;
            },
            selectTarget(card,player,range){
                if(!range||range[1]==-1)return;
                if(!['basic','trick'].includes(get.type(card)))return;
                if(card.storage?.djcchanyuan){
                    range[1]+=card.storage?.djcchanyuan.length;
                }
            },
        },
        init(){
            lib.hooks['checkBegin'].push(function djcchanyuan(event){
                if(event.name!='chooseToUse')return;
                if(ui.selected.cards.length!=1)return;
                const card=ui.selected.cards[0];
                if(!['basic','trick'].includes(get.type(card)))return;
                if(card.storage?.djcchanyuan){
                    const targets=game.filterPlayer(target=>{
                        if(!card.storage.djcchanyuan.includes(target.playerid))return false;
                        return lib.filter.targetEnabled2(card,event.player,target);
                    });
                    ui.selected.targets.addArray(targets);
                    for(const target of targets){
                        ['selected','selectable'].forEach(className=>{
                            if(!target.classList.contains(className)){
                                target.classList.add(className);
                            }else{
                                target.classList.remove(className);
                            }
                        });
                    }
                }
            });
        },
        group:'djcchanyuan_use',
        onremove:['djcchanyuan_effect'],
        subSkill:{
            use:{
                trigger:{
                    player:'useCard2',
                },
                forced:true,
                locked:false,
                filter(event,player){
                    const{card}=event;
                    if(!card.storage?.djcchanyuan||!event.targets?.length)return false;
                    const info=get.info(card);
                    if(!['basic','trick'].includes(info.type))return false;
                    if(info.allowMultiple==false||info.multitarget)return false;
                    return game.hasPlayer(target=>{
                        if(!card.storage.djcchanyuan.includes(target.playerid))return false;
                        return !event.targets.includes(target)&&lib.filter.targetEnabled2(event.card,player,target);
                    });
                },
                async content(event,trigger,player){
                    const targets=game.filterPlayer(target=>{
                        if(!trigger.card.storage.djcchanyuan.includes(target.playerid))return false;
                        return !trigger.targets.includes(target)&&lib.filter.targetEnabled2(trigger.card,player,target);
                    });
                    trigger.targets.addArray(targets);
                    game.log(targets,'成为了',trigger.card,'的额外目标');
                },
            },
            effect:{
                onremove(player,skill){
                    let tags=player.getCards('hs',card=>card.gaintag?.some(tag=>tag.startsWith(skill)));
                    if(tags.length){
                        tags=tags.slice().map(card=>card.gaintag.find(tag=>tag.startsWith(skill))).unique();
                        tags.forEach(tag=>player.removeGaintag(tag));
                    }
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3352; original skill djcjuebian
'djcjuebian':{//谲变 你可以将一张本轮未以此法使用过的花色的牌当作任意额定目标与此牌完全相同的牌使用或打出。
        audio:'ext:点绛唇/audio/skill:2',
        enable:['chooseToUse','chooseToRespond'],
        filter(event,player){
            if(!player.countCards('hes',card=>!player.hasStorage('djcjuebian',get.suit(card,player))))return false;
            return get.info('djcjuebian').getVCards(event,player).length;
        },
        intro:{
            content:storage=>`已使用过花色：${get.translation(storage)}`,
        },
        chooseButton:{
            dialog(event,player){
                const list=get.info('djcjuebian').getVCards(event,player);
                return ui.create.dialog('谲变',[list,'vcard']);
            },
            filter(button,player){
                return _status.event.getParent().filterCard({name:button.link[2],nature:button.link[3]},player,_status.event.getParent());
            },
            check(button){
                if(_status.event.getParent().type!='phase')return 1;
                const player=_status.event.player;
                if(['wugu','zhulu_card','yiyi','lulitongxin','lianjunshengyan'].includes(button.link[2]))return 0;
                return player.getUseValue({
                    name:button.link[2],
                    nature:button.link[3],
                });
            },
            backup(links,player){
                return{
                    filterCard(card,player){
                        if(player.hasStorage('djcjuebian',get.suit(card,player)))return false;
                        const list1=get.info('djcjuebian').getTargets(card,player);
                        const cardx=get.copy(lib.skill.djcjuebian_backup.viewAs);
                        cardx.cards=[card];
                        const list2=get.info('djcjuebian').getTargets(cardx,player);
                        return list1.slice().removeArray(list2).length==0&&list2.slice().removeArray(list1).length==0&&get.info('djcjuebian').getNum(card,player)==get.info('djcjuebian').getNum(cardx,player);
                    },
                    popname:true,
                    check(card){
                        return 8-get.value(card);
                    },
                    position:'hes',
                    viewAs:{
                        name:links[0][2],
                        nature:links[0][3]
                    },
                    log:false,
                    async precontent(event,trigger,player){
                        player.logSkill('djcjuebian');
                        const suit=get.suit(event.result.cards[0]);
                        if(!lib.suit.includes(suit))return;
                        if(!player.storage.djcjuebian){
                            player.when({global:'roundStart'}).then(()=>{
                                delete player.storage.djcjuebian;
                            });
                        };
                        player.markAuto('djcjuebian',[suit]);
                    },
                };
            },
            prompt(links,player){
                return '将一张本轮未以此法使用过的花色的牌当作任意额定目标与'+(get.translation(links[0][3])||'')+get.translation(links[0][2])+'完全相同的牌当此牌使用或打出';
            },
        },
        getNum(card,player){
            var info=get.info(card,player);
            if(info?.selectTarget!=undefined){
                if(Array.isArray(info.selectTarget)){
                    if(info.selectTarget<0){
                        return game.filterPlayer(target=>{
                            if(card.storage?.djcchanyuan?.includes(target.playerid))return true;
                            return lib.filter.targetEnabled(card,player,target)&&lib.filter.targetInRange(card,player,target)
                        }).length;
                    }
                    const num=game.filterPlayer(target=>{
                        if(card.storage?.djcchanyuan?.includes(target.playerid))return true;
                        return lib.filter.targetEnabled(card,player,target)&&lib.filter.targetInRange(card,player,target)
                    }).length;
                    return Math.min(num,info.selectTarget[1]);
                }else{
                    if(info.selectTarget<0){
                        return game.filterPlayer(target=>{
                            if(card.storage?.djcchanyuan?.includes(target.playerid))return true;
                            return lib.filter.targetEnabled(card,player,target)&&lib.filter.targetInRange(card,player,target)
                        }).length;
                    }
                    const num=game.filterPlayer(target=>{
                        if(card.storage?.djcchanyuan?.includes(target.playerid))return true;
                        return lib.filter.targetEnabled(card,player,target)&&lib.filter.targetInRange(card,player,target)
                    }).length;
                    return Math.min(num,info.selectTarget);
                }
            }
            return game
                .filterPlayer(target=>{
                    return card.storage?.djcchanyuan?.includes(target.playerid);
                })
                .length;
        },
        getNumber(card,player){
            var rangex=null;
            var info=get.info(card);
            if(!info)return null;
            if(info.notarget)return null;
            if(info.selectTarget!=undefined){
                var select=get.select(info.selectTarget);
                if(select[0]<0){
                    if(!info.toself){
                        var count=game.countPlayer(target=>{
                            return lib.filter.targetEnabled(card,player,target);
                        });
                    }else count=1;
                    rangex=[count,count];
                }else rangex=select;
            }return rangex;
        },
        getTargets(card,player){
            var info=get.info(card,player);
            if(info?.selectTarget!=undefined){
                return game.filterPlayer(target=>{
                    if(card.storage?.djcchanyuan?.includes(target.playerid))return true;
                    return lib.filter.targetEnabled(card,player,target)&&lib.filter.targetInRange(card,player,target);
                });
            }
            return game.filterPlayer(target=>{
                return card.storage?.djcchanyuan?.includes(target.playerid);
            });
        },
        getVCards(event,player){
            return get.inpileVCardList(info=>{
                if(!['basic','trick','delay'].includes(info[0]))return false;
                const name=info[2],
                    nature=info[3],
                    infox=get.info({name:name});
                if(!infox)return false;
                if(!player.hasCard(card=>{
                    if(player.hasStorage('djcjuebian',get.suit(card,player)))return false;
                    const list1=get.info('djcjuebian').getTargets(card,player);
                    const cardx={name:name,nature:nature};
                    cardx.cards=[card];
                    const list2=get.info('djcjuebian').getTargets(cardx,player);
                    return list1.slice().removeArray(list2).length==0&&
                        list2.slice().removeArray(list1).length==0&&get.info('djcjuebian').getNum(card,player)==get.info('djcjuebian').getNum(cardx,player);
                },'hes'))return false;
                return event.filterCard(get.autoViewAs({name:name,nature:nature},'unsure'),player,event);
            });
        },
        hiddenCard(player,name){
            if(!player.countCards('hes',card=>!player.hasStorage('djcjuebian',get.suit(card,player))))return false;
            var type=get.type2(name);
            return lib.inpile.includes(name)&&['basic','trick'].includes(type);
        },
        ai:{
            respondSha:true,
            respondShan:true,
            skillTagFilter(player,tag,arg){
                const name=tag=='respondSha'?'sha':'shan';
                return get.info('djcjuebian').hiddenCard(player,name);
            },
            order:6,
            result:{
                player(player){
                    if(_status.event.dying)return get.attitude(player,_status.event.dying);
                    return 1;
                },
            },
        },
        subSkill:{
            backup:{},
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2070; original skill djcluanji
'djcluanji':{//乱击 锁定技，准备阶段或一种花色的牌于你的回合内首次进入弃牌堆后，你依次对所有手牌数与你相同的其他角色造成1点伤害。然后若其本回合未以此法交给过你牌，其可以交给你一张牌并回复1点体力。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseZhunbeiBegin',
            global:['loseAfter','cardsDiscardAfter','loseAsyncAfter','equipAfter'],
        },
        forced:true,
        getIndex(event,player){
            if(event.name=='phaseZhunbei')return 1;
            if(_status.currentPhase!=player)return 0;
            let cards=event?.getd();
            if(!cards||!cards.length)return false;
            let suits=[];
            for(let card of cards)suits.add(get.suit(card,false));
            game.getGlobalHistory('cardMove',evt=>{
                if(evt.name!='lose'&&evt.name!='cardsDiscard')return false;
                if(evt.name=='lose'&&evt.position!=ui.discardPile)return false;
                if(evt==event||evt.getParent()==event)return false;
                for(let cardx of evt.cards)suits.remove(get.suit(cardx,false));
            });
            return suits.length;
        },
        logTarget(event,player){
            return game.filterPlayer((target)=>target!=player&&target.countCards('hs')==player.countCards('hs')).sortBySeat();
        },
        async content(event,trigger,player){
            let suits=[];
            game.getGlobalHistory('cardMove',evt=>{
                if(evt.name!='lose'&&evt.name!='cardsDiscard')return false;
                if(evt.name=='lose'&&evt.position!=ui.discardPile)return false;
                for(let cardx of evt.cards)suits.add(get.suit(cardx,false));
            });
            if(suits.length){
                player.markAuto(event.name+'_mark',suits);
                player.addTempSkill(event.name+'_mark');
            };
            if(event.targets){
                for(const target of event.targets){
                    const damageEvent=target.damage();
                    if(target==player)damageEvent.set('unreal',true);
                    await damageEvent;
                    await game.asyncDelay(0.5);
                };
                for(const target of event.targets){
                    if(target.isIn()&&target!=player&&!target.hasHistory('lose',(evt)=>evt.getParent(3).name==event.name&&evt.getParent(3).player==player)){
                        const {result}=await target.chooseToGive(player,'hes').set('prompt','是否交给'+get.translation(player)+'一张牌'+(target.isDamaged()?'并回复1点体力':'')+'？').set('ai',card=>{
                            const target=get.event('player');
                            const player=get.event('target');
                            const att=get.attitude(target,player);
                            if(get.recoverEffect(target,target,target)<=0){
                                if(att<=0)return-get.value(card);
                                return 0;
                            };
                            return 7-get.value(card);
                        }).set('target',player);
                        if(result.bool)await target.recover();
                    };
                };
            };
        },
        subSkill:{
            'mark':{
                charlotte:true,
                onremove:true,
                intro:{
                content:'本回合已进入弃牌堆的花色：$',
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2140; original skill djcjiaowang
'djcjiaowang':{//骄妄 锁定技，你使用非基本牌时须与一名其他角色拼点。若你赢，你摸一张牌。若你没赢，你弃置一张牌或令此牌无效。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCard',
        },
        filter(event,player,name){
            return get.type(event.card)!='basic'&&player.countCards('hs')&&game.hasPlayer(target=>{
                return player.canCompare(target);
            });
        },
        async cost(event,trigger,player){
            event.result=await player.chooseTarget(true,'你发动了〖'+get.skillTranslation(event.skill)+'〗','请选择你要拼点的目标',(card,player,target)=>{
                return player.canCompare(target);
            }).set('ai',(target)=>{
                return-2;
            }).forResult();
        },
        async content(event,trigger,player){
            const {result}=await player.chooseToCompare(event.targets[0]);
            if(result.bool)await player.draw();
            else{
                const {result:{bool}}=await player.chooseToDiscard('hes').set('prompt','弃置一张牌，或点取消令'+get.translation(trigger.card)+'无效');
                if(!bool){
                    trigger.targets.length=0;
                    trigger.all_excluded=true;
                    game.log(trigger.card,'被无效了');
                };
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2170; original skill djczongshi
'djczongshi':{//纵势 主公技，锁定技，群雄势力角色拼点牌亮出时，你令此牌点数+X（X为场上群雄势力角色数-其手牌数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'compare',
        },
        forced:true,
        unique:true,
        zhuSkill:true,
        filter(event,player,name){
            return event.player.group=='qun'||event.target.group=='qun';
        },
        prompt2(event,player){
            const num=game.filterPlayer(target=>{
                return target.group=='qun';
            }).length-event.player.countCards('hs');
            let str='的拼点牌点数';
            if(num>=0)str+='+';
            return '令'+get.translation(event.player)+str+num;
        },
        async content(event,trigger,player){
            let targets=[];
            if(trigger.player.group=='qun')targets.push(trigger.player);
            if(trigger.target.group=='qun')targets.push(trigger.target);
            for(let target of targets){
                let num=game.filterPlayer(target=>{
                    return target.group=='qun';
                }).length-target.countCards('hs');
                let cardNum=trigger[target==trigger.player?'num1':'num2'];
                if(cardNum+num>13)num=13-cardNum;
                if(cardNum+num<1)num=cardNum-1;
                trigger[target==trigger.player?'num1':'num2']+=num;
                let str='的拼点牌点数';
                game.log(target,str,(num>=0?'+':''),num);
                target.popup((num>=0?'+':'')+num);
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:800; original skill djcjuyi
'djcjuyi':{//聚义 锁定技，每回合限一次，一名角色使用【杀】结算后，你将此【杀】置于你的武将牌上，称之为“方”，然后你与其各摸一张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'useCardAfter',
        },
        forced:true,
        usable:1,
        logTarget:'player',
        filter(event,player,name){
            return event.card.name=='sha'&&event.cards?.filterInD('oe').length;
        },
        async content(event,trigger,player){
            await player.addToExpansion(trigger.cards.filterInD(),'gain2').set('gaintag',[event.name]);
            await game.asyncDraw([player,trigger.player]);
        },
        marktext:'方',
        intro:{
            name:'方',
            content:'expansion',
            markcount:'expansion',
        },
        onremove(player,skill){
            let cards=player.getExpansions(skill);
            if(cards.length)player.loseToDiscardpile(cards);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:826; original skill djcqingtian
'djcqingtian':{//倾天 你使用【杀】时，你可以弃置总点数之和为X的任意张“方”（X为36-此【杀】的点数）。若如此做，你对此【杀】的目标造成3点雷属性伤害并取消此【杀】所有目标，然后你令此【杀】不计入出牌阶段使用次数。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCard',
        },
        filter(event,player,name){
            return event.card.name=='sha'&&player.getExpansions('djcjuyi').length;
        },
        popup:false,
        getResult(cards,number){
            let l=cards.length;
            let all=Math.pow(l,2);
            let list=[];
            for(let i=1;i<all;i++){
                let array=[];
                for(let j=0;j<l;j++){
                    if(Math.floor((i%Math.pow(2,j+1))/Math.pow(2,j))>0)array.push(cards[j]);
                };
                let num=0;
                for(let k of array){
                    num+=get.number(k);
                };
                if(num==number)list.push(array);
            };
            if(list.length){
                list.sort(function(a,b){
                    if(a.length!=b.length)return b.length-a.length;
                    return get.value(a)-get.value(b);
                });
                return list[0];
            };
            return list;
        },
        async cost(event,trigger,player){
            const cards=player.getExpansions('djcjuyi');
            const {result:{bool,links}}=await player.chooseButton([`###${get.prompt(event.name.slice(0,-5))}###弃置总点数之和为${(36-get.number(trigger.card))}的任意张“方”，并对${get.translation(trigger.targets)}造成3点雷属性伤害，然后取消${get.translation(trigger.card)}的所有目标，并令${get.translation(trigger.card)}不计入出牌阶段使用次数`,cards],[1,player.getExpansions('djcjuyi').length]).set('filterButton',button=>{
                    return get.number(button.link)+ui.selected.buttons.reduce((p,c)=>p+get.number(c.link,false),0)<=get.event('number');
                }).set('filterOk',()=>{
                    return ui.selected.buttons.reduce((p,c)=>p+get.number(c.link,false),0)==get.event('number');
                }).set('ai',button=>{
                    const player=get.player();
                    const trigger=get.event().getTrigger();
                    if(trigger.targets.filter(target=>{
                        return get.damageEffect(target,player,player,'thunder')<=0;
                    }).length>Math.floor(trigger.targets.length/2))return 0;
                    return get.info('djcqingtian').getResult(player.getExpansions('djcjuyi'),get.event('number')).includes(button.link);
                }).set('complexSelect',true).set('number',36-get.number(trigger.card))
            if(bool)event.result={bool,cost_data:{links}};
        },
        async content(event,trigger,player){
            player.logSkill(event.name,trigger.targets);
            const cards=event.cost_data.links;
            await player.loseToDiscardpile(cards);
            for(const target of trigger.targets)await target.damage(3,'thunder','nocard');
            trigger.targets.length=0;
            trigger.all_excluded=true;
            game.log(player,'取消了',trigger.card,'的所有目标');
            if(trigger.addCount!==false){
                trigger.addCount=false;
                player.getStat().card[trigger.card.name]--;
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2306; original skill djczhishi
'djczhishi':{//峙势 锁定技，转换技，你的一个手牌数未发生变化的阶段结束时，你摸一张牌并将下一个阶段改为：阳，弃牌阶段；阴，出牌阶段。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:['phaseZhunbeiEnd','phaseJudgeEnd','phaseDrawEnd','phaseUseEnd','phaseDiscardEnd','phaseJieshuEnd'],
        },
        filter(event,player,name){
            let num=0;
            player.getHistory('gain',evt=>{
                if(evt.getParent(event.name)==event)num++;
            });
            player.getHistory('lose',evt=>{
                if(evt.getParent(event.name)==event&&evt.hs.length)num--;
            });
            return num==0;
        },
        prompt2(event,player){
            return '将你的下一个阶段改为'+(player.storage.djczhishi?'出牌阶段':'弃牌阶段');
        },
        mark:true,
        marktext:'☯',
        forced:true,
        zhuanhuanji(player,skill){
            player.storage[skill]=!player.storage[skill];
            player.changeSkin({characterName:'fhq_zhujun'},'fhq_zhujun'+(player.storage[skill]?'_shadow':''));
        },
        intro:{
            content(storage,player,skill){
                let str='手牌数未发生过变化的阶段结束后，下一个阶段改为';
                if(storage)str+='出牌阶段';
                else str+='弃牌阶段';
                if(player.isUnderControl(true))return str;
                return storage?'阴':'阳';
            },
        },
        async content(event,trigger,player){
            await player.draw();
            player.addSkill(event.name+'_change');
            player.changeZhuanhuanji(event.name);
        },
        subSkill:{
            'change':{
                trigger:{
                    player:'phaseChange',
                },
                mark:true,
                intro:{
                    content(storage,player,skill){
                        let str='下一个阶段改为';
                        if(!player.storage[skill.replace('_change','')])str+='出牌阶段';
                        else str+='弃牌阶段';
                        return str;
                    },
                },
                forced:true,
                direct:true,
                async content(event,trigger,player){
                    if(!player.storage[event.name.replace('_change','')])trigger.phaseList[trigger.num]='phaseUse|djczhishi';
                    else trigger.phaseList[trigger.num]='phaseDiscard|djczhishi';
                    player.removeSkill(event.name);
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2369; original skill djcsuzi
'djcsuzi':{//肃资 出牌阶段限一次，你可以将手牌数调整至手牌上限。若你未以此法获得牌，你本回合手牌上限+X（X为你失去牌的数量+1）；否则你视为使用一张火攻。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        usable:1,
        filter(event,player,name){
            return player.getHandcardLimit()!=player.countCards('h');
        },
        async content(event,trigger,player){
            let num=player.getHandcardLimit()-player.countCards('h');
            if(num>0){
                await player.draw(num);
                await player.chooseUseTarget({name:'huogong',isCard:true},true);
            }else{
                await player.chooseToDiscard('h',true,-num);
                player.addTempSkill(event.name+'_use');
                player.storage[event.name+'_use']+=(1-num);
                player.markSkill(event.name+'_use');
            };
        },
        subSkill:{
            'use':{
                charlotte:true,
                mark:true,
                intro:{
                    content:'手牌上限+#',
                },
                init(player,skill){
                    player.storage[skill]=0;
                },
                onremove(player,skill){
                    delete player.storage[skill];
                },
                mod:{
                    maxHandcard(player,num){
                        return num+(player.storage.djcsuzi_use||0);
                    },
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5206; original skill djcwending
'djcwending':{//问鼎 觉醒技，回合开始时，若场上有同名技能的角色数不小于你的体力值，你获得1体力上限，回复1点体力，并获得〖筹策〗与武将牌上的所有主公技。
        audio:'ext:点绛唇/audio/skill:3',
        trigger:{
            player:'phaseBegin',
        },
        forced:true,
        juexingji:true,
        skillAnimation:true,
        animationColor:'thunder',
        derivation:['djcchouce'],
        prompt2:'获得1体力上限，回复1点体力，并获得【筹策】与武将牌上的所有主公技',
        filter(event,player,name){
            let num=1;
            let nameList=[];
            const list=[['feiyang','飞扬'],['bahu','跋扈']];
            game.countPlayer(target=>{
                let skills=target.getSkills(null,false,false).filter(skill=>list.some(text=>skill.includes(text[0])&&get.translation(skill)===text[1])||!get.info(skill)?.charlotte);
                let bool=false;
                skills.forEach(skill=>{
                    const transName=get.skillTranslation(skill);
                    if(!nameList.includes(transName)){
                        nameList.push(transName);
                    }else bool=true;
                });
                if(bool)num++;
            });
            return num>=player.hp;
        },
        async content(event,trigger,player){
            player.awakenSkill(event.name);
            await player.gainMaxHp();
            await player.recover();
            await player.addSkills('djcchouce');
            const skills=player.getStockSkills(true,true).filter(skill=>{
                if(player.hasSkill(skill))return false;
                const info=get.info(skill);
                return info&&info.zhuSkill;
            });
            if(skills.length)await player.addSkills(skills);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4823; original skill djcchouce
'djcchouce':{//筹策 一名角色受到你造成的伤害后，你可以重铸两张类型相同的非基本牌并重置你武将牌上的一个技能。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:'damageEnd',
        },
        filter(event,player,name){
            return event.source&&event.source==player&&lib.skill.djcchouce.controlResetSkill(player).length;
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard('he',2,get.prompt(event.skill),'重铸两张类型相同的非基本牌并重置武将牌上的一个技能').set('filterCard',(card,player)=>{
                if(get.type(card)=='basic')return false;
                return !ui.selected.cards.some(cardx=>get.type(cardx,player)!=get.type(card,player));
            }).set('complexCard',true).forResult();
        },
        controlResetSkill(player,control){
            let skills=player.getStockSkills(true,true);
            if(control)skills=[control];
            game.expandSkills(skills);
            let resetSkills=[];
            const suffixs=['used','round','block','blocker'];
            for(let skill of skills){
                const info=get.info(skill);
                if(info.usable!==undefined){
                    if(player.hasSkill('counttrigger')&&player.storage.counttrigger[skill]&&player.storage.counttrigger[skill]>=1){
                        if(control)delete player.storage.counttrigger[skill];
                        resetSkills.add(skill);
                    };
                    if(typeof get.skillCount(skill)=='number'&&get.skillCount(skill)>=1){
                        if(control)delete player.getStat('skill')[skill];
                        resetSkills.add(skill);
                    };
                };
                if(info.round&&player.storage[skill+'_roundcount']){
                    if(control)delete player.storage[skill+'_roundcount'];
                    resetSkills.add(skill);
                };
                if(player.storage[`temp_ban_${skill}`]){
                    if(control)delete player.storage[`temp_ban_${skill}`];
                    resetSkills.add(skill);
                };
                if(player.awakenedSkills.includes(skill)){
                    if(control)player.restoreSkill(skill);
                    resetSkills.add(skill);
                }else if(!game.filterSkills(skills.filter(skill=>{
                    const info=get.info(skill);
                    return !info.persevereSkill||!info.charlotte;
                }),player).includes(skill)){
                    if(control)player.enableSkill(skill);
                    resetSkills.add(skill);
                };
                for(let suffix of suffixs){
                    if(player.hasSkill(skill+'_'+suffix)){
                       if(control)player.removeSkill(skill+'_'+suffix);
                        resetSkills.add(skill);
                    };
                };
                if(control)game.log(player,'重置了技能','#g'+'【'+get.translation(skill)+'】');
            };
            return resetSkills;
        },
        async content(event,trigger,player){
            await player.recast(event.cards);
            const skills=lib.skill.djcchouce.controlResetSkill(player);
            if(skills.length>1){
                const {result}=await player.chooseControl(skills).set('prompt','你发动了【'+get.skillTranslation(event.name)+'】').set('prompt2','选择一个要重置的技能');
                if(result.control&&result.control!='cancel2')lib.skill.djcchouce.controlResetSkill(player,result.control);
            }else lib.skill.djcchouce.controlResetSkill(player,skills[0]);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5247; original skill djcfengtu
'djcfengtu':{//封土 其他角色获得你的牌后，你可以令其横置并获得你武将牌上的一个非锁定技，然后你摸场上横置角色数张牌。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            global:['gainAfter','loseAsyncAfter'],
        },
        prompt2(event,player,name){
            const cards=event.getl(player)?.cards2;
            const targets=game.filterPlayer(target=>{
                if(target==player||target.isLinked())return false;
                const cardsx=event.getg(target);
                return cardsx.some(card=>cards.includes(card));
            });
            return '令'+get.translation(targets)+'横置并获得你武将牌上的一个非锁定技';
        },
        filter(event,player,name){
            if(event.name!='gain'&&event.type !='gain')return false;
            const cards=event.getl(player)?.cards2;
            if(!cards.length)return false;
            return game.hasPlayer(target=>{
                let skills=player.getStockSkills(true,true).filter(skill=>!target.hasSkill(skill)&&!get.is.locked(skill,player));
                if(target==player||target.isLinked()||!skills.length)return false;
                const cardsx=event.getg(target);
                return cardsx.some(card=>cards.includes(card));
            });
        },
        logTarget(event,player){
            const cards=event.getl(player)?.cards2;
            return game.filterPlayer(target=>{
                let skills=player.getStockSkills(true,true).filter(skill=>!target.hasSkill(skill)&&!get.is.locked(skill,player));
                if(target==player||target.isLinked()||!skills.length)return false;
                const cardsx=event.getg(target);
                return cardsx.some(card=>cards.includes(card));
            });
        },
        async content(event,trigger,player){
            for(let target of event.targets){
                await target.link();
                let skills=player.getStockSkills(true,true).filter(skill=>!target.hasSkill(skill)&&!get.is.locked(skill,player));
                const {result}=await player.chooseControl(skills).set('prompt','你发动了【'+get.skillTranslation(event.name)+'】').set('prompt2','选择一个令'+get.translation(target)+'获得的技能');
                if(result.control&&result.control!='cancel2')await target.addSkills(result.control,'roundStart');
            };
            await player.draw(game.countPlayer(target=>target.isLinked()));
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5291; original skill djcquanyi
'djcquanyi':{//权弈 转换技，每回合每项限一次，你造成或受到伤害后，你可以令当前回合角色将一张手牌当：阳：【顺手牵羊】；阴：【借刀杀人】使用。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
            player:'damageEnd',
        },
        mark:true,
        marktext:'☯',
        zhuanhuanji:true,
        intro:{
            content(storage,player,skill){
                if(!storage)return '阳：你造成或受到伤害后，你可以令当前回合角色将一张手牌当【顺手牵羊】使用。';
                return '阴：你造成或受到伤害后，你可以令当前回合角色将一张手牌当【借刀杀人】使用。';
            },
        },
        filter(event,player,name){
            if(player.hasStorage('djcquanyi_used',player.storage.djcquanyi))return false;
            const target=_status.currentPhase;
            return target?.isIn()&&target.countCards('h');
        },
        check(event,player){
            return get.attitude(player,_status.currentPhase)<=0;
        },
        async content(event,trigger,player){
            const bool=player.getStorage(event.name,false);
            await player.changeZhuanhuanji(event.name);
            if(player.hasStorage('djcquanyi_used',bool))return;
            player.addTempSkill('djcquanyi_used');
            player.markAuto('djcquanyi_used',[bool]);
            const target=_status.currentPhase;
            if(!target?.isIn())return;
            const card=new lib.element.VCard({name:!bool?'shunshou':'jiedao'});
            if(!target.hasUseTarget(card))return;
            const {result}=await target.chooseCard('h',true,'将一张手牌当'+get.translation(card)+'使用');
            if(result.bool){
                await target.chooseUseTarget(card,result.cards,true);
            };
        },
        subSkill:{
            'used':{
                charlotte:true,
                onremove:true,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5336; original skill djcshouyue
'djcshouyue':{//授钺 主公技，锁定技，出牌阶段开始时，你令所有未装备武器牌的角色依次将牌堆顶的X张牌当【三尖两刃刀】使用（X为场上晋势力角色数）。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'phaseUseBegin',
        },
        forced:true,
        logTarget(event,player){
            return game.filterPlayer(target=>!target.getEquips(1).length&&target.hasEnabledSlot(1));
        },
        filter(event,player,name){
            return game.hasPlayer(target=>!target.getEquips(1).length&&target.hasEnabledSlot(1))
        },
        async content(event,trigger,player){
            const num=game.countPlayer(target=>target.group=='jin');
            for(let target of event.targets){
                const cards=get.cards(num);
                await game.cardsGotoOrdering(cards);
                await target.chooseUseTarget({name:'sanjian'},cards,true,'noanimate','nopopup');
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5075; original skill djcmushi
'djcmushi':{//募士 出牌阶段，若你的手牌中没有牌名不同的牌，你可以摸三张牌。若如此做，弃牌阶段结束后，你须重铸X张手牌或失去前X个技能（X为你本回合过发动〖募士〗的次数）。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        filter(event,player,name){
            for(let card of player.getCards('h')){
                if(player.countCards('h',{name:card.name})>1)return false;
            };
            return true;
        },
        async content(event,trigger,player){
            await player.draw(3);
            await player.addTempSkill(event.name+'_use');
        },
        subSkill:{
            'use':{
                trigger:{
                    player:'phaseDiscardEnd',
                },
                direct:true,
                async content(event,trigger,player){
                    const num=player.getHistory('useSkill',evt=>{
                        return evt.skill=='djcmushi';
                    }).length;
                    const list=[['feiyang','飞扬'],['bahu','跋扈']];
                    let skills=player.getSkills(null,false,false).filter(skill=>list.some(text=>skill.includes(text[0])&&get.translation(skill)===text[1])||!get.info(skill)?.charlotte);
                    if(player.countCards('h')>=num){
                        const {result}=await player.chooseCard('h',num).set('prompt','募士:重铸'+get.cnNumber(num)+'张牌，或点取消失去前'+num+'个技能');
                        if(result.bool){
                            player.recast(result.cards);
                        }else{
                            player.removeSkills(skills.slice(0,num));
                        };
                    }else{
                        player.removeSkills(skills.slice(0,num));
                    };
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5114; original skill djcchenlue
'djcchenlue':{//沉略 你可以重铸一种基本牌或普通锦囊牌牌名的所有手牌并视为使用或打出此牌（重铸牌的数量须大于你本回合以此法使用过此牌名牌的次数）。
        audio:'ext:点绛唇/audio/skill:2',
        enable:['chooseToUse','chooseToRespond'],
        direct:true,
        delay:false,
        hiddenCard(player,name){
            return player.countCards('h',{name:name});
        },
        filter(event,player){
            let list=[];
            for(let name of lib.inpile){
                const type=get.type(name);
                if(type!='basic'&&type!='trick')continue;
                const card={name:name,isCard:true};
                if(player.countCards('h',{name:name})&&event.filterCard(card,player,event)&&(!player.storage['djcchenlue_use']||!player.storage['djcchenlue_use'][name]||player.countCards('h',{name:name})>player.storage['djcchenlue_use'][name]))list.push([type,'',name]);
            };
            return list.length;
        },
        chooseButton:{
            dialog(event,player){
                let list=[];
                for(let name of lib.inpile){
                    const type=get.type(name);
                    if(type!='basic'&&type!='trick')continue;
                    const card={name:name,isCard:true};
                    if(player.countCards('h',{name:name})&&event.filterCard(card,player,event)&&(!player.storage['djcchenlue_use']||!player.storage['djcchenlue_use'][name]||player.countCards('h',{name:name})>player.storage['djcchenlue_use'][name]))list.push([type,'',name]);
                };
                return ui.create.dialog('沉略',[list,'vcard'],'hidden');
            },
            backup(links,player){
                return{
                    filterCard:()=>false,
                    selectCard:-1,
                    viewAs:{
                        name:links[0][2],
                        isCard:true,
                    },
                    popname:true,
                    async precontent(event,trigger,player){
                        await player.logSkill('djcchenlue');
                        const cards=player.getCards('h',{name:links[0][2]});
                        player.addTempSkill('djcchenlue_use');
                        if(!player.storage['djcchenlue_use'][links[0][2]])player.storage['djcchenlue_use'][links[0][2]]=0;
                        player.storage['djcchenlue_use'][links[0][2]]++;
                        await player.recast(cards);
                    },
                };
            },
            prompt(links,player){
            return '重铸手牌所有'+(get.translation(links[0][3])||'')+get.translation(links[0][2])+'并视为使用之';
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
            'use':{
                charlotte:true,
                init(player,skill){
                    player.storage[skill]={};
                },
                onremove:true,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5188; original skill djcdantao
'djcdantao':{//瘅讨 锁定技，当你失去牌后，若你失去牌的数量不小于你的手牌数，你将所有手牌当作一张【杀】使用。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'loseAfter',
            global:['equipAfter','addJudgeAfter','gainAfter','loseAsyncAfter','addToExpansionAfter'],
        },
        forced:true,
        filter(event,player,name){
            if(event.name=='gain'&&event.player==player||!player.countCards('h'))return false;
            const evt=event.getl(player);
            return evt?.cards2?.length>=player.countCards('h');
        },
        async content(event,trigger,player){
            await player.chooseUseTarget({name:'sha'},player.getCards('h'),true,false).set('prompt','你发动了〖'+get.skillTranslation(event.name)+'〗').set('prompt2','将所有手牌当一张【杀】使用，请选择此【杀】的目标');
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4761; original skill djcclantongcao
'djcclantongcao':{//同槽 宗族技，锁定技，回合结束时，你令一名河内司马氏角色获得一个你已失效或本回合失去过的技能。
        audio:'ext:点绛唇/audio/skill:2',
        audioname2:{
            fhq_clan_simazhao:'djcclantongcao_fhq_clan_simazhao',
            fhq_clan_simayi:'djcclantongcao_fhq_clan_simayi',
            fhq_clan_simashi:'djcclantongcao_fhq_clan_simashi',
        },
        trigger:{
            player:'phaseJieshuBegin',
        },
        clanSkill:true,
        locked:true,
        getLoseSkills(player){
            let onPhaseLose_skills=[];
            game.getGlobalHistory('everything',(evt)=>{
                if(evt.name=='changeSkills'&&evt.player==player)onPhaseLose_skills.addArray(evt.removeSkill.filter((i)=>lib.skill[i]));
            });
            const list=[['feiyang','飞扬'],['bahu','跋扈']];
            const disableSkills=game.filterSkills(player.getSkills(null,false,false).filter(skill=>{
                const info=get.info(skill);
                return !info.persevereSkill||!info.charlotte;
            }),player);
            const skills=player.getSkills(null,false,false).filter(skill=>{
                if(disableSkills.includes(skill))return false;
                if(list.some(text=>skill.includes(text[0])&&get.translation(skill)==text[1]))return true;
                const info=get.info(skill);
                return !info||!info.charlotte;
            });
            return [...new Set([...onPhaseLose_skills,...skills])];
        },
        filter(event,player,name){
            const skills=lib.skill.djcclantongcao.getLoseSkills(player);
            if(!skills.length)return false;
            return game.hasPlayer(target=>{
                if(!target.hasClan('河内司马氏'))return false;
                for(let skill of skills){
                    if(!target.hasSkill(skill,null,null,false))return true;
                };
                return false;
            });
        },
        async cost(event,trigger,player){
            const skills=lib.skill.djcclantongcao.getLoseSkills(player);
            event.result=await player.chooseTarget('你发动了〖'+get.skillTranslation(event.skill)+'〗','选择一名河内司马氏角色，令其获得你已失效或本回合失去过的技能',true,(card,player,target)=>{
                if(!target.hasClan('河内司马氏'))return false;
                for(let skill of skills){
                    if(!target.hasSkill(skill,null,null,false))return true;
                };
                return false;
            }).forResult();
        },
        async content(event,trigger,player){
            let skills=lib.skill.djcclantongcao.getLoseSkills(player).filter(skill=>!event.targets[0].hasSkill(skill,null,null,false));
            if(skills.length>1){
                const {result}=await player.chooseControl(skills).set('prompt','选择一个令'+get.translation(event.targets[0])+'获得的技能');
                game.log(result.control)
                if(result.control&&result.control!='cancel2')await event.targets[0].addSkills([result.control]);
            }else event.targets[0].addSkills([skills[0]]);
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4976; original skill djctaohui
'djctaohui':{//韬晦 出牌阶段结束时，你可以重铸X张手牌（X为你的手牌数-体力值）。然后你失去武将牌上第X个其他技能，本回合获得〖连破〗。
        audio:'ext:点绛唇/audio/skill:2',
        derivation:'lianpo',
        trigger:{
            player:'phaseUseEnd',
        },
        init(player,skill){
            player.storage[skill]=0;
        },
        filter(event,player){
            return player.countCards('h')>player.hp;
        },
        async cost(event,trigger,player){
            event.result=await player.chooseCard(get.prompt2(event.skill),'he',player.countCards('h')-player.hp).set('filterCard',card=>{
                const player=get.player();
                return player.canRecast(card);
            }).set('ai',card=>{
                const player=get.player();
                if(player.getHp()+player.countCards('hs',card=>player.canSaveCard(card,player))<=1)return 0;
                return 6 - get.value(card);
            }).forResult();
        },
        async content(event,trigger,player){
            await player.recast(event.cards);
            let skills=player.getStockSkills(true,true);
            game.expandSkills(skills);
            skills=skills.filter(skill=>skill!=event.name);
            if(skills.length>(event.cards.length-1))await player.removeSkills(skills[event.cards.length-1]);
            await player.addTempSkills('lianpo',{global:'phaseBefore'});
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5008; original skill djczhibian
'djczhibian':{//制变 你使用牌时，若你的手牌中没有与此牌花色相同的牌，你可以令此牌不可被响应。然后你根据此牌的花色获得对应技能至你的当前阶段结束：♠：〖完杀〗；♣：〖放逐〗；♥：〖集智〗；♦：〖制衡〗；无色:〖鬼才〗。
        audio:'ext:点绛唇/audio/skill:2',
        derivation:['wansha','fangzhu','jizhi','rezhiheng','guicai'],
        trigger:{
            player:'useCard',
        },
        prompt2(event,player){
            const skillList=new Map([
                ['club','fangzhu'],
                ['spade','wansha'],
                ['heart','jizhi'],
                ['diamond','rezhiheng'],
                ['none','guicai'],
            ]);
            return '令'+get.translation(event.card)+'不可被响应并获得〖'+get.skillTranslation(skillList.get(get.suit(event.card)))+'〗';
        },
        filter(event,player){
            return !player.countCards('h',{suit:get.suit(event.card)});
        },
        async content(event,trigger,player){
            trigger.directHit.addArray(game.players)
            const skillList=new Map([
                ['club','fangzhu'],
                ['spade','wansha'],
                ['heart','jizhi'],
                ['diamond','rezhiheng'],
                ['none','guicai'],
            ]);
            if(Array.from(skillList.keys()).includes(get.suit(trigger.card))){
                if(lib.phaseName.some(phase=>{
                    const evt=event.getParent(phase);
                    return evt?.name===phase;
                })){
                    for(const phase of lib.phaseName){
                        const evt=event.getParent(phase);
                        if(evt?.name===phase)await player.addTempSkills(skillList.get(get.suit(trigger.card)),{player:`${phase}After`});
                    };
                }else await player.addSkills(skillList.get(get.suit(trigger.card)));
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5053; original skill djcyinlue
'djcyinlue':{//隐略 锁定技，你于摸牌阶段外摸牌后，若你有其他手牌，你需弃置至少一张手牌。若弃置牌数大于你的体力值，你回复1点体力。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'drawAfter',
        },
        forced:true,
        filter(event,player,name){
            if(event.getParent('phaseDraw').player==player)return false;
            for(let card of player.getCards('h')){
                if(!event.result.includes(card))return true;
            };
            return false;
        },
        async content(event,trigger,player){
            const {result}=await player.chooseToDiscard('h',true,[1,player.countCards('h')]).set('prompt2','弃置至少一张手牌，若弃置牌数大于'+get.cnNumber(player.hp)+'，你回复1点体力');
            if(result.bool){
                if(result.cards.length>player.hp)await player.recover();
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4892; original skill djczhanlong
'djczhanlong':{//斩龙 限定技，出牌阶段，你可以视为使用一张【杀】，然后你可以失去首个失效的技能并重复此流程。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        filterTarget(card,player,target){
            return player.canUse({name:'sha',isCard:true},target);
        },
        filter(event,player,name){
            return game.hasPlayer(target=>lib.skill.djczhanlong.filterTarget(null,player,target));
        },
        limited:true,
        skillAnimation:true,
        animationColor:'orange',
        async content(event,trigger,player){
            player.awakenSkill(event.name);
            await player.useCard({name:'sha',isCard:true},event.targets[0],false);
            let disableSkills=game.filterSkills(player.getSkills(null,false,false).filter(skill=>{
                const info=get.info(skill);
                return !info.persevereSkill||!info.charlotte;
            }),player);
            const list=[['feiyang','飞扬'],['bahu','跋扈']];
            let skills=player.getSkills(null,false,false).filter(skill=>{
                if(disableSkills.includes(skill))return false;
                if(list.some(text=>skill.includes(text[0])&&get.translation(skill)==text[1]))return true;
                const info=get.info(skill);
                return !info||!info.charlotte;
            });
            let bool=true;
            if(skills.length){
                do{
                    const {result}=await player.chooseUseTarget({name:'sha',isCard:true},false,'失去〖'+get.skillTranslation(skills[0])+'〗并视为使用一张【杀】');
                    if(result.bool){
                        await player.removeSkills([skills[0]]);
                    }else break;
                    disableSkills=game.filterSkills(player.getSkills(null,false,false).filter(skill=>{
                        const info=get.info(skill);
                        return !info.persevereSkill||!info.charlotte;
                    }),player);
                    skills=player.getSkills(null,false,false).filter(skill=>{
                        if(disableSkills.includes(skill))return false;
                        if(list.some(text=>skill.includes(text[0])&&get.translation(skill)==text[1]))return true;
                        const info=get.info(skill);
                        return !info||!info.charlotte;
                    });
                }while(skills.length&&bool);
                
            };
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:4940; original skill djczhaoxin
'djczhaoxin':{//昭心 锁定技，当你造成伤害后，若受伤的角色仍存活，你摸一张牌并令你首个未失效的技能本回合失效。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            source:'damageSource',
        },
        filter(event,player,name){
            return event.player.isIn()&&game.filterSkills(player.getSkills(null,false,false).filter(skill=>{
                const info=get.info(skill);
                return !info.persevereSkill||!info.charlotte;
            }),player).length;
        },
        forced:true,
        async content(event,trigger,player){
            const skills=game.filterSkills(player.getSkills(null,false,false).filter(skill=>{
                const info=get.info(skill);
                return !info.persevereSkill||!info.charlotte;
            }),player);
            await player.draw();
            player.disableSkill(event.name,skills[0]);
            player.addTempSkill(event.name+'_restore');
            game.log(player,'的技能','#g'+'【'+get.translation(skills[0])+'】','失效了');
        },
        subSkill:{
            'restore':{
                charlotte:true,
                forced:true,
                popup:false,
                onremove(player,skill){
                    player.enableSkill(skill.replace('_restore',''));
                    game.log(player,'恢复了技能');
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:5359; original skill djcyizheng
'djcyizheng':{//翊正 转换技，当你需要使用或打出：阳：基本牌；阴：普通锦囊牌时，你可以将本回合进入弃牌堆的X张牌当此牌使用或打出（X为此牌牌名字数）。此牌结算后，你将此牌对应的实体牌以任意顺序置入牌堆顶。
        audio:'ext:点绛唇/audio/skill:2',
        zhuanhuanji(player,skill){
            player.storage[skill]=!player.storage[skill];
            player.changeSkin({characterName:'fhq_clan_xunyu'},'fhq_clan_xunyu'+(player.storage[skill]?'_shadow':''));
        },
        mark:true,
        marktext:'☯',
        intro:{
            content(storage){
                return '转换技。当你需要使用或打出'+(storage?'普通锦囊牌':'基本牌')+'时，你可以将本回合进入弃牌堆的X张牌当此牌使用或打出（X为此牌牌名字数）。此牌结算后，你将此牌对应的实体牌以任意顺序置入牌堆顶。';
            },
        },
        enable:['chooseToUse','chooseToRespond'],
        filter(event,player){
            if(event.djcyizheng)return false;
            return get.inpileVCardList(info=>{
                const name=info[2],type=get.type(name),infox=get.info({ name:name });
                if(get.cardNameLength(name)>(event.djcyizheng_num??0))return false;
                if(!player.storage.djcyizheng)return type=='basic';
                return type=='trick';
            }).filter(card=>event.filterCard(get.autoViewAs({ name:card[2],nature:card[3] },'unsure'),player,event)).length;
        },
        onChooseToUse(event){
            if(!game.online&&!event.djcyizheng){
                const player=event.player;
                event.set('djcyizheng_num',get.discarded().filter(card=>get.position(card,true)=='d').length);
            };
        },
        onChooseToRespond(event){
            if(!game.online&&!event.djcyizheng){
                const player=event.player;
                event.set('djcyizheng_num',get.discarded().filter(card=>get.position(card,true)=='d').length);
            };
        },
        chooseButton:{
            dialog(event,player){
                const list=get.inpileVCardList(info=>{
                    const name=info[2],
                        nature=info[3],
                        type=get.type(name),
                        infox=get.info({ name:name });
                    if(nature || get.cardNameLength(name)>(event.djcyizheng_num??0))return false;
                    if(!player.storage.djcyizheng)return type=='basic';
                    return type=='trick';
                }).filter(card=>event.filterCard(get.autoViewAs({ name:card[2],nature:card[3] },'unsure'),player,event));
                const dialog=ui.create.dialog('翊正',[list,'vcard']);
                dialog.direct=true;
                return dialog;
            },
            check(button){
                const card=button.link,
                    player=get.player();
                return player.getUseValue(card);
            },
            backup(links,player){
                return{
                    viewAs:{
                        name:links[0][2],
                        nature:links[0][3],
                    },
                    filterCard:()=>false,
                    selectCard:-1,
                    log:false,
                    async precontent(event,trigger,player){
                        player.logSkill('djcyizheng');
                        await player.changeZhuanhuanji('djcyizheng');
                        const cards=get.discarded().filter(card=>get.position(card,true)=='d');
                        const num=get.cardNameLength(event.result.card);
                        if(cards.length<num){
                            var evt=event.getParent();
                            evt.set('djcyizheng',true);
                            evt.goto(0);
                            await game.delay();
                            return;
                        }else if(cards.length==num){
                            event.result2={bool:true,links:cards};
                        }else{
                            event.result2=await player.chooseCardButton(`翊正：选择将这些牌当${get.translation(event.result.card)}使用`,cards,true).set('selectButton',num).set('ai',button=>{
                                return 1+Math.random();
                            }).forResult();
                        };
                        if(event.result2?.bool){
                            event.result.cards=event.result2.links;
                            player.when(['useCardAfter','respondAfter']).filter(event=>event.skill=='djcyizheng_backup').step(async(event,trigger,player)=>{
                                let cards=trigger.cards.filterInD();
                                if(cards.length>1){
                                    const {result}=await player.chooseToMove('翊正：将牌按顺序置于牌堆顶',true).set('list',[['牌堆顶',cards]]).set('reverse',_status.currentPhase?.next && get.attitude(player,_status.currentPhase.next)>0).set('processAI',function(list){
                                        const cards=list[0][1].slice(0);
                                        cards.sort(function(a,b){
                                            return(_status.event.reverse?1:-1)*(get.value(b)- get.value(a));
                                        });
                                        return [cards];
                                    });
                                    if(!result.bool)return;
                                    cards=result.moved[0];
                                };
                                cards.reverse();
                                await game.cardsGotoPile(cards,'insert');
                                game.log(player,'将',cards,'置于了牌堆顶');
                            }).assign({
                                lastDo:true,
                            });
                        };
                    },
                };
            },
            prompt(links,player){
                return '将本回合进入弃牌堆的牌当做【'+get.translation(links[0][2])+'】使用';
            },
        },
        hiddenCard(player,name){
            if(!lib.inpile.includes(name))return false;
            if(get.cardNameLength(name)>get.discarded().filter(card=>get.position(card,true)=='d').length)return false;
            if(get.type(name)=='basic')return !player.storage.djcyizheng;
            return get.type(name)=='trick'&&player.storage.djcyizheng;
        },
        ai:{
            respondSha:true,
            respondShan:true,
            skillTagFilter(player,tag,arg){
                if(player.storage.djcyizheng)return false;
                if(!get.discarded().some(card=>get.position(card,true)=='d'))return false;
            },
            order(item,player){
                if(player && get.event().type=='phase'){
                    let list=get.inpileVCardList(info=>{
                        const name=info[2],infox=get.info({ name:name });
                        if(!player.storage.djcyizheng)return type=='basic';
                        return type=='trick';
                    }).map(card=>{
                        return { name:card[2],nature:card[3] };
                    }).filter(card=>player.getUseValue(card,true,true)>0);
                    if(!list.length)return 0;
                    list.sort((a,b)=>(player.getUseValue(b,true,true)||0)-(player.getUseValue(a,true,true)||0));
                    return get.order(list[0],player)*0.99;
                }
                return 1;
            },
            result:{
                player(player){
                    if(_status.event.dying)return get.attitude(player,_status.event.dying);
                    return 1;
                },
            },
        },
        subSkill:{
            'backup':{},
        },
    },
// Source: outputs/module-01/package/character/clan/skill.js:6634; original skill clandaojie
extra_generals_fhq_clandaojie: {
 audio:"clandaojie",clanSkill:true,forced:true,trigger:{player:"useCardAfter"},
 filter(event,player){return get.type(event.card,null,false)==="trick"&&!get.tag(event.card,"damage")&&player.getHistory("useCard",e=>get.type(e.card,null,false)==="trick"&&!get.tag(e.card,"damage")).indexOf(event)===0;},
 async content(event,trigger,player){
  const skills=player.getSkills(null,false,false).filter(id=>{const info=get.info(id);return info&&!info.charlotte&&get.is.locked(id)&&get.skillInfoTranslation(id,player).length>0;});
  let result={bool:false};if(skills.length)result=await player.chooseButton(["蹈节：失去一个锁定技，或取消并失去1点体力",[skills,"skill"]]).set("displayIndex",false).set("ai",button=>get.info(button.link)?.ai?.neg?1:0).forResult();
  if(result.bool&&result.links?.length)await player.removeSkills(result.links);else await player.loseHp(1);
  if(!trigger.cards?.someInD())return;
  const targets=game.filterPlayer(p=>p.hasClan("颍川荀氏"));if(!targets.length)return;
  const choice=targets.length===1?{bool:true,targets}:await player.chooseTarget("蹈节：令一名颍川荀氏角色获得此牌对应的实体牌",true,(_card,_player,target)=>target.hasClan("颍川荀氏")).set("ai",target=>get.attitude(get.player(),target)).forResult();
  if(choice.bool&&choice.targets?.[0]?.isIn()&&trigger.cards.someInD())await choice.targets[0].gain(trigger.cards.filterInD(),player,"gain2");
 }
},
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2209; original skill djcjinfan
'djcjinfan':{//锦帆 出牌阶段限一次，你可以展示一名角色的所有手牌。若其手牌中没有【杀】/【闪】，你从牌堆获得一张【决斗】/【杀】。然后若其手牌数大于你/小于你，你从牌堆获得一张【过河拆桥】/【酒】。
        audio:'ext:点绛唇/audio/skill:2',
        enable:'phaseUse',
        usable:1,
        filterTarget(card,player,target){
            return target.countCards('hs');
        },
        async content(event,trigger,player){
            await player.showCards(event.targets[0].getCards('hs'),'〖'+get.skillTranslation(event.name)+'〗:'+get.translation(event.targets[0])+'的手牌');
            let needCards=[];
            let gainCards=[];
            if(!event.targets[0].countCards('hs',{name:'shan'}))needCards.push('sha');
            if(!event.targets[0].countCards('hs',{name:'sha'}))needCards.push('juedou');
            if(event.targets[0].countCards('hs')>player.countCards('hs'))needCards.push('guohe');
            if(event.targets[0].countCards('hs')<player.countCards('hs'))needCards.push('jiu');
            for(let name of needCards){
                let card=get.cardPile2(card=>{
                    return card.name==name;
                });
                if(card)gainCards.push(card);
            };
            if(gainCards.length)await player.gain(gainCards,'gain2');
        },
        ai:{
            order:6,
            result:{
                player:10,
                target:-2,
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:2240; original skill djcsheque
'djcsheque':{//射却 锁定技，你使用本回合获得的牌无距离限制。你使用摸牌阶段外获得的牌时，你下个摸牌阶段的额定摸牌数+1。你使用摸牌阶段外获得的【杀】或普通锦囊牌额外结算一次。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCard',
        },
        filter(event,player,name){
            return player.hasHistory('lose',evt=>{
                if(event!=evt.getParent())return false;
                for(let i in evt.gaintag_map){
                    if(evt.gaintag_map[i].includes('djcsheque_otherGain'))return true;
                };
            });
        },
        intro:{
            content:'下个摸牌阶段的摸牌数+#',
        },
        forced:true,
        async content(event,trigger,player){
            const type=get.type(trigger.card);
            if(trigger.targets.length&&(trigger.card.name=='sha'||type=='trick'))trigger.effectCount++;
            player.addMark(event.name);
            player.when({player:'phaseDrawBegin2'}).then(()=>{
                trigger.num++;
                player.unmarkSkill(skill);
                player.removeMark(skill,player.countMark(skill));
            }).vars({skill:event.name});
        },
        mod:{
            targetInRange(card,player,target,now){
                if(card.cards&&card.cards[0]&&card.cards[0].hasGaintag('djcsheque_phase'))return true;
            },
        },
        group:['djcsheque_1'],
        subSkill:{
            '1':{
                trigger:{
                    player:'gainAfter',
                    global:'loseAsyncAfter',
                },
                popup:false,
                forced:true,
                init(player,skill){
                    game.broadcastAll((skill)=>{
                        lib.translate[skill.replace('_1','')+'_phase']='无距离限制';
                        lib.translate[skill.replace('_1','')+'_otherGain']=get.skillTranslation(skill.replace('_1',''));
                    },skill);
                },
                async content(event,trigger,player){
                    let evt=trigger.getParent('phaseDraw');
                    if(!evt||evt.player!=player)player.addGaintag(trigger.getg(player),event.name.replace('_1','')+'_otherGain');
                    if(event.triggername=='gainAfter'){
                        player.addGaintag(trigger.cards,event.name.replace('_1','')+'_phase');
                        player.addTempSkill(event.name.replace('_1','')+'_2');
                    };
                },
            },
            '2':{
                charlotte:true,
                onremove(player,skill){
                    player.removeGaintag(skill.replace('_2','')+'_phase',player.getCards('hs'));
                },
            },
        },
    },
// Source: outputs/module-01/package/extension/点绛唇/character/skill.js:3123; original skill djcpaoxiao
'djcpaoxiao':{//咆哮 锁定技，你使用【杀】无距离和次数限制。你于回合内声明使用牌前，你攻击范围内的其他角色需依次选择是否打出一张闪。然后若：1.此牌为【杀】且其未打出【闪】，你令其成为此【杀】的额外目标。2.此牌不为【杀】且有角色打出【闪】，你下张【杀】的伤害基数+1。
        audio:'ext:点绛唇/audio/skill:2',
        trigger:{
            player:'useCardBefore',
        },
        filter(event,player,name){
            return player==_status.currentPhase;
        },
        forced:true,
        logTarget(event,player){
            return game.filterPlayer(target=>player.inRange(target));
        },
        async content(event,trigger,player){
            const targets=game.filterPlayer(target=>player.inRange(target));
            let boo=false;
            for(let target of targets){
                const {result}=await target.chooseToRespond('是否打出一张【闪】响应'+get.translation(player)+'使用的牌',(card,player)=>{
                    return card.name=='shan';
                }).set('ai',card=>{
                    const player=get.player();
                    const source=event.getParent().player;
                });
                if(result.bool&&trigger.card.name!='sha')boo=true;
                else if(!result.bool&&trigger.card.name=='sha'){
                    player.when({player:'useCard'}).filter(evt=>{
                        return evt.card==trigger.card;
                    }).then(()=>{
                        if(!trigger.targets.includes(target)){
                            trigger.targets.push(target);
                        };
                        trigger.directHit.addArray(game.filterPlayer());
                    }).vars({target:target});
                };
            };
            if(boo){
                player.addSkill(event.name+'_damage');
                player.storage[event.name+'_damage']++;
            };
        },
        mod:{
            targetInRange(card,player,target,now){
                if(card.name=='sha')return true;
            },
            cardUsable(card,player,num){
                if(card.name=='sha')return Infinity;
            },
        },
        subSkill:{
            'damage':{
                trigger:{
                    player:'useCard',
                },
                silent:true,
                direct:true,
                mark:true,
                charlotte:true,
                init(player,skill){
                    player.storage[skill]=0;
                },
                oremove(player,skill){
                    delete player.storage[skill];
                },
                intro:{
                    content:'下张【杀】伤害值基数+#',
                },
                filter(event,player,name){
                    return event.card.name=='sha';
                },
                async content(event,trigger,player){
                    trigger.baseDamage+=player.storage[event.name];
                    player.removeSkill(event.name);
                },
            },
        },
    },
};
const block=skills;
export default skills;
