@echo off
:: 设置代码页
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul

:: 切换到脚本所在目录
cd /d "%~dp0"

:: 检查VBS脚本是否存在
if not exist "start.vbs" (
    echo Error: start.vbs not found
    pause
    exit /b 1
)

:: 使用WScript运行VBS脚本（不显示窗口）
:: //nologo 防止显示WScript的logo
:: 使用start /min最小化运行
start /min "" wscript //nologo "start.vbs"

:: 立即退出，不显示任何窗口
exit
