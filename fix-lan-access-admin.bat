@echo off
net session >nul 2>nul
if not %errorlevel%==0 (
  echo Please right-click this file and choose "Run as administrator".
  echo.
  pause
  exit /b 1
)

echo Opening Windows Firewall for Hengxintong port 3000...
netsh advfirewall firewall delete rule name="Hengxintong Port 3000" >nul 2>nul
netsh advfirewall firewall add rule name="Hengxintong Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=private,domain

echo.
echo Done.
echo Ask other computers to open:
echo http://192.168.60.182:3000/
echo.
pause
