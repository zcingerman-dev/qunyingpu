@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "%~dp0package\.runtime\python\python.exe" (
  echo 请先运行“准备源码.cmd”，从已解压的便携包补齐资源。
  pause
  exit /b 1
)
call "%~dp0package\启动游戏.cmd" %*
