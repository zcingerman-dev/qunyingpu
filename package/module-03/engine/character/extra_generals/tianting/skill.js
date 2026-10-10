import {lib,game,ui,get,ai,_status} from "../../../noname.js";
import translate from "./translate.js";
const skills = {
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:3937; original skill zqchengchen
zqchengchen: {
                            audio: 'ext:天庭/audio/skill/sp_zq_sunquan:3',
                            direct: true,
                            locked: false,
                            forced: true,
                            trigger: {
                                player: 'phaseUseBegin',
                            },
                            filter: function (event, player) {
                                return player.countCards('h') >= 2;
                            },
                            content: function () {
                                'step 0'
                                player.chooseCardTarget({
                                    position: 'h',
                                    filterCard: true,
                                    selectCard: 2,
                                    filterTarget: function (card, player, target) {
                                        return player != target;
                                    },
                                    ai1: function (card) {
                                        if (card.name == 'du') return 20;
                                        if (get.tag(card, 'damage')) return 3 + get.value(card);
                                        return 5 - get.value(card);
                                    },
                                    ai2: function (target) {
                                        var att = get.attitude(_status.event.player, target);
                                        if (ui.selected.cards.length && ui.selected.cards[0].name == 'du') {
                                            if (target.hasSkillTag('nodu')) return 0;
                                            return 4 - att;
                                        }
                                        if (target.countCards('h') >= target.hp) return 2 - att;
                                        return -att;
                                    },
                                    prompt: get.prompt2('zqchengchen'),
                                });
                                'step 1'
                                if (result.bool) {
                                    var target = result.targets[0];
                                    var cards = result.cards;
                                    player.storage.zqchengchen_mod = target;
                                    player.logSkill('zqchengchen', target);
                                    player.addTempSkill('zqchengchen_mod', { player: 'phaseUseBefore' });
                                    player.give(cards, target);
                                }
                            },
                            group: 'zqchengchen_damage',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:3985; original skill zqchengchen_mod
zqchengchen_mod: {
                            mod: {
                                targetEnabled: function (card, player, target, now) {
                                    if (target.storage.zqchengchen_mod && target.storage.zqchengchen_mod == player) {
                                        if (get.tag(card, 'damage')) return false;
                                    }
                                },
                            },
                            mark: true,
                            marktext: '称臣︎',
                            intro: {
                                name: '称臣︎',
                                content: function (storage, player) {
                                    if (player.storage.zqchengchen_mod) return '【' + get.translation(player.storage.zqchengchen_mod) + '】不能使用可以造成伤害的牌指定【' + get.translation(player) + '】为目标';
                                    return '【称臣】选择的角色不能使用可以造成伤害的牌指定【' + get.translation(player) + '】为目标';
                                },
                            },
                            trigger: {
                                global: 'loseEnd',
                            },
                            charlotte: true,
                            forced: true,
                            filter: function (event, player) {
                                return player.storage.zqchengchen_mod && player.storage.zqchengchen_mod == event.player && event.type == 'discard' && event.cards.filterInD('d').length > 0;
                            },
                            content: function () {
                                var cards = trigger.cards.filterInD('d');
                                if (cards) {
                                    player.gain(cards);
                                    game.log(player, '获得了', player.storage.zqchengchen_mod, '弃置的', cards);
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) {
                                        if (player.hasSkill('zqwuwang') && player.storage.zqchengchen_mod && get.tag(card, 'damage') && player.storage.zqchengchen_mod == target && player != target) return 'zeroplayertarget';
                                        //return;
                                    },
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4041; original skill zqwuwang
zqwuwang: {
                            audio: 'ext:天庭/audio/skill/sp_zq_sunquan:3',
                            derivation: 'zqliujian',
                            trigger: {
                                global: 'roundStart',
                            },
                            priority: 20,
                            juexingji: true,
                            forced: true,
                            skillAnimation: true,
                            animationColor: 'metal',
                            filter: function (event, player) {
                                return !player.hasSkill('zqwuwang_awaken') && game.roundNumber > 1;
                            },
                            content: function () {
                                player.awakenSkill('zqwuwang');
                                player.removeSkill('zqchengchen');
                                game.broadcastAll(function (player) {
                                    player.group = 'wu';
                                }, player);
                                game.log(player, '将势力改为<font color=\"#68DD7F\">【吴】</font>');
                                player.addSkill('zqliujian');
                            },
                            group: ['zqwuwang_damage', 'zqwuwang_round'],
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4081; original skill zqwuwang_awaken
zqwuwang_awaken: {
                            charlotte: true,
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4098; original skill zqliujian
zqliujian: {
                            audio: 'ext:天庭/audio/skill/sp_zq_sunquan:2',
                            forced: true,
                            direct: true,
                            trigger: {
                                player: 'useCard',
                            },
                            filter: function (event, player) {
                                if (player.hasSkill('zqliujian_basic') && player.hasSkill('zqliujian_trick') && player.hasSkill('zqliujian_equip') && player.hasSkill('zqliujian_heart') && player.hasSkill('zqliujian_spade') && player.hasSkill('zqliujian_club') && player.hasSkill('zqliujian_diamond')) return false;
                                return ['heart', 'diamond', 'club', 'spade'].includes(get.suit(event.card)) && ['basic', 'trick', 'equip'].includes(get.type2(event.card)) && ['black', 'red'].includes(get.color(event.card));
                            },
                            content: function () {
                                var color = get.color(trigger.card);
                                var type = get.type2(trigger.card);
                                var suit = get.suit(trigger.card);
                                if (player.hasSkill('zqliujian_red') || player.hasSkill('zqliujian_black')) {
                                    var numd = 0;
                                    if (!player.hasSkill('zqliujian_' + color)) {
                                        player.addTempSkill('zqliujian_' + color);
                                        numd++;
                                    }
                                    if (!player.hasSkill('zqliujian_' + type)) {
                                        player.addTempSkill('zqliujian_' + type);
                                        numd++;
                                    }
                                    if (!player.hasSkill('zqliujian_' + suit)) {
                                        player.addTempSkill('zqliujian_' + suit);
                                        numd++;
                                    }
                                    if (numd > 0) {
                                        player.logSkill('zqliujian');
                                        player.draw(numd);
                                    }
                                } else {
                                    player.addTempSkill('zqliujian_' + color);
                                    player.addTempSkill('zqliujian_' + type);
                                    player.addTempSkill('zqliujian_' + suit);
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) {
                                        var type = get.type2(card);
                                        var suit = get.suit(card);
                                        if (get.tag(card, 'damage') && player != target && get.attitude(player, target) <= 0) {
                                            if (!player.hasSkill('zqliujian_' + type)) return [1, 2];
                                            if (!player.hasSkill('zqliujian_' + suit)) return [1, 2];
                                        }
                                        //return;
                                    },
                                },
                            },
                            global: 'zqliujian_wuliu',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4178; original skill zqliujian_basic
zqliujian_basic: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#FFFF00\">基</font>︎', //黄色
                            intro:{
                                name: '基本牌',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4186; original skill zqliujian_trick
zqliujian_trick: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#68DD7F\">锦</font>', //绿色，无名杀绿色是68DD7F
                            intro:{
                                name: '锦囊牌',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4194; original skill zqliujian_equip
zqliujian_equip: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#00CCFF\">装</font>', //蓝色
                            intro:{
                                name: '装备牌',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4202; original skill zqliujian_heart
zqliujian_heart: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♥</font>︎',
                            intro:{
                                name: '红桃',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4210; original skill zqliujian_spade
zqliujian_spade: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♠</font>︎︎',
                            intro:{
                                name: '黑桃',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4218; original skill zqliujian_club
zqliujian_club: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♣</font>︎︎',
                            intro:{
                                name: '梅花',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4226; original skill zqliujian_diamond
zqliujian_diamond: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♦</font>︎︎',
                            intro:{
                                name: '方块︎︎',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4162; original skill zqliujian_red
zqliujian_red: {
                            charlotte: true,
                            /*mark:true,
                            marktext:'<font color=\"#FF66FF\">红</font>︎',
                            intro:{
                                name:'红色︎',
                            },*/
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4170; original skill zqliujian_black
zqliujian_black: {
                            charlotte: true,
                            /*mark:true,
                            marktext:'黑︎',
                            intro:{
                                name:'黑色︎',
                            },*/
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4152; original skill zqliujian_wuliu
zqliujian_wuliu: {
                            //equipSkill:true,
                            mod: {
                                attackFrom: function (from, to, distance) {
                                    if (from.group == 'wu') return distance - game.countPlayer(function (current) {
                                        return current.hasSkill('zqliujian');
                                    });
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4066; original skill zqwuwang_damage
zqwuwang_damage: {
                            trigger: {
                                player: 'damageEnd',
                            },
                            priority: 11,
                            forced: true,
                            popup: false,
                            charlotte: true,
                            filter: function (event, player) {
                                return !player.hasSkill('zqwuwang_awaken') && event.num > 0;
                            },
                            content: function () {
                                player.addSkill('zqwuwang_awaken');
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4084; original skill zqwuwang_round
zqwuwang_round: {
                            trigger: {
                                global: 'roundStart',
                            },
                            charlotte: true,
                            forced: true,
                            priority: -1,
                            filter: function (event, player) {
                                return player.hasSkill('zqwuwang_awaken') && game.roundNumber > 1;
                            },
                            content: function () {
                                player.removeSkill('zqwuwang_awaken');
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4026; original skill zqchengchen_damage
zqchengchen_damage: {
                            trigger: {
                                source: 'damageEnd',
                            },
                            priority: 3,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                return player.storage.zqchengchen_mod && event.player == player.storage.zqchengchen_mod && player.hasSkill('zqchengchen_mod') && event.num > 0;
                            },
                            content: function () {
                                player.removeSkill('zqchengchen_mod');
                                delete player.storage.zqchengchen_mod;
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4416; original skill zqjiamei
zqjiamei: {
                            audio: 'ext:天庭/audio/skill/sp_zq_caocao:3',
                            trigger: {
                                global: 'phaseBefore',
                            },
                            filter: function (event, player) {
                                game.log('    '); //隔开记录
                                return event.player != player && !player.isTurnedOver();
                            },
                            check: function (event, player) {
                                var pp = event.player;
                                if (!player.hasSkill('zqbaoqi')) return false;
                                if (player.hasJudge('lebu') && player.countCards('h', { name: 'wuxie' }) == 0 && (player.countCards('h', { name: 'shan' }) > 0 || player.countCards('h', { name: 'tao' }) > 0)) return true; //有桃闪被乐✔
                                if (get.attitude(player, pp) > 0) return false; //队友的回合
                                if (player.countCards('h') < 30 && player.countCards('h', { name: 'tao' }) > 0) return true; //有桃时手牌小于30✔
                                if (player.countCards('h') > 15) return false; //手牌不能超过15
                                if (player.countCards('h', { name: 'shan' }) > 0 || player.countCards('h', { name: 'tao' }) > 0 || player.countCards('h', { name: 'jiu' }) > 0) return true; //有闪酒桃✔
                                return false;
                                //var pp=_status.currentPhase; //还是上一回合的玩家
                                //if(player.countCards('h',{name:'shan'})==0) return true; //没有闪 //player.getPrevious()!=pp&&
                            },
                            content: function () {
                                if (!player.isTurnedOver()) {
                                    player.storage.zqjiameiAudio = true; //防止语音重叠
                                    player.turnOver();
                                    player.draw();
                                }
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4235; original skill zqbaoqi
zqbaoqi: {
                            audio: 'ext:天庭/audio/skill/sp_zq_caocao:3',
                            forced: true,
                            trigger: {
                                player: ['useCard', 'respond'],
                            },
                            filter: function (event, player) {
                                return player.isTurnedOver() && _status.currentPhase && player != _status.currentPhase;
                            },
                            content: function () {
                                if (player.isTurnedOver()) {
                                    game.log(player, '突然睁眼');
                                    player.turnOver();
                                    if (_status.currentPhase && _status.currentPhase.hasMark('zqyixin')) _status.currentPhase.damage(_status.currentPhase.countMark('zqyixin'));
                                    //player.useCard({name:'sha'},_status.currentPhase,false);
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) { //尽量救队友
                                        if (_status.currentPhase) var pp = _status.currentPhase;
                                        if (player.isTurnedOver() && get.name(card) == 'tao' && player.getFriends().includes(target) && pp && get.attitude(player, pp) < 1 && pp.hasMark('zqyixin')) return [1, 2];
                                        //return;
                                    },
                                    target: function (card, player, target) { //攻击你有负面效果
                                        var numh = target.countCards('h');
                                        if (_status.currentPhase) {
                                            var pp = _status.currentPhase;
                                            var att = get.attitude(target, pp);
                                        }
                                        var name = get.name(card);
                                        if (pp && target.isTurnedOver() && att > 1 && pp.hasMark('zqyixin') && player == pp && pp != target) {
                                            if (target.hp > 1) return 0; //队友回合不要出牌
                                            if (get.tag(card, 'damage')) return [1, -2];
                                            return;
                                        }
                                        if (pp && player == pp && pp.hasMark('zqyixin') && target.isTurnedOver() && get.tag(card, 'damage')) {
                                            if (numh > 3 && (name == 'juedou' || name == 'nanman')) return [1, 0, 1, -1.5 * pp.countMark('zqyixin')];
                                            if (pp.countMark('zqyixin') >= pp.hp) return [1, 0, 1, -pp.countMark('zqyixin') - numh / 5];
                                            return [1, 0, 1, -numh / 5];
                                        }
                                        //return;
                                    },
                                },
                            },
                            //group:'zqbaoqi2',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4318; original skill zqyixin
zqyixin: {
                            audio: 'ext:天庭/audio/skill/sp_zq_caocao:4',
                            trigger: {
                                player: 'damageEnd',
                            },
                            priority: 3,
                            direct: true,
                            frequent: true,
                            onremove: true,
                            //mark:true,
                            marktext: '疑',
                            intro:{
                                name: '疑心',
                                content: 'mark',
                            },
                            filter: function (event, player) {
                                return event.num >= 1;
                            },
                            content: function () {
                                const audio = ['zqyixin1', 'zqyixin2'].randomGet();
                                game.playAudio('../extension/天庭/audio/skill/sp_zq_caocao/' + audio + '.mp3');
                                if (trigger.source && trigger.num >= 1) {
                                    if (!trigger.source.hasMark('zqyixin')) trigger.source.addMark('zqyixin', Math.min(3, trigger.num)); //没有则最多3
                                    else {
                                        var numk = trigger.source.countMark('zqyixin');
                                        if (numk == 1) trigger.source.addMark('zqyixin', Math.min(2, trigger.num)); //有1个最多2
                                        if (numk == 2) trigger.source.addMark('zqyixin', 1); //有2个+1
                                        if (numk > 3) trigger.source.removeMark('zqyixin', numk - 3); //超过3个的部分移除
                                    }
                                }
                            },
                            group: ['zqyixin2', 'zqyixin3'],
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4351; original skill zqyixin2
zqyixin2: {
                            trigger: {
                                global: 'phaseBegin',
                            },
                            priority: 4,
                            //direct:true,
                            //locked:false,
                            forced: true,
                            filter: function (event, player) {
                                return event.player != player;
                            },
                            content: function () {
                                'step 0'
                                if (player.storage.zqjiameiAudio) delete player.storage.zqjiameiAudio;
                                else {
                                    player.logSkill('zqyixin2');
                                    const audio = ['zqyixin3', 'zqyixin4'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/sp_zq_caocao/' + audio + '.mp3');
                                }
                                if (trigger.player.countCards('h') <= 0) {
                                    if (!trigger.player.hasMark('zqyixin') || trigger.player.countMark('zqyixin') < 3) trigger.player.addMark('zqyixin', 1);
                                    event.finish();
                                } else {
                                    event.numh = Math.ceil(trigger.player.countCards('h') / 2);
                                    trigger.player.chooseCard('h', event.numh, '将一半的手牌(向上取整)交给' + get.translation(player) + '并弃置一枚「疑」，否则你获得一枚「疑」').set('ai', function (card) {
                                        var att = get.attitude(trigger.player, player);
                                        var name = get.name(card);
                                        if (att <= 1) {
                                            if (!player.isTurnedOver()) return 0;
                                            if (!trigger.player.hasMark('zqyixin')) return 0;
                                            if (name == 'shan' || name == 'tao' || name == 'jiu' || name == 'wuxie') return 0;
                                        }
                                        if (att > 1) {
                                            if (name == 'tao' || name == 'wuxie') return 20;
                                            if (event.numh > 3) return 20 - get.value(card);
                                            return 3 - get.value(card);
                                        }
                                        if (!player.hasFriend() && trigger.player.hasMark('zqyixin') && trigger.player.countMark('zqyixin') >= trigger.player.hp) {
                                            return 20 - get.value(card);
                                        }
                                        if (event.numh == 1) return 6 - get.value(card);
                                        if (event.numh < 4) return 4 - get.value(card);
                                        return 0;
                                    });
                                }
                                'step 1'
                                if (result.bool) {
                                    trigger.player.give(result.cards, player, true);
                                    if (trigger.player.hasMark('zqyixin')) trigger.player.removeMark('zqyixin', 1);
                                } else {
                                    if (!trigger.player.hasMark('zqyixin') || trigger.player.countMark('zqyixin') < 3) trigger.player.addMark('zqyixin', 1);
                                }
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4405; original skill zqyixin3
zqyixin3: {
                            forced: true,
                            forceDie: true,
                            charlotte: true,
                            trigger: { player: 'dieAfter' },
                            content: function () {
                                for (var i of game.players) {
                                    if (i.hasMark('zqyixin')) i.removeMark('zqyixin', i.countMark('zqyixin'), false);
                                }
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4812; original skill zqzhengtong
zqzhengtong: {
                            audio: 'ext:天庭/audio/skill/sp_zq_liushan:3',
                            locked: true,
                            mod: {
                                cardUsable: function (card) {
                                    if (get.info(card) && get.info(card).forceUsable) return;
                                    return Infinity;
                                },
                                targetInRange: function () {
                                    return true;
                                },
                            },
                            trigger: {
                                source: 'damageEnd',
                                player: 'damageEnd',
                            },
                            frequent: true,
                            filter: function (event, player) {
                                return event.num >= 1;
                            },
                            content: function () {
                                if (trigger.num >= 1) player.draw(trigger.num);
                            },
                            ai: {
                                effect: { //不酒杀
                                    player: function (card, player, target) {
                                        var name = get.name(card);
                                        if (player == target && player.hp > 0 && name == 'jiu' && !player.hasSkill('zqanle') && !player.hasSkill('zqanlex')) return [1, -1];
                                        //return;
                                    },
                                },
                            },
                            group: ['zqzhengtong1', 'zqzhengtong2', 'zqzhengtongx'],
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4581; original skill zqanle
zqanle: {
                            audio: 'ext:天庭/audio/skill/sp_zq_liushan:4',
                            trigger: {
                                source: 'damageBegin1',
                            },
                            priority: -100,
                            lastDo: true,
                            forced: true,
                            direct: true,
                            charlotte: true,
                            persevereSkill: true,
                            //fixed:true,
                            //superCharlotte:true,
                            filter: function (event, player) {
                                return event.num > 0;
                            },
                            init2: function (player) {
                                if (player.hasSkill('zqanlex')) player.removeSkill('zqanlex');
                            },
                            ondisable: true,
                            onremove: true,
                            onremove: function (player) {
                                if (player.hasSkill('zqzhengtong')) player.addSkill('zqanlex');
                            },
                            content: function () {
                                game.playAudio('../extension/天庭/audio/skill/sp_zq_liushan/zqanle1.mp3');
                                game.log(player, '对', trigger.player, '造成的伤害-1');
                                if (trigger.num < 1) trigger.num = 0;
                                else trigger.num--;
                            },
                            group: ['zqanle1', 'zqanle_ai_jiu', 'zqanle_die'],
                            global: 'zqanle_ai',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4614; original skill zqanlex
zqanlex: { //相同技能
                            audio: 'ext:天庭:0',
                            trigger: {
                                source: 'damageBegin1',
                            },
                            priority: -101,
                            lastDo: true,
                            forced: true,
                            direct: true,
                            charlotte: true,
                            persevereSkill: true,
                            //fixed:true,
                            //superCharlotte:true,
                            filter: function (event, player) {
                                return event.num > 0 && !player.hasSkill('zqanle');
                            },
                            init2: function (player) {
                                if (player.hasSkill('zqanle')) player.removeSkill('zqanle');
                            },
                            ondisable: true,
                            onremove: true,
                            onremove: function (player) {
                                if (player.hasSkill('zqzhengtong')) player.addSkill('zqanle');
                            },
                            get content() { return lib.skill.zqanle.content },
                            set content(content) { lib.skill.zqanle.content = content },
                            group: ['zqanle1', 'zqanle_ai_jiu', 'zqanle_die'],
                            global: 'zqanle_ai',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4661; original skill zqanle1
zqanle1: {
                            usable: 3,
                            trigger: {
                                player: 'damageBegin3',
                            },
                            firstDo: true,
                            fixed: true,
                            direct: true,
                            forced: true,
                            charlotte: true,
                            filter: function (event, player) {
                                return event.num > 0 && game.hasPlayer(function (current) {
                                    return !current.hasSkill('zqanle') && !current.hasSkill('zqanlex') && current.hasSkill('zqzhengtong');
                                });
                            },
                            content: function () {
                                'step 0'
                                var targetx = game.players.filter(function (i) {
                                    return !i.hasSkill('zqanle') && !i.hasSkill('zqanlex') && i.hasSkill('zqzhengtong');
                                });
                                if (targetx && targetx.length) {
                                    if (targetx.length == 1) {
                                        player.line(targetx[0]);//射线
                                        trigger.player = targetx[0];
                                        game.log('<font color=\"#68DD7F\">【安乐】</font>：', targetx[0], '替', player, '受到伤害');
                                        event.finish();
                                    } else {
                                        var next = player.chooseTarget(true, '选择一名有【正统】的角色替你受到伤害');
                                        next.set('filterTarget', function (card, player, target) {
                                            return targetx.includes(target);
                                        });
                                        next.set('ai', function (target) {
                                            return -get.attitude(_status.event.player, target);
                                        });
                                    }
                                } else event.finish();
                                'step 1'
                                if (result.bool) {
                                    const audio = ['zqanle2', 'zqanle3', 'zqanle4'].randomGet();
                                    game.playAudio('../extension/天庭/audio/skill/sp_zq_liushan/' + audio + '.mp3');
                                    player.line(result.targets[0]);
                                    trigger.player = result.targets[0];
                                    game.log('<font color=\"#68DD7F\">【安乐】</font>：', result.targets[0], '替', player, '受到伤害');
                                }
                            },
                            ai: {
                                maixie: true,
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, 'damage') && target != player) {
                                            if (target.storage.counttrigger && target.storage.counttrigger['zqanle1'] >= 3) {
                                                if (get.attitude(player, target) < 0) return [1, -1, 1, 3]; //攻击我
                                                return;
                                            }
                                            var targetx = game.players.filter(function (i) {
                                                return i.hasSkill('zqzhengtong') && !i.hasSkill('zqanle') && !i.hasSkill('zqanlex');
                                            });
                                            if (targetx) {
                                                if (targetx.length == 1) {
                                                    if (player == targetx[0]) { //单挑
                                                        if (targetx[0].hp <= 1) return [0, 0, 1, -2];
                                                        if (game.zhu && targetx[0] == game.zhu) return;
                                                        return [0, -0.5, 1, -0.2];
                                                    }
                                                    if (get.attitude(target, targetx[0]) < 0) return [-1, 2]; //你的敌人，卖血
                                                    if (get.attitude(player, targetx[0]) < 0) return [1, -1, 1, 1]; //player的敌人，攻击你
                                                    return; //共同队友
                                                }
                                                if (targetx.length > 1) {
                                                    if (game.hasPlayer(function (current) {
                                                        var att1 = get.attitude(target, current);
                                                        var zqzhengtong = current.hasSkill('zqzhengtong') && !current.hasSkill('zqanle') && !current.hasSkill('zqanlex');
                                                        return zqzhengtong && att1 < 0;
                                                    })) return [-1, 3]; //有我的敌人，卖血
                                                    if (game.hasPlayer(function (current) {
                                                        var att2 = get.attitude(player, current);
                                                        var zqzhengtong = current.hasSkill('zqzhengtong') && !current.hasSkill('zqanle') && !current.hasSkill('zqanlex');
                                                        return zqzhengtong && att2 >= 0;
                                                    })) return [1, -1, 1, -3]; //有共同队友，不能攻击我
                                                    return [1, -1, 1, 3]; //有player的敌人，攻击我
                                                } return;
                                            } return;
                                        } return;
                                    },
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4748; original skill zqanle_ai_jiu
zqanle_ai_jiu: {
                            trigger: {
                                player: 'useCardBefore',
                            },
                            popup: false,
                            forced: true,
                            fixed: true,
                            charlotte: true,
                            superCharlotte: true,
                            content: function () {
                                'step 0'
                                if (player.hasSkill('jiu') && get.name(trigger.card) == 'sha') player.storage.zqanle_ai_jiu = true;
                                else if (player.storage.zqanle_ai_jiu) delete player.storage.zqanle_ai_jiu;
                                'step 1'
                                var func = function (skill) {
                                    var info = get.info(skill);//技能信息
                                    if (!info || info.charlotte) return false;
                                    //if(!lib.translate[skill+'_info']) return false;
                                    return true;
                                };
                                var skills = [];
                                var skilln = player.getSkills(true);//已获得的技能(删掉第二个false则包括装备)
                                for (var i = 0; i < skilln.length; i++) {
                                    if (func(skilln[i])) skills.add(skilln[i]);
                                }
                                if (player.storage.zqanle_ai_skill) delete player.storage.zqanle_ai_skill;
                                if (skills) {
                                    for (let i of skills) {
                                        if (lib.translate[i + '_info'] && lib.translate[i + '_info'].indexOf('伤害+') != -1 && lib.translate[i + '_info'].indexOf('受到') == -1) return player.storage.zqanle_ai_skill = true;
                                    }
                                }
                            },
                            ai: {
                                effect: {
                                    player: function (card, player, target) { //酒杀，不浪费牌
                                        var name = get.name(card);
                                        if (target && get.attitude(player, target) < 0) {
                                            if ((player.hasSkill('jiu') && name == 'sha') || (name == 'jiu' && !player.hasSkill('jiu') && player == target)) return [1, 1.4];
                                            if (player.countCards('h') > player.getHandcardLimit() && get.tag(card, 'damage')) return [1, 1.4];
                                        }
                                        //return;
                                    },
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4793; original skill zqanle_die
zqanle_die: {
                            forced: true,
                            forceDie: true,
                            charlotte: true,
                            trigger: { player: 'dieAfter' },
                            filter: function (event, player) {
                                return game.hasPlayer(function (current) {
                                    return current.hasSkill('zqzhengtong');
                                });
                            },
                            content: function () {
                                for (var i = 0; i < game.players.length; i++) {
                                    if (game.players[i].hasSkill('zqzhengtong')) {
                                        game.log(game.players[i], '失去了技能<font color=\'##68DD7F\'>【正统】</font>');
                                        game.players[i].removeSkill('zqzhengtong');
                                    }
                                }
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4643; original skill zqanle_ai
zqanle_ai: {
                            ai: {
                                effect: {
                                    target: function (card, player, target, current) { //安乐伤害减一
                                        if ((player.hasSkill('zqanle') || player.hasSkill('zqanlex')) && get.tag(card, 'damage') && target != player) {
                                            var numx = get.tag(card, 'damage');
                                            if (numx > 1) return;
                                            if (player.hasSkillTag('jueqing', false, target)) return;
                                            //if(player.hasSkillTag('damageBonus')) return;
                                            if (player.storage.zqanle_ai_jiu) return;
                                            if (player.storage.zqanle_ai_skill) return;
                                            return 0; //return [0,0,1,1]; //没效果
                                        }
                                        //return;
                                    },
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4846; original skill zqzhengtong1
zqzhengtong1: {
                            trigger: {
                                player: 'gainEnd',
                            },
                            forced: true,
                            priority: 2,
                            filter: function (event, player) {
                                var evt = event.getParent('phaseUse');
                                return event.cards && event.cards.length && evt && evt.player == player && event.getParent().name == 'draw' && event.getParent(2).name != 'zqzhengtong';
                            },
                            content: function () {
                                if (trigger.cards && trigger.cards.length) player.addGaintag(trigger.cards, 'zqzhengtong');
                                //if(player.countDiscardableCards(player,'he')) player.chooseToDiscard('he','【正统】：弃置一张牌',true,lib.filter.cardDiscardable);
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4861; original skill zqzhengtong2
zqzhengtong2: {
                            mod: {
                                cardDiscardable: function (card, player) {
                                    if (card.hasGaintag('zqzhengtong')) return false;
                                },
                                'cardEnabled2': function (card, player) {
                                    if (get.itemtype(card) == 'card' && card.hasGaintag('zqzhengtong')) return false;
                                },
                            },
                            trigger: {
                                player: 'phaseUseEnd',
                            },
                            forced: true,
                            popup: false,
                            charlotte: true,
                            /*filter:function(event){
                                return event.num<0;
                            },*/
                            content: function () {
                                player.removeGaintag('zqzhengtong');
                            },
                            onremove: function (player) {
                                player.removeGaintag('zqzhengtong');
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4886; original skill zqzhengtongx
zqzhengtongx: {
                            trigger: {
                                source: 'damageBefore',
                            },
                            priority: 10,
                            forced: true,
                            fixed: true,
                            charlotte: true,
                            superCharlotte: true,
                            filter: function (event, player) {
                                for (var i in player.disabledSkills) {
                                    if (i == 'zqanle' || i == 'zqanlex') return true;
                                };
                                return false;
                            },
                            content: function () {
                                for (var i in player.disabledSkills) {
                                    if (i == 'zqanle') delete player.disabledSkills['zqanle'];
                                    if (i == 'zqanlex') delete player.disabledSkills['zqanlex'];
                                }
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4538; original skill zqguixiang
zqguixiang: {
                            audio: 'ext:天庭/audio/skill/sp_zq_liushan:3',
                            trigger: {
                                player: 'dying',
                            },
                            check: function (event, player) {
                                if (!player.hasFriend()) return true;
                                return (game.zhu && player == game.zhu) || !_status.currentPhase || get.attitude(player, _status.currentPhase) >= 0;
                            },
                            limited: true,
                            unique: true,
                            locked: false,
                            filter: function (event, player) {
                                return player.hp <= 0;
                            },
                            skillAnimation: true,
                            animationColor: 'thunder',
                            content: function () {
                                'step 0'
                                player.awakenSkill('zqguixiang');
                                'step 1'
                                var num = player.maxHp - player.hp;
                                if (num) player.recover(num);
                                'step 2'
                                if (_status.currentPhase && _status.currentPhase.isAlive()) _status.currentPhase.addSkill('zqzhengtong');
                            },
                            mark: true,
                            intro:{
                                content: 'limited',
                            },
                            ai: {
                                threaten: 4,
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, 'damage') && target != player && (target.hp == 1 || get.mode() == 'identity' && game.zhu && target == game.zhu && target.hp <= 2) && player.identity != 'zhong' && player.identity != 'mingzhong') return [0, 0, 1, 10]; //攻击我，拿技能正统
                                        if ((get.tag(card, 'recover') || get.tag(card, 'save')) && (target == player || get.attitude(player, target) >= 0)) {
                                            if (get.mode() == 'identity' && game.zhu && target == game.zhu) return [0, -2]; //队友不要救
                                        }
                                        //return;
                                    },
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:4446; original skill zqtuiwei
zqtuiwei: {
                            audio: 'ext:天庭:0',
                            trigger: {
                                player: 'zqguixiangAfter',
                            },
                            zhuSkill: true,
                            'prompt2': function (event, player) {
                                return '是否令一名有【正统】的角色成为“主公”，并令你成为“忠臣”？';
                            },
                            filter: function (event, player) {
                                return get.mode() == 'identity' && game.zhu && player == game.zhu && game.hasPlayer(function (current) {
                                    return !current.hasSkill('zqanle') && !current.hasSkill('zqanlex') && current.hasSkill('zqzhengtong');
                                });
                            },
                            content: function () {
                                'step 0'
                                var targetx = game.players.filter(function (i) {
                                    return !i.hasSkill('zqanle') && !i.hasSkill('zqanlex') && i.hasSkill('zqzhengtong');
                                });
                                if (targetx && targetx.length) {
                                    if (targetx.length == 1) {
                                        var zqtuiwei_zhu = targetx[0];
                                        player.line(zqtuiwei_zhu);//射线
                                        game.broadcastAll(function (player, zqtuiwei_zhu) {
                                            zqtuiwei_zhu.identity = player.identity;
                                            delete player.isZhu;
                                            player.identity = 'zhong';
                                            game.zhu = zqtuiwei_zhu;
                                            zqtuiwei_zhu.showIdentity();
                                            player.showIdentity();
                                        }, player, zqtuiwei_zhu);
                                        zqtuiwei_zhu.gainMaxHp();
                                        game.log('【', player, '退位】，将“主公”让给了', zqtuiwei_zhu);
                                        event.goto(2);
                                    } else {
                                        var next = player.chooseTarget(true, '选择一名拥有【正统】的角色成为“主公”，之后你成为“忠臣”');
                                        next.set('filterTarget', function (card, player, target) {
                                            return targetx.includes(target);
                                        });
                                        next.set('ai', function (target) {
                                            return -get.attitude(_status.event.player, target);
                                        });
                                    }
                                } else event.goto(2);
                                'step 1'
                                if (result.bool) {
                                    var zqtuiwei_zhu = result.targets[0];
                                    player.line(zqtuiwei_zhu);//射线
                                    game.broadcastAll(function (player, zqtuiwei_zhu) {
                                        zqtuiwei_zhu.identity = player.identity;
                                        delete player.isZhu;
                                        player.identity = 'zhong';
                                        game.zhu = zqtuiwei_zhu;
                                        zqtuiwei_zhu.showIdentity();
                                        player.showIdentity();
                                    }, player, zqtuiwei_zhu);
                                    zqtuiwei_zhu.gainMaxHp();
                                    game.log('【', player, '退位】，选择将“主公”让给', zqtuiwei_zhu);
                                }
                                'step 2'
                                var targetx = game.players.filter(function (i) {
                                    return i.identity == 'nei';
                                });
                                if (targetx && targetx.length) {
                                    event.numn = 0;
                                    event.targetx = targetx;
                                } else {
                                    if (_status.connectMode) game.checkOnlineResult?.(); else game.checkResult?.();
                                    event.finish();
                                }
                                'step 3'
                                event.targets = event.targetx[event.numn];
                                event.numn++;
                                event.targets.chooseControl('确定', 'cancel2').set('prompt', '【退位】：是否加入“反贼”阵营？');
                                'step 4'
                                if (result.control == '确定') {
                                    var zqtuiwei_fan = event.targets;
                                    if (zqtuiwei_fan.identity != 'fan') {
                                        zqtuiwei_fan.line(player);
                                        game.broadcastAll(function (player, zqtuiwei_fan) {
                                            zqtuiwei_fan.identity = 'fan';
                                            zqtuiwei_fan.showIdentity();
                                        }, player, zqtuiwei_fan);
                                        game.log('【', player, '退位】，原内奸', zqtuiwei_fan, '选择加入“反贼”阵营');
                                    }
                                }
                                'step 5'
                                if (event.numn < event.targetx.length) event.goto(3);
                                'step 6'
                                if (_status.connectMode) game.checkOnlineResult?.(); else game.checkResult?.();
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6218; original skill zqqibu
zqqibu: {
                            mod: {
                                aiUseful: function (player, card, num) {
                                    if (player.getHandcardLimit() > 1 && get.name(card) == 'shan') return 0; //手牌上限
                                },
                            },
                            trigger: {
                                player: 'damageEnd',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shencaozhi:3',
                            direct: true,
                            locked: false,
                            filter: function (event, player) {
                                return !player.hasSkill('zqqibu_chengshi');
                            },
                            content: function () {
                                'step 0'
                                var h = [];
                                var cardh = player.getCards('h').filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                for (var i = 0; i < cardh.length; i++) {
                                    h.add(cardh[i].suit);
                                }
                                player.chooseControl('确定', 'cancel2').set('prompt', '【七步】：展示手牌和牌堆顶的七张牌并使用其中至多4张。若使用的牌的原本花色不足4种，你减少一点体力上限').set('ai', function () {
                                    if (h.length > 1) return 0;
                                    if (player.hp < 2) return 0; //1血或者阴兵状态
                                    if (!player.hasSkill('zqchengshi')) return 0; //孙悟空发动
                                    return 1;
                                });
                                'step 1'
                                if (result.control == 'cancel2') event.finish();
                                'step 2'
                                player.logSkill('zqqibu');
                                player.removeSkill('zqqibu_heart');
                                player.removeSkill('zqqibu_spade');
                                player.removeSkill('zqqibu_club');
                                player.removeSkill('zqqibu_diamond');
                                'step 3'
                                player.addTempSkill('zqqibu_chengshi');
                            },
                            ai: {
                                maixie: true,
                                'maixie_hp': true,
                                effect: {
                                    target: function (card, player, target) {
                                        if (get.tag(card, 'damage')) {
                                            if (player.hasSkillTag('jueqing', false, target)) return [1, -2];//target指的自己
                                            if (!target.hasFriend()) return;
                                            if (target.hasSkill('zqqibu_chengshi')) return;
                                            var num = target.getCards('h').length;
                                            if (target.hp > 1) return [1, num * 0.3];
                                        }
                                    },
                                },
                            },
                            group: 'zqqibux',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6296; original skill zqqibu_chengshi
zqqibu_chengshi: { //七步成诗
                            init: function (player) {
                                player.storage.listx = [];
                            },
                            locked: false,
                            mod: {
                                aiValue: function (player, card, num) {
                                    if (player.storage.listx.length < 4) {
                                        if (!player.storage.listx.includes(card.suit) && (card.name == 'wuzhong' || card.name == 'shunshou' || card.name == 'wugu' || card.name == 'yiyi')) return num + 30;
                                        else {
                                            if (!player.storage.listx.includes(card.suit) && (card.name != 'shan' && card.name != 'wuxie')) return num + 20;
                                            else return num;
                                        }
                                    }
                                    else return num;
                                },
                            },
                            trigger: {
                                player: ['damageEnd', 'phaseBegin'],
                            },
                            direct: true,
                            charlotte: true,
                            filter: function (event, player) {
                                return !player.hasSkill('zqqibu_heart') && !player.hasSkill('zqqibu_spade') && !player.hasSkill('zqqibu_club') && !player.hasSkill('zqqibu_diamond');
                            },
                            content: function () {
                                'step 0'
                                event.num = 1;
                                var cards = get.cards(7);
                                player.storage.cs = cards;
                                if (player.countCards('h') > 0) {
                                    player.showHandcards();
                                    game.delay(2);
                                }
                                //ai需要调用：
                                var cardx = cards.filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                event.cardx = cardx;
                                player.storage.list = [];
                                player.storage.listx = [];
                                for (var i = 0; i < event.cardx.length; i++) {
                                    player.storage.listx.add(event.cardx[i].suit);
                                }
                                game.cardsGotoOrdering(cards);
                                game.log(player, '展示【牌堆顶】的7张牌：', player.storage.cs);
                                game.delay(2);
                                'step 1'
                                var cards2 = player.storage.cs.filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                var cards3 = player.getCards('h').filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                //ai需要调用：
                                for (var i = 0; i < cards3.length; i++) {
                                    player.storage.listx.add(cards3[i].suit);
                                }
                                game.log('展示的牌中包含的花色种类：', player.storage.listx);
                                if (cards2.length || cards3.length) {
                                    if (cards2.length == 0) {
                                        var next = player.chooseButton(['是否使用其中一张牌？', cards3]);
                                    }
                                    if (cards3.length == 0) {
                                        var next = player.chooseButton(['是否使用其中一张牌？', cards2]);
                                    }
                                    if (cards2.length && cards3.length) {
                                        var next = player.chooseButton(['是否使用其中一张牌？', cards2, '手牌区', cards3]);
                                    }
                                    next.set('ai', function (button) {
                                        var card = button.link;
                                        if (player.storage.listx.length == 4) {
                                            if (!player.storage.list.includes(card.suit)) {
                                                if (player.getUseValue(card) < 1) return 2;
                                                else return 2 + player.getUseValue(card);
                                            }
                                            else return 1;
                                        }
                                        else {
                                            if (!player.storage.list.includes(card.suit) && (card.name == 'wuzhong' || card.name == 'shunshou' || card.name == 'wugu' || card.name == 'yiyi')) return 30;
                                            else {
                                                if (player.storage.cs.includes(card)) return 10 + player.getUseValue(card);
                                                else return player.getUseValue(card);
                                            }
                                        }
                                    });
                                } else event.goto(3);
                                'step 2'
                                if (result.bool) {
                                    var card = result.links[0];
                                    player.chooseUseTarget(true, card, false);
                                    player.storage.cs.remove(card);
                                    player.storage.list.add(card.suit);
                                    var suit = card.suit;
                                    if (['heart', 'diamond', 'club', 'spade'].includes(suit)) {
                                        if (!player.hasSkill('zqqibu_' + suit)) player.addTempSkill('zqqibu_' + suit);
                                    }
                                }
                                'step 3'
                                event.num++;
                                if (event.num <= 4) {
                                    event.goto(1);
                                }
                                'step 4'
                                if (player.hasSkill('zqqibu_heart') && player.hasSkill('zqqibu_spade') && player.hasSkill('zqqibu_club') && player.hasSkill('zqqibu_diamond')) {
                                    if (player.hasSkill('zqchengshi')) {
                                        var cards2 = player.storage.cs.filter(function (i) {
                                            return player.hasUseTarget(i);
                                        });
                                        player.storage.zqqibux++;
                                        player.markSkill('zqqibux');
                                        player.syncStorage('zqqibux');
                                        player.logSkill('zqchengshi'); //播放语音
                                        game.log(player, '作诗成功！获得了：', cards2);
                                        player.gain(cards2);
                                    }
                                } else {
                                    if (player.maxHp > 1) game.log(player, '作诗失败！割发代首');
                                    else game.log(player, '作诗失败！被拖出去斩了');
                                    if (player.maxHp > 0) player.loseMaxHp();
                                }
                                'step 5'
                                player.removeSkill('zqqibu_heart');
                                player.removeSkill('zqqibu_spade');
                                player.removeSkill('zqqibu_club');
                                player.removeSkill('zqqibu_diamond');
                                //player.removeSkill('zqqibu_none');
                                player.removeSkill('zqqibu_chengshi');
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6426; original skill zqqibu_heart
zqqibu_heart: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♥</font>︎',
                            intro:{
                                name: '红桃',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6434; original skill zqqibu_spade
zqqibu_spade: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♠</font>︎︎',
                            intro:{
                                name: '黑桃',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6442; original skill zqqibu_club
zqqibu_club: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#8dbede\">♣</font>︎︎',
                            intro:{
                                name: '梅花',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6450; original skill zqqibu_diamond
zqqibu_diamond: {
                            charlotte: true,
                            mark: true,
                            marktext: '<font color=\"#ef1806\">♦</font>︎︎',
                            intro:{
                                name: '方块︎︎',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6110; original skill zqchengshi
zqchengshi: {
                            audio: 'ext:天庭/audio/skill/zq_shencaozhi:3',
                            /* trigger:{
                                player:'useCard',
                            },
                            onremove:true,
                            frequent:true,
                        intro:{
                            content:'已记录花色：$',
                        },
                        filter:function(event,player){
                            return player==event.getParent('phase').player&&!player.getStorage('zqchengshi').includes(event.card.suit);
                        },
                        content:function(){
                            player.markAuto('zqchengshi',[trigger.card.suit]);
                        },*/
                            group: ['zqchengshi2', 'zqchengshi3'], //'zqchengshi1',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6170; original skill zqchengshi2
zqchengshi2: {
                            trigger: {
                                player: 'phaseAfter',
                            },
                            charlotte: true,
                            direct: true,
                            content: function () {
                                if (player.getStorage('zqchengshi').includes('heart')) player.unmarkAuto('zqchengshi', ['heart']);
                                if (player.getStorage('zqchengshi').includes('spade')) player.unmarkAuto('zqchengshi', ['spade']);
                                if (player.getStorage('zqchengshi').includes('club')) player.unmarkAuto('zqchengshi', ['club']);
                                if (player.getStorage('zqchengshi').includes('diamond')) player.unmarkAuto('zqchengshi', ['diamond']);
                                player.unmarkAuto('zqchengshi', [player.getStorage('zqchengshi')]);
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6184; original skill zqchengshi3
zqchengshi3: {
                            trigger: {
                                player: 'phaseBegin',
                            },
                            direct: true,
                            filter: function (event, player) {
                                return !player.hasSkill('zqqibu_chengshi');
                            },
                            content: function () {
                                'step 0'
                                var h = [];
                                var cardh = player.getCards('h').filter(function (i) {
                                    return player.hasUseTarget(i);
                                });
                                for (var i = 0; i < cardh.length; i++) {
                                    h.add(cardh[i].suit);
                                }
                                player.chooseControl('确定', 'cancel2').set('prompt', '【七步】：展示手牌和牌堆顶的七张牌并使用其中至多4张。若使用的牌的原本花色不足4种，你减少一点体力上限').set('ai', function () {
                                    if (h.length > 2) return 0;
                                    if (h.length > 1 && player.maxHp > 1) return 0;
                                    return 1;
                                });
                                'step 1'
                                if (result.control == 'cancel2') event.finish();
                                'step 2'
                                player.logSkill('zqqibu');
                                player.removeSkill('zqqibu_heart');
                                player.removeSkill('zqqibu_spade');
                                player.removeSkill('zqqibu_club');
                                player.removeSkill('zqqibu_diamond');
                                'step 3'
                                player.addTempSkill('zqqibu_chengshi');
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:6276; original skill zqqibux
zqqibux: {
                            mark: true,
                            init: function (player) {
                                player.storage.zqqibux = 0;
                            },
                            intro: {
                                content: function (storage) {
                                    if (storage > 0) return '手牌上限+' + storage;
                                    if (storage < 0) if (player.storage.zqqibux == 'number') return '手牌上限' + storage;
                                    return '手牌上限无变化';
                                },
                            },
                            mod: {
                                maxHandcard: function (player, num) {
                                    return num + player.storage.zqqibux;
                                },
                            },
                            charlotte: true,
                            onremove: true,
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:8066; original skill zqxushi
zqxushi: {
                            audio: 'ext:天庭:0',
                            trigger: {
                                source: 'damageEnd',
                            },
                            onremove: true,
                            init: function (player) {
                                player.storage.zqxushi = 0;
                            },
                            mark: true,
                            marktext: '破',
                            intro:{
                                name: '破',
                                content: 'mark',
                            },
                            frequent: true,
                            content: function () {
                                player.storage.zqxushi += 1;
                                player.syncStorage('zqxushi');
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:8087; original skill zqpodi
zqpodi: {
                            //audio:['repojun',2],
                            audio: 'ext:天庭/audio/skill/zq_shenxusheng:2',
                            trigger: {
                                player: 'useCardToPlayered',
                            },
                            direct: true,
                            filter: function (event, player) {
                                if (event.cards.length < 1 && !get.number(event.card)) return false;
                                return event.target != player && event.target.countCards('he') && event.targets.length == 1 && (get.number(event.card) || get.number(event.cards[0]));
                            },
                            content: function () {
                                'step 0'
                                if (trigger.cards.length < 1 && !get.number(trigger.card)) event.finish();
                                if (trigger.target != player && trigger.target.countCards('he') && trigger.targets.length == 1 && (get.number(trigger.card) || get.number(trigger.cards[0]))) {
                                    var next = player.choosePlayerCard(trigger.target, 'he', [1, Math.min((get.number(trigger.card) || get.number(trigger.cards[0])), trigger.target.countCards('he'))], get.prompt('zqpodi', trigger.target));
                                    next.cardx = trigger.card;
                                    next.set('ai', function (button) {
                                        var numx = _status.event.target.countCards('he');
                                        var name2 = get.name(_status.event.cardx);
                                        if (get.attitude(_status.event.player, _status.event.target) > 0) return 0;
                                        if (name2 == 'sha' && button.link == _status.event.target.getEquip(2)) return 25;
                                        if ((name2 == 'shunshou' || name2 == 'guohe' || name2 == 'huogong') && ui.selected.buttons.length + 1 >= numx) return 0;
                                        //return get.value(button.link); //注释后无法优先选防具，不注释bug更严重，ai盖牌总数减半
                                    });
                                } else event.finish();
                                'step 1'
                                if (result.bool) {
                                    var target = trigger.target;
                                    player.logSkill('zqpodi', target);
                                    game.log(player, '将', target, '的【', result.cards.length, '】张牌扣置于其武将上');
                                    target.addTempSkill('zqpodi2');
                                    target.addToExpansion(result.cards, 'forceAuto', target).gaintag.add('zqpodi2');
                                }
                            },
                            ai: {
                                'unequip_ai': true,
                                'directHit_ai': true,
                                skillTagFilter: function (player, tag, arg) {
                                    if (get.attitude(player, arg.target) > 0) return false;
                                    if (tag == 'directHit_ai') return get.number(arg.card) >= arg.target.countCards('he');
                                    if (arg && arg.target.getEquip(2)) return true;
                                    return false;
                                },
                            },
                            group: 'zqpodi3'
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:8161; original skill zqpodi2
'zqpodi2': {
                            trigger: {
                                global: 'phaseEnd',
                            },
                            //locked:true,
                            forced: true,
                            popup: false,
                            charlotte: true,
                            filter: function (event, player) {
                                return player.getExpansions('zqpodi2').length > 0;
                            },
                            content: function () {
                                'step 0'
                                var cards = player.getExpansions('zqpodi2');
                                player.gain(cards, 'draw');
                                game.log(player, '收回了' + get.cnNumber(cards.length) + '张置于武将上的牌');
                                'step 1'
                                player.removeSkill('zqpodi2');
                            },
                            //mark:true,
                            intro: {
                                markcount: 'expansion',
                                mark: function (dialog, storage, player) {
                                    var cards = player.getExpansions('zqpodi2');
                                    if (player.isUnderControl(true)) dialog.addAuto(cards);
                                    else return '共有' + get.cnNumber(cards.length) + '张牌';
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:8134; original skill zqpodi3
'zqpodi3': {
                            trigger: {
                                player: 'useCardToPlayer',
                            },
                            direct: true,
                            filter: function (event, player) {
                                return event.targets.length == 1; //&&player.countMark('zqxushi')>0
                            },
                            content: function () {
                                player.addTempSkill('zqpodi4', 'useCardAfter');
                            },
                            ai: {
                                threaten: 0.5,
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:8149; original skill zqpodi4
'zqpodi4': {
                            trigger: {
                                source: 'damageBegin1',
                            },
                            direct: true,
                            filter: function (event, player, card) {
                                return event.card && event.player != player;
                            },
                            content: function () {
                                trigger.num += player.countMark('zqxushi');
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:8190; original skill zqyicheng
zqyicheng: { //清除所有标记
                            //audio:['pojun',2],
                            audio: 'ext:天庭/audio/skill/zq_shenxusheng:2',
                            trigger: {
                                player: 'phaseJieshuBegin',
                            },
                            forced: true,
                            frequent: true,
                            preHidden: true,
                            filter: function (event, player) {
                                return !player.getHistory('sourceDamage').length;
                            },
                            content: function () {
                                'step 0'
                                if (player.countCards('h') < player.maxHp) player.drawTo(player.maxHp);
                                'step 1'
                                for (var i in player.storage) {
                                    //if(lib.skill[i]) game.log('●',lib.skill[i].marktext);
                                    if (typeof player.storage[i] === 'number' && lib.skill[i] && lib.skill[i].marktext) player.removeMark(i, player.storage[i], true);
                                }
                                'step 2'
                                player.addTempSkill('zqyicheng2', { player: 'phaseBegin' });
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:8214; original skill zqyicheng2
zqyicheng2: {
                            mod: {
                                targetEnabled: function (card, player, target, now) {
                                    if (card.name == 'sha') return false;
                                },
                            },
                            mark: true, //是否显示标记，player.markSkill('技能名');显示标记，用于联机同步标记
                            onremove: true, //失去技能时移除标记
                            marktext: '疑城︎', //标记名字，没有则显示技能名
                            intro:{ //点击标记的弹窗内容
                                name: '疑城',
                                content: '你不能成为【杀】的目标。', //可用函数
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7568; original skill zqdouhun
zqdouhun: {
                            mod: {
                                maxHandcardFinal: function (player, num) {
                                    return 4;
                                },
                            },
                            trigger: {
                                global: 'gameStart',
                                player: 'enterGame',
                            },
                            forced: true,
                            unique: true,
                            audio: 'ext:天庭/audio/skill/sp_zq_zhoutai:1',
                            init2: function (player) {
                                player.storage.zqdouhun_maxHp = player.maxHp;
                                if (player.maxHp > 1) player.loseMaxHp(player.maxHp - 1);
                            },
                            content: function () {
                                if (player.maxHp > 1) player.loseMaxHp(player.maxHp - 1);
                            },
                            group: ['zqdouhun0', 'zqdouhun1'],
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7590; original skill zqdouhun0
'zqdouhun0': {
                            trigger: {
                                player: ['gainMaxHpBefore', 'loseMaxHpBefore'],
                            },
                            filter: function (event, player) {
                                return player.maxHp == 1;
                            },
                            forced: true,
                            priority: Infinity,
                            content: function () {
                                trigger.cancel();
                                player.maxHp = 1;
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7604; original skill zqdouhun1
'zqdouhun1': {
                            unique: true,
                            frequent: true,
                            priority: 3,
                            trigger: {
                                player: 'dieBegin',
                            },
                            forced: true,
                            //limited:true,
                            skillAnimation: true,
                            content: function () {
                                'step 0'
                                //player.awakenSkill('zqdouhun1');
                                trigger.cancel();
                                'step 1'
                                player.removeSkill('zqdouhun');
                                'step 2'
                                player.maxHp = player.storage.zqdouhun_maxHp;
                                'step 3'
                                if (game.zhu && player == game.zhu) {
                                    if (player.name1 == 'sp_zq_zhoutai' || player.name2 == 'sp_zq_zhoutai') player.maxHp++;
                                }
                                'step 4'
                                player.update();
                                player.recover(2 - player.hp);
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7631; original skill zqboming
zqboming: {
                            //audio:['buqu',2],
                            audio: 'ext:天庭/audio/skill/sp_zq_zhoutai:4',
                            trigger: {
                                player: 'dying',
                            },
                            onremove: true,
                            direct: true,
                            forced: true,
                            priority: 3,
                            filter: function (event, player) {
                                return player.hp <= 0 && player.maxHp > 0;
                            },
                            content: function () {
                                'step 0'
                                var card = get.cards()[0];
                                event.card = card;
                                player.chooseTarget('选择获得「危」的角色', true, function (card, player, target) {
                                    return player.inRange(target) || target == player;
                                }).set('ai', function (target) {
                                    if (player.getExpansions('zqboming')?.length==0 || player.hasSkill('zqdouhun')) return target == player;
                                    return -get.attitude(player, target);
                                }).animate = false;
                                'step 1'
                                if (result.targets) {
                                    player.logSkill('zqboming');
                                    var target = result.targets[0];
                                    target.addToExpansion(card, 'gain2').gaintag.add('zqboming');
                                    game.log(target, '将', card, '置于武将牌上，称为「危」');
                                    for (var x = 0; x < game.filterPlayer().length; x++) {
                                        var cards = game.filterPlayer()[x].getExpansions('zqboming'), num = get.number(card);
                                        target.showCards(cards, '危');
                                        for (var i = 0; i < cards.length; i++) {
                                            if (num == get.number(cards[i])) target.die();
                                        }
                                    }
                                }
                                'step 2'
                                var suit = get.suit(card);
                                if (suit != 'spade' && player.hp <= 0) player.recover(1 - player.hp);
                            },
                            //mark:true,
                            marktext: '危',
                            intro:{
                                content: 'expansion',
                                markcount: 'expansion',
                            },
                            ai: {
                                save: true,
                                expose: 0.2,
                                result: {
                                    player: 1,
                                },
                            },
                            //group: 'zqboming1',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7702; original skill zqjiuzhu
zqjiuzhu: {
                            trigger: {
                                global: 'phaseBefore',
                                player: 'enterGame',
                            },
                            audio: 'ext:天庭/audio/skill/sp_zq_zhoutai:1',
                            forced: true,
                            locked: false,
                            filter: function (event) {
                                return game.players.length > 1 && (event.name != 'phase' || game.phaseNumber == 0);
                            },
                            content: function () {
                                'step 0'
                                player.chooseTarget('请选择【救主】的目标', lib.translate.zqjiuzhu_info, true, function (card, player, target) {
                                    return target != player && (!player.storage.zqjiuzhu2 || !player.storage.zqjiuzhu2.includes(target));
                                }).set('ai', function (target) {
                                    var att = get.attitude(_status.event.player, target);
                                    if (att > 0) return att + 1;
                                    if (att == 0) return Math.random();
                                    return att;
                                }).animate = false;
                                'step 1'
                                if (result.bool) {
                                    var target = result.targets[0];
                                    if (!player.storage.zqjiuzhu2) player.storage.zqjiuzhu2 = [];
                                    player.storage.zqjiuzhu2.push(target);
                                }
                            },
                            group: 'zqjiuzhu2',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7732; original skill zqjiuzhu2
'zqjiuzhu2': {
                            charlotte: true,
                            trigger: {
                                global: 'dying',
                            },
                            forced: true,
                            filter: function (event, player) {
                                if (event.player.isDead() || !player.storage.zqjiuzhu2 || !player.storage.zqjiuzhu2.includes(event.player)) return false;
                                if (event.player.hp <= 0 && player.countCards('he') > 0) return true;
                                return event, player.isDying();
                            },
                            logTarget: 'player',
                            content: function () {
                                'step 0'
                                var target = trigger.player;
                                if (!target.storage.xianfu_mark) target.storage.xianfu_mark = [];
                                target.markSkill('zqjiuzhu_mark');
                                'step 1'
                                player.chooseControl('确定', 'cancel2').set('prompt', '【救主】：弃置一张牌并失去1点体力，令【' + get.translation(trigger.player) + '】将体力回复至1点').set('ai', function () {
                                    if (get.attitude(player, trigger.player) >= 0) return 0;
                                    return 1;
                                });
                                'step 2'
                                if (result.control == '确定') {
                                    player.chooseToDiscard(1, 'he', get.prompt('zqjiuzhu2'), '弃置1张牌', lib.filter.cardDiscardable).set('ai', function (card) {
                                        return 1;
                                    });
                                }
                                'step 3'
                                if (result.bool) {
                                    player.loseHp();
                                    trigger.player.recover(1 - trigger.player.hp);
                                } else event.finish();
                            },
                            ai: {
                                respondTao: true,
                                threaten: 1.6,
                                expose: 0.2,
                            },
                            group: 'zqjiuzhu3',
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7788; original skill zqjiuzhu_mark
'zqjiuzhu_mark': {
                            mark: true,
                            marktext: '主',
                            intro:{
                                name: '救主的目标',
                                content: '进入濒死状态时，SP周泰可以弃置1张牌并失去一点体力，令你脱离濒死状态。',
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7773; original skill zqjiuzhu3
'zqjiuzhu3': {
                            trigger: {
                                global: 'dieBegin',
                            },
                            silent: true,
                            filter: function (event, player) {
                                return event.player == player || player.storage.zqjiuzhu2 && player.storage.zqjiuzhu2.includes(player);
                            },
                            content: function () {
                                if (player == trigger.player) lib.skill.zqjiuzhu2.onremove(player);
                                else player.storage.zqjiuzhu2.remove(event.player);
                            },
                            forced: true,
                            popup: false,
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7493; original skill zqhuanhua
zqhuanhua: {
                            trigger: {
                                target: 'useCardToTarget',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:3',
                            frequent: true,
                            preHidden: true,
                            filter: function (event, player) {
                                return (event.card.name == 'sha' || event.card.name == 'juedou');
                            },
                            content: function () {
                                'step 0'
                                if (trigger.player != player && game.filterPlayer().length < 3) event.goto(1);
                                else {
                                    player.storage.zqhuanhua_player = trigger.player;
                                    player.storage.zqhuanhua_card = trigger.card;
                                    var next = player.chooseTarget('至多选择两名角色，将此牌的目标随机转移给你或其中一名，若取消则此牌有一半的概率对你无效', [1, 2]);
                                    next.set('filterTarget', function (card, player, target) {
                                        if (target != player && target != player.storage.zqhuanhua_player) {
                                            if (lib.filter.targetEnabled(player.storage.zqhuanhua_card, player.storage.zqhuanhua_player, target)) return true;
                                        }
                                        return false;
                                    });
                                    next.set('ai', function (target) {
                                        return -get.attitude(_status.event.player, target);
                                    });
                                }
                                'step 1'
                                var evt = trigger.getParent();
                                if (result && result.bool) {
                                    if (result.targets.length > 1) player.line(result.targets);
                                    else player.line(result.targets[0]);
                                    if (result.targets.length == 1) {
                                        var list1 = [result.targets[0]];
                                        game.log(player, '将【', list1, '】幻化成自己');
                                        if (Math.random() > 1 / 2) {
                                            var t1 = list1.randomGet();
                                            evt.targets.remove(player);
                                            evt.targets.push(t1);
                                            trigger.player.line(t1);
                                            game.log(trigger.player, '猜错目标攻击了【', t1, '】');
                                        } else game.log(trigger.player, '破除了', player, '的<font color=\"#68DD7F\">【幻化】</font>');
                                    } else {
                                        var list2 = [result.targets[0], result.targets[1]];
                                        game.log(player, '将【', list2, '】幻化成自己');
                                        if (Math.random() > 1 / 3) {
                                            var t2 = list2.randomGet();
                                            evt.targets.remove(player);
                                            evt.targets.push(t2);
                                            trigger.player.line(t2);
                                            game.log(trigger.player, '猜错目标攻击了【', t2, '】');
                                        } else game.log(trigger.player, '破除了', player, '的<font color=\"#68DD7F\">【幻化】</font>');
                                    }
                                } else {
                                    game.log(player, '幻化出一道“分身”');
                                    if (Math.random() > 1 / 2) {
                                        evt.targets.remove(player);
                                        game.log(trigger.player, '猜错目标攻击了“分身”');
                                    } else game.log(trigger.player, '破除了', player, '的<font color=\"#68DD7F\">【幻化】</font>');
                                }
                            },
                            ai: {
                                'maixie_defend': true,
                                effect: {
                                    target: function (card, player, target) {
                                        if (card.name != 'sha' && card.name != 'juedou') return;
                                        if (!player.hasFriend()) return;
                                        if (card.name == 'sha' || card.name == 'juedou') return [1, 1];
                                    },
                                },
                                threaten: 2,
                                expose: 2,
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7172; original skill zqjinye
zqjinye: {
                            trigger: {
                                player: 'damageEnd',
                            },
                            frequent: true,
                            priority: 5,
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:1',
                            filter: function (event, player) {
                                return event.num > 0;
                            },
                            content: function () {
                                'step 0'
                                if (!player.storage.zqjinye) player.storage.zqjinye = [];
                                var next = player.chooseTarget('【金液】：选择一名角色，令其一个技能失效至其下个回合结束');
                                next.set('filterTarget', function (card, player, target) {
                                    if (player.storage.zqjinye && player.storage.zqjinye.includes(target)) return false;
                                    //if(target.hasSkillTag('zqfengyin')) return false;
                                    for (var i in target.disabledSkills) {
                                        if (target.disabledSkills[i].includes('zqfengyin')) return false;
                                    }
                                    var list = [];
                                    var func = function (skill) {
                                        var info = get.info(skill);
                                        if (!info || info.charlotte || info.persevereSkill) return false; //排除持恒技
                                        if (!lib.translate[skill + '_info']) return false; //排除无描述的技能
                                        return true;
                                    };
                                    var skills = target.getSkills(null, false, true); //3是过滤失效技能
                                    if (skills) {
                                        for (var i = 0; i < skills.length; i++) {
                                            if (func(skills[i])) list.add(skills[i]);
                                        }
                                    }
                                    return list.length > 0//&&target!=player;
                                });
                                next.set('ai', function (target) {
                                    if (target == player) return -99;
                                    return 0.5 - get.attitude(player, target);
                                });
                                'step 1'
                                if (result.targets) {
                                    var target = result.targets[0];
                                    var list = [];
                                    var func = function (skill) {
                                        var info = get.info(skill);//技能信息
                                        if (!info || info.charlotte || info.persevereSkill) return false;//排除空技能、状态技和持恒技
                                        if (!lib.translate[skill + '_info']) return false; //排除无描述的技能
                                        return true;
                                    };
                                    var skills = target.getSkills(null, false, true); //3是过滤失效技能
                                    if (skills) {
                                        for (var i = 0; i < skills.length; i++) {
                                            if (func(skills[i])) list.add(skills[i]);
                                        }
                                    }
                                    event.targetx = target;
                                    if (player.storage.zqjinye) player.storage.zqjinye.push(target);
                                    var next = player.chooseControl(list, 'cancel2');
                                    next.set('prompt', '令【' + get.translation(target) + '】的一个技能失效至其下个回合结束');
                                    next.set('choiceList', list.map(function (i) {
                                        if (lib.translate[i + '_info']) return '<div class="skill">【' + get.translation(i) + '】</div><div class="popup text" style="width:calc(100% - 10px);display:inline-block">' + lib.translate[i + '_info'] + '</div>';
                                    }));
                                    next.set('ai', function () {
                                        if (_status.event.controls.length == 1) return _status.event.controls[0];
                                        var iss = [];
                                        for (let i of _status.event.controls) {
                                            if (!target.tempSkills[i] && //排除临时技能
                                                lib.translate[i + '_info'] &&
                                                (lib.translate[i + '_info'].indexOf('觉醒技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('隐匿技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('主公技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('势力技') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('标记') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('游戏开始') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('若你的武将牌') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('记录的') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('枚') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('发动') == -1) &&
                                                (lib.translate[i + '_info'].indexOf('扑克牌') == -1)
                                            ) iss.push(i);
                                        }
                                        if (iss.length) return iss.randomGet();
                                        return _status.event.controls.slice(0).randomGet();
                                    });
                                }
                                'step 2'
                                if (result && result.control && event.targetx) {
                                    if (result.control == 'cancel2') event.goto(0);
                                    else {
                                        event.targetx.disableSkill('zqfengyin', result.control);
                                        event.targetx.addTempSkill('zqfengyin2', { player: 'phaseBeforeStart' });
                                        event.targetx.markSkill('zqfengyin');
                                        game.log(player, '选择了', event.targetx, '的技能', '#g【' + get.translation(result.control) + '】');
                                    }
                                }
                                'step 3'
                                delete player.storage.zqjinye;
                            },
                            ai: {
                                threaten: 2,
                                result: {
                                    player: 1,
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7277; original skill zqfengyin2
zqfengyin2: {
                            charlotte: true,
                            onremove: true,
                            onremove: function (player, skill) {
                                player.addTempSkill('zqfengyin', { player: 'phaseAfter' });
                            },
                            /*mark: true,
                            intro: {
                                content: function (storage, player, skill) {
                                    var list = [];
                                    for (var i in player.disabledSkills) {
                                        if (player.disabledSkills[i].includes('zqfengyin')) list.push(i);
                                    };
                                    if (list.length) {
                                        var str = '失效技能：';
                                        for (var i = 0; i < list.length; i++) {
                                            if (lib.translate[list[i] + '_info']) str += get.translation(list[i]) + '、';
                                        };
                                        return str.slice(0, str.length - 1);
                                    };
                                },
                            },*/
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7300; original skill zqfengyin
zqfengyin: {
                            onremove: true,
                            onremove: function (player, skill) {
                                player.enableSkill(skill);
                            },
                            mark: true,
                            charlotte: true,
                            intro: {
                                content: function (storage, player, skill) {
                                    var list = [];
                                    for (var i in player.disabledSkills) {
                                        if (player.disabledSkills[i].includes(skill)) list.push(i);
                                    };
                                    if (list.length) {
                                        var str = '失效技能：';
                                        for (var i = 0; i < list.length; i++) {
                                            if (lib.translate[list[i] + '_info']) str += get.translation(list[i]) + '、';
                                        };
                                        return str.slice(0, str.length - 1);
                                    };
                                },
                            },
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7323; original skill zqjiuding
zqjiuding: {
                            trigger: {
                                global: 'roundStart',
                            },
                            frequent: true,
                            priority: 5,
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:1',
                            onremove: true,
                            mark: true,
                            marktext: '九鼎',
                            intro: {
                                name: '九鼎',
                                markcount: 'mark',
                                content: function (storage, player, skill) {
                                    if (player.storage.zqjiuding) return '共' + player.storage.zqjiuding.length + '个限定技：' + get.translation(player.storage.zqjiuding);
                                    return '已获得技能太清';
                                },
                            },
                            init2: function (player) {
                                player.storage.zqjiuding = [];
                            },
                            filter: function (event, player) {
                                var skillx = player.getSkills(null, false, false).filter(function (skill) {
                                    var info = lib.skill[skill];
                                    return info && info.limited;
                                });
                                if (skillx && skillx.length && skillx.length >= 9 && player.hasSkill('zqtaiqing')) return false;
                                return true;
                            },
                            content: function () {
                                'step 0'
                                if (!_status.characterlist) {
                                    if (_status.connectMode) _status.characterlist = get.charactersOL();
                                    else {
                                        var list = [];
                                        for (var i in lib.character) {
                                            if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                            list.add(i);
                                        }
                                        _status.characterlist = list;
                                    }
                                }
                                'step 1'
                                var skillx = player.getSkills(null, false, false).filter(function (skill) {
                                    var info = lib.skill[skill];
                                    return info && info.limited;
                                });
                                if (skillx && skillx.length && skillx.length >= 9 && !player.hasSkill('zqtaiqing')) {
                                    player.addSkill('zqtaiqing');
                                    delete player.storage.zqjiuding;
                                    player.update();
                                } else {
                                    var is_limited = function (list) {
                                        for (var i = 0; i < list.length; i++) {
                                            var info = lib.skill[list[i]];
                                            if (info && info.limited) return true;
                                        }
                                        return false;
                                    }
                                    var list = [];
                                    for (var i = 0; i < _status.characterlist.length; i++) {
                                        var skills = lib.character[_status.characterlist[i]][3];
                                        for (var j = 0; j < skills.length; j++) {
                                            var cur = [skills[j]];
                                            game.expandSkills(cur);
                                            if (is_limited(cur) && !player.awakenedSkills.includes(skills[j]) && !player.hasSkill(skills[j])) {
                                                list.push(skills[j]);
                                            }
                                        }
                                    }
                                    if (skillx.length && list.length) {
                                        for (let i of skillx) {
                                            for (let j of list) {
                                                if (get.translation(i) == get.translation(j)) list.remove(j);
                                            }
                                        }
                                    }
                                    if (list.length) {
                                        game.log('搜索到' + list.length + '个限定技');
                                        var skill = list.randomGet();
                                        player.addSkill([skill], true);
                                        player.popup(skill);
                                        game.log(player, '获得了技能<font color=\"#68DD7F\">【' + get.translation(skill) + '】</font>');
                                        var skillx = player.getSkills(null, false, false).filter(function (skill) {
                                            var info = lib.skill[skill];
                                            return info && info.limited;
                                        });
                                        player.storage.zqjiuding = skillx;
                                        player.syncStorage('zqjiuding');
                                        player.markSkill('zqjiuding');
                                    } else game.log('未搜索到限定技');
                                }
                            },
                            ai: {
                                threaten: 2,
                                result: {
                                    player: 10,
                                },
                            },
                            derivation: ['zqtaiqing'],
                        },
// Source: outputs/module-01/desktop-package/extension/天庭/extension.js:7424; original skill zqtaiqing
zqtaiqing: {
                            trigger: {
                                player: 'dieBefore',
                            },
                            audio: 'ext:天庭/audio/skill/zq_shenzuoci:1',
                            limited: true,
                            mark: true,
                            intro:{
                                content: 'limited',
                            },
                            skillAnimation: true,
                            animationColor: 'fire',
                            filter: function (event, player) {
                                return player.maxHp > 0;
                            },
                            content: function () {
                                'step 0'
                                player.awakenSkill('zqtaiqing');
                                trigger.cancel();
                                player.recover(player.maxHp - player.hp);
                                'step 1'
                                if (player.isLinked()) player.link();
                                if (player.isTurnedOver()) player.turnOver();
                                //if(player.countCards('j')) player.discardPlayerCard(player,'j',true);
                                'step 2'
                                if (!_status.characterlist) {
                                    if (_status.connectMode) _status.characterlist = get.charactersOL();
                                    else {
                                        var list = [];
                                        for (var i in lib.character) {
                                            if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) continue;
                                            list.add(i);
                                        }
                                        _status.characterlist = list;
                                    }
                                }
                                'step 3'
                                var is_limited = function (list) {
                                    for (var i = 0; i < list.length; i++) {
                                        var info = lib.skill[list[i]];
                                        if (info && info.limited) return true;
                                    }
                                    return false;
                                }
                                var list = ['zqtaiqing'];
                                for (var i = 0; i < _status.characterlist.length; i++) {
                                    var skills = lib.character[_status.characterlist[i]][3];
                                    for (var j = 0; j < skills.length; j++) {
                                        var cur = [skills[j]];
                                        game.expandSkills(cur);
                                        if (is_limited(cur) && (player.awakenedSkills.includes(skills[j]) || player.hasSkill(skills[j]))) {
                                            list.push(skills[j]);
                                        }
                                    }
                                }
                                if (list.length) {
                                    player.removeSkill([list], true);
                                    for (let i of list) { player.restoreSkill(i) }
                                    game.log(player, '失去了所有限定技');
                                }
                            },
                            ai: {
                                save: true,
                                threaten: 2,
                                result: {
                                    player: 10,
                                },
                            },
                        },
};
const block=skills;
export default skills;
