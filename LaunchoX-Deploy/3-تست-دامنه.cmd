@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LaunchoX - domain check

set "NODE=node"
where node >nul 2>&1 && goto :ask

set "NODE=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE%" goto :ask

set "NODE=D:\soft\PC sort\node.js\node.exe"
if exist "%NODE%" goto :ask

echo.
echo Node.js not found on this computer.
echo Install it from https://nodejs.org or run:  winget install OpenJS.NodeJS.LTS
echo.
pause
exit /b 1

:ask
echo.
echo Enter your domain without https, for example:  launchox.ir
echo.
set "DOMAIN="
set /p DOMAIN=Domain: 
if "%DOMAIN%"=="" goto :empty
"%NODE%" 06-check-domain.js %DOMAIN%
goto :done

:empty
echo.
echo No domain entered. Nothing was checked.

:done
echo.
echo ----------------------------------------------
echo The Persian report is opening in Notepad.
echo ----------------------------------------------
start "" notepad.exe "%~dp0last-result.txt"
pause
