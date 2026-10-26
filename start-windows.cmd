@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js LTS from https://nodejs.org and try again.
  pause
  exit /b 1
)
echo Starting Next Step. Keep this window open while using the app.
echo After the server starts, open http://localhost:3000 in your browser.
echo.
call npm.cmd start
pause
