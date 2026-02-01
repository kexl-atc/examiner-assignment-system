@echo off
setlocal
REM ========================================================
REM Examiner Assignment System - Stop Service
REM Version: 8.0.1
REM Compatible: Windows 7 SP1 / Windows 10 / Windows 11
REM ========================================================

cd /d "%~dp0"
title Examiner System - Stopping...

echo ========================================================
echo   Stopping All Services
echo ========================================================
echo.

REM Stop Java processes (backend and frontend)
echo [1/2] Stopping Java services...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Java services stopped
) else (
    echo [INFO] No Java services were running
)
echo.

REM Wait for processes to terminate
ping 127.0.0.1 -n 3 >nul

REM Verify services are stopped
echo [2/2] Verifying services stopped...
set "JAVA_RUNNING=false"
tasklist /FI "IMAGENAME eq java.exe" 2>nul | find /I "java.exe" >nul
if %errorlevel% equ 0 set "JAVA_RUNNING=true"
tasklist /FI "IMAGENAME eq javaw.exe" 2>nul | find /I "javaw.exe" >nul
if %errorlevel% equ 0 set "JAVA_RUNNING=true"

if "%JAVA_RUNNING%"=="true" (
    echo [WARN] Some Java processes may still be running
    echo You may need to stop them manually from Task Manager
) else (
    echo [OK] All Java services stopped successfully
)
echo.

echo ========================================================
echo   All services stopped
echo ========================================================
echo.
pause
