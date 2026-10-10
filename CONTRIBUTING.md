# 贡献与维护

先阅读 `package/readme.md`，它保留了模块路径、相对接口、AI 工作通道、技能书写规范和已冻结范围。

修改时保留角色和技能 ID，保持单机与联机共用的规则；不要用画面座位改变引擎座次，不要绕开 Host 验证及 PlayerView 隐藏信息边界。保留原作者、来源和许可证。

源码准备方式见 `docs/SOURCE.md`。补齐资源不会覆盖代码；首次运行从 `initial-data/` 初始化，已有个人资料不覆盖。正式发行重新使用初始数据，不带开发对局和密钥。

新增修改须运行对应检查。纯发布整理检查入口为 `tools/package_tools.py check`，工具安全测试为 `tools/test_package_tools.py`。真实浏览器测试使用 `tools/smoke-browser.cjs`，需要开发者自行提供 Playwright 与测试浏览器；这些测试工具不成为普通玩家的运行依赖。
