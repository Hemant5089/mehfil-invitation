@echo off
cd /d "%~dp0"
title Mehfil Invitation Server
where py >nul 2>&1
if not errorlevel 1 (
    py -3 start.py
) else (
    where python >nul 2>&1
    if errorlevel 1 (
        echo Python 3.9 or newer was not found. Install Python and enable Add Python to PATH.
    ) else (
        python start.py
    )
)
echo.
pause
