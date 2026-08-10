@echo off
title Rwanda Opportunity Map Launcher
cd /d "%~dp0"
echo Starting Rwanda Opportunity Map Server silently...
start "" pythonw serve.py
timeout /t 2 >nul
start http://localhost:8000
exit
