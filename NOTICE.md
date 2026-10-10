# 第三方来源、鸣谢和许可范围

## 规则代码

原无名杀上游：<https://github.com/libnoname/noname>。`package/module-03/LICENSE` 和根目录 `LICENSE` 保留 GNU GPL 第3版文本。原引擎、技能和扩展不声称为本项目原创。本次新增的源码准备工具按 GPL-3.0 提供；第三方文件保留其原许可，不统一改写为本项目许可。

本仓库保留当前实战使用的代码及对应的源码准备／构建方法。当前编译后的浏览器模块也保留在原路径。各原包声明见 `package/module-01/package/LICENSE` 和相关扩展目录；原作者不明时不虚构姓名。

## 依赖与运行时

- pinyin-pro 3.27.0：原声明在 `package/app/PINYIN-NOTICE.txt`。
- 信令 ws：原声明在 `package/signaling/vendor/ws/LICENSE`。
- 原生引擎随带的 Node 模块：原目录中的 `package.json` 和许可声明保留，索引见 `third-party-notices/dependencies.json`。有些原包未附独立 LICENSE，此表不把这些空缺写成已核实。
- 便携 CPython 3.12.14、Node v24.19.0：由网盘包提供，许可证另保留于 `third-party-notices/`，资源恢复时同时恢复其原声明。Node 上游：<https://nodejs.org/>，CPython 上游：<https://www.python.org/>。

## 美术、音频、字体和资料

感谢三国杀制作方、原画与配音作者，诗笺版、子琪电脑版、懒人包及各系列作者，03佬静态皮肤整合、千幻聆音与社区贡献者。人物资料来源与模块鸣谢见 `package/readme.md`。

这些素材的权利归各自权利人；代码许可不表示素材可以按同一许可使用。素材从网盘完整包恢复，保留原文件、来源索引和既有水印。发布者应确认第三方素材的公开分发范围；本次整理未取得或编造新的授权。

## 本次发布整理

游戏、武将与技能代码按已验收发行目录保留，未改规则或平衡。仅将 `package/module-03/runtime-source.json` 和 `package/module-01/catalog-data.js` 中的历史开发机来源元数据改为相对来源标识。原维护说明及直接关联文档原样保留。
