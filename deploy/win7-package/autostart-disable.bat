@echo off
setlocal
REM ========================================================
REM Examiner Assignment System - Disable Auto-start
REM Version: 8.0.0
REM Compatible: Windows 7 SP1 / Windows 10 / Windows 11
REM Requires: Administrator privileges
REM ========================================================

title Examiner System - Disable Auto-start
cd /d "%~dp0"

echo ========================================================
echo   Disable Auto-start on Boot
echo ========================================================
echo.

REM Check admin privileges
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Administrator privileges required!
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo [OK] Administrator privileges confirmed
echo.

REM Set task name
set "TASK_NAME=ExaminerAssignmentSystem"

REM Remove task
echo Removing auto-start task...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

if errorlevel 1 (
    echo [INFO] No auto-start task found (may have been already removed)
) else (
    echo [OK] Auto-start task removed successfully
)
echo.

echo ========================================================
echo   Auto-start Disabled
echo ========================================================
echo.
echo The system will NOT start automatically on boot.
echo.
echo To re-enable auto-start, run: autostart-enable.bat
echo.
pause
