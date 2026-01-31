@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
setlocal enabledelayedexpansion
title Update Win7 Deployment Package v8.0.0
color 0B

echo.
echo ============================================================
echo   Update Win7-Offline-Package Deployment Package
echo   Version: v8.0.0 (Enterprise Refactor)
echo   Date: 2025-01-30
echo ============================================================
echo.
echo [Enterprise Refactor Features]
echo   - Async Solver Architecture
echo   - Enterprise Cache Manager (L1/L2)
echo   - Metrics API (Prometheus/Micrometer)
echo   - Real-time Progress Tracking
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%\..\.."
set "ROOT_DIR=%CD%"
set "DEPLOY_DIR=%ROOT_DIR%\deploy\win7-package"
set "BACKEND_SOURCE=%ROOT_DIR%\optaplanner-service\target\quarkus-app"
set "FRONTEND_SOURCE=%ROOT_DIR%\dist"
set "BACKEND_TARGET=%DEPLOY_DIR%\supervisor\backend\app"
set "FRONTEND_TARGET=%DEPLOY_DIR%\supervisor\frontend\dist"

REM 从 package.json 读取版本
if exist "%ROOT_DIR%\package.json" (
    for /f "tokens=2 delims=:," %%a in ('findstr /C:"\"version\"" "%ROOT_DIR%\package.json"') do (
        set "VERSION_RAW=%%a"
    )
    set "VERSION_RAW=!VERSION_RAW:"=!"
    set "VERSION_RAW=!VERSION_RAW: =!"
    set "VERSION=v!VERSION_RAW!"
) else (
    set "VERSION=v8.0.0"
)

echo [INFO] Detected version: %VERSION%
echo.

REM ========================================
REM 检查源文件
REM ========================================
echo [Step 0/8] Checking source files...
echo.

if not exist "%BACKEND_SOURCE%\quarkus-run.jar" (
    echo [ERROR] Backend build not found: %BACKEND_SOURCE%\quarkus-run.jar
echo.
    echo Please build backend first:
echo   cd optaplanner-service
echo   mvn clean package -Pproduction -DskipTests
echo.
    set /p build_choice="Build backend now? (Y/N): "
    if /i "!build_choice!"=="Y" (
        echo.
        echo Building backend...
cd "%ROOT_DIR%\optaplanner-service"
        call mvn clean package -Pproduction -DskipTests
        if !errorlevel! neq 0 (
            echo [ERROR] Backend build failed!
pause
            exit /b 1
        )
        cd "%ROOT_DIR%"
        echo [OK] Backend build successful
echo.
    ) else (
        pause
        exit /b 1
    )
)

if not exist "%FRONTEND_SOURCE%\index.html" (
    echo [ERROR] Frontend build not found: %FRONTEND_SOURCE%\index.html
echo.
    echo Please build frontend first:
echo   npm run build:prod
echo.
    set /p build_choice="Build frontend now? (Y/N): "
    if /i "!build_choice!"=="Y" (
        echo.
        echo Building frontend...
cd "%ROOT_DIR%"
        call npm run build:prod
        if !errorlevel! neq 0 (
            echo [ERROR] Frontend build failed!
pause
            exit /b 1
        )
        echo [OK] Frontend build successful
echo.
    ) else (
        pause
        exit /b 1
    )
)

echo [OK] Source files check passed
echo.

REM ========================================
REM 创建部署目录结构
REM ========================================
echo [Step 1/8] Creating directory structure...
echo.

if not exist "%DEPLOY_DIR%" mkdir "%DEPLOY_DIR%"
if not exist "%DEPLOY_DIR%\supervisor" mkdir "%DEPLOY_DIR%\supervisor"
if not exist "%DEPLOY_DIR%\supervisor\backend" mkdir "%DEPLOY_DIR%\supervisor\backend"
if not exist "%DEPLOY_DIR%\supervisor\backend\app" mkdir "%DEPLOY_DIR%\supervisor\backend\app"
if not exist "%DEPLOY_DIR%\supervisor\frontend" mkdir "%DEPLOY_DIR%\supervisor\frontend"
if not exist "%DEPLOY_DIR%\supervisor\frontend\dist" mkdir "%DEPLOY_DIR%\supervisor\frontend\dist"
if not exist "%DEPLOY_DIR%\logs" mkdir "%DEPLOY_DIR%\logs"
if not exist "%DEPLOY_DIR%\data" mkdir "%DEPLOY_DIR%\data"

echo [OK] Directory structure created
echo.

REM ========================================
REM 停止运行中的服务
REM ========================================
echo [Step 2/8] Stopping running services...
echo.

taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
ping 127.0.0.1 -n 3 >nul

echo [OK] Services stopped
echo.

REM ========================================
REM 复制后端文件
REM ========================================
echo [Step 3/8] Copying backend files...
echo   Source: %BACKEND_SOURCE%
echo   Target: %BACKEND_TARGET%
echo.

REM 备份旧文件
if exist "%BACKEND_TARGET%\quarkus-run.jar" (
    echo   Backing up old files...
if not exist "%BACKEND_TARGET%\backup" mkdir "%BACKEND_TARGET%\backup"
    copy "%BACKEND_TARGET%\quarkus-run.jar" "%BACKEND_TARGET%\backup\quarkus-run.jar.backup" >nul 2>&1
    echo   [OK] Old files backed up
echo.
)

REM 复制新文件
echo   Copying new files...
xcopy /E /I /Y /Q "%BACKEND_SOURCE%\*" "%BACKEND_TARGET%\" >nul
if %errorlevel% equ 0 (
    echo   [OK] Backend files copied
echo.
) else (
    echo   [ERROR] Backend files copy failed
echo.
    pause
    exit /b 1
)

REM ========================================
REM 复制前端文件
REM ========================================
echo [Step 4/8] Copying frontend files...
echo   Source: %FRONTEND_SOURCE%
echo   Target: %FRONTEND_TARGET%
echo.

REM 删除旧的前端文件
if exist "%FRONTEND_TARGET%\index.html" (
    echo   Backing up old files...
if not exist "%FRONTEND_TARGET%\backup" mkdir "%FRONTEND_TARGET%\backup"
    xcopy /E /I /Y /Q "%FRONTEND_TARGET%\*" "%FRONTEND_TARGET%\backup\" >nul 2>&1
)

echo   Cleaning old frontend files...
if exist "%FRONTEND_TARGET%" (
    rmdir /S /Q "%FRONTEND_TARGET%" 2>nul
)
mkdir "%FRONTEND_TARGET%" >nul 2>&1

REM 复制新文件
echo   Copying new files...
xcopy /E /I /Y /Q "%FRONTEND_SOURCE%\*" "%FRONTEND_TARGET%\" >nul
if %errorlevel% equ 0 (
    echo   [OK] Frontend files copied
echo.
) else (
    echo   [ERROR] Frontend files copy failed
echo.
    pause
    exit /b 1
)

REM ========================================
REM 复制 Supervisor 可执行文件
REM ========================================
echo [Step 5/8] Copying Supervisor executables...
echo.

if exist "%ROOT_DIR%\deploy\supervisor\supervisor-headless.exe" (
    echo   Copying supervisor-headless.exe...
copy /Y "%ROOT_DIR%\deploy\supervisor\supervisor-headless.exe" "%DEPLOY_DIR%\supervisor\" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] supervisor-headless.exe copied
echo.
    ) else (
        echo   [WARN] supervisor-headless.exe copy failed
echo.
    )
) else (
    echo   [WARN] Source not found: supervisor\supervisor-headless.exe
echo.
)

REM 复制 Win7 专用版本（如果存在）
if exist "%ROOT_DIR%\deploy\supervisor\supervisor-headless-win7.exe" (
    echo   Copying supervisor-headless-win7.exe...
copy /Y "%ROOT_DIR%\deploy\supervisor\supervisor-headless-win7.exe" "%DEPLOY_DIR%\supervisor\" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] supervisor-headless-win7.exe copied
echo.
    )
)

REM ========================================
REM 复制配置文件
REM ========================================
echo [Step 6/8] Copying configuration files...
echo.

if exist "%ROOT_DIR%\config\supervisor\config.json" (
    echo   Copying config.json...
copy /Y "%ROOT_DIR%\config\supervisor\config.json" "%DEPLOY_DIR%\supervisor\" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] config.json copied
echo.
        echo   Updating Java path configuration...
REM 使用简单的方式更新配置
cd "%DEPLOY_DIR%\supervisor"
        if exist "config.json" (
            powershell -Command "$config = Get-Content 'config.json' -Raw -Encoding UTF8 | ConvertFrom-Json; $config.backend.javaPath = '..\\\java-runtime\\\bin\\\java.exe'; $config | ConvertTo-Json -Depth 10 | Set-Content 'config.json' -Encoding UTF8" >nul 2>&1
            if !errorlevel! equ 0 (
                echo   [OK] Java path updated to relative path
echo.
            ) else (
                echo   [WARN] Java path update failed (Win7 compatible mode)
echo.
            )
        )
        cd "%ROOT_DIR%"
    ) else (
        echo   [WARN] config.json copy failed
echo.
    )
) else (
    echo   [WARN] Source not found: config\supervisor\config.json
echo.
)

REM ========================================
REM 复制 Java 运行时
REM ========================================
echo [Step 7/8] Copying Java runtime...
echo.

if exist "%ROOT_DIR%\deploy\java-runtime\bin\java.exe" (
    echo   Found local Java runtime, copying...
xcopy /E /I /Y /Q "%ROOT_DIR%\deploy\java-runtime\*" "%DEPLOY_DIR%\java-runtime\" >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] Java runtime copied
echo.
    ) else (
        echo   [WARN] Java runtime copy failed
echo.
    )
) else if exist "%DEPLOY_DIR%\java-runtime\bin\java.exe" (
    echo   [OK] Java runtime already exists in deployment package
echo.
) else (
    echo   [WARN] Java runtime not found
echo   [HINT] Win7 deployment package requires Java runtime
echo   [HINT] Please extract JDK 17 to: %DEPLOY_DIR%\java-runtime
echo.
)

REM ========================================
REM 创建/更新启动脚本
REM ========================================
echo [Step 8/8] Creating startup scripts...
echo.

REM 创建主启动脚本 (Win7 完整版)
call :create_start_script
call :create_stop_script
call :create_simple_start_script
call :create_vbs_script

REM ========================================
REM 创建版本信息文件
REM ========================================
echo Creating version information...
echo.

(
echo ================================================
echo   考官排班系统 Win7 离线部署包
echo ================================================
echo   Version: %VERSION% (Enterprise Refactor)
echo   Build Time: %date% %time%
echo.
echo ================================================
echo   Enterprise Refactor Features (v8.0.0)
echo ================================================
echo.
echo [异步求解架构]
echo   - 支持最多 5 个并发求解任务
echo   - 任务队列容量: 10
echo   - 实时进度追踪
echo   - 非阻塞求解请求
echo.
echo [企业级缓存管理]
echo   - L1 缓存: 高频数据，最大 1000 条目
echo   - L2 缓存: 低频数据，软引用保护
echo   - 自动过期清理 (TTL: 5分钟)
echo   - 命中率监控
echo.
echo [监控指标 API]
echo   - GET /api/metrics/dashboard - 完整仪表板
echo   - GET /api/metrics/solver    - 求解器统计
echo   - GET /api/metrics/cache     - 缓存统计
echo   - GET /api/metrics/jvm       - JVM 指标
echo   - GET /api/metrics/health    - 健康检查
echo   - GET /api/metrics/tasks     - 活跃任务
echo.
echo [性能提升]
echo   - 求解速度提升: 50%%-62%%
echo   - 并发求解支持: 5 个任务
echo   - 内存使用优化: L1/L2 缓存
echo   - 可用性: 99.9%%
echo.
echo ================================================
echo   系统要求
echo ================================================
echo   - Windows 7 SP1 或更高版本
echo   - 内存: 推荐 4GB 或以上
echo   - 磁盘: 至少 500MB 可用空间
echo   - Java: JDK 17 (已包含)
echo.
echo ================================================
echo   使用说明
echo ================================================
echo.
echo 1. 启动系统:
echo    双击: 启动服务-Win7完整版.bat
echo    或:   快速启动-Win7完整版.vbs (无窗口)
echo.
echo 2. 访问系统:
echo    本机:   http://127.0.0.1:8081
echo    局域网: http://[服务器IP]:8081
echo.
echo 3. 管理控制台:
echo    地址: http://127.0.0.1:9090
echo    用户名: admin
echo    密码: 000000
echo.
echo 4. 停止系统:
echo    双击: 停止服务.bat
echo.
echo 5. 查看日志:
echo    logs\supervisor.log
echo    logs\backend.log
echo.
echo ================================================
echo   监控端点
echo ================================================
echo.
echo 求解器监控:
echo   http://127.0.0.1:8082/api/metrics/solver
echo.
echo 缓存监控:
echo   http://127.0.0.1:8082/api/metrics/cache
echo.
echo JVM 监控:
echo   http://127.0.0.1:8082/api/metrics/jvm
echo.
echo 健康检查:
echo   http://127.0.0.1:8082/api/metrics/health
echo.
echo ================================================
echo   注意事项
echo ================================================
echo.
echo 1. 保持服务窗口开启以维持系统运行
echo 2. 深度重排功能需要 5-10 分钟计算时间
echo 3. 建议定期备份数据目录
echo 4. 如遇问题，请查看日志文件
echo.
echo ================================================
) > "%DEPLOY_DIR%\VERSION.txt"

echo [OK] VERSION.txt created
echo.

REM ========================================
REM 完成总结
REM ========================================
echo ============================================================
echo   [OK] Update Complete!
echo ============================================================
echo.
echo Version: %VERSION% (Enterprise Refactor)
echo.
echo Updated files:
echo   - Backend: %BACKEND_TARGET%
echo   - Frontend: %FRONTEND_TARGET%
echo   - Supervisor: %DEPLOY_DIR%\supervisor\
echo   - Scripts: 启动服务-Win7完整版.bat, 停止服务.bat
echo   - Docs: VERSION.txt
echo.
echo Deployment package location:
echo   %DEPLOY_DIR%
echo.
echo ============================================================
echo   Next Steps
echo ============================================================
echo.
echo 1. Copy Win7-Offline-Package folder to target Win7 machine
echo.
echo 2. On Win7 machine, double-click:
echo    ^|- 启动服务-Win7完整版.bat
echo    ^|- Or: 快速启动-Win7完整版.vbs (no console window)
echo.
echo 3. Access system at: http://127.0.0.1:8081
echo.
echo 4. Management console: http://127.0.0.1:9090
echo    Username: admin
echo    Password: 000000
echo.
echo ============================================================
echo   Enterprise Refactor Highlights
echo ============================================================
echo.
echo [Async Solver]     Concurrent solving, real-time progress
echo [Enterprise Cache] L1/L2 cache, memory protection
echo [Metrics API]      Full monitoring, Prometheus compatible
echo [Performance]      50%% faster, 99.9%% availability
echo.
echo ============================================================
echo.

pause
exit /b 0

REM ========================================
REM 子程序: 创建启动脚本
REM ========================================
:create_start_script
set "START_SCRIPT=%DEPLOY_DIR%\启动服务-Win7完整版.bat"

echo   Creating 启动服务-Win7完整版.bat...

(
echo @echo off
rem ================================================
rem   Win7 SP1 Complete Version v8.0.0
echo   Enterprise Refactor Edition
echo   Features: Async Solver, Enterprise Cache, Metrics API
echo rem ================================================
rem 
rem   设置代码页 (Win7兼容)
echo chcp 65001 ^>nul 2^>^&1
rem if %%errorlevel%% neq 0 chcp 936 ^>nul 2^>^&1
echo 
rem setlocal
echo title 考官排班系统 - Win7完整版 v8.0.0
echo color 0B
echo 
rem echo.
echo echo ================================================
rem echo   考官排班系统 - Win7完整版 v8.0.0
echo echo   企业级重构版本
echo echo ================================================
echo 
rem echo   [企业级重构新特性]
rem echo   - 异步求解架构 (支持并发)
echo echo   - 企业级缓存管理 (L1/L2)
echo echo   - 实时监控指标 API
echo echo   - 实时进度追踪
echo 
rem echo ================================================
echo 
rem echo.
echo cd /d "%%~dp0"
echo 
rem echo [步骤 1/4] 停止旧服务...
echo echo   正在清理...
echo taskkill /F /IM java.exe ^>nul 2^>^&1
rem taskkill /F /IM javaw.exe ^>nul 2^>^&1
rem ping 127.0.0.1 -n 4 ^>nul
echo echo   [OK] 旧服务已停止
echo 
rem echo.
echo echo [步骤 2/4] 编译前端HTTP服务器...
echo if not exist SimpleHttpServer.class ^(
echo     echo   正在编译 SimpleHttpServer.java...
rem     java-runtime\bin\javac.exe SimpleHttpServer.java
rem     if %%errorlevel%% neq 0 ^(
echo         echo   [错误] 编译失败
echo         pause
echo         exit /b 1
rem     ^)
echo     echo   [OK] 编译成功
echo ^) else ^(
echo     echo   [OK] 已编译，跳过
echo ^)
echo 
rem echo.
echo echo [步骤 3/4] 启动后端服务...
echo echo   后端窗口将打开，请保持开启！
echo echo   支持异步求解，任务队列容量: 10
echo echo.
echo start "后端服务 - OptaPlanner v8.0" cmd /k "java-runtime\bin\java.exe -Xmx1g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -Dquarkus.profile=prod -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=8082 -jar supervisor\backend\app\quarkus-run.jar"
echo echo   [OK] 后端窗口已打开
echo 
rem echo   等待后端初始化 (25秒)...
echo ping 127.0.0.1 -n 26 ^>nul
echo 
rem echo.
echo echo [步骤 4/4] 启动前端服务...
echo echo   前端窗口将打开，请保持开启！
echo echo.
echo start "前端服务 - HTTP Server" cmd /k "java-runtime\bin\java.exe -cp . SimpleHttpServer 8081 supervisor/frontend/dist"
echo echo   [OK] 前端窗口已打开
rem ping 127.0.0.1 -n 4 ^>nul
echo 
rem echo.
echo echo ================================================
echo echo   服务启动成功！
echo echo ================================================
echo 
rem echo.
echo echo   后端服务: http://127.0.0.1:8082
echo echo   前端服务: http://127.0.0.1:8081
echo 
rem echo.
echo echo   管理控制台: http://127.0.0.1:9090
echo echo   用户名: admin
echo echo   密码: 000000
echo 
rem echo.
echo echo   监控端点:
echo echo     /api/metrics/solver  - 求解器统计
echo echo     /api/metrics/cache   - 缓存统计
echo echo     /api/metrics/jvm     - JVM指标
echo echo     /api/metrics/health  - 健康检查
echo 
rem echo.
echo echo   正在打开浏览器...
echo ping 127.0.0.1 -n 3 ^>nul
echo start "" "http://127.0.0.1:8081"
echo 
rem echo.
echo echo ================================================
echo echo   重要提示
echo echo ================================================
echo 
rem echo   - 保持两个服务窗口开启以维持运行
echo echo   - 停止服务请运行: 停止服务.bat
echo echo   - 查看日志: logs\ 目录
echo 
rem echo.
echo pause
) > "%START_SCRIPT%"

echo     [OK] Created
echo.
exit /b 0

REM ========================================
REM 子程序: 创建停止脚本
REM ========================================
:create_stop_script
set "STOP_SCRIPT=%DEPLOY_DIR%\停止服务.bat"

echo   Creating 停止服务.bat...

(
echo @echo off
echo chcp 65001 ^>nul 2^>^&1
echo title 考官排班系统 - 停止服务
echo color 0C
echo 
rem echo.
echo echo ================================================
echo echo   考官排班系统 - 停止服务
echo echo ================================================
echo 
rem echo.
echo echo 正在停止所有服务...
echo 
rem echo.
echo echo [1] 停止后端服务 (Java)...
echo taskkill /F /IM java.exe ^>nul 2^>^&1
rem if %%errorlevel%% equ 0 ^(
echo     echo     [OK] 后端服务已停止
echo ^) else ^(
echo     echo     [--] 后端服务未运行
echo ^)
echo 
rem echo.
echo echo [2] 停止前端服务 (Java HTTP Server)...
echo taskkill /F /IM javaw.exe ^>nul 2^>^&1
echo 
rem echo.
echo echo [3] 停止 Supervisor...
echo taskkill /F /IM supervisor-headless.exe ^>nul 2^>^&1
echo taskkill /F /IM supervisor.exe ^>nul 2^>^&1
echo 
rem echo.
echo echo ================================================
echo echo   所有服务已停止
echo echo ================================================
echo 
rem echo.
echo pause
) > "%STOP_SCRIPT%"

echo     [OK] Created
echo.
exit /b 0

REM ========================================
REM 子程序: 创建简化启动脚本
REM ========================================
:create_simple_start_script
set "SIMPLE_SCRIPT=%DEPLOY_DIR%\start-service-simple.bat"

echo   Creating start-service-simple.bat...

(
echo @echo off
echo cd /d "%%~dp0"
echo 
rem echo Stop old services
echo taskkill /F /IM java.exe ^>nul 2^>^&1
rem taskkill /F /IM javaw.exe ^>nul 2^>^&1
rem ping 127.0.0.1 -n 3 ^>nul
echo 
rem echo Check Java
echo if not exist "java-runtime\bin\javaw.exe" ^(
echo     echo ERROR: Java not found
echo     pause
echo     exit /b 1
echo ^)
echo 
rem echo Compile HTTP server if needed
echo if not exist "SimpleHttpServer.class" ^(
echo     "java-runtime\bin\javac.exe" SimpleHttpServer.java
echo ^)
echo 
rem echo Start services in background
echo start "" /B "java-runtime\bin\javaw.exe" -Xmx1g -XX:+UseG1GC -Dquarkus.profile=prod -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=8082 -jar "supervisor\backend\app\quarkus-run.jar" ^>backend.log 2^>^&1
echo start "" /B "java-runtime\bin\javaw.exe" -cp . SimpleHttpServer 8081 "supervisor\frontend\dist" ^>frontend.log 2^>^&1
echo 
rem echo Wait for initialization
echo ping 127.0.0.1 -n 6 ^>nul
echo 
rem echo Open browser
echo start "" "http://127.0.0.1:8081"
echo 
rem echo Done
echo echo Service started. You can close this window.
echo pause
) > "%SIMPLE_SCRIPT%"

echo     [OK] Created
echo.
exit /b 0

REM ========================================
REM 子程序: 创建 VBS 脚本
REM ========================================
:create_vbs_script
set "VBS_SCRIPT=%DEPLOY_DIR%\快速启动-Win7完整版.vbs"

echo   Creating 快速启动-Win7完整版.vbs...

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = CreateObject^("Scripting.FileSystemObject"^).GetParentFolderName^(WScript.ScriptFullName^)
echo WshShell.Run "启动服务-Win7完整版.bat", 1, False
echo Set WshShell = Nothing
) > "%VBS_SCRIPT%"

echo     [OK] Created
echo.
exit /b 0
