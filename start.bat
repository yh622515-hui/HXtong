@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE="
where node >nul 2>nul
if not errorlevel 1 (
  set "NODE_EXE=node"
)

if not defined NODE_EXE (
  set "NODE_EXE=C:\Users\yh622\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if not defined NODE_EXE (
  echo Node.js was not found.
  echo Please install Node.js 24 or newer, then run this file again.
  echo.
  pause
  exit /b 1
)

if not "%NODE_EXE%"=="node" if not exist "%NODE_EXE%" (
  echo Node.js was not found.
  echo Please install Node.js 24 or newer, then run this file again.
  echo.
  pause
  exit /b 1
)

echo Starting Hengxintong...
echo.
echo This computer: http://localhost:3000
echo Other computers: http://192.168.60.182:3000
echo.
echo Keep this window open. Closing it will stop the website.
echo.
"%NODE_EXE%" server.js
pause
