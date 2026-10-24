@echo off
title Holy Bible Web App
echo ========================================================
echo  Launching Holy Bible Web Application...
echo ========================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Opening directly in default browser...
    start "" "%~dp0index.html"
)
pause
