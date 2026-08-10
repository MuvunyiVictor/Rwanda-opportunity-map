@echo off
title Rwanda Opportunity Map Launcher
cd /d "%~dp0"

echo ======================================================================
echo           RWANDA OPPORTUNITY AND INVESTMENT MAP ($5M USD PROTOTYPE)
echo ======================================================================
echo Refreshing server instance and launching application...

taskkill /F /IM python.exe /IM pythonw.exe >nul 2>&1

start "" pythonw serve.py

start http://localhost:8000

exit
