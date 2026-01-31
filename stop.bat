@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 考官排班系统 - 停止服务
color 0C

echo.
echo ============================================================
echo   考官排班系统 - 停止服务
echo ============================================================
echo.
echo 正在停止所有服务...
echo.

echo [1] 停止 Supervisor...
taskkill /F /IM supervisor-headless.exe >nul 2>&1
echo [OK]
echo.

echo [2] 停止后端服务...
taskkill /F /IM java.exe >nul 2>&1
echo [OK]
echo.

echo [3] 停止前端服务...
taskkill /F /IM javaw.exe >nul 2>&1
echo [OK]
echo.

echo ============================================================
echo   所有服务已停止
echo ============================================================
echo.
pause
