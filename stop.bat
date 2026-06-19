@echo off
chcp 65001 >nul
set PORT=3000
set PID=
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do set PID=%%a
if "%PID%"=="" (
  echo 没有发现正在运行的恒信通服务。
  pause
  exit /b 0
)
echo 准备停止端口 %PORT% 上的服务，进程编号：%PID%
taskkill /PID %PID% /F
pause
