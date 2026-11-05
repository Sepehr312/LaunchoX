@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LaunchoX - setup wizard

set "NODE=node"
where node >nul 2>&1 && goto :run

set "NODE=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE%" goto :run

set "NODE=D:\soft\PC sort\node.js\node.exe"
if exist "%NODE%" goto :run

echo.
echo Node.js not found on this computer.
echo Install it from https://nodejs.org or run:  winget install OpenJS.NodeJS.LTS
echo.
pause
exit /b 1

:run
"%NODE%" server.js
echo.
echo Wizard stopped.
pause
