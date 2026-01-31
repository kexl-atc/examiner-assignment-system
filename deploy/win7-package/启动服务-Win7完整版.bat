@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
setlocal enabledelayedexpansion
title 考官排班系统 - Win7完整版 v8.0.0
color 0B

echo.
echo ============================================================
echo   考官排班系统 - Win7完整版 v8.0.0
echo ============================================================
echo.
echo [企业级重构新特性]
echo   - 异步求解架构 (支持并发)
echo   - 企业级缓存管理 (L1/L2)
echo   - 实时监控指标 API
echo   - 实时进度追踪
echo.
echo ============================================================
echo.

cd /d "%~dp0"

REM [步骤 1/4] 停止旧服务
echo [步骤 1/4] 停止旧服务...
echo   正在清理...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
ping 127.0.0.1 -n 4 >nul
echo   [OK] 旧服务已停止
echo.

REM [步骤 2/4] 编译前端HTTP服务器
echo [步骤 2/4] 检查前端HTTP服务器...
if not exist "SimpleHttpServer.class" (
    echo   正在编译 SimpleHttpServer.java...
    if not exist "SimpleHttpServer.java" (
        echo   [错误] SimpleHttpServer.java 不存在
        pause
        exit /b 1
    )
    java-runtime\bin\javac.exe SimpleHttpServer.java
    if %errorlevel% neq 0 (
        echo   [错误] 编译失败
        pause
        exit /b 1
    )
    echo   [OK] 编译成功
) else (
    echo   [OK] 已编译，跳过
)
echo.

REM [步骤 3/4] 启动后端服务
echo [步骤 3/4] 启动后端服务...
echo   后端窗口将打开，请保持开启！
echo   支持异步求解，任务队列容量: 10
echo.

if not exist "supervisor\backend\app\quarkus-run.jar" (
    echo   [错误] 后端JAR文件不存在: supervisor\backend\app\quarkus-run.jar
    pause
    exit /b 1
)

start "" "java-runtime\bin\javaw.exe" -Xmx1g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -Dquarkus.profile=prod -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=8082 -jar "supervisor\backend\app\quarkus-run.jar"
echo   [OK] 后端窗口已打开
echo.

REM 等待后端初始化
echo   等待后端初始化 (25秒)...
ping 127.0.0.1 -n 26 >nul

REM [步骤 4/4] 启动前端服务
echo.
echo [步骤 4/4] 启动前端服务...
echo   前端窗口将打开，请保持开启！
echo.

if not exist "supervisor\frontend\dist" (
    if not exist "supervisor\frontend\index.html" (
        echo   [错误] 前端文件不存在
        pause
        exit /b 1
    )
    start "" "java-runtime\bin\javaw.exe" -cp . SimpleHttpServer 8081 "supervisor\frontend"
) else (
    start "" "java-runtime\bin\javaw.exe" -cp . SimpleHttpServer 8081 "supervisor\frontend\dist"
)
echo   [OK] 前端窗口已打开
echo.

echo ============================================================
echo   服务启动成功！
echo ============================================================
echo.
echo   后端服务: http://127.0.0.1:8082
echo   前端服务: http://127.0.0.1:8081
echo.
echo   管理控制台: http://127.0.0.1:9090
echo   用户名: admin
echo   密码: 000000
echo.
echo   监控端点:
echo     /api/metrics/solver  - 求解器统计
echo     /api/metrics/cache   - 缓存统计
echo     /api/metrics/jvm     - JVM指标
echo     /api/metrics/health  - 健康检查
echo.
echo ============================================================
echo   重要提示
echo ============================================================
echo.
echo   - 保持服务窗口开启以维持运行
echo   - 停止服务请运行: 停止服务.bat
echo   - 查看日志: logs\ 目录
echo.
echo   正在打开浏览器...
ping 127.0.0.1 -n 3 >nul
start "" "http://127.0.0.1:8081"

echo.
echo 按任意键关闭此窗口（服务将继续在后台运行）...
pause >nul
