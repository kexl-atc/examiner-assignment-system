@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 考官排班系统 - 启动服务
color 0B

echo.
echo ============================================================
echo   考官排班系统 - 启动服务 v8.0.1
echo ============================================================
echo.
echo 正在启动服务...
echo.

REM 检查 Supervisor 是否存在
if not exist "deploy\supervisor\supervisor-headless.exe" (
    echo [错误] 未找到 Supervisor 程序
echo.
    echo 请先运行 deploy.bat 完成部署
echo.
    pause
    exit /b 1
)

REM 启动服务
cd deploy\supervisor
if exist start-supervisor.vbs (
    cscript //nologo start-supervisor.vbs
) else (
    start "" /B supervisor-headless.exe --headless
)

cd ..\..

echo.
echo [OK] 服务已启动
echo.
echo 访问地址:
echo   管理控制台: http://localhost:9090/
echo   业务系统:   http://localhost:8081/
echo.
echo 按任意键打开浏览器...
pause >nul

start "" "http://localhost:9090/"
