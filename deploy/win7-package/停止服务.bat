@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 停止考官排班系统服务
color 0C

echo ================================================
echo   停止考官排班系统服务
echo ================================================
echo.

echo [1/3] 正在停止Java进程...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
if errorlevel 1 (
    echo   [信息] 没有Java进程在运行
) else (
    echo   [OK] Java进程已停止
)
echo.

echo [2/3] 等待进程清理...
timeout /t 3 /nobreak >nul 2>&1
echo   [OK] 清理完成
echo.

echo [3/3] 检查端口状态...
echo   端口8081:
netstat -ano | findstr ":8081" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo   [OK] 已释放
) else (
    echo   [警告] 仍被占用，尝试强制释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
)

echo   端口8082:
netstat -ano | findstr ":8082" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo   [OK] 已释放
) else (
    echo   [警告] 仍被占用，尝试强制释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8082" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
)
echo.

echo ================================================
echo   所有服务已停止
echo ================================================
echo.
echo 提示: 如果端口仍被占用，请重启计算机
echo.
pause
