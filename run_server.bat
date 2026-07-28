@echo off
title Rwanda Opportunity Map Server
cd /d "%~dp0"
echo ======================================================================
echo           RWANDA OPPORTUNITY & AGRICULTURE MAP SERVER
echo ======================================================================
echo Starting local server on http://localhost:8000...
echo.
python serve.py
if %errorlevel% neq 0 (
    echo.
    echo Server stopped with error. Trying fallback with pythonw...
    start "" pythonw serve.py
)
pause
