@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 考官排班系统诊断工具
color 0E

echo ================================================
echo   考官排班系统诊断工具
echo ================================================
echo.

cd /d "%~dp0"

echo [检查 1/6] 检查Java运行时...
if exist "java-runtime\bin\java.exe" (
    echo   [OK] Java运行时存在
    for /f "tokens=3" %%g in ('"java-runtime\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
        set JAVA_VERSION=%%g
        set JAVA_VERSION=!JAVA_VERSION:"=!
    )
    echo   版本: %JAVA_VERSION%
) else (
    echo   [错误] Java运行时不存在！
)
echo.

echo [检查 2/6] 检查后端文件...
if exist "supervisor\backend\app\quarkus-run.jar" (
    echo   [OK] 后端JAR文件存在
    for %%F in ("supervisor\backend\app\quarkus-run.jar") do (
        echo   大小: %%~zF bytes
    )
) else (
    echo   [错误] 后端JAR文件不存在！
)
echo.

echo [检查 3/6] 检查前端文件...
if exist "supervisor\frontend\dist\index.html" (
    echo   [OK] 前端文件存在
) else (
    echo   [错误] 前端文件不存在！
)
echo.

echo [检查 4/6] 检查端口占用...
echo   端口 8081 (前端):
netstat -ano | findstr ":8081" | findstr "LISTENING"
if errorlevel 1 (
    echo   [信息] 端口8081未占用
)
echo.
echo   端口 8082 (后端):
netstat -ano | findstr ":8082" | findstr "LISTENING"
if errorlevel 1 (
    echo   [信息] 端口8082未占用
)
echo.

echo [检查 5/6] 测试后端服务...
echo   正在尝试连接后端健康检查端点...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8082/q/health/ready' -TimeoutSec 5; Write-Host '   [OK] 后端服务运行正常 - HTTP ' $r.StatusCode } catch { Write-Host '   [错误] 后端服务未响应 - ' $_.Exception.Message }"
echo.

echo [检查 6/6] 检查日志文件...
if exist "logs\backend.log" (
    echo   [信息] 后端日志存在
    echo   最后10行日志:
    echo   --------------------
    powershell -Command "Get-Content logs\backend.log -Tail 10 2>$null | ForEach-Object { Write-Host '   ' $_ }"
    echo   --------------------
) else (
    echo   [信息] 后端日志不存在（服务可能尚未启动）
)
echo.

echo ================================================
echo   诊断完成
echo ================================================
echo.
echo 常见解决方案:
echo   1. 如果后端未响应，请运行: 启动服务(修复版).bat
echo   2. 如果端口被占用，请运行: 停止服务.bat 后再启动
echo   3. 如果Java不存在，请重新解压部署包
echo.
pause
