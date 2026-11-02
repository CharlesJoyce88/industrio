@echo off
REM ============================================================
REM industrio - one-click local server
REM ============================================================
REM Double-click this file to:
REM   1. Start a local web server in this folder
REM   2. Open your browser to the search page
REM
REM Press Ctrl+C in this window when done to stop the server.
REM ============================================================

cd /d "%~dp0"

echo.
echo  industrio local server
echo  ----------------------
echo  Folder:  %CD%
echo  URL:     http://localhost:8000/map.html
echo.
echo  Opening browser in 2 seconds...
echo  Press Ctrl+C to stop the server when done.
echo.

REM Try Python 3 first (most common), then python launcher
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:8000/map.html
    timeout /t 2 /nobreak >nul
    python -m http.server 8000
    goto :end
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:8000/map.html
    timeout /t 2 /nobreak >nul
    py -3 -m http.server 8000
    goto :end
)

REM Fall back to Node if available
where npx >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:8000/map.html
    timeout /t 2 /nobreak >nul
    npx --yes serve -p 8000 .
    goto :end
)

echo.
echo  ERROR: No local server found.
echo.
echo  Install one of these (free):
echo    - Python:  https://www.python.org/downloads/  (recommended; ~30 MB)
echo    - Node:    https://nodejs.org/                (heavier; ~80 MB)
echo.
echo  After install, re-run this file.
echo.
pause

:end
