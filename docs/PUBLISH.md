# 发行方式与维护边界

源码仓库：<https://github.com/zcingerman-dev/qunyingpu>。本项目采用“GitHub 完整源码与说明＋网盘完整便携版”的发行方式。

## 下载入口

- 普通玩家：下载 [夸克网盘便携版](https://pan.quark.cn/s/ecbb3918af01?pwd=p9Hz)，提取码 `p9Hz`，完整解压后运行 `启动游戏.cmd`。
- 开发者：获取本仓库源码，按 [源码准备说明](SOURCE.md) 从便携包补齐资源和运行时；补齐后可以运行全部功能。

发布者已人工核对网盘文件为此前验收的便携版 ZIP，目前未单独提供 SHA-256。仓库自动生成的 Source code ZIP 不包含外置美术、音频、字体和便携运行时，不能直接当作完整便携版。

## 维护要求

1. 已通过的游戏规则、武将与技能继续冻结。原生引擎相对路径、角色／技能 ID、Host 权威与 PlayerView 边界保留，不因发布重新审核全部技能。
2. 原 `package/readme.md` 及其直接维护文档原样保留。普通玩家说明在仓库根 README，不覆盖 Windows 上同名大小写的维护文档。
3. 发布源码与便携包应对应同一版本。当前版本为 `v1.0.0`；后续修复或新增功能时同步更新两者的版本记录与资源清单。
4. 发行初始数据来自 `initial-data/`，保留当前修改、DIY／test 包与素材。运行中的数据库、对局记录、连接令牌、账号或密钥不提交。
5. 所有已引用美术仍在网盘便携包内；GitHub 使用资源清单与相对路径补齐，不恢复旧 extension loader。字体与动画骨骼也属于外置资源。
6. 上游无名杀、Wiki 等来源与许可说明保留在原维护文档、LICENSE、NOTICE 及依赖声明索引中，不虚构额外素材授权。部分原包依赖缺独立许可文件的历史状态保留在 `third-party-notices/dependencies.json`。
7. 自动回归的历史问题与发布者后续确认分开记录，详见 [运行时核对记录](RUNTIME-REVIEW.md)，不得把人工反馈改写成自动测试 PASS。

## 后续更新

源码内存在超过网页上传 25 MiB 限制的索引文件，应使用 GitHub Desktop 或 Git 命令行提交；本次没有超过普通 Git 单文件 100 MiB 限制的文件。参考 [GitHub 文件限制](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。

提交前检查源码、初始资料和忽略规则；不要在原开发目录全量提交，不提交恢复后的资源、运行时、日志或个人数据。更新源码和说明需要发布者明确授权。

便携 ZIP 继续放网盘，版本说明记录下载链接、提取码和变更。仓库用于源码与下载说明，运行中的 Wiki、信令和 TURN 服务仍由使用者启动。本次源码上传不包含大资源附件，不自动创建 GitHub Release 或上传便携 ZIP。
