@echo off
setlocal enabledelayedexpansion

REM ========================================
REM 考官排班系统部署流程控制脚本
REM 版本: 1.0.0
REM 日期: 2026-01-30
REM ========================================

REM 设置脚本目录
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM 设置日志目录
set LOG_DIR=C:\Deployment\logs
set LOG_FILE=%LOG_DIR%\deploy-controller_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log
set LOG_FILE=%LOG_FILE: =0%

REM 设置部署超时时间（秒）
set DEPLOY_TIMEOUT=300

REM 设置版本文件
set VERSION_FILE=%SCRIPT_DIR%\VERSION.txt

REM 设置部署状态文件
set STATUS_FILE=%LOG_DIR%\deploy-status.txt

REM 设置备份目录
set BACKUP_DIR=C:\Deployment\backup

REM 创建日志目录
if not exist "%LOG_DIR%" (
    mkdir "%LOG_DIR%" 2>nul
)

REM 创建备份目录
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%" 2>nul
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
call :log [ERROR] 部署流程控制失败，错误代码: %ERROR_CODE%
echo FAILED > "%STATUS_FILE%"
exit /b %ERROR_CODE%

REM 版本比较函数
:compare_versions
set VERSION1=%~1
set VERSION2=%~2

REM 解析版本号
for /f "tokens=1,2,3 delims=." %%a in ("%VERSION1%") do (
    set MAJOR1=%%a
    set MINOR1=%%b
    set PATCH1=%%c
)

for /f "tokens=1,2,3 delims=." %%a in ("%VERSION2%") do (
    set MAJOR2=%%a
    set MINOR2=%%b
    set PATCH2=%%c
)

REM 比较主版本号
if %MAJOR1% GTR %MAJOR2% (
    exit /b 1
)
if %MAJOR1% LSS %MAJOR2% (
    exit /b -1
)

REM 比较次版本号
if %MINOR1% GTR %MINOR2% (
    exit /b 1
)
if %MINOR1% LSS %MINOR2% (
    exit /b -1
)

REM 比较补丁版本号
if %PATCH1% GTR %PATCH2% (
    exit /b 1
)
if %PATCH1% LSS %PATCH2% (
    exit /b -1
)

REM 版本相同
exit /b 0

REM 版本验证函数
:validate_version
set TARGET_VERSION=%~1

call :log [INFO] 开始版本验证...

REM 检查版本文件是否存在
if not exist "%VERSION_FILE%" (
    call :log [WARNING] 版本文件未找到: %VERSION_FILE%
    exit /b 0
)

REM 读取当前版本
set /p CURRENT_VERSION=<"%VERSION_FILE%"
call :log [INFO] 当前版本: %CURRENT_VERSION%

REM 如果未指定目标版本，跳过验证
if "%TARGET_VERSION%"=="" (
    call :log [INFO] 未指定目标版本，跳过版本验证
    exit /b 0
)

REM 比较版本
call :compare_versions %CURRENT_VERSION% %TARGET_VERSION%
set COMPARE_RESULT=%errorlevel%

if %COMPARE_RESULT% EQU 0 (
    call :log [INFO] 版本匹配: %CURRENT_VERSION%
    exit /b 0
) else if %COMPARE_RESULT% EQU 1 (
    call :log [INFO] 当前版本高于目标版本: %CURRENT_VERSION% ^> %TARGET_VERSION%
    exit /b 0
) else (
    call :log [WARNING] 当前版本低于目标版本: %CURRENT_VERSION% ^< %TARGET_VERSION%
    call :log [WARNING] 建议升级到版本: %TARGET_VERSION%
    exit /b 1
)

REM 超时控制函数
:timeout_control
set COMMAND=%~1
set TIMEOUT=%~2

call :log [INFO] 开始超时控制，超时时间: %TIMEOUT% 秒

REM 创建临时脚本
set TEMP_SCRIPT=%TEMP%\timeout-control-%random%.bat
(
echo @echo off
echo setlocal
echo set START_TIME=%%time%%
echo %COMMAND%
echo set END_TIME=%%time%%
echo exit /b %%errorlevel%%
) > "%TEMP_SCRIPT%"

REM 启动命令
start "" /B /WAIT cmd /c "%TEMP_SCRIPT%"
set RESULT=%errorlevel%

REM 删除临时脚本
del "%TEMP_SCRIPT%" >nul 2>&1

call :log [INFO] 命令执行完成，返回代码: %RESULT%
exit /b %RESULT%

REM 部署前检查函数
:pre_deploy_check
call :log [INFO] 开始部署前检查...

REM 检查磁盘空间
call :log [INFO] 检查磁盘空间...
for /f "tokens=3" %%a in ('dir c:\ ^| find "bytes free"') do set FREE_SPACE=%%a
set FREE_SPACE=%FREE_SPACE:,=%
if %FREE_SPACE% LSS 524288000 (
    call :log [ERROR] 磁盘空间不足，至少需要500MB可用空间
    exit /b 1
)
call :log [INFO] 磁盘空间检查通过

REM 检查端口占用
call :log [INFO] 检查端口占用...
netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    call :log [WARNING] 端口8081已被占用
)
netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    call :log [WARNING] 端口8082已被占用
)

REM 检查Java运行时
call :log [INFO] 检查Java运行时...
if not exist "%SCRIPT_DIR%\java-runtime\bin\javaw.exe" (
    call :log [ERROR] Java运行时未找到
    exit /b 1
)
call :log [INFO] Java运行时检查通过

REM 检查后端JAR文件
call :log [INFO] 检查后端JAR文件...
if not exist "%SCRIPT_DIR%\supervisor\backend\app\quarkus-run.jar" (
    call :log [ERROR] 后端JAR文件未找到
    exit /b 1
)
call :log [INFO] 后端JAR文件检查通过

call :log [INFO] 部署前检查完成
exit /b 0

REM 备份当前版本函数
:backup_current_version
call :log [INFO] 开始备份当前版本...

REM 检查版本文件是否存在
if not exist "%VERSION_FILE%" (
    call :log [WARNING] 版本文件未找到，跳过备份
    exit /b 0
)

REM 读取当前版本
set /p CURRENT_VERSION=<"%VERSION_FILE%"
set BACKUP_NAME=backup_%CURRENT_VERSION%_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_NAME=%BACKUP_NAME: =0%

REM 创建备份目录
set BACKUP_PATH=%BACKUP_DIR%\%BACKUP_NAME%
if not exist "%BACKUP_PATH%" (
    mkdir "%BACKUP_PATH%"
)

REM 备份关键文件
call :log [INFO] 备份关键文件到: %BACKUP_PATH%

if exist "%SCRIPT_DIR%\supervisor\backend\app\quarkus-run.jar" (
    copy "%SCRIPT_DIR%\supervisor\backend\app\quarkus-run.jar" "%BACKUP_PATH%\" >nul 2>&1
    call :log [INFO] 已备份: quarkus-run.jar
)

if exist "%SCRIPT_DIR%\supervisor\frontend" (
    xcopy "%SCRIPT_DIR%\supervisor\frontend" "%BACKUP_PATH%\frontend\" /E /I /Y >nul 2>&1
    call :log [INFO] 已备份: frontend目录
)

if exist "%SCRIPT_DIR%\VERSION.txt" (
    copy "%SCRIPT_DIR%\VERSION.txt" "%BACKUP_PATH%\" >nul 2>&1
    call :log [INFO] 已备份: VERSION.txt
)

call :log [INFO] 备份完成
exit /b 0

REM 部署后验证函数
:post_deploy_verify
call :log [INFO] 开始部署后验证...

REM 检查后端服务
call :log [INFO] 检查后端服务...
set BACKEND_READY=0
for /L %%i in (1,1,30) do (
    timeout /t 1 /nobreak >nul
    netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        set BACKEND_READY=1
        call :log [INFO] 后端服务已就绪（耗时%%i秒）
        goto :backend_verify_done
    )
)

:backend_verify_done
if %BACKEND_READY% EQU 0 (
    call :log [ERROR] 后端服务未就绪
    exit /b 1
)

REM 检查前端服务
call :log [INFO] 检查前端服务...
set FRONTEND_READY=0
for /L %%i in (1,1,10) do (
    timeout /t 1 /nobreak >nul
    netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        set FRONTEND_READY=1
        call :log [INFO] 前端服务已就绪（耗时%%i秒）
        goto :frontend_verify_done
    )
)

:frontend_verify_done
if %FRONTEND_READY% EQU 0 (
    call :log [ERROR] 前端服务未就绪
    exit /b 1
)

call :log [INFO] 部署后验证完成
exit /b 0

REM 记录部署状态函数
:record_deploy_status
set STATUS=%~1
set MESSAGE=%~2

echo %STATUS% > "%STATUS_FILE%"
echo %date% %time% >> "%STATUS_FILE%"
echo %MESSAGE% >> "%STATUS_FILE%"

call :log [INFO] 部署状态已记录: %STATUS%
exit /b 0

REM 获取部署状态函数
:get_deploy_status
if not exist "%STATUS_FILE%" (
    echo UNKNOWN
    exit /b 0
)

set /p STATUS=<"%STATUS_FILE%"
echo %STATUS%
exit /b 0

REM 清理旧备份函数
:cleanup_old_backups
call :log [INFO] 开始清理旧备份...

REM 保留最近5个备份
set KEEP_COUNT=5
set COUNT=0

for /f "skip=%KEEP_COUNT% delims=" %%d in ('dir /b /o-d "%BACKUP_DIR%\backup_*" 2^>nul') do (
    set /a COUNT+=1
    rd /s /q "%BACKUP_DIR%\%%d" >nul 2>&1
    if not errorlevel 1 (
        call :log [INFO] 已删除旧备份: %%d
    )
)

if %COUNT% EQU 0 (
    call :log [INFO] 没有需要清理的旧备份
) else (
    call :log [INFO] 已清理 %COUNT% 个旧备份
)

exit /b 0

REM 主函数
:main
call :log [INFO] ========================================
call :log [INFO] 考官排班系统部署流程控制开始
call :log [INFO] ========================================

REM 记录开始时间
set START_TIME=%time%

REM 记录部署状态
call :record_deploy_status IN_PROGRESS "部署进行中"

REM 执行部署前检查
call :pre_deploy_check
if errorlevel 1 (
    call :error_handler %errorlevel% "部署前检查失败"
)

REM 备份当前版本
call :backup_current_version
if errorlevel 1 (
    call :log [WARNING] 备份失败，但继续部署
)

REM 执行部署脚本
call :log [INFO] 执行部署脚本...
call "%SCRIPT_DIR%\deploy.bat"
if errorlevel 1 (
    call :error_handler %errorlevel% "部署脚本执行失败"
)

REM 执行部署后验证
call :post_deploy_verify
if errorlevel 1 (
    call :error_handler %errorlevel% "部署后验证失败"
)

REM 清理旧备份
call :cleanup_old_backups

REM 记录部署状态
call :record_deploy_status SUCCESS "部署成功完成"

REM 记录结束时间
set END_TIME=%time%

call :log [INFO] ========================================
call :log [INFO] 部署流程控制成功完成！
call :log [INFO] ========================================
call :log [INFO] 部署开始时间: %START_TIME%
call :log [INFO] 部署结束时间: %END_TIME%
call :log [INFO] ========================================

exit /b 0

REM 执行主函数
call :main
