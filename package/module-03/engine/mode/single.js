import { lib, game, ui, get, ai, _status } from "noname";
export const type = "mode";
/**
 * @type { () => importModeConfig }
 */
export default () => {
	return {
		name: "single",
		changbanCharacter: ["key_rei", "key_yoshino", "key_noda", "key_nagisa", "re_caocao", "re_caozhang", "re_diaochan", "re_ganning", "re_gongsunzan", "re_guojia", "re_huangyueying", "re_lidian", "re_lvbu", "re_simayi", "sunquan", "re_xiahoudun", "re_xushu", "yuanshu", "xf_yiji", "re_zhangfei", "re_zhangliao", "re_xuzhu", "re_zhaoyun", "re_zhouyu", "re_zhugeliang", "ol_xiahouyuan", "re_huangzhong", "re_weiyan", "dianwei", "te_yanwen", "re_pangde", "re_zhurong", "re_sunjian", "jiaxu", "dengai", "re_jiangwei", "re_sunben", "wangji", "wangping", "guanqiujian", "chendao", "ol_yujin", "re_caozhi", "xin_masu", "re_lingtong", "xusheng", "re_gaoshun", "xunyou", "guanzhang", "madai", "handang", "caochong", "re_guohuai", "guanping", "liufeng", "re_zhuran", "xin_liru", "hanhaoshihuan", "guyong", "zhuhuan", "caoxiu", "liuchen", "re_zhangyi", "re_quancong", "sunxiu", "sundeng", "guohuanghou", "re_jikang", "xuezong", "qinmi", "lvdai", "re_zhangliang", "lingcao", "sunru", "zhuling", "sp_caoren", "fanchou", "fuwan", "sp_ganning", "guanyinping", "guosi", "heqi", "sp_jiangwei", "litong", "re_panfeng", "sp_pangde", "xf_sufei", "xf_tangzi", "xiahouba", "xujing", "yuejin", "sp_zhangfei", "zhangji", "zhangyì", "dongcheng"],
		singlePile: [
			["spade", 5, "sha"],
			["spade", 7, "sha"],
			["spade", 8, "sha"],
			["spade", 10, "sha"],
			["heart", 10, "sha"],
			["heart", 11, "sha"],
			["club", 4, "sha"],
			["club", 5, "sha"],
			["club", 6, "sha"],
			["club", 8, "sha"],
			["club", 9, "sha"],
			["club", 10, "sha"],
			["club", 11, "sha"],
			["diamond", 6, "sha"],
			["diamond", 9, "sha"],
			["diamond", 11, "sha"],
			["heart", 2, "shan"],
			["heart", 5, "shan"],
			["diamond", 2, "shan"],
			["diamond", 3, "shan"],
			["diamond", 7, "shan"],
			["diamond", 8, "shan"],
			["diamond", 10, "shan"],
			["diamond", 11, "shan"],
			["heart", 3, "tao"],
			["heart", 4, "tao"],
			["heart", 9, "tao"],
			["diamond", 12, "tao"],
			["club", 12, "bingliang"],
			["spade", 3, "guohe"],
			["diamond", 12, "guohe"],
			["club", 3, "guohe"],
			["club", 1, "juedou"],
			["spade", 1, "juedou"],
			["heart", 6, "lebu"],
			["spade", 1, "nanman"],
			["club", 7, "shuiyanqijunx"],
			["spade", 4, "shunshou"],
			["spade", 11, "shunshou"],
			["diamond", 4, "shunshou"],
			["heart", 1, "wanjian"],
			["heart", 5, "wuxie"],
			["club", 5, "wuxie"],
			["heart", 7, "wuzhong"],
			["heart", 8, "wuzhong"],
			["diamond", 5, "guanshi"],
			["spade", 9, "hanbing"],
			["spade", 6, "qinggang"],
			["spade", 12, "zhangba"],
			["diamond", 1, "zhuge"],
			["spade", 2, "bagua"],
			["club", 2, "renwang"],
		],
		singlePile_wuxianhuoli: [
			["heart", 1, "wanjian"],
			["heart", 2, "shan"],
			["heart", 2, "huogong"],
			["heart", 3, "tao"],
			["heart", 3, "huogong"],
			["heart", 4, "tao"],
			["heart", 4, "sha", "fire"],
			["heart", 6, "tao"],
			["heart", 7, "sha", "fire"],
			["heart", 7, "wuzhong"],
			["heart", 8, "wuzhong"],
			["heart", 9, "wuzhong"],
			["heart", 10, "sha"],
			["heart", 10, "sha"],
			["heart", 10, "sha", "fire"],
			["heart", 12, "guohe"],
			["heart", 12, "shandian"],
			["heart", 13, "shan"],

			["diamond", 1, "juedou"],
			["diamond", 1, "zhuge"],
			["diamond", 1, "zhuque"],
			["diamond", 3, "shunshou"],
			["diamond", 4, "shunshou"],
			["diamond", 5, "guanshi"],
			["diamond", 6, "sha"],
			["diamond", 6, "shan"],
			["diamond", 7, "sha"],
			["diamond", 7, "shan"],
			["diamond", 8, "sha"],
			["diamond", 8, "shan"],
			["diamond", 9, "sha"],
			["diamond", 9, "shan"],
			["diamond", 9, "jiu"],
			["diamond", 10, "shan"],
			["diamond", 11, "shan"],
			["diamond", 12, "tao"],
			["diamond", 12, "wuxie"],
			["diamond", 12, "huogong"],

			["club", 1, "juedou"],
			["club", 1, "baiyin"],
			["club", 2, "sha"],
			["club", 2, "bagua"],
			["club", 2, "renwang"],
			["club", 3, "sha"],
			["club", 3, "guohe"],
			["club", 4, "sha"],
			["club", 5, "sha"],
			["club", 5, "sha", "thunder"],
			["club", 6, "sha"],
			["club", 6, "sha", "thunder"],
			["club", 7, "sha"],
			["club", 7, "sha", "thunder"],
			["club", 7, "nanman"],
			["club", 8, "sha"],
			["club", 9, "sha"],
			["club", 9, "jiu"],
			["club", 12, "wuxie"],
			["club", 13, "wuxie"],

			["spade", 1, "juedou"],
			["spade", 1, "guding"],
			["spade", 2, "cixiong"],
			["spade", 2, "hanbing"],
			["spade", 2, "tengjia"],
			["spade", 3, "shunshou"],
			["spade", 4, "sha", "thunder"],
			["spade", 4, "guohe"],
			["spade", 4, "shunshou"],
			["spade", 5, "sha", "thunder"],
			["spade", 5, "qinglong"],
			["spade", 6, "sha", "thunder"],
			["spade", 6, "qinggang"],
			["spade", 7, "sha"],
			["spade", 7, "sha", "thunder"],
			["spade", 8, "sha"],
			["spade", 8, "sha"],
			["spade", 8, "sha", "thunder"],
			["spade", 9, "sha"],
			["spade", 9, "jiu"],
			["spade", 10, "sha"],
			["spade", 10, "bingliang"],
			["spade", 11, "wuxie"],
			["spade", 12, "guohe"],
			["spade", 12, "zhangba"],
			["spade", 13, "nanman"],
		],
		characterSingle: {},
		startBefore() {},
		onreinit() {
			_status.mode = _status.connectMode ? lib.configOL.single_mode : get.config("single_mode");
			if (_status.mode != "normal") {
				return;
			}
			for (var i in lib.characterSingle) {
				lib.character[i] = lib.characterSingle[i];
			}
			for (var j in lib.singleTranslate) {
				lib.translate[j] = lib.singleTranslate[j];
			}
		},
		start() {
			"step 0";
			_status.mode = _status.connectMode ? lib.configOL.single_mode : get.config("single_mode");
			var playback = localStorage.getItem(lib.configprefix + "playback");
			if (playback) {
				ui.create.me();
				ui.arena.style.display = "none";
				ui.system.style.display = "none";
				_status.playback = playback;
				localStorage.removeItem(lib.configprefix + "playback");
				var store = lib.db.transaction(["video"], "readwrite").objectStore("video");
				store.get(parseInt(playback)).onsuccess = function (e) {
					if (e.target.result) {
						game.playVideoContent(e.target.result.video);
					} else {
						alert("播放失败：找不到录像");
						game.reload();
					}
				};
				event.finish();
			} else if (!_status.connectMode) {
				game.prepareArena(2);
			}
			"step 1";
			if (_status.connectMode) {
				game.waitForPlayer(function () {
					lib.configOL.number = 2;
				});
			}
			"step 2";
			if (_status.mode == "normal") {
				lib.card.list = lib.singlePile.slice(0);
				game.fixedPile = true;
				game.broadcastAll(
					function (singleTranslate, characterSingle, jin) {
						_status.mode = "normal";
						for (var j in singleTranslate) {
							lib.translate[j] = singleTranslate[j];
						}
						_status.characterlist = [];
						for (var i in characterSingle) {
							if (!jin && characterSingle[i].group === "jin") {
								continue;
							}
							lib.character[i] = characterSingle[i];
							_status.characterlist.push(i);
						}
					},
					lib.singleTranslate,
					lib.characterSingle,
					_status.connectMode ? lib.configOL.enable_jin : get.config("enable_jin")
				);
			} else if (_status.mode == "changban") {
				_status.characterlist = [];
				for (var i = 0; i < lib.changbanCharacter.length; i++) {
					var name = lib.changbanCharacter[i];
					if (lib.character[name] && !lib.filter.characterDisabled(name)) {
						_status.characterlist.push(name);
					}
				}
				game.broadcastAll(function () {
					_status.mode = "changban";
					lib.translate.bingliang_info = "目标角色判定阶段进行判定：若判定结果不为梅花，则跳过该角色的摸牌阶段。";
					lib.translate.zhuge_info = "锁定技，出牌阶段，你使用杀的次数上限+3";
				});
				for (var i = 0; i < lib.card.list.length; i++) {
					var card = lib.card.list[i];
					if (card[2] == "muniu" || card[2] == "shandian" || (card[2] == "tengjia" && card[0] == "club") || (card[2] == "wuxie" && card[0] == "diamond" && card[1] == 12)) {
						lib.card.list.splice(i--, 1);
					}
				}
			} else if (_status.mode == "wuxianhuoli") {
				var list = [];
				lib.card.list = lib.singlePile_wuxianhuoli.slice(0);
				game.fixedPile = true;
				if (_status.connectMode) {
					list = get.charactersOL();
				} else {
					var list = [];
					for (var i in lib.character) {
						if (!lib.filter.characterDisabled2(i) && !lib.filter.characterDisabled(i)) {
							list.push(i);
						}
					}
				}
				game.countPlayer2(function (current) {
					list.remove(current.name);
					list.remove(current.name1);
					list.remove(current.name2);
				});
				_status.characterlist = list;
				game.broadcast(list => (_status.characterlist = list), list);
			}
			if (_status.connectMode) {
				lib.configOL.number = 2;
				game.randomMapOL();
			} else {
				for (var i = 0; i < game.players.length; i++) {
					game.players[i].getId();
				}
				if (_status.brawl && _status.brawl.chooseCharacterBefore) {
					_status.brawl.chooseCharacterBefore();
				}
				game.chooseCharacter();
			}
			"step 3";
			if (ui.coin) {
				_status.coinCoeff = get.coinCoeff([game.me.name]);
			}

			game.syncState();
			event.trigger("gameStart");

			var players = get.players(lib.sort.position);
			var info = [];
			for (var i = 0; i < players.length; i++) {
				info.push({
					name: players[i].name1,
					name2: players[i].name2,
					identity: players[i].identity,
					nickname: players[i].node.nameol.innerHTML,
				});
			}
			_status.videoInited = true;
			game.addVideo("init", null, info);

			game.gameDraw(game.zhu, function (player) {
				if (_status.mode == "dianjiang") {
					return 4;
				}
				if (_status.mode == "wuxianhuoli") {
					return 4;
				}
				if (_status.mode == "normal") {
					if (player.hasSkill("cuorui")) {
						player.logSkill("cuorui");
						return 2 + _status.characterChoice[player.identity].length;
					}
					return player == game.zhu ? 3 : 4;
				}
				if (_status.mode == "changban") {
					return player == game.fan ? 5 : 4;
				}
				return player.maxHp;
			});
			if (_status.connectMode && lib.configOL.change_card) {
				game.replaceHandcards(game.players.slice(0));
			}
			"step 4";
			game.phaseLoop(game.zhu);
			game.countPlayer(current => current.showGiveup(), true);
		},
		game: {
			canReplaceViewpoint: () => true,
			addRecord(bool) {
				if (typeof bool == "boolean") {
					var mode = _status.mode;
					var data = lib.config.gameRecord.single.data;
					if (!get.is.object(data[mode])) {
						data[mode] = {};
					}
					var data2 = data[mode];
					var identity = game.me.identity;
					if (!data2[identity]) {
						data2[identity] = [0, 0];
					}
					if (bool) {
						data2[identity][0]++;
					} else {
						data2[identity][1]++;
					}
					var list = ["zhu", "fan"];
					var str = "";
					for (var j in data) {
						str += get.translation(j + 2) + "：<br>";
						for (var i = 0; i < list.length; i++) {
							if (data[j][list[i]]) {
								str += lib.translate[list[i] + "2"] + "：" + data[j][list[i]][0] + "胜" + " " + data[j][list[i]][1] + "负<br>";
							}
						}
					}
					lib.config.gameRecord.single.str = str;
					game.saveConfig("gameRecord", lib.config.gameRecord);
				}
			},
			getState() {
				var state = {};
				for (var i in lib.playerOL) {
					var player = lib.playerOL[i];
					state[i] = { identity: player.identity };
				}
				return state;
			},
			updateState(state) {
				for (var i in state) {
					var player = lib.playerOL[i];
					if (player) {
						player.identity = state[i].identity;
					}
				}
			},
			getRoomInfo(uiintro) {
				if (lib.configOL.single_mode == "normal") {
					uiintro.add('<div class="text chat">晋势力武将：' + (lib.configOL.enable_jin ? "开启" : "关闭"));
				}
				if (lib.configOL.bannedcards.length) {
					uiintro.add('<div class="text chat">禁用卡牌：' + get.translation(lib.configOL.bannedcards));
				}
				uiintro.style.paddingBottom = "8px";
			},
			getVideoName() {
				var str = get.translation(game.me.name);
				if (game.me.name2) {
					str += "/" + get.translation(game.me.name2);
				}
				var name = [str, get.translation(_status.mode + 2) + " - " + lib.translate[game.me.identity + "2"]];
				return name;
			},
			showIdentity() {},
			checkResult() {
				game.over((game.me._trueMe || game.me).isAlive());
			},
			checkOnlineResult(player) {
				return player.isAlive();
			},
			chooseCharacterDianjiang() {
				var next = game.createEvent("chooseCharacter");
				next.showConfig = true;
				next.setContent(function () {
					"step 0";
					ui.arena.classList.add("choose-character");
					lib.init.onfree();
					"step 1";
					game.me.chooseControl("先手", "后手").prompt = "请选择自己的行动顺序";
					"step 2";
					var map = result.control == "先手" ? ["zhu", "fan"] : ["fan", "zhu"];
					game.me.identity = map[0];
					game.me.next.identity = map[1];
					game.me.showIdentity();
					game.me.next.showIdentity();
					"step 3";
					event.flipassign = true;
					event.videoId = lib.status.videoId++;
					var list = [];
					for (var i in lib.character) {
						if (lib.filter.characterDisabled2(i, "ignoreForibidden")) {
							continue;
						}
						list.push(i);
					}
					_status.characterlist = list;
					var filter = function (name) {
						return !_status.characterlist.includes(name);
					};
					var dialog = ui.create.characterDialog("heightset", filter).open();
					dialog.videoId = event.videoId;

					game.me
						.chooseButton(true)
						.set("ai", function (button) {
							return Math.random();
						})
						.set(
							"selectButton",
							(function (choice) {
								if (choice == "singble") {
									return [1, 2];
								}
								if (choice == "double") {
									return 2;
								}
								return 1;
							})(get.config("double_character"))
						)
						.set("dialog", event.videoId);
					"step 4";
					game.addRecentCharacter(result.links[0]);
					_status.characterlist.removeArray(result.links);
					if (result.links.length == 2) {
						game.me.init(result.links[0], result.links[1]);
						game.addRecentCharacter(result.links[1]);
					} else {
						game.me.init(result.links[0]);
					}
					game.me
						.chooseButton(true)
						.set("ai", function (button) {
							return Math.random();
						})
						.set(
							"selectButton",
							(function (choice) {
								if (choice == "singble") {
									return [1, 2];
								}
								if (choice == "double") {
									return 2;
								}
								return 1;
							})(get.config("double_character"))
						)
						.set("dialog", event.videoId);
					"step 5";
					game.broadcastAll("closeDialog", event.videoId);
					game.addRecentCharacter(result.links[0]);
					_status.characterlist.removeArray(result.links);
					if (result.links.length == 2) {
						game.me.next.init(result.links[0], result.links[1]);
						game.addRecentCharacter(result.links[1]);
					} else {
						game.me.next.init(result.links[0]);
					}
					setTimeout(function () {
						ui.arena.classList.remove("choose-character");
					}, 500);
					if (get.config("single_control")) {
						game.checkResult = () => game.over(true);
						game.addGlobalSkill("autoswap");
						game.me.next._trueMe = game.me;
					}
				});
			},
			chooseCharacterWuxianhuoli() {
				const next = game.createEvent("chooseCharacter");
				next.showConfig = true;
				next.setContent(function () {
					"step 0";
					ui.arena.classList.add("choose-character");
					lib.init.onfree();
					var num = [0, 1].randomGet();
					game.players[num].identity = "zhu";
					game.players[1 - num].identity = "fan";
					game.broadcastAll(
						function (p, t) {
							p.enemy = t;
							t.enemy = p;
						},
						game.players[0],
						game.players[1]
					);
					for (var i = 0; i < game.players.length; i++) {
						game.players[i].showIdentity();
					}
					game.globalBuff = ["wuxianhuoli_weisuoyuwei"];
					const randomBuff = ["liuanhuaming", "duoduoyishan", "xushidaifa", "mianmianjudao"].randomGet();
					game.globalBuff.add(`wuxianhuoli_${randomBuff}`);
					"step 1";
					_status.characterChoice = {
						zhu: _status.characterlist.randomRemove(6),
						fan: _status.characterlist.randomRemove(6),
					};
					// 创建自由选将功能
					const createCharacterDialog = function () {
						if (get.config("free_choose")) {
							event.dialogxx = ui.create.characterDialog("heightset");
						} else {
							event.dialogxx = ui.create.characterDialog("heightset");
						}
					};
					if (lib.onfree) {
						lib.onfree.push(createCharacterDialog);
					} else {
						createCharacterDialog();
					}
					ui.create.cheat2 = function () {
						ui.cheat2 = ui.create.control("自由选将", function () {
							if (this.dialog == _status.event.dialog) {
								if (game.changeCoin) {
									game.changeCoin(10);
								}
								this.dialog.close();
								_status.event.dialog = this.backup;
								this.backup.open();
								delete this.backup;
								game.uncheck();
								game.check();
							} else {
								if (game.changeCoin) {
									game.changeCoin(-10);
								}
								this.backup = _status.event.dialog;
								_status.event.dialog.close();
								_status.event.dialog = _status.event.parent.dialogxx;
								this.dialog = _status.event.dialog;
								this.dialog.open();
								game.uncheck();
								game.check();
							}
						});
						if (lib.onfree) {
							ui.cheat2.classList.add("disabled");
						}
					};
					if (!ui.cheat2 && get.config("free_choose")) {
						ui.create.cheat2();
					}
					const dialog = ["请选择出场武将", '<div class="text center">本局游戏Buff</div>'];
					game.globalBuff.forEach((buff, ind) => {
						dialog.add(`<div class="text">「${ind === 0 ? "固定" : "随机"}」 ${get.translation(buff)}：${get.skillInfoTranslation(buff, null, false)}</div>`);
					});
					dialog.add([_status.characterChoice[game.me.identity], "character"]);
					game.me.chooseButton(true, dialog);
					"step 2";
					if (ui.cheat2) {
						ui.cheat2.close();
						delete ui.cheat2;
					}
					game.me.init(result.links[0]);
					game.addRecentCharacter(result.links[0]);
					_status.characterChoice[game.me.identity].removeArray(result.links);
					var list = _status.characterChoice[game.me.enemy.identity].randomRemove(1);
					game.me.enemy.init(list[0]);
					[game.me, game.me.enemy].forEach(current => {
						if (current.storage.nohp || (lib.character[current.name1].hasHiddenSkill && !current.noclick)) {
							current.storage.rawHp = 1;
							current.storage.rawMaxHp = 1;
						}
						current.hp = 10;
						current.maxHp = 10;
						current.hujia = 0;
						current.update();
					});
					game.globalBuff.forEach(buff => {
						game.addGlobalSkill(buff);
					});
					
					_status.wuxianhuoliProgress = 0;
					_status.wuxianhuoliLevel = 0;
					const func = () => {
						ui.wuxianhuoliProgress = get.is.phoneLayout() ? ui.create.div(".touchinfo.left", ui.window) : ui.create.div(ui.gameinfo);
						ui.wuxianhuoliProgress.innerHTML = "任务进度(0/3)";
						const showTasks = () => {
							if (ui.wuxianhuoliInfo) {
								return;
							}
							ui.wuxianhuoliInfo = ui.create.system("无限火力", null, true);
							ui.wuxianhuoliInfo.currentProgress = 0;
							ui.wuxianhuoliInfo.currentLevel = 0;
							lib.setPopped(
								ui.wuxianhuoliInfo,
								() => {
									var uiintro = ui.create.dialog("hidden");
									uiintro.add(`<div class="text center" style="font-size:18px"><b>任务列表</b></div>`);
									if (typeof _status.wuxianhuoliLevel !== "number") {
										uiintro.add(`<div class="text center" style="font-size:12px">未获取当前进度，请于一名角色受伤后再查看</div>`);
									} else if (_status.wuxianhuoliLevel < 2) {
										uiintro.add(`<div class="text center">全场角色造成${_status.wuxianhuoliLevel === 0 ? 3 : 5}点伤害(当前${_status.wuxianhuoliProgress}点)</div>\
										<div class="text center">奖励：获得一个技能，摸两张牌</div>`);
									} else {
										uiintro.add(`<div class="text center">所有任务已完成，无后续任务</div>`);
									}
									uiintro.add(`<div class="text center" style="font-size:18px"><b>全局Buff</b></div>`);
									uiintro.add(
										`<div class="text">${game.globalBuff
											.map((buff, ind) => {
												return get.translation(buff) + "：" + get.skillInfoTranslation(buff, null, false);
											})
											.join("<br>")}</div>`
									);
									var ul = uiintro.querySelector("ul");
									if (ul) {
										ul.style.width = "180px";
									}
									uiintro.add(ui.create.div(".placeholder"));
									return uiintro;
								},
								250
							);
						};
						showTasks();
						var dialog = ui.create.dialog("hidden", "forcebutton");
						dialog.add(`任务一`);
						dialog.addText(`任务：全场角色共计造成3点伤害<br>奖励：获得一个技能，摸两张牌`);
						dialog.add(`任务二<div class="text center" style="font-size:10px">(完成任务一后解锁)</div>\
							<div class="text center">任务：全场角色共计造成5点伤害<br>奖励：获得一个技能，摸两张牌</div>`);
						dialog.open();
						setTimeout(() => {
							dialog.close();
						}, 3000);
					};
					game.broadcastAll(func);
					game.delay(0, 3000);
					"step 3";
					_status.characterlist.addArray(Object.values(_status.characterChoice).flat());
					setTimeout(function () {
						ui.arena.classList.remove("choose-character");
					}, 500);
				});
			},
			chooseCharacter() {
				if (_status.mode == "dianjiang") {
					game.chooseCharacterDianjiang();
					return;
				}
				if (_status.mode == "wuxianhuoli") {
					game.chooseCharacterWuxianhuoli();
					return;
				}
				var next = game.createEvent("chooseCharacter");
				next.showConfig = true;
				next.setContent(function () {
					"step 0";
					ui.arena.classList.add("choose-character");
					var num = [0, 1].randomGet();
					game.players[num].identity = "zhu";
					game.players[1 - num].identity = "fan";
					game.broadcastAll(
						function (p, t) {
							p.enemy = t;
							t.enemy = p;
						},
						game.players[0],
						game.players[1]
					);
					for (var i = 0; i < game.players.length; i++) {
						game.players[i].showIdentity();
					}
					"step 1";
					_status.characterChoice = {
						zhu: _status.characterlist.randomRemove(3),
						fan: _status.characterlist.randomRemove(3),
						all: _status.characterlist.randomRemove(6),
					};
					event.videoIdx = lib.status.videoId++;
					game.broadcastAll(
						function (id, list) {
							var dialog = ui.create.dialog("选择武将", [list.all, "character"], "起始武将", [list[game.me.identity], "character"]);
							dialog.videoId = id;
						},
						event.videoIdx,
						_status.characterChoice
					);
					"step 2";
					var next = game.fan.chooseButton(true, 1);
					next.filterButton = function (button) {
						return _status.event.canChoose.includes(button.link);
					};
					next.set("onfree", true);
					next.dialog = event.videoIdx;
					next.canChoose = _status.characterChoice.all;
					next.ai = function () {
						return Math.random();
					};
					"step 3";
					_status.characterChoice.fan.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.fan,
						true,
						event.videoIdx
					);
					var next = game.zhu.chooseButton(true, 2);
					next.filterButton = function (button) {
						return _status.event.canChoose.includes(button.link);
					};
					next.dialog = event.videoIdx;
					next.canChoose = _status.characterChoice.all;
					next.ai = function () {
						return Math.random();
					};
					"step 4";
					_status.characterChoice.zhu.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.zhu,
						false,
						event.videoIdx
					);
					var next = game.fan.chooseButton(true, 2);
					next.filterButton = function (button) {
						return _status.event.canChoose.includes(button.link);
					};
					next.dialog = event.videoIdx;
					next.canChoose = _status.characterChoice.all;
					next.ai = function () {
						return Math.random();
					};
					"step 5";
					_status.characterChoice.fan.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.fan,
						true,
						event.videoIdx
					);
					var next = game.zhu.chooseButton(true);
					next.filterButton = function (button) {
						return _status.event.canChoose.includes(button.link);
					};
					next.dialog = event.videoIdx;
					next.canChoose = _status.characterChoice.all;
					next.ai = function () {
						return Math.random();
					};
					"step 6";
					_status.characterChoice.zhu.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.zhu,
						false,
						event.videoIdx
					);
					"step 7";
					game.broadcastAll("closeDialog", event.videoIdx);
					"step 8";
					game.me.chooseButton(true, ["请选择出场武将", [_status.characterChoice[game.me.identity], "character"]], _status.mode == "changban" ? 2 : 1);
					"step 9";
					game.me.init(result.links[0], _status.mode == "changban" ? result.links[1] : null);
					_status.characterChoice[game.me.identity].removeArray(result.links);
					var list = _status.characterChoice[game.me.enemy.identity].randomRemove(_status.mode == "changban" ? 2 : 1);
					game.me.enemy.init(list[0], list[1]);
					"step 10";
					setTimeout(function () {
						ui.arena.classList.remove("choose-character");
					}, 500);
				});
			},
			chooseCharacterDianjiangOL() {
				var next = game.createEvent("chooseCharacter");
				next.showConfig = true;
				next.setContent(function () {
					"step 0";
					var map = Math.random() < 0.5 ? ["zhu", "fan"] : ["fan", "zhu"];
					game.me.identity = map[0];
					game.me.next.identity = map[1];
					game.me.showIdentity();
					game.me.next.showIdentity();
					"step 1";
					//event.flipassign=true;
					event.videoId = lib.status.videoId++;
					var list = [];
					var libCharacter = {};
					for (var i = 0; i < lib.configOL.characterPack.length; i++) {
						var pack = lib.characterPack[lib.configOL.characterPack[i]];
						for (var j in pack) {
							if (lib.character[j]) {
								libCharacter[j] = pack[j];
							}
						}
					}
					for (i in libCharacter) {
						if (lib.filter.characterDisabled(i, libCharacter)) {
							continue;
						}
						list.push(i);
					}
					game.broadcastAll(
						function (list, id) {
							_status.characterlist = list;
							var filter = function (name) {
								return !_status.characterlist.includes(name);
							};
							var dialog = ui.create.characterDialog("heightset", filter).open();
							dialog.videoId = id;
							ui.arena.classList.add("choose-character");
						},
						list,
						event.videoId
					);
					game.zhu
						.chooseButton(true)
						.set("ai", function (button) {
							return Math.random();
						})
						.set(
							"selectButton",
							(function (choice) {
								if (choice == "singble") {
									return [1, 2];
								}
								if (choice == "double") {
									return 2;
								}
								return 1;
							})(lib.configOL.double_character)
						)
						.set("dialog", event.videoId);
					"step 2";
					game.broadcastAll(
						function (player, character, id) {
							if (player == game.me) {
								game.addRecentCharacter(character[0]);
							}
							if (character.length !== 2) {
								player.init(character[0]);
							} else {
								player.init(character[0], character[1]);
								if (player == game.me) {
									game.addRecentCharacter(character[1]);
								}
							}
							_status.characterlist.removeArray(character);
						},
						game.zhu,
						result.links
					);
					game.fan
						.chooseButton(true)
						.set("ai", function (button) {
							return Math.random();
						})
						.set(
							"selectButton",
							(function (choice) {
								if (choice == "singble") {
									return [1, 2];
								}
								if (choice == "double") {
									return 2;
								}
								return 1;
							})(lib.configOL.double_character)
						)
						.set("dialog", event.videoId);
					"step 3";
					game.broadcastAll("closeDialog", event.videoId);
					game.broadcastAll(
						function (player, character, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								dialog.close();
							}
							if (player == game.me) {
								game.addRecentCharacter(character[0]);
							}
							if (character.length !== 2) {
								player.init(character[0]);
							} else {
								player.init(character[0], character[1]);
								if (player == game.me) {
									game.addRecentCharacter(character[1]);
								}
							}
							_status.characterlist.removeArray(character);
							setTimeout(function () {
								ui.arena.classList.remove("choose-character");
							}, 500);
						},
						game.fan,
						result.links,
						event.videoId
					);
				});
			},
			chooseCharacterWuxianhuoliOL() {
				var next = game.createEvent("chooseCharacter");
				next.showConfig = true;
				next.setContent(function () {
					"step 0";
					ui.arena.classList.add("choose-character");
					var num = [0, 1].randomGet();
					game.players[num].identity = "zhu";
					game.players[1 - num].identity = "fan";
					game.broadcastAll(
						function (p, t) {
							p.enemy = t;
							t.enemy = p;
						},
						game.players[0],
						game.players[1]
					);
					for (var i = 0; i < game.players.length; i++) {
						game.players[i].showIdentity();
					}
					game.globalBuff = ["wuxianhuoli_weisuoyuwei"];
					const randomBuff = ["liuanhuaming", "duoduoyishan", "xushidaifa", "mianmianjudao"].randomGet();
					game.globalBuff.add(`wuxianhuoli_${randomBuff}`);
					const setBuff = buff => {
						game.globalBuff = buff;
					};
					game.broadcast(setBuff, game.globalBuff);
					if (!_status.postReconnect.wuxianhuoliBuff) {
						_status.postReconnect.wuxianhuoliBuff = [setBuff, []];
					}
					_status.postReconnect.wuxianhuoliBuff[1].addArray(game.globalBuff);
					"step 1";
					_status.characterChoice = {
						zhu: _status.characterlist.randomRemove(6),
						fan: _status.characterlist.randomRemove(6),
					};
					// 创建自由选将功能
					const createCharacterDialog = function () {
						if (get.config("free_choose")) {
							event.dialogxx = ui.create.characterDialog("heightset");
						} else {
							event.dialogxx = ui.create.characterDialog("heightset");
						}
					};
					if (lib.onfree) {
						lib.onfree.push(createCharacterDialog);
					} else {
						createCharacterDialog();
					}
					ui.create.cheat2 = function () {
						ui.cheat2 = ui.create.control("自由选将", function () {
							if (this.dialog == _status.event.dialog) {
								if (game.changeCoin) {
									game.changeCoin(10);
								}
								this.dialog.close();
								_status.event.dialog = this.backup;
								this.backup.open();
								delete this.backup;
								game.uncheck();
								game.check();
							} else {
								if (game.changeCoin) {
									game.changeCoin(-10);
								}
								this.backup = _status.event.dialog;
								_status.event.dialog.close();
								_status.event.dialog = _status.event.parent.dialogxx;
								this.dialog = _status.event.dialog;
								this.dialog.open();
								game.uncheck();
								game.check();
							}
						});
						if (lib.onfree) {
							ui.cheat2.classList.add("disabled");
						}
					};
					if (!ui.cheat2 && get.config("free_choose")) {
						ui.create.cheat2();
					}
					const list = ["zhu", "fan"].map(identity => {
						const dialog = ["请选择出场武将", '<div class="text center">本局游戏Buff</div>'];
						game.globalBuff.forEach((buff, ind) => {
							dialog.add(`<div class="text">「${ind === 0 ? "固定" : "随机"}」 ${get.translation(buff)}：${get.skillInfoTranslation(buff, null, false)}</div>`);
						});
						dialog.add([_status.characterChoice[identity], "character"]);
						return [game[identity], true, dialog];
					});
					game.me.chooseButtonOL(list, function (player, result) {
						if (game.online || player == game.me) {
							player.init(result.links[0]);
							if (player == game.me) {
								game.addRecentCharacter(result.links[0]);
							}
							player.hp = 10;
							player.maxHp = 10;
							player.hujia = 0;
							player.update();
						}
					});
					"step 2";
					if (ui.cheat2) {
						ui.cheat2.close();
						delete ui.cheat2;
					}
					for (var i in result) {
						var current = lib.playerOL[i];
						if (result[i] == "ai") {
							result[i] = _status.characterChoice[current.identity].randomGets(1);
						} else {
							result[i] = result[i].links;
						}
						_status.characterChoice[current.identity].removeArray(result[i]);
						if (!current.name) {
							current.init(result[i][0]);
							if (current.storage.nohp || (lib.character[current.name1].hasHiddenSkill && !current.noclick)) {
								current.storage.rawHp = 1;
								current.storage.rawMaxHp = 1;
							}
							current.hp = 10;
							current.maxHp = 10;
							current.hujia = 0;
							current.update();
						}
					}
					game.broadcast(function (result) {
						for (var i in result) {
							const current = lib.playerOL[i];
							if (!current.name) {
								current.init(result[i][0]);
								if (current.storage.nohp || (lib.character[current.name1].hasHiddenSkill && !current.noclick)) {
									current.storage.rawHp = 1;
									current.storage.rawMaxHp = 1;
								}
								current.hp = 10;
								current.maxHp = 10;
								current.hujia = 0;
								current.update();
							}
						}
						setTimeout(function () {
							ui.arena.classList.remove("choose-character");
						}, 500);
					}, result);
					game.globalBuff.forEach(buff => {
						game.addGlobalSkill(buff);
					});
					
					game.broadcastAll(() => {
						_status.wuxianhuoliProgress = 0;
						_status.wuxianhuoliLevel = 0;
					});
					const func = () => {
						ui.wuxianhuoliProgress = get.is.phoneLayout() ? ui.create.div(".touchinfo.left", ui.window) : ui.create.div(ui.gameinfo);
						ui.wuxianhuoliProgress.innerHTML = "任务进度(0/3)";
						const showTasks = () => {
							if (ui.wuxianhuoliInfo) {
								return;
							}
							ui.wuxianhuoliInfo = ui.create.system("无限火力", null, true);
							ui.wuxianhuoliInfo.currentProgress = 0;
							ui.wuxianhuoliInfo.currentLevel = 0;
							lib.setPopped(
								ui.wuxianhuoliInfo,
								() => {
									var uiintro = ui.create.dialog("hidden");
									uiintro.add(`<div class="text center" style="font-size:18px"><b>任务列表</b></div>`);
									if (typeof _status.wuxianhuoliLevel !== "number") {
										uiintro.add(`<div class="text center" style="font-size:12px">未获取当前进度，请于一名角色受伤后再查看</div>`);
									} else if (_status.wuxianhuoliLevel < 2) {
										uiintro.add(`<div class="text center">全场角色造成${_status.wuxianhuoliLevel === 0 ? 3 : 5}点伤害(当前${_status.wuxianhuoliProgress}点)</div>\
										<div class="text center">奖励：获得一个技能，摸两张牌</div>`);
									} else {
										uiintro.add(`<div class="text center">所有任务已完成，无后续任务</div>`);
									}
									uiintro.add(`<div class="text center" style="font-size:18px"><b>全局Buff</b></div>`);
									uiintro.add(
										`<div class="text">${game.globalBuff
											.map((buff, ind) => {
												return get.translation(buff) + "：" + get.skillInfoTranslation(buff, null, false);
											})
											.join("<br>")}</div>`
									);
									var ul = uiintro.querySelector("ul");
									if (ul) {
										ul.style.width = "180px";
									}
									uiintro.add(ui.create.div(".placeholder"));
									return uiintro;
								},
								250
							);
						};
						showTasks();
						if (!_status.postReconnect.wuxianhuoliShowTasks) {
							_status.postReconnect.wuxianhuoliShowTasks = [showTasks, []];
						}
						const dialog = ui.create.dialog("hidden", "forcebutton");
						dialog.add(`任务一`);
						dialog.addText(`任务：全场角色共计造成3点伤害<br>奖励：获得一个技能，摸两张牌`);
						dialog.add(`任务二<div class="text center" style="font-size:10px">(完成任务一后解锁)</div>\
							<div class="text center">任务：全场角色共计造成5点伤害<br>奖励：获得一个技能，摸两张牌</div>`);
						dialog.open();
						setTimeout(() => {
							dialog.close();
						}, 3000);
					};
					game.broadcastAll(func);
					game.delay(0, 3000);
					"step 3";
					_status.characterlist.addArray(Object.values(_status.characterChoice).flat());
					setTimeout(function () {
						ui.arena.classList.remove("choose-character");
					}, 500);
				});
			},
			chooseCharacterOL() {
				if (_status.mode == "dianjiang") {
					game.chooseCharacterDianjiangOL();
					return;
				}
				if (_status.mode == "wuxianhuoli") {
					game.chooseCharacterWuxianhuoliOL();
					return;
				}
				var next = game.createEvent("chooseCharacter");
				next.setContent(function () {
					"step 0";
					ui.arena.classList.add("choose-character");
					var num = [0, 1].randomGet();
					game.players[num].identity = "zhu";
					game.players[1 - num].identity = "fan";
					game.broadcastAll(
						function (p, t) {
							p.enemy = t;
							t.enemy = p;
						},
						game.players[0],
						game.players[1]
					);
					for (var i = 0; i < game.players.length; i++) {
						game.players[i].showIdentity();
					}
					"step 1";
					_status.characterChoice = {
						zhu: _status.characterlist.randomRemove(3),
						fan: _status.characterlist.randomRemove(3),
						all: _status.characterlist.randomRemove(6),
					};
					event.videoIdx = lib.status.videoId++;
					game.broadcastAll(
						function (id, list) {
							var dialog = ui.create.dialog(game.me.identity == "fan" ? "选择武将" : "请等待对手选择武将", [list.all, "character"], "起始武将", [list[game.me.identity], "character"]);
							dialog.videoId = id;
						},
						event.videoIdx,
						_status.characterChoice
					);
					"step 2";
					var next = game.fan.chooseButton(true, 1);
					next.set("filterButton", function (button) {
						return _status.event.canChoose.includes(button.link);
					});
					next.set("dialog", event.videoIdx);
					next.set("canChoose", _status.characterChoice.all);
					next.ai = function () {
						return Math.random();
					};
					"step 3";
					_status.characterChoice.fan.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.fan,
						true,
						event.videoIdx
					);
					var next = game.zhu.chooseButton(true, 2);
					next.set("filterButton", function (button) {
						return _status.event.canChoose.includes(button.link);
					});
					next.set("dialog", event.videoIdx);
					next.set("canChoose", _status.characterChoice.all);
					next.ai = function () {
						return Math.random();
					};
					"step 4";
					_status.characterChoice.zhu.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.zhu,
						false,
						event.videoIdx
					);
					var next = game.fan.chooseButton(true, 2);
					next.set("filterButton", function (button) {
						return _status.event.canChoose.includes(button.link);
					});
					next.set("dialog", event.videoIdx);
					next.set("canChoose", _status.characterChoice.all);
					next.ai = function () {
						return Math.random();
					};
					"step 5";
					_status.characterChoice.fan.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.fan,
						true,
						event.videoIdx
					);
					var next = game.zhu.chooseButton(true);
					next.set("filterButton", function (button) {
						return _status.event.canChoose.includes(button.link);
					});
					next.set("dialog", event.videoIdx);
					next.set("canChoose", _status.characterChoice.all);
					next.ai = function () {
						return Math.random();
					};
					"step 6";
					_status.characterChoice.zhu.addArray(result.links);
					_status.characterChoice.all.removeArray(result.links);
					game.broadcastAll(
						function (link, choosing, first, id) {
							var dialog = get.idDialog(id);
							if (dialog) {
								if (choosing == game.me) {
									choosing = "你";
								} else {
									choosing = "对手";
								}
								dialog.content.firstChild.innerHTML = choosing + "选择了" + get.translation(link);
								for (var i = 0; i < dialog.buttons.length; i++) {
									if (link.includes(dialog.buttons[i].link)) {
										if (first) {
											dialog.buttons[i].classList.add("selectedx");
										} else {
											dialog.buttons[i].classList.add("glow");
										}
									}
								}
							}
						},
						result.links,
						game.zhu,
						false,
						event.videoIdx
					);
					"step 7";
					game.broadcastAll("closeDialog", event.videoIdx);
					"step 8";
					var num = _status.mode == "changban" ? 2 : 1;
					var list = [
						[game.zhu, num, true, ["选择出场角色", [_status.characterChoice.zhu, "character"]]],
						[game.fan, num, true, ["选择出场角色", [_status.characterChoice.fan, "character"]]],
					];
					game.me.chooseButtonOL(list, function (player, result) {
						if (game.online || player == game.me) {
							player.init(result.links[0], result.links[1]);
						}
					});
					"step 9";
					for (var i in result) {
						var current = lib.playerOL[i];
						if (result[i] == "ai") {
							result[i] = _status.characterChoice[current.identity].randomGets(_status.mode == "changban" ? 2 : 1);
						} else {
							result[i] = result[i].links;
						}
						_status.characterChoice[current.identity].removeArray(result[i]);
						if (!current.name) {
							current.init(result[i][0], result[i][1]);
						}
					}
					game.broadcast(function (result) {
						for (var i in result) {
							if (!lib.playerOL[i].name) {
								lib.playerOL[i].init(result[i][0], result[i][1]);
							}
						}
						setTimeout(function () {
							ui.arena.classList.remove("choose-character");
						}, 500);
					}, result);
					setTimeout(function () {
						ui.arena.classList.remove("choose-character");
					}, 500);
				});
			},
		},
		element: {
			player: {
				dieAfter() {
					if (_status.mode != "normal" || _status.characterChoice[this.identity].length <= 3) {
						game.checkResult();
					}
				},
				dieAfter2() {
					if (_status.mode != "normal") {
						return;
					}
					var next = game.createEvent("replacePlayerSingle", false, _status.event.getParent());
					next.player = this;
					next.forceDie = true;
					next.setContent(function () {
						"step 0";
						game.delay();
						"step 1";
						player.chooseButton(true, ["请选择一名出场武将", [_status.characterChoice[player.identity].slice(0), "character"]]).set("forceDie", true);
						"step 2";
						var source = player;
						var name = result.links[0];
						var color = source.node.identity.dataset.color;

						game.broadcastAll(
							function (source, name, color) {
								source.revive(null, false);
								source.uninit();
								source.init(name);
								source.node.identity.dataset.color = color;
							},
							source,
							name,
							color
						);
						game.log(source, "出场");

						var num = _status.mode == "normal" ? 4 : source.maxHp;
						if (player.hasSkill("cuorui")) {
							player.logSkill("cuorui");
							num = 2 + _status.characterChoice[player.identity].length;
						}
						source.draw(num);
						var evt = event.getParent("dying");
						if (evt && evt.parent) {
							evt.parent.untrigger(false, source);
						}
						game.addVideo("reinit", source, [name, color]);
						game.triggerEnter(source);
						_status.characterChoice[player.identity].remove(name);
					});
				},
				logAi(targets, card) {},
				showIdentity() {
					game.broadcastAll(
						function (player, identity) {
							player.identity = identity;
							game[identity] = player;
							player.side = identity == "zhu";
							player.node.identity.classList.remove("guessing");
							player.identityShown = true;
							player.ai.shown = 1;
							player.setIdentity();
							if (player.identity == "zhu") {
								player.isZhu = true;
							}
							if (_status.clickingidentity) {
								for (var i = 0; i < _status.clickingidentity[1].length; i++) {
									_status.clickingidentity[1][i].delete();
									_status.clickingidentity[1][i].style.transform = "";
								}
								delete _status.clickingidentity;
							}
						},
						this,
						this.identity
					);
				},
			},
		},
		get: {
			attitude(from, to) {
				if (!from || !to) {
					return 0;
				}
				from = from._trueMe || from;
				let att = from.identity == to.identity ? 10 : -10;
				if (!_status.tempnofake) {
					_status.tempnofake = true;
					if (from.ai.modAttitudeFrom) {
						att = from.ai.modAttitudeFrom(from, to, att);
					}
					if (to.ai.modAttitudeTo) {
						att = to.ai.modAttitudeTo(from, to, att);
					}
					delete _status.tempnofake;
				}
				return att;
			},
		},
		skill: {

		},
		singleTranslate: {},
		translate: {
			zhu: "先",
			fan: "后",
			zhu2: "先手",
			fan2: "后手",
			normal2: "新1v1",
			changban2: "血战长坂坡",
			dianjiang2: "点将单挑",
			wuxianhuoli2: "无限火力",

			
			
			
			
			
			
			
			
			
			

			
			
			"#wanrong1": "狂蜂浪蝶，休想得逞！",
			"#wanrong2": "无礼之徒，速速退下。",
			
			
			
			
			"#xiechan1": "休走！你我今日定要分个胜负！",
			"#xiechan2": "不是你死，便是我亡！",
			
			
			"#huwei1": "传令，发动水计！",
			"#huwei2": "来人，引水对敌！",
			
			
			
			
			
			"#suzi1": "来来来！清点缴获！哈哈哈！",
			"#suzi2": "抢夺资材，快，快，快！",
			
			
			"#cangji1": "乾坤之道，我也略知一二。",
			"#cangji2": "聪慧之人，自有藏巧之计。",
			
			
			"#sgrenwang1": "民心，就是最好的武器！",
			"#sgrenwang2": "仁德之世，岂能毁于你手！",
			
			
			
			
			
			
			"#pianyi1": "呵呵，不能动了吧~",
			"#pianyi2": "将军，看呆了么~",
			
			
			"#sgxiaoji1": "你可要看好了！",
			"#sgxiaoji2": "谁说女子不如男！",
			
			
			
			
			"#shenju1": "谨慎为妙。",
			"#shenju2": "时机未到。",
			
			
		},
		help: {
			血战长坂: '<div style="margin:10px">游戏规则</div><ul style="margin-top:0"><li>选将阶段<br>双方在游戏开始时由系统随机分配身份。分配到先手身份的玩家优先出牌，分配到后手身份的玩家优先选将。<br>双方各自随机获得3名暗置武将，同时从将池中随机选出6名明置武将，由后手玩家开始，按照一次1张-2张-2张-1张的顺序，轮流选择获得明置武将。之后双方各从自己的6名武将中选择2名分别作为主将和副将进行游戏。<li>胜利条件<br>对方死亡。' + "<li>双将规则<br>双将主将决定角色的性别和势力，体力上限为主副将体力上限的平均值，向下取整。体力上限为3的角色可在游戏开始后更换一次起始手牌。<li>牌堆<br>牌堆中移除【木牛流马】【闪电】，♣花色的【藤甲】和【无懈可击 ♦️Q】️</ul>",
			无限火力: '<div style="margin:10px">1ｖ1火力全开模式</div><ul style="margin-top:0">（来自三国杀国际服）<li>所有角色的初始体力值和体力上限均为10，护甲均为0<li>每局游戏会有一个固定的Buff和一个随机的Buff，对所有角色生效' + "<li>游戏全程会有两个任务，分别为“所有角色造成3点伤害”和“所有角色造成5点伤害”，在任务一完成后才会解锁任务二。<br>每当任务完成时，系统会发放奖励：所有角色观看三个随机的技能并获得其中一个（每名角色每局有一次刷新的机会），然后摸两张牌。",
		},
	};
};
