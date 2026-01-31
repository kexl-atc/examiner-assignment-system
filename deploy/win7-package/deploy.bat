@echo off
setlocal enabledelayedexpansion

REM ========================================
REM 考官排班系统自动部署脚本
REM 版本: 1.0.0
REM 日期: 2026-01-30
REM ========================================

REM 设置脚本目录
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM 设置日志目录
set LOG_DIR=C:\Deployment\logs
set LOG_FILE=%LOG_DIR%\deploy_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log
set LOG_FILE=%LOG_FILE: =0%

REM 设置部署超时时间（秒）
set DEPLOY_TIMEOUT=300

REM 设置版本文件
set VERSION_FILE=%SCRIPT_DIR%\VERSION.txt

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
call :log [ERROR] 部署失败，错误代码: %ERROR_CODE%
exit /b %ERROR_CODE%

REM 环境检查函数
:check_environment
call :log [INFO] 开始环境检查...

REM 检查操作系统版本
call :log [INFO] 检查操作系统版本...
ver | findstr /i "6.1" >nul
if errorlevel 1 (
    call :log [WARNING] 操作系统可能不是Windows 7
) else (
    call :log [INFO] 操作系统版本检查通过: Windows 7
)

REM 检查磁盘空间（至少需要500MB）
call :log [INFO] 检查磁盘空间...
for /f "tokens=3" %%a in ('dir c:\ ^| find "bytes free"') do set FREE_SPACE=%%a
set FREE_SPACE=%FREE_SPACE:,=%
if %FREE_SPACE% LSS 524288000 (
    call :error_handler 1 "磁盘空间不足，至少需要500MB可用空间"
)
call :log [INFO] 磁盘空间检查通过

REM 检查网络连接（可选）
call :log [INFO] 检查网络连接...
ping -n 1 127.0.0.1 >nul 2>&1
if errorlevel 1 (
    call :log [WARNING] 网络连接检查失败，但继续部署
) else (
    call :log [INFO] 网络连接检查通过
)

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

call :log [INFO] 环境检查完成
goto :eof

REM 依赖验证函数
:check_dependencies
call :log [INFO] 开始依赖验证...

REM 检查Java运行时
call :log [INFO] 检查Java运行时...
if not exist "%SCRIPT_DIR%\java-runtime\bin\javaw.exe" (
    call :error_handler 2 "Java运行时未找到: %SCRIPT_DIR%\java-runtime\bin\javaw.exe"
)
call :log [INFO] Java运行时检查通过

REM 检查后端JAR文件
call :log [INFO] 检查后端JAR文件...
if not exist "%SCRIPT_DIR%\supervisor\backend\app\quarkus-run.jar" (
    call :error_handler 3 "后端JAR文件未找到: %SCRIPT_DIR%\supervisor\backend\app\quarkus-run.jar"
)
call :log [INFO] 后端JAR文件检查通过

REM 检查前端文件
call :log [INFO] 检查前端文件...
if not exist "%SCRIPT_DIR%\supervisor\frontend\index.html" (
    call :error_handler 4 "前端文件未找到: %SCRIPT_DIR%\supervisor\frontend\index.html"
)
call :log [INFO] 前端文件检查通过

REM 检查SimpleHttpServer.java
call :log [INFO] 检查SimpleHttpServer.java...
if not exist "%SCRIPT_DIR%\SimpleHttpServer.java" (
    call :error_handler 5 "SimpleHttpServer.java未找到: %SCRIPT_DIR%\SimpleHttpServer.java"
)
call :log [INFO] SimpleHttpServer.java检查通过

call :log [INFO] 依赖验证完成
goto :eof

REM 版本验证函数
:check_version
call :log [INFO] 开始版本验证...

if not exist "%VERSION_FILE%" (
    call :log [WARNING] 版本文件未找到: %VERSION_FILE%
    goto :eof
)

set /p CURRENT_VERSION=<"%VERSION_FILE%"
call :log [INFO] 当前版本: %CURRENT_VERSION%

REM 检查版本格式
echo %CURRENT_VERSION% | findstr /r "^[0-9]\+\.[0-9]\+\.[0-9]\+$" >nul
if errorlevel 1 (
    call :log [WARNING] 版本格式可能不正确: %CURRENT_VERSION%
) else (
    call :log [INFO] 版本格式检查通过
)

call :log [INFO] 版本验证完成
goto :eof

REM 停止服务函数
:stop_services
call :log [INFO] 开始停止服务...

REM 停止Java进程
call :log [INFO] 停止Java进程...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1

REM 等待进程完全停止
call :log [INFO] 等待进程完全停止...
timeout /t 3 /nobreak >nul

REM 检查进程是否已停止
tasklist | findstr /i "java.exe" >nul 2>&1
if not errorlevel 1 (
    call :log [WARNING] Java进程仍在运行，尝试强制停止...
    taskkill /F /IM java.exe >nul 2>&1
    taskkill /F /IM javaw.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

call :log [INFO] 服务停止完成
goto :eof

REM 编译前端HTTP服务器函数
:compile_http_server
call :log [INFO] 开始编译前端HTTP服务器...

if exist "%SCRIPT_DIR%\SimpleHttpServer.class" (
    call :log [INFO] SimpleHttpServer.class已存在，跳过编译
    goto :eof
)

call :log [INFO] 编译SimpleHttpServer.java...
"%SCRIPT_DIR%\java-runtime\bin\javac.exe" -d "%SCRIPT_DIR%" "%SCRIPT_DIR%\SimpleHttpServer.java"
if errorlevel 1 (
    call :error_handler 6 "编译SimpleHttpServer.java失败"
)

call :log [INFO] 前端HTTP服务器编译完成
goto :eof

REM 启动后端服务函数
:start_backend
call :log [INFO] 开始启动后端服务...

cd /d "%SCRIPT_DIR%"
start "" /B "java-runtime\bin\javaw.exe" -Xmx512m -Dquarkus.profile=prod -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=8082 -jar "supervisor\backend\app\quarkus-run.jar" >"%SCRIPT_DIR%\backend.log" 2>&1

call :log [INFO] 后端服务启动命令已执行

REM 等待后端初始化
call :log [INFO] 等待后端初始化（最多30秒）...
set BACKEND_READY=0
for /L %%i in (1,1,30) do (
    timeout /t 1 /nobreak >nul
    netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        set BACKEND_READY=1
        call :log [INFO] 后端服务已就绪（耗时%%i秒）
        goto :backend_ready
    )
)

:backend_ready
if %BACKEND_READY% equ 0 (
    call :log [WARNING] 后端服务可能未就绪，但继续部署
)

call :log [INFO] 后端服务启动完成
goto :eof

REM 启动前端服务函数
:start_frontend
call :log [INFO] 开始启动前端服务...

cd /d "%SCRIPT_DIR%"
start "" /B "java-runtime\bin\javaw.exe" -cp . SimpleHttpServer 8081 "supervisor\frontend" >"%SCRIPT_DIR%\frontend.log" 2>&1

call :log [INFO] 前端服务启动命令已执行

REM 等待前端初始化
call :log [INFO] 等待前端初始化（最多10秒）...
set FRONTEND_READY=0
for /L %%i in (1,1,10) do (
    timeout /t 1 /nobreak >nul
    netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        set FRONTEND_READY=1
        call :log [INFO] 前端服务已就绪（耗时%%i秒）
        goto :frontend_ready
    )
)

:frontend_ready
if %FRONTEND_READY% equ 0 (
    call :log [WARNING] 前端服务可能未就绪，但继续部署
)

call :log [INFO] 前端服务启动完成
goto :eof

REM 健康检查函数
:health_check
call :log [INFO] 开始健康检查...

REM 检查后端健康
call :log [INFO] 检查后端健康状态...
netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    call :log [ERROR] 后端服务未监听端口8082
    call :error_handler 7 "后端服务健康检查失败"
)
call :log [INFO] 后端服务健康检查通过

REM 检查前端健康
call :log [INFO] 检查前端健康状态...
netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    call :log [ERROR] 前端服务未监听端口8081
    call :error_handler 8 "前端服务健康检查失败"
)
call :log [INFO] 前端服务健康检查通过

call :log [INFO] 健康检查完成
goto :eof

REM 部署成功函数
:deploy_success
call :log [INFO] ========================================
call :log [INFO] 部署成功完成！
call :log [INFO] ========================================
call :log [INFO] 后端服务: http://127.0.0.1:8082
call :log [INFO] 前端服务: http://127.0.0.1:8081
call :log [INFO] 日志文件: %LOG_FILE%
call :log [INFO] ========================================
goto :eof

REM 主函数
:main
call :log [INFO] ========================================
call :log [INFO] 考官排班系统自动部署开始
call :log [INFO] ========================================

REM 记录开始时间
set START_TIME=%time%

REM 执行环境检查
call :check_environment
if errorlevel 1 (
    call :error_handler %errorlevel% "环境检查失败"
)

REM 执行依赖验证
call :check_dependencies
if errorlevel 1 (
    call :error_handler %errorlevel% "依赖验证失败"
)

REM 执行版本验证
call :check_version

REM 停止现有服务
call :stop_services

REM 编译前端HTTP服务器
call :compile_http_server
if errorlevel 1 (
    call :error_handler %errorlevel% "编译前端HTTP服务器失败"
)

REM 启动后端服务
call :start_backend
if errorlevel 1 (
    call :error_handler %errorlevel% "启动后端服务失败"
)

REM 启动前端服务
call :start_frontend
if errorlevel 1 (
    call :error_handler %errorlevel% "启动前端服务失败"
)

REM 执行健康检查
call :health_check
if errorlevel 1 (
    call :error_handler %errorlevel% "健康检查失败"
)

REM 记录结束时间
set END_TIME=%time%

REM 部署成功
call :deploy_success

REM 计算部署耗时
call :log [INFO] 部署开始时间: %START_TIME%
call :log [INFO] 部署结束时间: %END_TIME%

exit /b 0

REM 执行主函数
call :main
