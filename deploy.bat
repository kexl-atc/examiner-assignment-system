@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 考官排班系统 - 部署向导
color 0A

echo.
echo ============================================================
echo   智能考官排班系统 - 部署向导 v8.0.0
echo ============================================================
echo.
echo 请选择操作:
echo.
echo   [1] 部署到 Win7 系统
echo   [2] 检查系统兼容性
echo   [3] 构建部署包
echo   [4] 管理工具
echo   [5] 打开部署包目录
echo.
echo ============================================================
echo.

set /p choice="请输入选项 (1-5): "

if "%choice%"=="1" (
    cd deploy\scripts
    call deploy-win7.bat
    exit /b
)

if "%choice%"=="2" (
    cd deploy\scripts
    call check-compatibility.bat
    exit /b
)

if "%choice%"=="3" (
    cd deploy\scripts
    call build-package.bat
    exit /b
)

if "%choice%"=="4" (
    cd deploy\scripts
    call manage.bat
    exit /b
)

if "%choice%"=="5" (
    start "" "deploy\win7-package"
    exit /b
)

echo.
echo 无效选项，请重试
timeout /t 2 >nul
call deploy.bat
