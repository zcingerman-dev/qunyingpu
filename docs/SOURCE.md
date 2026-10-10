# 源码准备、测试与目录发行

## 目录

```text
README.md                    GitHub 首页与下载入口
package/                     与便携包一致的应用源码、配置和维护文档
initial-data/                干净初始资料，含当前 DIY、素材与技能改良
tools/                       资源补齐、检查、目录构建与工具测试
resource-manifest.json       外置美术和运行时清单，路径相对 package/
source-manifest.json         当前版本源码及初始资料指纹
third-party-notices/         依赖声明索引与运行时许可证
```

## 首次准备

1. 从 README 的网盘下载并完整解压便携包到源码目录以外。
2. 在源码根目录双击 `准备源码.cmd`，输入包含 `app/`、`.runtime/`、`module-01/` 的便携包根目录。
3. 完成后双击 `启动源码.cmd`。使用的仍是 `package/启动游戏.cmd`，不是另建的游戏引擎。

也可在源码根目录的 PowerShell 执行（示例使用相邻目录，不固定用户名或盘符）：

```powershell
& '../群英谱/.runtime/python/python.exe' -I -B -X utf8 tools/package_tools.py prepare --from-portable '../群英谱'
& 'package/.runtime/python/python.exe' -I -B -X utf8 tools/package_tools.py check --ready
```

工具仅访问指定本地目录，不下载网盘、不发送数据、不启动服务。不复制便携包的旧源码，只恢复清单中的资源和运行时；先验证完整清单，资源缺失或冲突时拒绝复制。初始数据库仅在目标不存在时复制，已有个人资料保留。素材验证依据为存在和大小，不宣称已完成所有素材的内容／版权审计。当前路径清单对应 v1.0.0。

`package/module-03/engine/node_modules/` 是原生浏览器模块的既有依赖，属于待提交源码，不能用通用 `node_modules/` 忽略规则排除。恢复的美术、运行时和本机资料由 `.gitignore` 排除。`.gitattributes` 保留现有文件字节，防止换行转换使当前版本指纹失效。

## 检查与测试

```powershell
& 'package/.runtime/python/python.exe' -I -B -X utf8 tools/package_tools.py check --ready
& 'package/.runtime/python/python.exe' -I -B -X utf8 tools/test_package_tools.py
```

`check` 检查当前版本源码与种子资料；`--ready` 再检查外置资源和本机数据库是否已初始化。修改源码后，旧指纹不再代表新版本，应在下一次正式发布时重新生成清单，不能把检查失败自动当作技能错误。

完整浏览器回归入口为 `tools/smoke-browser.cjs`，由本地开发者提供以下环境变量：`RELEASE_PLAYWRIGHT`（Playwright 模块位置）、`RELEASE_BROWSER`（测试浏览器）、`RELEASE_ROOT`（当前完整包体）、`RELEASE_URL`（本机统一服务地址）、`RELEASE_SIGNAL`（测试信令地址）、`RELEASE_REPORT`（测试报告输出）。测试覆盖四种模式的真实原生开局和 WebRTC。测试有意产生对局，仅在隔离副本运行，不在待上传目录或已验收便携包运行。

本机自动回归的测试浏览器禁用 WebRTC mDNS 地址隐藏，避免测试环境无法解析本机候选地址导致的连接超时；此参数仅用于隔离测试进程，不写入发行启动器或游戏连接设置，也不替代跨公网信令／STUN／TURN 验收。

## 再次整理便携目录

补齐资源后，在源码根目录执行：

```powershell
& 'package/.runtime/python/python.exe' -I -B -X utf8 tools/package_tools.py build --destination '../群英谱-新发行目录'
```

目标必须为源码外的新目录，工具拒绝覆盖或删除已有目录。应用文件取当前源码，资源来自已补齐的清单，数据库始终取 `initial-data/`，不会复制开发运行中的对局和密钥。这是目录构建，后续压缩与 SHA-256 计算另行进行。

只发布版本一致、已测试的源码与便携包。当前网盘便携版已由发布者移动，本仓库不重新生成它，不伪造它的校验值。
