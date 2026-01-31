@echo off
setlocal enabledelayedexpansion

REM ========================================
REM 考官排班系统任务计划程序配置脚本
REM 版本: 1.0.0
REM 日期: 2026-01-30
REM ========================================

REM 设置脚本目录
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM 设置任务名称
set TASK_NAME=ExaminerAssignmentSystem

REM 设置日志目录
set LOG_DIR=C:\Deployment\logs
set LOG_FILE=%LOG_DIR%\setup-task_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log
set LOG_FILE=%LOG_FILE: =0%

REM 创建日志目录
if not exist "%LOG_DIR%" (
    mkdir "%LOG_DIR%" 2>nul
    if errorlevel 1 (
        echo [ERROR] 无法创建日志目录: %LOG_DIR%
        exit /b 1
    )
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
call :log [ERROR] 任务配置失败，错误代码: %ERROR_CODE%
exit /b %ERROR_CODE%

REM 检查管理员权限函数
:check_admin
call :log [INFO] 检查管理员权限...
net session >nul 2>&1
if errorlevel 1 (
    call :log [ERROR] 需要管理员权限才能配置任务计划程序
    call :log [INFO] 请右键点击此脚本，选择"以管理员身份运行"
    call :error_handler 1 "缺少管理员权限"
)
call :log [INFO] 管理员权限检查通过
goto :eof

REM 删除现有任务函数
:delete_existing_task
call :log [INFO] 检查现有任务...
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if errorlevel 1 (
    call :log [INFO] 未找到现有任务，跳过删除
    goto :eof
)

call :log [INFO] 删除现有任务: %TASK_NAME%
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
if errorlevel 1 (
    call :log [WARNING] 删除现有任务失败，但继续创建新任务
) else (
    call :log [INFO] 现有任务已删除
)
goto :eof

REM 创建任务函数
:create_task
call :log [INFO] 创建任务计划程序任务...

REM 设置部署脚本路径
set DEPLOY_SCRIPT=%SCRIPT_DIR%\deploy.bat

REM 检查部署脚本是否存在
if not exist "%DEPLOY_SCRIPT%" (
    call :error_handler 2 "部署脚本未找到: %DEPLOY_SCRIPT%"
)

REM 创建任务
schtasks /create /tn "%TASK_NAME%" /tr "\"%DEPLOY_SCRIPT%\"" /sc onstart /ru SYSTEM /rl highest /f >nul 2>&1
if errorlevel 1 (
    call :error_handler 3 "创建任务失败"
)

call :log [INFO] 任务创建成功
goto :eof

REM 配置任务触发器函数
:configure_trigger
call :log [INFO] 配置任务触发器...

REM 任务已在创建时配置为"系统启动时触发"（/sc onstart）
call :log [INFO] 触发器已配置为系统启动时运行
goto :eof

REM 配置任务重试策略函数
:configure_retry
call :log [INFO] 配置任务重试策略...

REM Windows 7的任务计划程序不支持直接配置重试策略
REM 但可以通过XML配置实现
call :log [INFO] Windows 7任务计划程序重试策略需要通过XML配置
call :log [INFO] 当前任务配置为最高权限运行（/rl highest）
goto :eof

REM 验证任务函数
:verify_task
call :log [INFO] 验证任务配置...

schtasks /query /tn "%TASK_NAME%" /v >nul 2>&1
if errorlevel 1 (
    call :error_handler 4 "任务验证失败"
)

call :log [INFO] 任务验证通过
goto :eof

REM 显示任务信息函数
:display_task_info
call :log [INFO] ========================================
call :log [INFO] 任务信息
call :log [INFO] ========================================
call :log [INFO] 任务名称: %TASK_NAME%
call :log [INFO] 触发器: 系统启动时
call :log [INFO] 运行账户: SYSTEM
call :log [INFO] 权限级别: 最高
call :log [INFO] 部署脚本: %DEPLOY_SCRIPT%
call :log [INFO] ========================================
goto :eof

REM 创建高级任务配置XML函数
:create_advanced_task_xml
call :log [INFO] 创建高级任务配置XML...

set XML_FILE=%SCRIPT_DIR%\task-config.xml

(
echo ^<?xml version="1.0" encoding="UTF-16"?^>
echo ^<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^>
echo   ^<RegistrationInfo^>
echo     ^<Date^>%date:~0,4%-%date:~5,2%-%date:~8,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%^</Date^>
echo     ^<Author^>SYSTEM^</Author^>
echo     ^<Version^>1.0.0^</Version^>
echo     ^<Description^>考官排班系统自动部署任务^</Description^>
echo   ^</RegistrationInfo^>
echo   ^<Triggers^>
echo     ^<BootTrigger^>
echo       ^<Enabled^>true^</Enabled^>
echo       ^<Delay^>PT30S^</Delay^>
echo     ^</BootTrigger^>
echo   ^</Triggers^>
echo   ^<Principals^>
echo     ^<Principal id="Author"^>
echo       ^<UserId^>S-1-5-18^</UserId^>
echo       ^<RunLevel^>HighestAvailable^</RunLevel^>
echo     ^</Principal^>
echo   ^</Principals^>
echo   ^<Settings^>
echo     ^<MultipleInstancesPolicy^>IgnoreNew^</MultipleInstancesPolicy^>
echo     ^<DisallowStartIfOnBatteries^>false^</DisallowStartIfOnBatteries^>
echo     ^<StopIfGoingOnBatteries^>false^</StopIfGoingOnBatteries^>
echo     ^<AllowHardTerminate^>true^</AllowHardTerminate^>
echo     ^<StartWhenAvailable^>true^</StartWhenAvailable^>
echo     ^<RunOnlyIfNetworkAvailable^>false^</RunOnlyIfNetworkAvailable^>
echo     ^<IdleSettings^>
echo       ^<StopOnIdleEnd^>true^</StopOnIdleEnd^>
echo       ^<RestartOnIdle^>false^</RestartOnIdle^>
echo     ^</IdleSettings^>
echo     ^<AllowStartOnDemand^>true^</AllowStartOnDemand^>
echo     ^<Enabled^>true^</Enabled^>
echo     ^<Hidden^>false^</Hidden^>
echo     ^<RunOnlyIfIdle^>false^</RunOnlyIfIdle^>
echo     ^<DisallowStartOnRemoteAppSession^>false^</DisallowStartOnRemoteAppSession^>
echo     ^<UseUnifiedSchedulingEngine^>false^</UseUnifiedSchedulingEngine^>
echo     ^<WakeToRun^>false^</WakeToRun^>
echo     ^<ExecutionTimeLimit^>PT0S^</ExecutionTimeLimit^>
echo     ^<Priority^>7^</Priority^>
echo     ^<RestartOnFailure^>
echo       ^<Interval^>PT1M^</Interval^>
echo       ^<Count^>3^</Count^>
echo     ^</RestartOnFailure^>
echo   ^</Settings^>
echo   ^<Actions Context="Author"^>
echo     ^<Exec^>
echo       ^<Command^>"%DEPLOY_SCRIPT%"^</Command^>
echo     ^</Exec^>
echo   ^</Actions^>
echo ^</Task^>
) > "%XML_FILE%"

if errorlevel 1 (
    call :log [WARNING] 创建XML配置文件失败
    goto :eof
)

call :log [INFO] XML配置文件已创建: %XML_FILE%
goto :eof

REM 使用XML创建任务函数
:create_task_from_xml
call :log [INFO] 使用XML配置创建任务...

set XML_FILE=%SCRIPT_DIR%\task-config.xml

if not exist "%XML_FILE%" (
    call :log [WARNING] XML配置文件不存在，使用默认配置
    goto :eof
)

schtasks /create /tn "%TASK_NAME%" /xml "%XML_FILE%" /f >nul 2>&1
if errorlevel 1 (
    call :log [WARNING] 使用XML创建任务失败，使用默认配置
    goto :eof
)

call :log [INFO] 使用XML配置创建任务成功
goto :eof

REM 测试任务函数
:test_task
call :log [INFO] 测试任务运行...

schtasks /run /tn "%TASK_NAME%" >nul 2>&1
if errorlevel 1 (
    call :log [WARNING] 手动运行任务失败
    goto :eof
)

call :log [INFO] 任务已手动启动，请检查部署日志
call :log [INFO] 日志目录: %LOG_DIR%
goto :eof

REM 配置成功函数
:setup_success
call :log [INFO] ========================================
call :log [INFO] 任务计划程序配置成功完成！
call :log [INFO] ========================================
call :log [INFO] 任务名称: %TASK_NAME%
call :log [INFO] 触发方式: 系统启动时自动运行
call :log [INFO] 运行账户: SYSTEM（最高权限）
call :log [INFO] 重试策略: 失败后1分钟重试，最多3次
call :log [INFO] ========================================
call :log [INFO] 下次系统启动时将自动执行部署
call :log [INFO] 如需立即测试，请运行: schtasks /run /tn "%TASK_NAME%"
call :log [INFO] ========================================
goto :eof

REM 主函数
:main
call :log [INFO] ========================================
call :log [INFO] 考官排班系统任务计划程序配置开始
call :log [INFO] ========================================

REM 检查管理员权限
call :check_admin
if errorlevel 1 (
    call :error_handler %errorlevel% "管理员权限检查失败"
)

REM 删除现有任务
call :delete_existing_task

REM 创建高级任务配置XML
call :create_advanced_task_xml

REM 使用XML创建任务
call :create_task_from_xml

REM 如果XML创建失败，使用默认配置
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if errorlevel 1 (
    call :log [INFO] 使用默认配置创建任务...
    call :create_task
    if errorlevel 1 (
        call :error_handler %errorlevel% "创建任务失败"
    )
)

REM 配置任务触发器
call :configure_trigger

REM 配置任务重试策略
call :configure_retry

REM 验证任务
call :verify_task
if errorlevel 1 (
    call :error_handler %errorlevel% "任务验证失败"
)

REM 显示任务信息
call :display_task_info

REM 测试任务
call :test_task

REM 配置成功
call :setup_success

exit /b 0

REM 执行主函数
call :main
