@echo off
setlocal enabledelayedexpansion
REM ========================================================
REM Examiner Assignment System - Start Service
REM Version: 8.0.0
REM Compatible: Windows 7 SP1 / Windows 10 / Windows 11
REM ========================================================

cd /d "%~dp0"
title Examiner System - Starting...

REM Check Java runtime
echo Checking Java runtime...
if not exist "java-runtime\bin\javaw.exe" (
    echo ERROR: Java runtime not found at java-runtime\bin\javaw.exe
    echo Please ensure JDK 17 is extracted to java-runtime folder
    pause
    exit /b 1
)
echo [OK] Java runtime found
echo.

REM Check backend JAR file
echo Checking backend JAR file...
if not exist "supervisor\backend\app\quarkus-run.jar" (
    echo ERROR: Backend JAR file not found at supervisor\backend\app\quarkus-run.jar
    pause
    exit /b 1
)
echo [OK] Backend JAR found
echo.

REM Stop any existing services first
echo Stopping any existing services...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
REM Use ping for delay (compatible with Win7)
ping 127.0.0.1 -n 3 >nul
echo [OK] Old services stopped
echo.

REM Compile frontend HTTP server if needed
echo Checking frontend HTTP server...
if not exist "SimpleHttpServer.class" (
    echo Compiling SimpleHttpServer.java...
    "java-runtime\bin\javac.exe" SimpleHttpServer.java
    if errorlevel 1 (
        echo ERROR: Failed to compile HTTP server
        pause
        exit /b 1
    )
    echo [OK] HTTP server compiled
) else (
    echo [OK] HTTP server already compiled
)
echo.

REM Start backend service
echo Starting backend service on port 8082...
start "" /B "java-runtime\bin\javaw.exe" -Xmx512m -Dquarkus.profile=prod -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=8082 -jar "supervisor\backend\app\quarkus-run.jar" >logs\backend.log 2>&1
echo [OK] Backend service started
echo.

REM Start frontend service
echo Starting frontend service on port 8081...
start "" /B "java-runtime\bin\javaw.exe" -cp . SimpleHttpServer 8081 "supervisor\frontend" >logs\frontend.log 2>&1
echo [OK] Frontend service started
echo.

REM Wait for services to initialize
echo Waiting for services to initialize...
ping 127.0.0.1 -n 6 >nul

REM Check if backend is listening
echo Checking backend health...
netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is ready on port 8082
) else (
    echo [WARN] Backend may still be starting...
)
echo.

REM Check if frontend is listening
echo Checking frontend health...
netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend is ready on port 8081
) else (
    echo [WARN] Frontend may still be starting...
)
echo.

REM Open browser
echo Opening browser...
start "" "http://127.0.0.1:8081"

echo ========================================================
echo   Service startup complete!
echo ========================================================
echo.
echo Backend Service:  http://127.0.0.1:8082
echo Frontend Service: http://127.0.0.1:8081
echo.
echo Logs are saved to logs\ directory
echo.
echo You can close this window, services will continue running.
echo To stop services, run stop.bat
echo.
 pause
