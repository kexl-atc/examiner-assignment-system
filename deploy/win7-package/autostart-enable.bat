@echo off
setlocal
REM ========================================================
REM Examiner Assignment System - Enable Auto-start
REM Version: 8.0.1
REM Compatible: Windows 7 SP1 / Windows 10 / Windows 11
REM Requires: Administrator privileges
REM ========================================================

title Examiner System - Enable Auto-start
cd /d "%~dp0"

echo ========================================================
echo   Enable Auto-start on Boot
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
set "SCRIPT_PATH=%~dp0start.bat"

REM Remove existing task if any
echo Removing existing task (if any)...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM Create new task
echo Creating auto-start task...
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc onstart /ru SYSTEM /rl highest /f >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Failed to create task
    echo Please check if Task Scheduler service is running
    pause
    exit /b 1
)

echo [OK] Auto-start task created successfully
echo.
echo ========================================================
echo   Auto-start Configuration
echo ========================================================
echo.
echo Task Name: %TASK_NAME%
echo Script: %SCRIPT_PATH%
echo Trigger: On system startup
echo Run As: SYSTEM (highest privileges)
echo.
echo The system will automatically start on next boot.
echo.
echo To disable auto-start, run: autostart-disable.bat
echo.
pause
