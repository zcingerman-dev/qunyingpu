@echo off
chcp 65001 >nul
cd /d "%~dp0"
"%~dp0.runtime\python\python.exe" -I -B -X utf8 "%~dp0app\portable_launcher.py" --kind signal %*
if errorlevel 1 pause
