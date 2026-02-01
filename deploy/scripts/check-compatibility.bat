@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 考官排班系统 - Win7 兼容性检查工具 v8.0.1
color 0E

echo.
echo ============================================================
echo   考官排班系统 - Win7 兼容性检查工具
echo   版本: v8.0.1 (企业级重构版)
echo ============================================================
echo.
echo 本工具将检查您的系统是否满足部署需求
echo.
pause
echo.

REM ========================================
REM 初始化检查结果
REM ========================================
set "PASS_COUNT=0"
set "WARN_COUNT=0"
set "FAIL_COUNT=0"

REM ========================================
REM 1. 操作系统检测
REM ========================================
echo ============================================================
echo  [1/10] 操作系统检测
echo ============================================================
echo.

ver | findstr /i "5\.1" >nul 2>&1
if %errorlevel% equ 0 (
    set "OS_NAME=Windows XP"
    set "OS_SUPPORTED=false"
    set "OS_VERSION=5.1"
)

ver | findstr /i "6\.0" >nul 2>&1
if %errorlevel% equ 0 (
    set "OS_NAME=Windows Vista"
    set "OS_SUPPORTED=false"
    set "OS_VERSION=6.0"
)

ver | findstr /i "6\.1" >nul 2>&1
if %errorlevel% equ 0 (
    set "OS_NAME=Windows 7"
    set "OS_SUPPORTED=true"
    set "OS_VERSION=6.1"
)

ver | findstr /i "6\.2" >nul 2>&1
if %errorlevel% equ 0 (
    set "OS_NAME=Windows 8"
    set "OS_SUPPORTED=true"
    set "OS_VERSION=6.2"
)

ver | findstr /i "6\.3" >nul 2>&1
if %errorlevel% equ 0 (
    set "OS_NAME=Windows 8.1"
    set "OS_SUPPORTED=true"
    set "OS_VERSION=6.3"
)

ver | findstr /i "10\.0" >nul 2>&1
if %errorlevel% equ 0 (
    set "OS_NAME=Windows 10/11"
    set "OS_SUPPORTED=true"
    set "OS_VERSION=10.0"
)

if not defined OS_NAME (
    set "OS_NAME=未知系统"
    set "OS_SUPPORTED=unknown"
)

echo   检测到操作系统: %OS_NAME%
echo   版本号: %OS_VERSION%

if "%OS_SUPPORTED%"=="true" (
    if "%OS_NAME%"=="Windows 7" (
        echo   [通过] Windows 7 完全支持
echo   [提示] 请确保已安装 SP1 补丁包
echo.
        set /a PASS_COUNT+=1
    ) else (
        echo   [通过] 操作系统支持
echo.
        set /a PASS_COUNT+=1
    )
) else if "%OS_SUPPORTED%"=="false" (
    echo   [失败] 操作系统不受支持
echo   [说明] Windows XP 和 Vista 不支持 Java 17
echo.
    set /a FAIL_COUNT+=1
) else (
    echo   [警告] 无法识别操作系统版本
echo.
    set /a WARN_COUNT+=1
)

REM ========================================
REM 2. 系统架构检测
REM ========================================
echo ============================================================
echo  [2/10] 系统架构检测
echo ============================================================
echo.

if defined PROCESSOR_ARCHITEW6432 (
    set "ARCH=%PROCESSOR_ARCHITEW6432%"
) else (
    set "ARCH=%PROCESSOR_ARCHITECTURE%"
)

echo   处理器架构: %ARCH%

if /i "%ARCH%"=="AMD64" (
    echo   [通过] 64位系统，支持
echo.
    set /a PASS_COUNT+=1
) else if /i "%ARCH%"=="x86" (
    echo   [警告] 32位系统
echo   [说明] 32位系统可能限制内存使用，建议64位系统
echo.
    set /a WARN_COUNT+=1
) else (
    echo   [警告] 未知架构: %ARCH%
echo.
    set /a WARN_COUNT+=1
)

REM ========================================
REM 3. 内存检测
REM ========================================
echo ============================================================
echo  [3/10] 内存容量检测
echo ============================================================
echo.

REM 使用 WMIC 获取内存信息 (Win7兼容)
for /f "skip=1" %%a in ('wmic ComputerSystem get TotalPhysicalMemory 2^>nul') do (
    if not defined TOTAL_MEM set "TOTAL_MEM=%%a"
)

if defined TOTAL_MEM (
    REM 转换为MB (约)
    set /a "MEM_MB=!TOTAL_MEM:~0,-6!"
    if !MEM_MB! lss 1 set /a "MEM_MB=!TOTAL_MEM:~0,-3!/1024"
    
    echo   总物理内存: !MEM_MB! MB
    
    if !MEM_MB! geq 4096 (
        echo   [通过] 内存充足 (推荐 4GB+)
echo.
        set /a PASS_COUNT+=1
    ) else if !MEM_MB! geq 2048 (
        echo   [警告] 内存较低 (2GB)
echo   [说明] 系统可以运行，但建议 4GB 以上
echo   [建议] 关闭其他程序以释放内存
echo.
        set /a WARN_COUNT+=1
    ) else (
        echo   [失败] 内存不足 (!MEM_MB! MB)
echo   [说明] 最低要求 2GB，推荐 4GB
echo.
        set /a FAIL_COUNT+=1
    )
) else (
    echo   [警告] 无法检测内存容量
echo   [说明] 请手动确认内存 >= 4GB
echo.
    set /a WARN_COUNT+=1
)

REM ========================================
REM 4. 磁盘空间检测
REM ========================================
echo ============================================================
echo  [4/10] 磁盘空间检测
echo ============================================================
echo.

for /f "tokens=3" %%a in ('dir /-C "%~d0\" 2^>nul ^| findstr /C:"bytes free"') do (
    set "FREE_SPACE=%%a"
)

if defined FREE_SPACE (
    REM 去除逗号
    set "FREE_SPACE=!FREE_SPACE:,=!"
    REM 转换为MB
    set /a "FREE_MB=!FREE_SPACE:~0,-6!"
    if !FREE_MB! lss 1 set /a "FREE_MB=!FREE_SPACE:~0,-3!/1024"
    
    echo   可用磁盘空间: !FREE_MB! MB
    
    if !FREE_MB! geq 1000 (
        echo   [通过] 磁盘空间充足 (>= 1GB)
echo.
        set /a PASS_COUNT+=1
    ) else if !FREE_MB! geq 500 (
        echo   [警告] 磁盘空间较少 (!FREE_MB! MB)
echo   [说明] 建议至少 500MB 可用空间
echo.
        set /a WARN_COUNT+=1
    ) else (
        echo   [失败] 磁盘空间不足 (!FREE_MB! MB)
echo   [说明] 需要至少 500MB 可用空间
echo.
        set /a FAIL_COUNT+=1
    )
) else (
    echo   [警告] 无法检测磁盘空间
echo.
    set /a WARN_COUNT+=1
)

REM ========================================
REM 5. Java 运行环境检测
REM ========================================
echo ============================================================
echo  [5/10] Java 运行环境检测
echo ============================================================
echo.

set "JAVA_FOUND=false"
set "JAVA_VERSION_OK=false"

REM 检查项目内置 Java
if exist "deploy\java-runtime\bin\java.exe" (
    echo   [发现] 项目内置 Java (java-runtime)
for /f "tokens=3" %%g in ('"deploy\java-runtime\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
        set "JAVA_VER=%%g"
        set "JAVA_VER=!JAVA_VER:"=!"
    )
    echo   Java 版本: !JAVA_VER!
set "JAVA_FOUND=true"
    set "JAVA_VERSION_OK=true"
) else if exist "deploy\java-runtime\bin\java.exe" (
    echo   [发现] 项目内置 Java (jdk-17)
set "JAVA_FOUND=true"
    set "JAVA_VERSION_OK=true"
)

REM 检查系统 Java
if "%JAVA_FOUND%"=="false" (
    java -version >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
            set "JAVA_VER=%%g"
            set "JAVA_VER=!JAVA_VER:"=!"
        )
        echo   [发现] 系统 Java
echo   Java 版本: !JAVA_VER!
set "JAVA_FOUND=true"
        
        REM 检查版本是否为 17+
        echo !JAVA_VER! | findstr /C:"17" >nul 2>&1
        if !errorlevel! equ 0 set "JAVA_VERSION_OK=true"
        echo !JAVA_VER! | findstr /C:"21" >nul 2>&1
        if !errorlevel! equ 0 set "JAVA_VERSION_OK=true"
    )
)

if "%JAVA_FOUND%"=="true" (
    if "%JAVA_VERSION_OK%"=="true" (
        echo   [通过] Java 环境符合要求 (17+)
echo.
        set /a PASS_COUNT+=1
    ) else (
        echo   [警告] Java 版本可能不兼容
echo   [说明] 推荐使用 Java 17 LTS
echo.
        set /a WARN_COUNT+=1
    )
) else (
    echo   [失败] 未找到 Java 运行环境
echo   [说明] 需要 Java 17 (JDK 或项目内置 java-runtime)
echo.
    set /a FAIL_COUNT+=1
)

REM ========================================
REM 6. 网络配置检测
REM ========================================
echo ============================================================
echo  [6/10] 网络配置检测
echo ============================================================
echo.

echo   检测网络接口...
echo.

set "IP_FOUND=false"
set "IP_COUNT=0"

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set /a IP_COUNT+=1
    set "TEMP_IP=%%a"
    set "TEMP_IP=!TEMP_IP: =!"
    echo     [!IP_COUNT!] !TEMP_IP!
    set "IP_FOUND=true"
)

if "%IP_FOUND%"=="true" (
    echo   [通过] 检测到 %IP_COUNT% 个网络接口
echo.
    set /a PASS_COUNT+=1
) else (
    echo   [警告] 未检测到网络接口
echo   [说明] 将使用本地地址 127.0.0.1
echo.
    set /a WARN_COUNT+=1
)

REM ========================================
REM 7. 端口可用性检测
REM ========================================
echo ============================================================
echo  [7/10] 端口可用性检测
echo ============================================================
echo.

echo   检测端口: 8081 (前端), 8082 (后端), 9090 (管理)
echo.

set "PORTS_OK=true"

for %%p in (8081 8082 9090) do (
    netstat -ano | findstr ":%%p" | findstr "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [警告] 端口 %%p 已被占用
echo.
        set "PORTS_OK=false"
    ) else (
        echo   [通过] 端口 %%p 可用
echo.
    )
)

if "%PORTS_OK%"=="true" (
    set /a PASS_COUNT+=1
) else (
    echo   [提示] 部署时将自动清理占用端口的进程
echo.
    set /a WARN_COUNT+=1
)

REM ========================================
REM 8. 必需文件检测
REM ========================================
echo ============================================================
echo  [8/10] 必需文件检测
echo ============================================================
echo.

set "FILES_OK=true"

if exist "deploy\supervisor\supervisor-headless.exe" (
    echo   [通过] supervisor-headless.exe
echo.
) else (
    echo   [失败] supervisor-headless.exe 不存在
echo.
    set "FILES_OK=false"
)

if exist "deploy\supervisor\config.json" (
    echo   [通过] deploy\supervisor\config.json
echo.
) else (
    echo   [失败] deploy\supervisor\config.json 不存在
echo.
    set "FILES_OK=false"
)

if exist "optaplanner-service\target\quarkus-app\quarkus-run.jar" (
    echo   [通过] quarkus-run.jar (后端)
echo.
) else (
    echo   [警告] quarkus-run.jar 不存在 (需要构建)
echo.
    set /a WARN_COUNT+=1
)

if "%FILES_OK%"=="true" (
    set /a PASS_COUNT+=1
) else (
    set /a FAIL_COUNT+=1
)

REM ========================================
REM 9. 系统权限检测
REM ========================================
echo ============================================================
echo  [9/10] 系统权限检测
echo ============================================================
echo.

net session >nul 2>&1
if %errorlevel% equ 0 (
    echo   [通过] 已获取管理员权限
echo   [说明] 可以自动配置防火墙
echo.
    set /a PASS_COUNT+=1
    set "IS_ADMIN=true"
) else (
    echo   [警告] 非管理员权限运行
echo   [说明] 建议以管理员身份运行以便自动配置防火墙
echo   [说明] 非管理员权限下需手动开放端口 8081, 8082, 9090
echo.
    set /a WARN_COUNT+=1
    set "IS_ADMIN=false"
)

REM ========================================
REM 10. 防火墙状态检测
REM ========================================
echo ============================================================
echo  [10/10] 防火墙状态检测
echo ============================================================
echo.

netsh advfirewall show currentprofile ^| findstr "State" ^| findstr "ON" >nul 2>&1
if %errorlevel% equ 0 (
    echo   [信息] Windows 防火墙已启用
echo.
    if "%IS_ADMIN%"=="true" (
        echo   [通过] 管理员权限可自动配置规则
echo.
        set /a PASS_COUNT+=1
    ) else (
        echo   [警告] 需手动配置防火墙规则
echo.
        set /a WARN_COUNT+=1
    )
) else (
    echo   [信息] Windows 防火墙未启用
echo   [说明] 端口访问不受限制，但建议启用防火墙
echo.
    set /a PASS_COUNT+=1
)

REM ========================================
REM 总结报告
REM ========================================
echo.
echo ============================================================
echo   兼容性检查报告
echo ============================================================
echo.
echo   操作系统: %OS_NAME%
echo   检查时间: %date% %time%
echo.
echo   通过:   %PASS_COUNT% 项
echo   警告:   %WARN_COUNT% 项  
echo   失败:   %FAIL_COUNT% 项
echo.

if %FAIL_COUNT% equ 0 (
    if %WARN_COUNT% equ 0 (
        echo ============================================================
        echo   [通过] 所有检查项均通过！
echo   系统完全兼容，可以部署
echo ============================================================
echo.
        echo 建议操作:
echo   1. 双击运行 智能部署.bat 或 deploy-win7-v8.bat
echo   2. 等待部署完成
echo   3. 访问 http://localhost:9090 进入管理控制台
echo.
    ) else (
        echo ============================================================
        echo   [警告] 检查通过，但存在 %WARN_COUNT% 个警告
echo   系统可以部署，但建议处理警告项
echo ============================================================
echo.
        echo 建议操作:
echo   1. 根据警告提示优化系统配置
echo   2. 关闭不必要的程序以释放内存
echo   3. 考虑使用管理员权限运行部署脚本
echo   4. 运行 智能部署.bat 进行部署
echo.
    )
) else (
    echo ============================================================
    echo   [失败] 存在 %FAIL_COUNT% 个关键问题
echo   请解决以下问题后再部署
echo ============================================================
echo.
    echo 常见问题解决:
echo.
    if "%OS_SUPPORTED%"=="false" (
        echo [操作系统不兼容]
echo   - 当前系统: %OS_NAME%
echo   - 系统要求: Windows 7 SP1 或更高版本
echo   - 解决方案: 升级操作系统或使用兼容的电脑
echo.
    )
    
    echo [Java 未找到]
echo   - 下载 JDK 17 便携版
echo   - 解压到项目目录，命名为 java-runtime
echo   - 重新运行检查
echo.
    
    echo [内存不足]
echo   - 关闭其他程序
echo   - 增加虚拟内存
echo   - 升级物理内存到 4GB
echo.
    
    echo [磁盘空间不足]
echo   - 清理磁盘空间
echo   - 确保有 500MB 以上可用空间
echo.
)

echo.
echo ============================================================
echo   v8.0.1 企业级重构系统要求
echo ============================================================
echo.
echo 最低配置:
echo   - 操作系统: Windows 7 SP1 (64位)
echo   - 内存: 2GB
echo   - 磁盘: 500MB 可用空间
echo   - Java: JDK 17
echo.
echo 推荐配置:
echo   - 操作系统: Windows 10/11 (64位)
echo   - 内存: 4GB 或以上
echo   - 磁盘: 1GB 可用空间
echo   - Java: JDK 17 LTS
echo.
echo ============================================================
echo.

pause
exit /b %FAIL_COUNT%

REM ========================================
REM 子程序: 检查端口
REM ========================================
:check_port
set "CHECK_PORT=%~1"
netstat -ano | findstr ":%CHECK_PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 1
) else (
    exit /b 0
)
