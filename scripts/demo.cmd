@echo off
rem GBK-encoded (cp936), matches zh-CN Windows default - no chcp needed
:: Agri-price-tracker - local demo launcher (double-click to run)
::   1) check ports 5173 / 8787
::   2) sync sqlite db from public/mock (auto re-import if data updated)
::   3) start backend (8787) and frontend (5173) in two windows
::   4) open browser http://localhost:5173
cd /d "%~dp0.."

echo ============================================
echo   农价通 · 本地演示一键启动
echo ============================================
echo.

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [demo] 警告:5173 端口被占用 —— 可能上次的前端服务还没关。
  echo        请先关闭它再重新双击本脚本。
  pause
  exit /b 1
)
netstat -ano | findstr ":8787" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [demo] 警告:8787 端口被占用 —— 可能上次的后端服务还没关。
  echo        请先关闭它再重新双击本脚本。
  pause
  exit /b 1
)

node scripts\ensure-seed.mjs
if errorlevel 1 (
  echo.
  echo [demo] 数据导入失败,请检查上面的报错信息。
  pause
  exit /b 1
)

echo [demo] 启动后端 http://localhost:8787 ...
start "农价通-后端" cmd /k npm run server:dev
echo [demo] 启动前端 http://localhost:5173 ...
start "农价通-前端" cmd /k npm run dev

echo [demo] 等待服务就绪(约 8 秒)...
%SystemRoot%\System32\ping.exe -n 9 127.0.0.1 >nul
start "" http://localhost:5173

echo.
echo [demo] 已打开浏览器:http://localhost:5173
echo [demo] 演示结束后,关闭「农价通-后端」与「农价通-前端」两个窗口即可。
pause
