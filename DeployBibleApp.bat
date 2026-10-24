@echo off
rem Simple batch wrapper to run the deployment PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0Deploy-BibleApp.ps1"
