@echo off
setlocal enabledelayedexpansion

REM ========================================
REM 考官排班系统部署异常处理脚本
REM 版本: 1.0.0
   日期: 2026-01-30
REM ========================================

REM 设置脚本目录
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM 设置日志目录
set LOG_DIR=C:\Deployment\logs
set LOG_FILE=%LOG_DIR%\exception-handler_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log
set LOG_FILE=%LOG_FILE: =0%

REM 设置备份目录
set BACKUP_DIR=C:\Deployment\backup

REM 设置错误代码定义
REM 环境错误 (1-10)
set ERROR_DISK_SPACE=1
set ERROR_OS_VERSION=2
set ERROR_NETWORK=3
set ERROR_PORT_OCCUPIED=4

REM 依赖错误 (11-20)
set ERROR_JAVA_RUNTIME=11
set ERROR_BACKEND_JAR=12
set ERROR_FRONTEND_FILES=13
set ERROR_HTTP_SERVER=14

REM 部署错误 (21-30)
set ERROR_COMPILE_HTTP_SERVER=21
set ERROR_START_BACKEND=22
set ERROR_START_FRONTEND=23
set ERROR_HEALTH_CHECK=24

REM 验证错误 (31-40)
set ERROR_VERSION_MISMATCH=31
set ERROR_DEPLOY_TIMEOUT=32

REM 回滚错误 (41-50)
set ERROR_BACKUP_NOT_FOUND=41
set ERROR_RESTORE_FAILED=42

REM 创建日志目录
if not exist "%LOG_DIR%" (
    mkdir "%LOG_DIR%" 2>nul
)

REM 日志记录函数
:log
set LOG_MSG=[%date% %time%] %*
echo %LOG_MSG%
echo %LOG_MSG% >> "%LOG_FILE%"
goto :eof

REM 错误处理函数
:error_handler
set ERROR_CODE=%~1
set ERROR_MSG=%~2
call :log [ERROR] %ERROR_MSG%
call :log [ERROR] 错误代码: %ERROR_CODE%
call :handle_error %ERROR_CODE%
exit /b %ERROR_CODE%

REM 错误分级处理函数
:handle_error
set ERROR_CODE=%~1

REM 环境错误（严重）
if %ERROR_CODE% GEQ 1 if %ERROR_CODE% LEQ 10 (
    call :log [ERROR] 严重错误: 环境问题
    call :log [ERROR] 建议操作: 检查系统环境并修复后重试
    call :send_alert "严重错误: 环境问题 (代码: %ERROR_CODE%)"
    exit /b %ERROR_CODE%
)

REM 依赖错误（严重）
if %ERROR_CODE% GEQ 11 if %ERROR_CODE% LEQ 20 (
    call :log [ERROR] 严重错误: 依赖问题
    call :log [ERROR] 建议操作: 检查依赖文件完整性
    call :send_alert "严重错误: 依赖问题 (代码: %ERROR_CODE%)"
    exit /b %ERROR_CODE%
)

REM 部署错误（中等）
if %ERROR_CODE% GEQ 21 if %ERROR_CODE% LEQ 30 (
    call :log [ERROR] 中等错误: 部署问题
    call :log [ERROR] 建议操作: 尝试回滚到上一个版本
    call :attempt_rollback
    exit /b %ERROR_CODE%
)

REM 验证错误（轻微）
if %ERROR_CODE% GEQ 31 if %ERROR_CODE% LEQ 40 (
    call :log [WARNING] 轻微错误: 验证问题
    call :log [WARNING] 建议操作: 检查配置并重试
    exit /b %ERROR_CODE%
)

REM 回滚错误（严重）
if %ERROR_CODE% GEQ 41 if %ERROR_CODE% LEQ 50 (
    call :log [ERROR] 严重错误: 回滚问题
    call :log [ERROR] 建议操作: 手动恢复系统
    call :send_alert "严重错误: 回滚失败 (代码: %ERROR_CODE%)"
    exit /b %ERROR_CODE%
)

REM 未知错误
call :log [ERROR] 未知错误代码: %ERROR_CODE%
exit /b %ERROR_CODE%

REM 发送警报函数
:send_alert
set ALERT_MSG=%~1

call :log [ALERT] %ALERT_MSG%

REM 尝试写入警报日志
set ALERT_FILE=%LOG_DIR%\alerts.log
echo [%date% %time%] %ALERT_MSG% >> "%ALERT_FILE%"

REM 在Windows 7上，可以使用msg命令发送消息到当前用户
REM msg * "%ALERT_MSG%" >nul 2>&1

exit /b 0

REM 尝试回滚函数
:attempt_rollback
call :log [INFO] 尝试回滚到上一个版本...

REM 查找最新的备份
set LATEST_BACKUP=
for /f "delims=" %%d in ('dir /b /o-d "%BACKUP_DIR%\backup_*" 2^>nul') do (
    set LATEST_BACKUP=%%d
    goto :found_backup
)

:found_backup
if "%LATEST_BACKUP%"=="" (
    call :log [ERROR] 未找到可用的备份
    call :send_alert "回滚失败: 未找到备份"
    exit /b %ERROR_BACKUP_NOT_FOUND%
)

call :log [INFO] 找到最新备份: %LATEST_BACKUP%

REM 执行回滚
call :rollback "%LATEST_BACKUP%"
if errorlevel 1 (
    call :log [ERROR] 回滚失败
    exit /b %ERROR_RESTORE_FAILED%
)

call :log [INFO] 回滚成功
exit /b 0

REM 回滚函数
:rollback
set BACKUP_NAME=%~1
set BACKUP_PATH=%BACKUP_DIR%\%BACKUP_NAME%

call :log [INFO] 开始回滚: %BACKUP_NAME%

REM 检查备份是否存在
if not exist "%BACKUP_PATH%" (
    call :log [ERROR] 备份不存在: %BACKUP_PATH%
    exit /b %ERROR_BACKUP_NOT_FOUND%
)

REM 停止当前服务
call :log [INFO] 停止当前服务...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1
timeout /t 3 /nobreak >nul

REM 恢复后端JAR文件
if exist "%BACKUP_PATH%\quarkus-run.jar" (
    call :log [INFO] 恢复后端JAR文件...
    copy /Y "%BACKUP_PATH%\quarkus-run.jar" "%SCRIPT_DIR%\supervisor\backend\app\" >nul 2>&1
    if errorlevel 1 (
        call :log [ERROR] 恢复后端JAR文件失败
        exit /b %ERROR_RESTORE_FAILED%
    )
    call :log [INFO] 后端JAR文件已恢复
)

REM 恢复前端文件
if exist "%BACKUP_PATH%\frontend" (
    call :log [INFO] 恢复前端文件...
    xcopy /E /I /Y "%BACKUP_PATH%\frontend" "%SCRIPT_DIR%\supervisor\frontend\" >nul 2>&1
    if errorlevel 1 (
        call :log [ERROR] 恢复前端文件失败
        exit /b %ERROR_RESTORE_FAILED%
    )
    call :log [INFO] 前端文件已恢复
)

REM 恢复版本文件
if exist "%BACKUP_PATH%\VERSION.txt" (
    call :log [INFO] 恢复版本文件...
    copy /Y "%BACKUP_PATH%\VERSION.txt" "%SCRIPT_DIR%\" >nul 2>&1
    if errorlevel 1 (
        call :log [WARNING] 恢复版本文件失败，但继续回滚
    ) else (
        call :log [INFO] 版本文件已恢复
    )
)

REM 重新启动服务
call :log [INFO] 重新启动服务...
call "%SCRIPT_DIR%\deploy.bat"
if errorlevel 1 (
    call :log [ERROR] 重新启动服务失败
    exit /b %ERROR_RESTORE_FAILED%
)

call :log [INFO] 回滚完成
exit /b 0

REM 列出可用备份函数
:list_backups
call :log [INFO] 可用备份列表:

if not exist "%BACKUP_DIR%" (
    call :log [INFO] 备份目录不存在
    exit /b 0
)

set COUNT=0
for /f "delims=" %%d in ('dir /b /o-d "%BACKUP_DIR%\backup_*" 2^>nul') do (
    set /a COUNT+=1
    call :log [INFO]   !COUNT!. %%d
)

if %COUNT% EQU 0 (
    call :log [INFO] 没有可用的备份
) else (
    call :log [INFO] 共找到 %COUNT% 个备份
)

exit /b 0

REM 手动回滚函数
:manual_rollback
set BACKUP_INDEX=%~1

call :log [INFO] 手动回滚到备份 #%BACKUP_INDEX%...

REM 获取指定备份
set CURRENT_INDEX=0
set TARGET_BACKUP=
for /f "delims=" %%d in ('dir /b /o-d "%BACKUP_DIR%\backup_*" 2^>nul') do (
    set /a CURRENT_INDEX+=1
    if !CURRENT_INDEX! EQU %BACKUP_INDEX% (
        set TARGET_BACKUP=%%d
        goto :found_target_backup
    )
)

:found_target_backup
if "%TARGET_BACKUP%"=="" (
    call :log [ERROR] 未找到备份 #%BACKUP_INDEX%
    exit /b 1
)

REM 执行回滚
call :rollback "%TARGET_BACKUP%"
exit /b %errorlevel%

REM 清理失败部署函数
:cleanup_failed_deploy
call :log [INFO] 清理失败的部署...

REM 清理临时文件
if exist "%SCRIPT_DIR%\*.tmp" (
    del /Q "%SCRIPT_DIR%\*.tmp" >nul 2>&1
)

REM 清理临时日志
if exist "%LOG_DIR%\*.tmp" (
    del /Q "%LOG_DIR%\*.tmp" >nul 2>&1
)

call :log [INFO] 清理完成
exit /b 0

REM 生成错误报告函数
:generate_error_report
set ERROR_CODE=%~1
set ERROR_MSG=%~2

set REPORT_FILE=%LOG_DIR%\error-report-%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt
set REPORT_FILE=%REPORT_FILE: =0%

(
echo ========================================
echo 考官排班系统部署错误报告
echo ========================================
echo 报告时间: %date% %time%
echo 错误代码: %ERROR_CODE%
echo 错误信息: %ERROR_MSG%
echo ========================================
echo 系统信息:
echo ----------------------------------------
systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Type"
echo ========================================
echo 磁盘信息:
echo ----------------------------------------
wmic logicaldisk get name,freespace,size
echo ========================================
echo 网络信息:
echo ----------------------------------------
ipconfig /all
echo ========================================
echo 进程信息:
echo ----------------------------------------
tasklist | findstr /i "java"
echo ========================================
echo 端口信息:
echo ----------------------------------------
netstat -ano | findstr ":8081 :8082"
echo ========================================
echo 最近日志:
echo ----------------------------------------
type "%LOG_FILE%" | findstr /i "error warning"
echo ========================================
) > "%REPORT_FILE%"

call :log [INFO] 错误报告已生成: %REPORT_FILE%
exit /b 0

REM 显示错误代码说明函数
:show_error_codes
call :log [INFO] 错误代码说明:
call :log [INFO] ========================================
call :log [INFO] 环境错误 (1-10):
call :log [INFO]   1 - 磁盘空间不足
call :log [INFO]   2 - 操作系统版本不兼容
call :log [INFO]   3 - 网络连接失败
call :log [INFO]   4 - 端口被占用
call :log [INFO] ========================================
call :log [INFO] 依赖错误 (11-20):
call :log [INFO]   11 - Java运行时未找到
call :log [INFO]   12 - 后端JAR文件未找到
call :log [INFO]   13 - 前端文件未找到
call :log [INFO]   14 - HTTP服务器文件未找到
call :log [INFO] ========================================
call :log [INFO] 部署错误 (21-30):
call :log [INFO]   21 - 编译HTTP服务器失败
call :log [INFO]   22 - 启动后端服务失败
call :log [INFO]   23 - 启动前端服务失败
call :log [INFO]   24 - 健康检查失败
call :log [INFO] ========================================
call :log [INFO] 验证错误 (31-40):
call :log [INFO]   31 - 版本不匹配
call :log [INFO]   32 - 部署超时
call :log [INFO] ========================================
call :log [INFO] 回滚错误 (41-50):
call :log [INFO]   41 - 备份未找到
call :log [INFO]   42 - 恢复失败
call :log [INFO] ========================================
exit /b 0

REM 主函数
:main
set COMMAND=%~1

if "%COMMAND%"=="" (
    call :log [INFO] 用法: deploy-exception-handler.bat [command]
    call :log [INFO] 命令:
    call :log [INFO]   handle [error_code] [error_msg] - 处理错误
    call :log [INFO]   rollback [backup_name] - 回滚到指定备份
    call :log [INFO]   manual-rollback [backup_index] - 手动回滚到指定索引的备份
    call :log [INFO]   list-backups - 列出可用备份
    call :log [INFO]   cleanup - 清理失败的部署
    call :log [INFO]   report [error_code] [error_msg] - 生成错误报告
    call :log [INFO]   show-codes - 显示错误代码说明
    exit /b 0
)

if "%COMMAND%"=="handle" (
    set ERROR_CODE=%~2
    set ERROR_MSG=%~3
    call :handle_error %ERROR_CODE%
    exit /b %errorlevel%
)

if "%COMMAND%"=="rollback" (
    set BACKUP_NAME=%~2
    call :rollback "%BACKUP_NAME%"
    exit /b %errorlevel%
)

if "%COMMAND%"=="manual-rollback" (
    set BACKUP_INDEX=%~2
    call :manual_rollback %BACKUP_INDEX%
    exit /b %errorlevel%
)

if "%COMMAND%"=="list-backups" (
    call :list_backups
    exit /b 0
)

if "%COMMAND%"=="cleanup" (
    call :cleanup_failed_deploy
    exit /b 0
)

if "%COMMAND%"=="report" (
    set ERROR_CODE=%~2
    set ERROR_MSG=%~3
    call :generate_error_report %ERROR_CODE% "%ERROR_MSG%"
    exit /b 0
)

if "%COMMAND%"=="show-codes" (
    call :show_error_codes
    exit /b 0
)

call :log [ERROR] 未知命令: %COMMAND%
exit /b 1

REM 执行主函数
call :main %*
