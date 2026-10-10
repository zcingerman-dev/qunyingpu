# 群英谱

人物 Wiki、无名杀基础实战、我的收藏与 DIY、AI 辅助的统一本地入口。角色与技能按具体版本保存，同人物的多个版本可以共存。

## 1. 启动与跨电脑迁移

双击本目录的 **启动群英谱.cmd**，打开启动窗口显示的本机地址。运行期间保留服务进程。后台任务不依赖前台页面持续打开，但本机服务、浏览器和外接工作客户端须运行；关机前先在页面暂停。服务重启不会自动恢复优化任务，续跑由使用者选择。

同时测试 Wiki 和联机时，双击 **启动Wiki与联机.cmd**（需要 Python 3 与 Node.js），等待两个服务检查通过后使用自动打开的页面；运行期间保留启动窗口，结束时按 Ctrl+C。已有同类服务会直接复用，不终止其他程序；启动或运行故障记录在 `.runtime/logs/`。看到 `ERR_CONNECTION_REFUSED` 表示浏览器所在电脑没有可访问的本机服务，先用此入口启动。AI 在隔离执行环境内的启动检查不代表桌面浏览器可访问，不能仅据此报告“已启动”。

**下文文件路径全部相对于本包根目录**，即包含 `启动群英谱.cmd`、`app/`、`module-01/` 至 `module-04/` 的目录。在开发工作区中它是 `outputs/`；分享时把整包搬到新目录，从该目录启动。禁止在源码、提示词和任务指令中写死某台电脑的用户名、盘符、工作区路径或服务端口。

需要 Python 3。启动脚本优先使用当前用户已有配套 Python，再使用 `py -3`；也可在本包目录运行 `python app/server.py --open-browser`。端口可用 `--port` 配置，以启动窗口实际显示为准。后台实战使用本机 Chrome/Edge，可由环境变量 `SANGUOSHA_BROWSER` 指定本机浏览器路径；不要恢复旧 extension loader。

**接口使用相对当前服务根的路由**，例如 `/studio/api/jobs`。前导 `/` 表示同源服务根，不是文件系统路径。页面使用同源 fetch；本机工具从当前连接文件读地址再拼接路由，不固定 `http://127.0.0.1:某端口`。

迁移前暂停任务、备份/按需导出个人资料。`module-04/data/desktop-runtime/` 中的 connection/inbox/answer 与 `data/codex-runtime/` 属于本机运行缓存，不应随包分享；不要分发账户凭据。新电脑重新生成工作通道连接。Windows DPAPI 保存的密钥绑定原用户，新电脑重新配置。

## 2. 模块、能力与数据

| 板块 | 主要路径 | 能力与数据 |
| --- | --- | --- |
| 统一入口 | `app/server.py`、`app/index.html` | 导航、同源挂载、共享皮肤/语音、说明；不另建重复资料库 |
| 素材与来源 | `module-01/` | 原始移动/桌面资源、图片、音频及来源索引 |
| 人物 Wiki | `module-02/index.html`、`wiki_server.py` | 人物检索、身份分类、关系图谱、作品情节、版本技能、编辑历史；个人数据 `data/wiki.sqlite`，基础数据 `wiki-data.json/js`、`relation-network.json/js` |
| 基础实战 | `module-03/index.html`、`play_server.py` | 身份场、国战、斗地主、点将单挑、逐席选将、将池、牌堆、托管、控制台、回放；设置与事件 `data/play.sqlite` |
| 本地联机（第一阶段） | `module-03/network.html`、`network-host.js`、`network-transport.js`、`network-store.py` | 同机两个真人客户端、Host唯一执行引擎、ACTION验证、EVENT/SNAPSHOT同步、Host随机数；详见 [本地联机说明](module-03/本地联机第一阶段.md) |
| 临时互联网房间（最终集成） | `module-03/internet.html`、`network-view.js`、`network-session.js`、`network-rtc.js`、`network-controls.js`、`network-table.js`、`signaling/server.mjs` | 身份／国战／斗地主／单挑、真人＋AI、逐席选将、Ready、Host权威、WebRTC/STUN/TURN配置、隐藏信息白名单、原座位Snapshot重连、防重复ACTION、原生风格牌桌、每席持续托管；Host退出关闭房间；详见 [最终联机验收报告](module-03/最终联机验收报告.md)及 [牌桌与托管验收](module-03/联机牌桌与托管验收.md) |
| 我的 | `module-04/personal.js` | 收藏、皮肤、DIY 独立版本、图片裁剪、报告、导出；`data/personal.sqlite` |
| AI 辅助 | `module-04/ai.js`、`studio_server.py` | 模型配置、技能草案、既有武将改良、后台优化、独立验证、综合报告 |

临时互联网房间独立使用正式接入的三国将池，选将可按中文将包名筛选，不沿用单机勾选的将包。创建房间后，Host可在“房间将池”打开“添加已有DIY武将”，勾选本机已发布的具体版本，再点击“应用将池变更”；所有真人重新Ready后开局。DIY默认关闭，未发布、缺代码或语法错误版本不可选。本入口不创建新武将，不恢复原extension loader；旧本地联机仍为标准单挑。

开局后冻结本局版本。DIY代码仅在Host原生引擎中执行，Client无需安装该DIY，通过PlayerView收到必要技能说明和压缩立绘；Host的收藏、其他素材、AI配置和密钥不进入房间广播。将池变更用配置修订号重置Ready，旧修订号的Ready或开局请求会被拒绝。接入路径为 `module-03/network-roster-index.json`、`network-roster.js`、`network-roster-ui.js`；只在Host的网络选将路径传入白名单，禁止据此改写单机配置或逐技能重构。混合包中题材不明的条目见 [联机将池分类待确认](module-03/联机将池分类待确认.md)。目录版本数不等于某模式的实际候选数，实际候选还需通过原生模式过滤和国战主副将配对规则。

联机对局使用原生风格牌桌：自己在左下、其他席位绕桌排列、手牌在底部、公开出牌在中央。显示座位绕自己旋转，不改变引擎座次；小屏幕改为自动换行。房间信息开局后折叠，仍可展开和离开。左上“托管”只控制自己的座位，选将和Ready须手动完成；进入对局后AI持续处理出牌、响应、技能选择及濒死救援，点击“取消托管”交回尚未提交的选择。暂停／继续整局仅Host可操作，暂停中可以取消托管。托管由Host内置AI执行，Client刷新恢复原座位和托管状态；断线仍使用现有暂停／重连规则，不自动交给AI。

联机工具仅展示PlayerView允许的资料：“牌堆”只显示数量，“公共区域”只显示公开装备／判定，“记牌器”保留最近96次公开使用／打出的牌，“显示身份”只开关已获授权的身份显示。`network-table.js`和`network-arena.css`负责外观，不能读取Host引擎；所有发往Client的状态继续经过`network-view.js`。托管与暂停使用已有ACTION通道，由`network-controls.js`检查真人座位、状态和控制修订号，不能绕过重复提交和protocolVersion检查。旧本地联机测试入口保持原界面。

新杀谋诸葛亮阴形态使用用户提供的补充图片，保存于`module-01/project-art/dc_sb_zhugeliang_shadow.png`，通过`module-03/asset-map.json`映射原生图片请求。转换形态同步到授权玩家视图，国战暗将不公开形态ID。原生单机自选皮肤优先，切换转换形态不丢失所选皮肤；恢复默认后重新使用对应形态图片。补图不修改技能实现。

页面入口：`/wiki/index.html`、`/play/index.html`、`/personal/index.html`、`/ai/index.html`。Wiki 与实战按版本映射，未接入资料不会当白板参战。

收藏保存具体版本与皮肤。皮肤窗口右上角“自选皮肤”仅展示自己上传的素材，与原包皮肤分开。临时换肤只在当前局生效，语音可独立选版本；国战暗置角色明置后才提供对应入口。只有点击角色下三分之一或武将的“技能”按钮才打开技能说明；双击立绘换肤。选目标时立绘仍用于选择目标，可用技能按钮查看。窗口保存打开前的暂停状态，关闭后恢复。测试/回放临时外观不改原始记录。

联机房间使用立绘牌桌、卡牌手牌和图像选将。显示层为 `module-03/network-table.js`，本地联机与互联网房间共用；它只读取 `network-view.js` 生成的 PlayerView，不读取完整 Host 状态。出牌、选目标、响应和技能选择仍提交 ACTION，由 Host 验证。国战暗将对其他玩家使用占位图。乐曹植的“赋”文字只显示在当前玩家自己的手牌内，移入他人区域或公共区域后隐藏；联机公开卡牌不发送该私人标签。详见 [交互与联机可视化验收](module-03/交互与联机可视化验收.md)。

立储与内奸择途使用八至十人、单将。内奸首次选择野心家后获得一次性的1枚“野心家标记”；仅自己的回合内（包括额外回合和濒死时）可消耗，选择摸两张牌或回复1点体力。回合外濒死不可使用，满血不能回复；未使用跨回合保留，消耗后不补充。真人可用规则栏按钮或原生技能选择，濒死时提供原生选择；AI遵守相同限制。标记及消耗保存到原生回放和规则快照，回放不重复结算。此规则沿用本地立储／择途入口，当前互联网身份场仍为标准身份。

实战速度支持慢速、正常、快速、极快、超快，可在开局设置或对局工具栏切换；超快使用引擎已有的 `vvfast` 档，回放使用对应的8倍档。

将包使用中文名，例如 `bingshi` 为“势包”，引擎 ID 不变。预览按武将显示，同包同名只列一次，不展开所有版本、不改已选将池。平台批注为十周年、OL、手杀，共有时全部标注，资料不足写“其他”；来源为本地保存的资料，标签不表示不同平台技能完全相同。共享逻辑：`app/general-packs.js`；资料索引：`app/general-platforms.json`。

DIY 按“技能1、技能2、技能3……”分别填写名称与描述，可增删、排序；详情逐技能显示。旧自由文本兼容，无法可靠拆分时先作为一个块保留，可手动分开。代码主技能列表应保持相同顺序。已有对局引用的版本不可原地改写，应保存新版本；新版本不会自动替换收藏或正在运行的任务目标。

测试服神姜维修正版为 v7。v6 的绝烬曾使用不支持的 `text` 按钮类型；新版本改为 `textbutton`。`module-03/personal-engine.js` 对这一已确认 v6 ID 的旧快照做同样的加载兼容，保留历史源码，其余版本不套用此修复。验证须覆盖真实选项窗口，不能只替代 `chooseButton` 的返回值。

武将卡改良支持增删改、效果草案预检、原因与历史、恢复。新增蓝色、删除加横线且不结算。生成草案、预检、应用分别显示状态；仅生成不会自动应用，应用只影响后续新局。

## 3. AI 接入与各通道

### 服务商与桌面接入

支持 OpenAI/Codex API、DeepSeek API、豆包/火山方舟及兼容 API。桌面工作模式支持 Codex、豆包、**DeepSeek Harness** 和能操作本机文件/命令的其他客户端。DeepSeek Harness 工作模式沿用其模型与登录，通过任务队列提交回答；与 DeepSeek API 独立，不读取 Harness 的密钥。

流程：保存服务商配置 → 生成本机任务指令 → 在客户端打开本包目录，运行指令中的 `module-04/desktop_worker.py` → 检查工作通道 → 在网页创建或续跑任务。普通聊天窗口不会自动成为接口；只有云端且无法访问这台电脑的客户端无法直接连接。

API 密钥默认仅在当前服务内存。手动勾选保存时使用 Windows 当前用户加密；导出不含密钥。桌面 token 上限是指导值，不能保证硬截断；没有准确用量时记“未知”，不虚构费用。Codex 本机直接接入另用本机 app-server 适配，是否可用以本机真实连接检查为准。

### 给外接 AI 阅读的接口分工

下列均为**相对服务根的路由**。完整参数以对应后端校验和前端现有请求为准，不能靠表格猜测请求结构。

| 用途 | 路由 | 调用边界 |
| --- | --- | --- |
| 设置/运行数据 | `GET /play/api/state`、`GET /studio/api/state`、`GET /studio/api/runtime` | 本机页面/受授权工具；响应含运行令牌，不打印或导出完整配置 |
| 改良资料 | `GET /studio/api/improvements`、`GET /studio/api/improvement/{version}` | 只读当前改良与历史 |
| 查看任务 | `GET /studio/api/jobs`、`GET /studio/api/job/{id}`、`GET /studio/api/job/{id}/status` | 读取已有任务，不能据此新建重复任务 |
| 后台牌桌截图 | `GET /studio/api/job/{id}/preview` | 查看当前任务，不开新局 |
| 创建后台优化 | `POST /studio/api/job`，`config.workflow="outer-v2"` | 网页或明确授权的控制端；**不是外接回答端入口** |
| 暂停/续跑/独立验证 | `POST /studio/api/job/{id}/control` | action 为 `pause`、`resume`、`evaluate` 等；续跑保持同一任务 ID |
| 引擎上报 | `POST /studio/api/job/{id}/{begin,finish,live,heartbeat}` | `background-runner.js` 专用，外接模型不得伪造局面/结果 |
| 策略分析/评分 | `POST /studio/api/job/{id}/coach`、`/evaluation` | 后台流程调度；外接 AI 只回答队列，不绕过流程触发 |
| 生成连接 | `POST /studio/api/desktop/connect` | 网页生成当前连接文件与指令；重启后重新生成 |
| **外接 AI 唯一任务通道** | `POST /studio/worker/claim`、`/heartbeat`、`/answer`、`/disconnect` | **后台优化、技能生成、报告均通过该队列**；由 `desktop_worker.py` 提交 |
| 后台技能效果草案 | `POST /studio/api/draft`；`GET /studio/api/draft/{id}` | 生成/查看草案，不自动应用或启动对局 |
| 应用武将改良 | `POST /studio/api/improvement` | 指定版本、预检和明确选择操作后提交 |
| DIY 代码生成 | `POST /studio/api/generate` | 返回 `code/explanation/uncertainties`；采用后保存未发布新草稿 |
| 保存个人资料 | `POST /studio/api/state`，带 `revision/state` | 保留其他字段；冲突先刷新，引用中 DIY 另存新版本 |
| 个人导出 | `GET /studio/api/export` | 收藏、DIY、报告、改良历史，不含密钥 |
| Wiki 编辑 | `GET /wiki/api/state`、`GET /wiki/api/history`、`PUT /wiki/api/state`、`POST /wiki/api/restore` | Wiki 版本校验专用，不是实战技能写入入口 |
| 实战/回放 | `POST /play/api/launch`、`GET /play/api/match/{id}`、`POST /play/api/match/{id}` | 网页/原生引擎使用；禁止改旧快照代替修复 |

实战/个人写接口要求同源和 `X-Play-Token`；Wiki使用自己的 `X-Wiki-Token`；队列独立使用 `X-Desktop-Token`。从当前服务/连接文件读取，不写死、不混用、不出现在报告或共享包里。

外接客户端只读本次指令指定 inbox，按 purpose/prompt/image 与合法候选生成回答；原子写入对应 answer：`lease` 匹配当前任务，`answer` 是 JSON 对象；有准确用量才填 `usage.input_tokens/output_tokens`。工具代为提交，模型不直接写数据库/源码、不自行创建或恢复优化任务。同一连接只启动一个工具。工具退出、90 秒心跳中断或领取后5分钟未回答会暂停，旧 lease 被拒绝。

### 后台优化与暂停

流程：本地 AI 采样 → 复制 Champion 为 Challenger → 分批优化 → 独立验证 → 综合评分 → PASS 晋级、DRAW 保留、FAIL 回滚。优化只修改 AI 策略字段，原生引擎结算技能；训练和验证分开，已冻结 Champion 不直接覆盖。

默认100个有效优化局、每批10局。第一批基线；前五批本地操作，模型批后分析。第50局按有效操作损失决定一次分支：单挑5%、军争身份场20%、国战25%、其他10%。超过阈值则逐局结束后分析调整下一局；不超过则固定第五批策略完成余下局数。操作损失基于当时可见信息与合法动作估评，不用胜率预测代替，也不把估计最优称为数学上已证明的最优。

单挑固定双方武将，其他模式允许将池随机。验证新旧策略采用成对相同阵容、座次、条件与种子，每一组内减少随机差异，各组间仍随机采样。故障局单列并补足有效数；目标技能未触发不能记作实战通过。

综合评分默认：结果20%、生存15%、输出15%、控制15%、资源循环15%、团队贡献10%、稳定性10%。采样/优化/验证局数、历史轮数可调。此为策略评价，不用于代码有效性审核。独立验证与策略采用由使用者启动，不因优化结束自动采纳。

切换页面看状态；关机/关服务/工作客户端前先暂停。续跑沿用任务ID。技能新版本不会自动替换已开始任务的规则快照。定位不明故障单独 Markdown，记录版本/任务、场景、位置、证据；不要清空存档或全局重置。

## 4. AI 修改项目的路径与规范

### 路径映射

| 修改对象 | 首选文件 | 同步/检查 |
| --- | --- | --- |
| 统一服务与包名 | `app/server.py`、`app/general-packs.js`、`app/general-platforms.json` | 静态路由白名单、共享显示、标签来源 |
| Wiki 基础资料 | `module-02/wiki-data.json/js`、`relation-network.json/js` | 成对内容一致，人物/版本 ID 保留；个人编辑走接口 |
| 实战目录与将池 | `module-03/play-catalog.json`、`roster-engine.js`、`roster-rules.js` | loader 可达性、技能挂载、说明映射 |
| 原生规则/正式包 | `module-03/engine/character/`、`engine/noname/` | 当前 API、注册与必要依赖，局部修改 |
| 迁入正式包 | `module-03/engine/character/extra_generals/` | 原系列子目录、`index.js`、`migration.json`，不执行旧扩展入口 |
| DIY 运行/展示 | `module-03/personal-engine.js`、`module-04/diy-skills.js` | prefix 隔离、主技能顺序、不可变版本 |
| 我的/AI 页面 | `module-04/personal.js`、`ai.js`、`common.js`、`studio.css` | 状态、版本选择、相对资源路径 |
| 武将改良 | `module-04/card_improvements.py`、`background_drafts.py`、`improvements.js` | 增删改、预检、应用、历史 |
| 后台优化 | `module-04/optimization.py`、`background_jobs.py`、`background-runner.js`、`outer-ui.js` | 状态机、暂停恢复、故障与独立验证 |
| 外接工作队列 | `module-04/desktop_bridge.py`、`desktop_worker.py` | 相对工作路径、运行时地址、lease、心跳 |

Python 用 `__file__`、前端用当前模块URL定位文件；不扫描其他聊天的工作区猜位置，不另启一份服务/数据库。

### 操作规则

1. 已有 PASS 默认冻结；只在公共 API、隐藏技能框架或生命周期规则确有缺陷时反查受影响项，不换方法全量重审。
2. 保留 character/skill ID。不同角色ID共存，相同定义复用；同ID异定义只对冲突技能内部隔离，保留原ID索引与必要辅助依赖。
3. 不恢复原 extension loader、旧单挑或专属模式。迁入只带必要武将/技能闭包/翻译/资源，失败单列。
4. 个人数据走已有 revision 接口，迁移前备份。禁止覆盖旧对局/已引用DIY；另存版本，不改无关收藏与任务。
5. 依赖默认一层、最多两层，无法证明就人工/运行时队列；国战暂缓项仍 DEFERRED。普通技能无明显错误立即 PASS 停读，不分析强度或平衡。
6. 先语法/加载/注册，必要时只跑触发技能的定向场景，不强求完整局。触发、移动/获得/清理确实发生且无错误才算通过。
7. 批量输出统计和非PASS项，附具体文件行号/原因；禁止重复长篇解释全部PASS。

### 常见技能书写规范

DIY 返回 character/skill/translate，仅一个武将；性别、势力、体力、立绘以DIY元数据为准。所有自定义技能、辅助和Mark用传入 prefix。

```javascript
const id=prefix+'example';
return {
  character:{[prefix+'general']:['male','shu',4,[id]]},
  skill:{[id]:{
    trigger:{player:'phaseZhunbeiBegin'},frequent:true,
    async content(event,trigger,player){await player.draw(1);}
  }},
  translate:{[prefix+'general']:'武将名',[id]:'技能名',
    [id+'_info']:'准备阶段，你可以摸一张牌。'}
};
```

- 主技能平级独立，每项单独名称/`_info`，character技能列表按显示顺序；“技能1/2”是编辑标签，不是运行ID。
- 选对 `trigger.player/source/target/global` 和当前引擎事件名；他人锦囊指定你为目标须检查目标事件，不能监听自己的出牌事件。
- `subSkill` 定义不代表自动触发，需要随主技能工作的用 `group` 挂载；直接/global/临时/动态依赖必须存在，命名同prefix。
- 新内容使用 `async content(event,trigger,player)` 和原生等待。旧 step 编译会重建普通 content，不能假定闭包仍保留 prefix/helper；不要混用 step 标签与async。
- 伤害、摸牌等原事件修改 `trigger.num`，不是包装事件的 `event.num`。检查 card/source/target 可能为空的情况。
- API 以当前引擎签名为准，例如 `player.damage(X,'fire',source)`；不要猜对象参数。弃牌使用本版 discardable 检查和 `discardPlayerCard`。
- 每轮/回合/阶段次数分开；本版轮次是 `game.roundNumber`。限定技在已确认的消耗点调用 `awakenSkill`，取消分支按用户规则。
- 临时技能明确到期，例如 `{player:'phaseAfter'}`；本局效果用长期技能/状态并有移除清理。`insertPhase` 保存来源，只在对应额外回合加成，结束即清。
- Mark/Storage/Flag/Pile核对创建→读取→清除。代理牌使用时移动原实体牌，取消/失去技能清代理，不能复制资源。
- ViewAs检查牌名/subcards/使用者/目标/skillName；hiddenCard只声称真实可用牌。`chooseButton` 读取links、`chooseControl`读取control、`chooseTarget`读取targets，使用 `.forResult()`。
- 已审核公共API可复用摘要，不反复读底层；只核明确错误，不追理论组合或收益。

## 5. 冻结范围与历史记录

上一阶段注册/加载核对冻结：**4,805 PASS，11国战暂缓**。迁入正式包94个武将版本，376个运行时技能定义（213主技能、163辅助），成功系列：玩点论杀、天庭、杀海拾遗、斩峥嵘、DDD、烽火起。三个失败版本按确认范围物理清理，原生手杀灵雎保留。这里的PASS表示对应阶段检查通过，不表示已证明所有技能语义和极端组合。

- [本次更新与检查](阶段更新与检查-2026-10-07.md)
- [未接入扩展包决策清单](未接入扩展包决策清单.md)
- [正式迁入结果](未接入扩展武将正式迁入结果.md)
- [失败版本物理清除](失败迁入版本物理清除结果.md)
- [旧说明与阶段更新](docs/history/readme-before-2026-10-07.md)

历史文件的统计和要求可能已过时，当前行为以本说明及最新阶段报告为准；历史清单不是让AI重新扫描或恢复已删除武将的指令。

## 6. 分模块鸣谢与许可证

### 无名杀规则引擎与基础实战

感谢 **无名杀原作者、维护者和全部社区贡献者**提供开源框架、规则引擎及武将技能。本项目整合本地入口与AI功能，不将原引擎或原技能实现称为原创。上游：[libnoname/noname](https://github.com/libnoname/noname)。完整GPL-3.0许可证保留在 `module-03/LICENSE`；分发时保留许可证和版权声明，并履行适用的源码义务。

### 原包、扩展与素材

感谢 **诗笺版及贡献者、子琪电脑版及扩展贡献者、懒人包整理者**提供两次资源导入基础；感谢 DDD、全能搜索、天庭、懒人包、杀海拾遗、斩峥嵘、烽火起、玩点论杀各系列原作者与贡献者。具体署名/许可以原包和源码记录为准，作者不明时不编造姓名。

感谢三国杀制作方、原画和配音作者。立绘、卡牌、音乐和音频的权利归原权利人，本项目保留原素材，不移除水印；源码开源许可不等于所有美术/音频的独立商业授权。

### Wiki、人物关系与检索

感谢三国杀 **BWiki十周年、手杀、OL** 的资料维护者提供版本与技能核对依据，资料页保留来源。史籍、小说、影视、包体创作分别标识。感谢 **pinyin-pro 3.27.0** 拼音库，MIT声明保留于 `app/PINYIN-NOTICE.txt`。

### 皮肤、语音与AI整合

感谢 **03佬静态皮肤整合与千幻聆音原作者和贡献者**提供整理与参考。AI模块为新增整合层，生成代码仍需预检和确认；使用AI不替代对无名杀、扩展和素材作者的署名。各文件保留原声明，鸣谢不表示原作者对本项目修改、AI输出或测试结论承担责任。
