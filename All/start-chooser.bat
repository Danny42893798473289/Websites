@echo off
setlocal

REM Starts gateway first, waits until ready, then boots backends.
set "ROOT=%~dp0.."
set "ALL_DIR=%~dp0"
set "WW_DIR=%ROOT%\werewolf kill"
set "LR_DIR=%ROOT%\Little remote"
set "BILLION_DIR=%ROOT%\1 in a billion"

if not exist "%WW_DIR%\package.json" (
  echo Missing werewolf project: "%WW_DIR%"
  exit /b 1
)

if not exist "%LR_DIR%\package.json" (
  echo Missing little remote project: "%LR_DIR%"
  exit /b 1
)

if not exist "%BILLION_DIR%\package.json" (
  echo Missing 1 in a billion project: "%BILLION_DIR%"
  exit /b 1
)

if not exist "%ALL_DIR%package.json" (
  echo Missing gateway package.json in "%ALL_DIR%"
  exit /b 1
)

echo Freeing ports 5500, 5501, 5502, 5503...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "5500,5501,5502,5503 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

if not exist "%ALL_DIR%node_modules\http-proxy" (
  echo Installing gateway dependency...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "cd '%ALL_DIR%'; npm install"
)

echo Allowing phone access through Windows Firewall (port 5500)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ALL_DIR%ensure-firewall.ps1"

echo Starting unified gateway on port 5500...
start "All Gateway (5500)" powershell -NoExit -ExecutionPolicy Bypass -Command "cd '%ALL_DIR%'; node --no-deprecation gateway.js"

echo Waiting for gateway to be ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ALL_DIR%wait-for-gateway.ps1"
if errorlevel 1 (
  echo Gateway failed to start. Check the "All Gateway (5500)" window for errors.
  exit /b 1
)

echo Starting Werewolf on port 5501...
start "Werewolf Kill (5501)" powershell -NoExit -ExecutionPolicy Bypass -Command "$env:PORT='5501'; cd '%WW_DIR%'; npm start"

echo Starting Little Remote server on port 5502...
start "Little Remote (5502)" powershell -NoExit -ExecutionPolicy Bypass -Command "$env:PORT='5502'; cd '%LR_DIR%'; npm run start -w server"

echo Starting 1 in a Billion on port 5503...
start "1 in a Billion (5503)" powershell -NoExit -ExecutionPolicy Bypass -Command "$env:PORT='5503'; cd '%BILLION_DIR%'; npm start"

echo Waiting for 1 in a Billion backend (this also warms the account database for fast login)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ALL_DIR%wait-for-gateway.ps1" -Url "http://127.0.0.1:5500/api/health" -TimeoutSec 30
if errorlevel 1 (
  echo 1 in a Billion backend slow to start. The chooser will open anyway; you may need to refresh /billion/ once.
)

REM Host agent is heavy (Electron). Start it after the chooser is open.
echo Starting Little Remote host-agent (optional, in background)...
start "Little Remote Host Agent" powershell -NoExit -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 8; $env:SIGNALING_URL='ws://localhost:5502'; cd '%LR_DIR%'; npm run dev -w host-agent"

start "" "http://localhost:5500/"

echo.
echo Chooser ready on this PC:  http://localhost:5500/
echo.
echo ========================================
echo PHONE URL (same WiFi - NOT localhost):
for /f "delims=" %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%ALL_DIR%get-lan-ip.ps1"') do (
  echo   http://%%I:5500/
  echo   http://%%I:5500/health   ^(quick test^)
)
echo Do NOT type localhost on your phone.
echo If phone still cannot connect, right-click All\open-firewall.bat -^> Run as administrator
echo ========================================
echo.
echo Werewolf:       http://localhost:5500/werewolf/
echo Little Remote:  http://localhost:5500/remote/
echo 1 in a Billion: http://localhost:5500/billion/
echo.
echo Backends are ready. If a site shows "not running yet", refresh it once.
