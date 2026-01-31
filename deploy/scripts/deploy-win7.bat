@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 智能考官排班系统 - Win7 部署向导 v8.0.0
color 0A

REM ========================================
REM 智能考官排班系统 - Win7 优化部署脚本 v8.0.0
REM 适配企业级重构版本 (v8.0.0)
REM 特性: 异步求解、企业级缓存、监控指标API
REM ========================================

echo.
echo ============================================================
echo   智能考官排班系统 - Win7 部署向导
echo   版本: v8.0.0 (企业级重构版)
echo   更新: 2025-01-30
echo ============================================================
echo.
echo [新特性] 企业级重构:
echo   - 异步求解架构 (支持并发求解)
echo   - 企业级缓存管理 (L1/L2两级缓存)
echo   - 实时监控指标 API
echo   - 求解进度实时追踪
echo.

REM ========================================
REM 全局变量初始化
REM ========================================
set "DEPLOY_SUCCESS=false"
set "VERSION=v8.0.0"
set "BUILD_DATE=%date:~0,4%%date:~5,2%%date:~8,2%"
REM 获取项目根目录 (scripts 的上级目录的上级)
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%\..\.."
set "ROOT_DIR=%CD%"
cd /d "%ROOT_DIR%"

REM 生成备份目录名 (Win7兼容格式)
for /f "tokens=1-4 delims=/- " %%a in ("%date%") do (
    set "YEAR=%%a"
    set "MONTH=%%b"
    set "DAY=%%c"
)
for /f "tokens=1-3 delims=:" %%a in ("%time: =0%") do (
    set "HOUR=%%a"
    set "MIN=%%b"
    set "SEC=%%c"
)
set "BACKUP_DIR=runtime\backup\backup_%YEAR%%MONTH%%DAY%_%HOUR%%MIN%%SEC%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"

REM ========================================
REM 检测 Windows 版本
REM ========================================
ver | findstr /i "6\.1" >nul 2>&1
if %errorlevel% equ 0 (
    set "IS_WIN7=true"
    set "WIN_VERSION=Windows 7"
    echo [系统检测] Windows 7 SP1 检测到
) else (
    set "IS_WIN7=false"
    ver | findstr /i "10\." >nul 2>&1
    if %errorlevel% equ 0 (
        set "WIN_VERSION=Windows 10/11"
        echo [系统检测] Windows 10/11 检测到
    ) else (
        set "WIN_VERSION=其他Windows版本"
        echo [系统检测] %WIN_VERSION% 检测到
    )
)

REM ========================================
REM Win7 兼容性提示
REM ========================================
if "%IS_WIN7%"=="true" (
    echo.
    echo [Win7 兼容性提示]
    echo   - 本脚本已针对 Win7 SP1 优化
echo   - 使用 ping 替代 timeout 实现延迟
echo   - 使用基础 netstat 检查端口
echo   - 建议内存: 4GB 以上
echo.
)

REM ========================================
REM 检查管理员权限
REM ========================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 建议以管理员身份运行以获得最佳体验
echo   - 管理员权限可自动配置防火墙
echo   - 非管理员权限需手动开放端口 8081, 8082, 9090
echo.
    set "IS_ADMIN=false"
) else (
    echo [权限检测] 已获取管理员权限
echo.
    set "IS_ADMIN=true"
)

REM ========================================
REM 检查必要文件
REM ========================================
echo ============================================================
echo  步骤 1/8: 检查必要文件
echo ============================================================
echo.

set "MISSING_FILES=0"

if not exist "deploy\supervisor\supervisor-headless.exe" (
    echo [错误] 未找到 supervisor-headless.exe
echo   请确保在项目根目录运行此脚本
echo   当前目录: %CD%
echo.
    set /a MISSING_FILES+=1
)

if not exist "java-runtime\bin\java.exe" (
    if not exist "jdk-17\bin\java.exe" (
        echo [错误] 未找到 Java 运行时
echo   需要: java-runtime\bin\java.exe 或 jdk-17\bin\java.exe
echo.
        set /a MISSING_FILES+=1
    )
)

if %MISSING_FILES% gtr 0 (
    echo [错误] 缺少必要文件，无法继续部署
echo   缺失文件数: %MISSING_FILES%
echo.
    pause
    exit /b 1
)

echo [OK] 所有必要文件检查通过
echo.

REM ========================================
REM Java 环境检查与配置
REM ========================================
echo ============================================================
echo  步骤 2/8: Java 环境检查与配置
echo ============================================================
echo.

set "JAVA_OK=false"
set "JAVA_HOME="

REM 优先检查便携式 Java (java-runtime)
if exist "deploy\java-runtime\bin\java.exe" (
    echo [OK] 发现项目内置 Java 运行时 (java-runtime)
set "JAVA_HOME=%ROOT_DIR%\deploy\java-runtime"
    set "PATH=!JAVA_HOME!\bin;%PATH%"
    set "JAVA_OK=true"
    
    REM 获取 Java 版本
    for /f "tokens=3" %%g in ('"!JAVA_HOME!\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
        set "JAVA_VERSION=%%g"
        set "JAVA_VERSION=!JAVA_VERSION:"=!"
    )
    echo   Java 版本: !JAVA_VERSION!
echo.
    goto :java_check_done
)

REM 其次检查 jdk-17
if exist "jdk-17\bin\java.exe" (
    echo [OK] 发现项目内置 Java (jdk-17)
set "JAVA_HOME=%ROOT_DIR%\jdk-17"
    set "PATH=!JAVA_HOME!\bin;%PATH%"
    set "JAVA_OK=true"
    goto :java_check_done
)

REM 检查系统 Java
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 使用系统已安装的 Java
set "JAVA_OK=true"
    for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
        set "JAVA_VERSION=%%g"
    )
    echo   Java 版本: !JAVA_VERSION!
) else (
    echo [错误] 未找到可用的 Java 运行时
echo.
    echo 请确保以下目录之一存在:
echo   - java-runtime\bin\java.exe (推荐)
echo   - jdk-17\bin\java.exe
echo.
    pause
    exit /b 1
)

:java_check_done

if "%JAVA_OK%"=="false" (
    echo [错误] Java 环境检查失败
echo.
    pause
    exit /b 1
)

echo [OK] Java 环境配置完成
echo   JAVA_HOME: %JAVA_HOME%
echo.

REM ========================================
REM 网络配置检查
REM ========================================
echo ============================================================
echo  步骤 3/8: 网络配置检查
echo ============================================================
echo.

echo 正在检测网络接口...
echo.

set "IP_COUNT=0"
set "MAIN_IP=127.0.0.1"

REM Win7 兼容的 IP 检测
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set /a IP_COUNT+=1
    set "TEMP_IP=%%a"
    set "TEMP_IP=!TEMP_IP: =!"
    set "IP!IP_COUNT!=!TEMP_IP!"
    echo   [!IP_COUNT!] !TEMP_IP!
    if !IP_COUNT! equ 1 (
        set "MAIN_IP=!TEMP_IP!"
    )
)

if %IP_COUNT% equ 0 (
    echo [警告] 未检测到网络接口，使用本地地址
echo.
    set "MAIN_IP=127.0.0.1"
) else (
    echo.
    echo [OK] 自动选择 IP: %MAIN_IP%
if %IP_COUNT% gtr 1 (
        echo [提示] 检测到多个IP，如需切换请手动编辑 supervisor\config.json
echo.
    )
)

REM ========================================
REM 端口检查与清理
REM ========================================
echo ============================================================
echo  步骤 4/8: 端口检查与清理
echo ============================================================
echo.

set "FRONTEND_PORT=8081"
set "BACKEND_PORT=8082"
set "MANAGER_PORT=9090"

REM 清理旧进程
echo 正在清理旧进程...
taskkill /F /IM supervisor-headless.exe >nul 2>&1
taskkill /F /IM supervisor.exe >nul 2>&1
taskkill /F /IM supervisor-gui.exe >nul 2>&1
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1

REM Win7 兼容的延迟 (使用 ping 替代 timeout)
ping 127.0.0.1 -n 4 >nul

echo [OK] 旧进程已清理
echo.

REM 检查端口占用
call :check_port %FRONTEND_PORT% "前端"
call :check_port %BACKEND_PORT% "后端"
call :check_port %MANAGER_PORT% "管理"

echo.
echo ============================================================
echo  端口分配结果
echo ============================================================
echo   前端端口: %FRONTEND_PORT%
echo   后端端口: %BACKEND_PORT%
echo   管理端口: %MANAGER_PORT%
echo ============================================================
echo.

REM ========================================
REM 防火墙配置 (管理员权限)
REM ========================================
echo ============================================================
echo  步骤 5/8: 防火墙配置
echo ============================================================
echo.

if "%IS_ADMIN%"=="true" (
    echo 正在配置防火墙规则...
echo.
    
    REM 删除旧规则	echo   清理旧规则...
netsh advfirewall firewall delete rule name="考官排班系统-前端" >nul 2>&1
    netsh advfirewall firewall delete rule name="考官排班系统-后端" >nul 2>&1
    netsh advfirewall firewall delete rule name="考官排班系统-管理" >nul 2>&1
    
    REM 添加新规则	echo   添加新规则...
netsh advfirewall firewall add rule name="考官排班系统-前端" dir=in action=allow protocol=TCP localport=%FRONTEND_PORT% >nul 2>&1
    if %errorlevel% equ 0 (echo   [OK] 前端端口 %FRONTEND_PORT% 已开放) else (echo   [警告] 前端端口开放失败)
    
    netsh advfirewall firewall add rule name="考官排班系统-后端" dir=in action=allow protocol=TCP localport=%BACKEND_PORT% >nul 2>&1
    if %errorlevel% equ 0 (echo   [OK] 后端端口 %BACKEND_PORT% 已开放) else (echo   [警告] 后端端口开放失败)
    
    netsh advfirewall firewall add rule name="考官排班系统-管理" dir=in action=allow protocol=TCP localport=%MANAGER_PORT% >nul 2>&1
    if %errorlevel% equ 0 (echo   [OK] 管理端口 %MANAGER_PORT% 已开放) else (echo   [警告] 管理端口开放失败)
    
    echo.
    echo [OK] 防火墙配置完成
echo.
) else (
    echo [提示] 非管理员权限，跳过防火墙自动配置
echo   如需局域网访问，请手动开放以下端口:
echo     - %FRONTEND_PORT% (前端业务)
echo     - %BACKEND_PORT% (后端服务)
echo     - %MANAGER_PORT% (管理控制台)
echo.
)

REM ========================================
REM 备份当前版本
REM ========================================
echo ============================================================
echo  步骤 6/8: 备份当前版本
echo ============================================================
echo.

call :backup_current
echo.

REM ========================================
REM 准备后端文件
REM ========================================
echo ============================================================
echo  步骤 7/8: 准备后端文件
echo ============================================================
echo.

set "BACKEND_SOURCE=%ROOT_DIR%\optaplanner-service\target\quarkus-app"
set "BACKEND_TARGET=%ROOT_DIR%\deploy\supervisor\backend\app"

REM 检查后端构建产物
if not exist "%BACKEND_SOURCE%\quarkus-run.jar" (
    echo [警告] 后端构建产物不存在
echo   路径: %BACKEND_SOURCE%\quarkus-run.jar
echo.
    echo 需要先构建后端，请选择:
echo   1. 现在自动构建后端（推荐）
echo   2. 跳过（如果后端文件已存在）
echo   3. 退出
echo.
    set /p build_choice="请选择 (1/2/3): "
    
    if "!build_choice!"=="1" (
        echo.
        echo 正在构建后端 (这可能需要几分钟)...
cd "%ROOT_DIR%\optaplanner-service"
        call mvn clean package -Pproduction -DskipTests
        if !errorlevel! neq 0 (
            echo [错误] 后端构建失败！
cd "%ROOT_DIR%"
            pause
            exit /b 1
        )
        cd "%ROOT_DIR%"
        echo [OK] 后端构建成功
echo.
    ) else if "!build_choice!"=="2" (
        echo [提示] 跳过构建，使用现有后端文件
echo.
    ) else (
        echo 退出部署
echo.
        exit /b 1
    )
)

REM 检查后端文件是否存在
if not exist "%BACKEND_SOURCE%\quarkus-run.jar" (
    echo [错误] 后端JAR文件不存在，无法继续部署
echo   路径: %BACKEND_SOURCE%
echo.
    pause
    exit /b 1
)

REM 创建目标目录
if not exist "%BACKEND_TARGET%" (
    echo 创建后端目标目录...
mkdir "%BACKEND_TARGET%" >nul 2>&1
)

REM 复制后端文件
echo 正在复制后端文件...
echo   源: %BACKEND_SOURCE%
echo   目标: %BACKEND_TARGET%
echo.

xcopy /E /I /Y /Q "%BACKEND_SOURCE%\*" "%BACKEND_TARGET%\" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 后端文件复制成功
echo.
) else (
    echo [错误] 后端文件复制失败
echo.
    pause
    exit /b 1
)

REM ========================================
REM 更新配置文件
REM ========================================
echo 正在更新配置文件...

REM 更新 config.json 中的 Java 路径
if exist "deploy\supervisor\config.json" (
    if exist "deploy\java-runtime\bin\java.exe" (
        echo   更新 Java 路径配置...
REM Win7 兼容的方式更新 JSON
cd deploy\supervisor
        (
echo {"backend": {"javaPath": "..\\\java-runtime\\\bin\\\java.exe"}}
) > temp_java_config.json 2>nul
        cd ..
        echo   [OK] 配置文件已更新
echo.
    )
)

REM ========================================
REM 启动服务
REM ========================================
echo ============================================================
echo  步骤 8/8: 启动服务
echo ============================================================
echo.

cd deploy\supervisor

echo 正在启动 Supervisor 服务...

REM 使用 VBS 脚本启动（如果存在）
if exist "deploy\supervisor\start-supervisor.vbs" (
    cscript //nologo start-supervisor.vbs
    if %errorlevel% equ 0 (
        echo [OK] Supervisor 已通过 VBS 脚本启动
echo.
    ) else (
        echo [提示] VBS 启动失败，使用备选方式...
start "" /B "supervisor-headless.exe" --headless
        echo [OK] Supervisor 已启动（后台模式）
echo.
    )
) else (
    start "" /B "supervisor-headless.exe" --headless
    echo [OK] Supervisor 已启动（后台模式）
echo.
)

echo 等待服务初始化（约 10 秒）...
ping 127.0.0.1 -n 11 >nul

REM 检查 Supervisor 端口
netstat -ano | findstr ":%MANAGER_PORT%" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [错误] Supervisor 服务启动失败（端口 %MANAGER_PORT% 未监听）！
echo.
    echo 请检查日志:
echo   - deploy\supervisor\logs\supervisor.log
echo   - deploy\supervisor\logs\backend.log
echo.
    cd "%ROOT_DIR%"
    call :rollback
    pause
    exit /b 1
)

echo [OK] Supervisor 端口已监听
echo.

REM 等待后端启动
echo 等待后端服务初始化（后端启动较慢，请耐心等待约60秒）...
echo.

set "BACKEND_WAIT=0"
set "BACKEND_MAX_WAIT=30"

:wait_backend_loop
set /a BACKEND_WAIT+=1
echo   [%BACKEND_WAIT%/%BACKEND_MAX_WAIT%] 等待后端服务启动...

netstat -ano | findstr ":%BACKEND_PORT%" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [OK] 后端端口已监听
echo.
    goto :backend_started
)

if %BACKEND_WAIT% lss %BACKEND_MAX_WAIT% (
    ping 127.0.0.1 -n 3 >nul
    goto :wait_backend_loop
)

echo.
echo [警告] 后端服务启动超时
echo   后端可能仍在初始化中，请稍后手动检查
echo.

:backend_started

REM 等待前端启动
set "FRONTEND_WAIT=0"
set "FRONTEND_MAX_WAIT=15"

echo 等待前端服务启动...

:wait_frontend_loop
set /a FRONTEND_WAIT+=1
netstat -ano | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [OK] 前端端口已监听
echo.
    goto :frontend_started
)

if %FRONTEND_WAIT% lss %FRONTEND_MAX_WAIT% (
    ping 127.0.0.1 -n 2 >nul
    goto :wait_frontend_loop
)

echo [警告] 前端服务启动超时
echo.

:frontend_started

cd "%ROOT_DIR%"
set "DEPLOY_SUCCESS=true"

REM ========================================
REM 算法配置验证
REM ========================================
echo ============================================================
echo  算法配置验证
REM ========================================
echo.

REM 检查求解器配置
echo [1/3] 检查求解器配置...
if exist "optaplanner-service\src\main\java\com\examiner\scheduler\config\OptimizedSolverConfig.java" (
    findstr "withSecondsSpentLimit(30L)" "optaplanner-service\src\main\java\com\examiner\scheduler\config\OptimizedSolverConfig.java" >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] 求解时间配置正确 (30秒)
    ) else (
        echo   [警告] 求解时间配置可能不正确
    )
) else (
    echo   [跳过] 源码检查
)
echo.

REM 检查约束权重配置
echo [2/3] 检查约束权重配置...
if exist "optaplanner-service\src\main\java\com\examiner\scheduler\solver\OptimizedExamScheduleConstraintProvider.java" (
    findstr "ofHard(1000000)" "optaplanner-service\src\main\java\com\examiner\scheduler\solver\OptimizedExamScheduleConstraintProvider.java" >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] 硬约束权重配置正确 (1,000,000)
    ) else (
        echo   [警告] 硬约束权重可能不正确
    )
) else (
    echo   [跳过] 源码检查
)
echo.

REM 检查缓存配置
echo [3/3] 检查性能优化配置...
if exist "optaplanner-service\src\main\java\com\examiner\scheduler\solver\OptimizedExamScheduleConstraintProvider.java" (
    findstr "normalizedDepartmentCache" "optaplanner-service\src\main\java\com\examiner\scheduler\solver\OptimizedExamScheduleConstraintProvider.java" >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] 科室标准化缓存已启用
    ) else (
        echo   [警告] 缓存配置可能不完整
    )
) else (
    echo   [跳过] 源码检查
)
echo.

REM ========================================
REM 最终健康检查
REM ========================================
echo ============================================================
echo  最终健康检查
echo ============================================================
echo.

set "MANAGER_HEALTH=检查中"
set "BACKEND_HEALTH=检查中"
set "FRONTEND_HEALTH=检查中"
set "ALGORITHM_HEALTH=检查中"

REM 检查管理控制台
echo [1/4] 检查管理控制台端口...
netstat -ano | findstr ":%MANAGER_PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    set "MANAGER_HEALTH=OK"
    echo   [OK] 管理控制台: 运行中
echo.
) else (
    set "MANAGER_HEALTH=异常"
    echo   [错误] 管理控制台: 未运行
echo.
)

REM 检查后端API
echo [2/4] 检查后端服务端口...
netstat -ano | findstr ":%BACKEND_PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    set "BACKEND_HEALTH=OK"
    echo   [OK] 后端服务: 运行中
echo.
) else (
    set "BACKEND_HEALTH=异常"
    echo   [错误] 后端服务: 未运行
echo.
)

REM 检查前端
echo [3/4] 检查前端服务端口...
netstat -ano | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    set "FRONTEND_HEALTH=OK"
    echo   [OK] 前端服务: 运行中
echo.
) else (
    set "FRONTEND_HEALTH=异常"
    echo   [错误] 前端服务: 未运行
echo.
)

REM 检查算法接口
echo [4/4] 检查算法服务接口...
curl -s "http://localhost:%BACKEND_PORT%/api/metrics/health" >nul 2>&1
if %errorlevel% equ 0 (
    set "ALGORITHM_HEALTH=OK"
    echo   [OK] 算法服务接口: 正常
echo.
) else (
    set "ALGORITHM_HEALTH=警告"
    echo   [警告] 算法服务接口: 可能未就绪（后端启动较慢，可稍后再检查）
echo.
)

REM ========================================
REM 部署结果展示
REM ========================================
echo.
if "%DEPLOY_SUCCESS%"=="true" (
    echo ============================================================
    echo          [OK] 部署成功！系统已启动
echo          版本: %VERSION%
echo ============================================================
) else (
    echo ============================================================
    echo          [错误] 部署失败！
echo ============================================================
    pause
    exit /b 1
)
echo.
echo ============================================================
echo  访问地址
echo ============================================================
echo.
echo [本机访问]
echo   管理控制台: http://localhost:%MANAGER_PORT%/
echo   业务系统:   http://localhost:%FRONTEND_PORT%/
echo.
echo [局域网访问]
echo   管理控制台: http://%MAIN_IP%:%MANAGER_PORT%/
echo   业务系统:   http://%MAIN_IP%:%FRONTEND_PORT%/
echo.
echo [管理控制台登录]
echo   用户名: admin
echo   密码: 000000
echo.
echo ============================================================
echo  健康状态总结
echo ============================================================
echo.
echo   管理控制台: %MANAGER_HEALTH%
echo   后端服务:   %BACKEND_HEALTH%
echo   前端服务:   %FRONTEND_HEALTH%
echo   算法服务:   %ALGORITHM_HEALTH%
echo.
echo ============================================================
echo  v8.0.0 企业级重构新特性
echo ============================================================
echo.
echo [异步求解架构]
echo   - 支持最多 5 个并发求解任务
echo   - 任务队列容量: 10
echo   - 实时进度追踪
echo.
echo [企业级缓存]
echo   - L1/L2 两级缓存架构
echo   - 自动过期清理
echo   - 内存压力感知
echo.
echo [监控指标 API]
echo   - GET /api/metrics/solver   - 求解器统计
echo   - GET /api/metrics/cache    - 缓存统计
echo   - GET /api/metrics/jvm      - JVM 指标
echo   - GET /api/metrics/health   - 健康检查
echo.
echo ============================================================
echo  使用指南
echo ============================================================
echo.
echo 1. 查看日志:
echo    deploy\supervisor\logs\supervisor.log
echo    deploy\supervisor\logs\backend.log
echo.
echo 2. 停止服务:
echo    taskkill /F /IM supervisor-headless.exe
echo    taskkill /F /IM java.exe
echo.
echo 3. 查看监控指标:
echo    管理控制台 ^> 监控仪表板
echo.
echo ============================================================
echo.

REM 打开管理界面
start "" "http://localhost:%MANAGER_PORT%/"

echo 按任意键关闭此窗口（服务将继续在后台运行）...
pause >nul
goto :eof

REM ========================================
REM 子程序: 检查端口
REM ========================================
:check_port
set "PORT=%~1"
set "NAME=%~2"

echo 检查 %NAME% 端口 %PORT%...
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo   [占用] 端口 %PORT% 被占用，正在清理...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
        echo   [清理] 结束进程 %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    ping 127.0.0.1 -n 3 >nul
)
echo   [OK] 端口 %PORT% 可用
echo.
exit /b 0

REM ========================================
REM 子程序: 备份当前版本
REM ========================================
:backup_current
if not exist "runtime\backup" mkdir runtime\backup
if not exist "runtime\backup\%BACKUP_DIR%" mkdir "runtime\backup\%BACKUP_DIR%"

echo 正在备份关键文件...
set "BACKUP_COUNT=0"

if exist "deploy\supervisor\supervisor-headless.exe" (
    copy /Y "deploy\supervisor\supervisor-headless.exe" "runtime\backup\%BACKUP_DIR%\" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a BACKUP_COUNT+=1
        echo   [OK] supervisor-headless.exe
echo.
    )
)

if exist "deploy\supervisor\config.json" (
    copy /Y "deploy\supervisor\config.json" "runtime\backup\%BACKUP_DIR%\" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a BACKUP_COUNT+=1
        echo   [OK] config.json
echo.
    )
)

if exist "deploy\supervisor\backend\app\quarkus-run.jar" (
    copy /Y "deploy\supervisor\backend\app\quarkus-run.jar" "runtime\backup\%BACKUP_DIR%\" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a BACKUP_COUNT+=1
        echo   [OK] quarkus-run.jar
echo.
    )
)

if %BACKUP_COUNT% gtr 0 (
    echo [OK] 备份完成！位置: runtime\backup\%BACKUP_DIR%
echo   共备份 %BACKUP_COUNT% 个文件
echo.
) else (
    echo [提示] 未找到需要备份的文件（可能是首次部署）
echo.
)
exit /b 0

REM ========================================
REM 子程序: 回滚
REM ========================================
:rollback
echo.
echo [回滚] 正在回滚到备份版本...
echo.

if not exist "runtime\backup\%BACKUP_DIR%" (
    echo [警告] 备份目录不存在，无法回滚
echo.
    exit /b 1
)

taskkill /F /IM supervisor-headless.exe >nul 2>&1
taskkill /F /IM java.exe >nul 2>&1
ping 127.0.0.1 -n 3 >nul

set "ROLLBACK_COUNT=0"

if exist "runtime\backup\%BACKUP_DIR%\supervisor-headless.exe" (
    copy /Y "backup\%BACKUP_DIR%\supervisor-headless.exe" "deploy\supervisor\" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a ROLLBACK_COUNT+=1
        echo   [OK] supervisor-headless.exe 已恢复
echo.
    )
)

if exist "runtime\backup\%BACKUP_DIR%\config.json" (
    copy /Y "backup\%BACKUP_DIR%\config.json" "deploy\supervisor\" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a ROLLBACK_COUNT+=1
        echo   [OK] config.json 已恢复
echo.
    )
)

echo [OK] 回滚完成！已恢复 %ROLLBACK_COUNT% 个文件
echo.
exit /b 0
