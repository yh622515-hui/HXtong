@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动恒信通...
echo.
echo 本机访问地址：http://localhost:3000
echo 同事访问地址：http://192.168.60.182:3000
echo.
echo 这个窗口不要关，关掉后系统就停止。
echo.
node server.js
pause
