@echo off
title Ashk24 Local Desktop Agent (Playwright)
color 0A

echo ================================================================
echo   Ashk24 Autonomous Agent / Cloud Worker (v5.8.20)
echo   Real-time Playwright Browser Engine
echo ================================================================
echo.

:: Check Node.js using standard errorlevel and classic GOTO
node --version >nul 2>&1
if errorlevel 1 goto ERROR_NODE

:: Move to script directory safely
cd /d "%~dp0"

:: Auto-detect local-agent folder
if exist "local-agent\index.js" cd "local-agent"

:: Double check index.js presence
if not exist "index.js" goto ERROR_NO_INDEX

:: Install dependencies on first run
if not exist "node_modules" goto INSTALL_DEPS

goto RUN_AGENT


:ERROR_NODE
color 0C
echo [ERROR] Node.js is not installed on this system!
echo Please download and install Node.js from: https://nodejs.org
echo.
pause
exit /b 1


:ERROR_NO_INDEX
color 0C
echo [ERROR] Cannot find index.js!
echo Current directory: "%cd%"
echo Please make sure this script is placed in the project root or inside the local-agent folder.
echo.
pause
exit /b 1


:INSTALL_DEPS
echo [1/2] Installing Node.js packages (First-time run only)...
call npm install --no-audit
echo.
echo [2/2] Installing dedicated Playwright Chromium browser...
call npx playwright install chromium
echo.
goto RUN_AGENT


:RUN_AGENT
:: Set initial default variables automatically without user prompt
if "%CPANEL_URL%"=="" set CPANEL_URL=https://secret.ashkghalam.ir/cpanel-backend/api/index.php
if "%CPANEL_AGENT_TOKEN%"=="" set CPANEL_AGENT_TOKEN=secret_9153108763
set HEADLESS=false

echo [OK] Connected Orchestrator: %CPANEL_URL%
echo [OK] Security Token: %CPANEL_AGENT_TOKEN%
echo [OK] Mode: Local Domestic IP Execution
echo.
echo ----------------------------------------------------------------
echo   Agent is active and listening for new jobs autonomously.
echo   Do not close this window. To stop, press Ctrl+C.
echo ----------------------------------------------------------------
echo.

node index.js

pause
