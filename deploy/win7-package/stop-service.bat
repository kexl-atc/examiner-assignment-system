@echo off
cd /d "%~dp0"

REM Stop all services
echo Stopping all services...
echo.

REM Stop Java processes (backend and frontend)
echo Stopping Java processes...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo Java processes stopped successfully
) else (
    echo No Java processes found (services may not be running)
)

REM Wait a moment for processes to terminate
timeout /t 2 /nobreak >nul

REM Verify services are stopped
echo.
echo Verifying services are stopped...
tasklist /FI "IMAGENAME eq java.exe" 2>nul | find /I /N "java.exe" >nul
if %errorlevel% equ 0 (
    echo WARNING: Some Java processes may still be running
) else (
    echo All Java processes have been stopped
)

tasklist /FI "IMAGENAME eq javaw.exe" 2>nul | find /I /N "javaw.exe" >nul
if %errorlevel% equ 0 (
    echo WARNING: Some Java processes may still be running
) else (
    echo All Java processes have been stopped
)

REM Complete
echo.
echo ========================================
echo   All services stopped
echo ========================================
echo.
echo You can now safely close this window.
pause

