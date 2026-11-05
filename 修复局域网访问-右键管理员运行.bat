@echo off
chcp 65001 >nul
net session >nul 2>nul
if not %errorlevel%==0 (
  echo 请右键这个文件，选择“以管理员身份运行”。
  echo.
  pause
  exit /b 1
)

echo 正在放行恒信通网站 3000 端口...
netsh advfirewall firewall delete rule name="恒信通网站 3000端口" >nul 2>nul
netsh advfirewall firewall add rule name="恒信通网站 3000端口" dir=in action=allow protocol=TCP localport=3000 profile=private,domain

echo.
echo 已处理完成。
echo 同事电脑请访问：http://192.168.60.182:3000/
echo.
pause
