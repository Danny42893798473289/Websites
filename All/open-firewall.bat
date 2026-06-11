@echo off
REM Run this once as Administrator if phone cannot reach port 5500.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ensure-firewall.ps1"
if errorlevel 1 (
  echo Failed to add firewall rule.
  pause
  exit /b 1
)
echo.
echo Firewall rule added. Restart start-chooser.bat, then on phone open:
for /f "delims=" %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get-lan-ip.ps1"') do (
  echo   http://%%I:5500/
)
echo.
pause
