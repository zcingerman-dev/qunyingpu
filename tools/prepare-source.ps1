param([string]$PortableDirectory)
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
if (-not $PortableDirectory) {
    $PortableDirectory = Read-Host '请输入已完整解压的群英谱便携包目录'
}
$portableRoot = (Resolve-Path -LiteralPath $PortableDirectory).Path
$pythonPath = Join-Path $portableRoot '.runtime/python/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
    throw '找不到便携包内的 Python。请选择包含 .runtime 和 app 的包体根目录。'
}
& $pythonPath -I -B -X utf8 (Join-Path $PSScriptRoot 'package_tools.py') prepare --from-portable $portableRoot
if ($LASTEXITCODE -ne 0) { throw '资源准备失败；已有源码和资料未被覆盖。' }
Write-Host '准备完成，可在仓库根目录双击“启动源码.cmd”。'
