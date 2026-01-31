@echo off
cd /d "%~dp0"

REM Stop old services
echo Stopping old services...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo Old services stopped

REM Check Java runtime
echo Checking Java runtime...
if not exist "java-runtime\bin\javaw.exe" (
    echo ERROR: Java runtime not found
    pause
    exit /b 1
)
echo Java runtime check passed

REM Check backend JAR file
echo Checking backend JAR file...
if not exist "supervisor\backend\app\quarkus-run.jar" (
    echo ERROR: Backend JAR file not found
    pause
    exit /b 1
)
echo Backend JAR file check passed

REM Compile frontend HTTP server
echo Checking frontend HTTP server...
if not exist "SimpleHttpServer.class" (
    echo Compiling frontend HTTP server...
    "java-runtime\bin\javac.exe" SimpleHttpServer.java
    if errorlevel 1 (
        echo ERROR: Failed to compile HTTP server
        pause
        exit /b 1
    )
    echo Frontend HTTP server compiled successfully
) else (
    echo Frontend HTTP server already compiled, skipping
)

REM Start backend service
echo Starting backend service (background)...
cd /d "%~dp0"
start "" /B "java-runtime\bin\javaw.exe" -Xmx512m -Dquarkus.profile=prod -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=8082 -jar "supervisor\backend\app\quarkus-run.jar" >backend.log 2>&1
echo Backend service started

REM Start frontend service
echo Starting frontend service (background)...
cd /d "%~dp0"
start "" /B "java-runtime\bin\javaw.exe" -cp . SimpleHttpServer 8081 "supervisor\frontend" >frontend.log 2>&1
echo Frontend service started

REM Wait for backend initialization
echo Waiting for backend initialization (5 seconds)...
timeout /t 5 /nobreak >nul

REM Check backend health
echo Checking backend health...
for /L %%i in (1,1,10) do (
    timeout /t 1 /nobreak >nul
    netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo Backend is ready
        goto :backend_ready
    )
)
echo WARNING: Backend may not be ready, but continuing...
:backend_ready

REM Wait for frontend initialization
echo Waiting for frontend initialization (2 seconds)...
timeout /t 2 /nobreak >nul

REM Check frontend health
echo Checking frontend health...
netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo Frontend is ready
) else (
    echo WARNING: Frontend may not be ready
)

REM Open browser
echo Opening browser...
start "" "http://127.0.0.1:8081"

REM Complete
echo.
echo Service startup complete!
echo Backend Service: http://127.0.0.1:8082
echo Frontend Service: http://127.0.0.1:8081
echo.
echo You can close this window safely, services will continue running in background.
pause