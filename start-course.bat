@echo off
REM ML Quest launcher for Windows — double-click me.
REM Starts a tiny local web server and opens the course in your browser.
cd /d "%~dp0"
set PORT=8877

where python >nul 2>nul
if %errorlevel%==0 (
  set PY=python
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set PY=py
  ) else (
    echo Python 3 was not found. Install it from https://www.python.org/downloads/
    echo During install, tick "Add python.exe to PATH".
    pause
    exit /b 1
  )
)

echo Starting ML Quest at http://localhost:%PORT%
echo Keep this window open while you study. Close it to stop the server.
start "" "http://localhost:%PORT%"
%PY% -m http.server %PORT%
