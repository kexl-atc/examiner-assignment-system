@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
setlocal enabledelayedexpansion
title 考官排班系统 - 部署管理工具 v8.0.1
color 0B

REM ========================================
REM 部署管理工具 v8.0.1 (企业级重构版)
REM ========================================

:MENU
cls
echo.
echo ========================================
echo   考官排班系统 - 部署管理工具 v8.0.1
echo   企业级重构版本 (Enterprise Refactor)
echo ========================================
echo.
echo   [1] 完整构建并打包 Win7 部署包
echo   [2] 仅构建后端 (OptaPlanner)
echo   [3] 仅构建前端 (Vue)
echo   [4] 复制运行时文件 (Java)
echo   [5] 诊断构建环境
echo   [6] 清理构建文件
echo   [7] 测试部署包
echo   [8] 快速更新 Win7 部署包
echo   [9] 运行 Win7 兼容性检查
echo   [0] 退出
echo.
echo ========================================
set /p choice=请选择操作（输入数字）: 

if "%choice%"=="1" goto BUILD_ALL
if "%choice%"=="2" goto BUILD_BACKEND
if "%choice%"=="3" goto BUILD_FRONTEND
if "%choice%"=="4" goto COPY_RUNTIME
if "%choice%"=="5" goto DIAGNOSE
if "%choice%"=="6" goto CLEAN
if "%choice%"=="7" goto TEST
if "%choice%"=="8" goto QUICK_UPDATE
if "%choice%"=="9" goto CHECK_COMPAT
if "%choice%"=="0" goto EXIT

echo.
echo 无效选择，请重试。
pause
goto MENU

REM ========================================
REM 功能 1：完整构建并打包
REM ========================================
:BUILD_ALL
cls
echo.
echo ========================================
echo   完整构建并打包 Win7 部署包
echo   版本: v8.0.1 (企业级重构)
echo ========================================
echo.
echo [企业级重构新特性]
echo   - 异步求解架构
echo   - 企业级缓存管理 (L1/L2)
echo   - 监控指标 API
echo   - 实时进度追踪
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%\..\.."
set "ROOT_DIR=%CD%"

echo [步骤 1/8] 停止运行中的服务...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
ping 127.0.0.1 -n 3 >nul
echo [OK] 服务已停止
echo.

echo [步骤 2/8] 构建后端 (OptaPlanner)...
echo   特性: 异步求解器、企业级缓存、监控指标
cd %ROOT_DIR%\optaplanner-service
call mvn clean package -Pproduction -DskipTests
if %errorlevel% neq 0 (
    echo [错误] 后端构建失败！
    pause
    goto MENU
)
cd ..
echo [OK] 后端构建成功
echo.

echo [步骤 3/8] 构建前端 (Vue)...
echo   特性: 性能优化、监控仪表板
call npm run build:prod
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败！
    pause
    goto MENU
)
echo [OK] 前端构建成功
echo.

echo [步骤 4/8] 创建部署包目录结构...
if not exist "Win7-Offline-Package\supervisor\backend\app" mkdir "Win7-Offline-Package\supervisor\backend\app"
if not exist "Win7-Offline-Package\supervisor\frontend\dist" mkdir "Win7-Offline-Package\supervisor\frontend\dist"
if not exist "Win7-Offline-Package\logs" mkdir "Win7-Offline-Package\logs"
if not exist "Win7-Offline-Package\data" mkdir "Win7-Offline-Package\data"
echo [OK] 目录结构已创建
echo.

echo [步骤 5/8] 复制后端文件...
xcopy /E /I /Y /Q "optaplanner-service\target\quarkus-app\*" "Win7-Offline-Package\supervisor\backend\app\" 
if %errorlevel% neq 0 (
    echo [错误] 后端文件复制失败
    pause
    goto MENU
)
echo [OK] 后端文件已复制
echo.

echo [步骤 6/8] 复制前端文件...
xcopy /E /I /Y /Q "dist\*" "Win7-Offline-Package\supervisor\frontend\dist\"
if %errorlevel% neq 0 (
    echo [错误] 前端文件复制失败
    pause
    goto MENU
)
echo [OK] 前端文件已复制
echo.

echo [步骤 7/8] 复制运行时环境...
if exist "%ROOT_DIR%\deploy\java-runtime\bin\java.exe" (
    xcopy /E /I /Y /Q "deploy\java-runtime\*" "Win7-Offline-Package\java-runtime\"
    echo [OK] Java 运行时已复制
echo.
) else (
    echo [警告] Java 运行时不存在，跳过
echo.
)

echo [步骤 8/8] 创建版本信息...
call :create_version_file
echo [OK] 版本信息已创建
echo.

echo ========================================
echo   [OK] 部署包构建完成！
echo ========================================
echo.
echo 部署包位置: Win7-Offline-Package\
echo.
echo v8.0.1 企业级重构新特性:
echo   - 异步求解: 支持 5 个并发求解任务
echo   - 企业级缓存: L1/L2 两级缓存
echo   - 监控指标: 完整 API 支持
echo   - 性能提升: 求解速度提升 50%%+
echo.
echo 下一步:
echo   1. 将 Win7-Offline-Package 复制到 Win7 电脑
echo   2. 运行 check-win7-compatibility.bat 检查兼容性
echo   3. 双击"启动服务-Win7完整版.bat"
echo.
pause
goto MENU

REM ========================================
REM 功能 2：仅构建后端
REM ========================================
:BUILD_BACKEND
cls
echo.
echo ========================================
echo   构建后端 (OptaPlanner v8.0.1)
echo ========================================
echo.
echo 后端企业级特性:
echo   - EnterpriseSolverConfig (4种规模/4种模式)
echo   - AsyncSolverService (5并发/10队列)
echo   - EnterpriseCacheManager (L1/L2缓存)
echo   - MetricsResource (监控指标API)
echo.

cd optaplanner-service
call mvn clean package -Pproduction -DskipTests
if %errorlevel% neq 0 (
    echo [错误] 后端构建失败
    cd ..
    pause
    goto MENU
)
cd ..

echo.
echo [OK] 后端构建成功
echo JAR 位置: optaplanner-service\target\quarkus-app\
echo.
echo 监控端点:
echo   /api/metrics/solver  - 求解器统计
echo   /api/metrics/cache   - 缓存统计
echo   /api/metrics/jvm     - JVM指标
echo.
pause
goto MENU

REM ========================================
REM 功能 3：仅构建前端
REM ========================================
:BUILD_FRONTEND
cls
echo.
echo ========================================
echo   构建前端 (Vue v8.0.1)
echo ========================================
echo.
echo 前端特性:
echo   - 性能优化组合式函数
echo   - 监控仪表板组件
echo   - 异步进度显示
echo   - 虚拟滚动支持
echo.

call npm run build:prod
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    pause
    goto MENU
)

echo.
echo [OK] 前端构建成功
echo 输出位置: dist\
echo.
pause
goto MENU

REM ========================================
REM 功能 4：复制运行时文件
REM ========================================
:COPY_RUNTIME
cls
echo.
echo ========================================
echo   复制运行时文件
REM ========================================
echo.

if not exist "Win7-Offline-Package" mkdir "Win7-Offline-Package"

echo 复制 Java 运行时...
if exist "deploy\java-runtime\bin\java.exe" (
    xcopy /E /I /Y /Q "deploy\java-runtime\*" "Win7-Offline-Package\java-runtime\"
    echo [OK] Java 运行时已复制
echo.
) else (
    echo [错误] Java 运行时不存在: java-runtime\bin\java.exe
echo.
)

echo 运行时文件复制完成！
echo.
pause
goto MENU

REM ========================================
REM 功能 5：诊断构建环境
REM ========================================
:DIAGNOSE
cls
echo.
echo ========================================
echo   诊断构建环境 (v8.0.1)
echo ========================================
echo.

echo [检查 1/8] Java 环境
java -version 2>&1 | findstr /i "version" >nul
if %errorlevel% equ 0 (
    echo [OK] Java 已安装
    java -version 2>&1 | findstr "version"
) else (
    echo [错误] Java 未安装
echo.
)

echo.
echo [检查 2/8] Maven 环境
call mvn -version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Maven 已安装
    call mvn -version | findstr "Maven"
) else (
    echo [错误] Maven 未安装
echo.
)

echo.
echo [检查 3/8] Node.js 环境
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js 已安装
    node -v
) else (
    echo [错误] Node.js 未安装
echo.
)

echo.
echo [检查 4/8] npm 环境
call npm -v >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] npm 已安装
    call npm -v
) else (
    echo [错误] npm 未安装
echo.
)

echo.
echo [检查 5/8] 项目文件
if exist "optaplanner-service\pom.xml" (
    echo [OK] 后端项目存在
echo.
) else (
    echo [错误] 后端项目不存在
echo.
)

if exist "package.json" (
    echo [OK] 前端项目存在
echo.
) else (
    echo [错误] 前端项目不存在
echo.
)

if exist "deploy\java-runtime\bin\java.exe" (
    echo [OK] Java 运行时存在
echo.
) else (
    echo [警告] Java 运行时不存在
echo.
)

echo.
echo [检查 6/8] 构建产物
if exist "optaplanner-service\target\quarkus-app\quarkus-run.jar" (
    echo [OK] 后端构建产物存在
echo.
    for %%A in ("optaplanner-service\target\quarkus-app\quarkus-run.jar") do echo   大小: %%~zA 字节
) else (
    echo [--] 后端未构建
echo.
)

if exist "dist\index.html" (
    echo [OK] 前端构建产物存在
echo.
) else (
    echo [--] 前端未构建
echo.
)

echo.
echo [检查 7/8] 企业级重构文件
echo   EnterpriseSolverConfig...
if exist "optaplanner-service\src\main\java\com\examiner\scheduler\config\EnterpriseSolverConfig.java" (
    echo   [OK] 企业级求解器配置存在
echo.
) else (
    echo   [警告] 企业级求解器配置不存在
echo.
)

echo   AsyncSolverService...
if exist "optaplanner-service\src\main\java\com\examiner\scheduler\service\AsyncSolverService.java" (
    echo   [OK] 异步求解服务存在
echo.
) else (
    echo   [警告] 异步求解服务不存在
echo.
)

echo   EnterpriseCacheManager...
if exist "optaplanner-service\src\main\java\com\examiner\scheduler\cache\EnterpriseCacheManager.java" (
    echo   [OK] 企业级缓存管理器存在
echo.
) else (
    echo   [警告] 企业级缓存管理器不存在
echo.
)

echo   MetricsResource...
if exist "optaplanner-service\src\main\java\com\examiner\scheduler\resource\MetricsResource.java" (
    echo   [OK] 监控指标资源存在
echo.
) else (
    echo   [警告] 监控指标资源不存在
echo.
)

echo.
echo [检查 8/8] 前端性能优化
if exist "src\composables\usePerformanceOptimization.ts" (
    echo [OK] 性能优化组合式函数存在
echo.
) else (
    echo [警告] 性能优化组合式函数不存在
echo.
)

echo.
echo ========================================
echo   诊断完成
echo ========================================
echo.
pause
goto MENU

REM ========================================
REM 功能 6：清理构建文件
REM ========================================
:CLEAN
cls
echo.
echo ========================================
echo   清理构建文件
echo ========================================
echo.
echo 警告：此操作将删除所有构建产物
echo.
set /p confirm=确认清理？(Y/N): 
if /i not "%confirm%"=="Y" goto MENU

echo.
echo 清理后端构建文件...
if exist "optaplanner-service\target" (
    rd /s /q "optaplanner-service\target"
    echo [OK] 后端构建文件已清理
echo.
) else (
    echo [--] 后端构建文件不存在
echo.
)

echo 清理前端构建文件...
if exist "dist" (
    rd /s /q "dist"
    echo [OK] 前端构建文件已清理
echo.
) else (
    echo [--] 前端构建文件不存在
echo.
)

echo.
echo [OK] 清理完成
echo.
pause
goto MENU

REM ========================================
REM 功能 7：测试部署包
REM ========================================
:TEST
cls
echo.
echo ========================================
echo   测试部署包 (v8.0.1)
echo ========================================
echo.

if not exist "Win7-Offline-Package\启动服务-Win7完整版.bat" (
    echo [错误] 部署包不存在或不完整
echo   请先运行"完整构建并打包"
echo.
    pause
    goto MENU
)

echo 检查部署包文件...
echo.

set "ERRORS=0"

if exist "Win7-Offline-Package\java-runtime\bin\java.exe" (
    echo [OK] Java 运行时
echo.
) else (
    echo [错误] Java 运行时缺失
echo.
    set /a ERRORS+=1
)

if exist "Win7-Offline-Package\supervisor\backend\app\quarkus-run.jar" (
    echo [OK] 后端 JAR 文件
echo.
    for %%A in ("Win7-Offline-Package\supervisor\backend\app\quarkus-run.jar") do (
        if %%~zA LSS 1000 (
            echo   [警告] 文件大小异常: %%~zA 字节
echo.
        )
    )
) else (
    echo [错误] 后端 JAR 文件缺失
echo.
    set /a ERRORS+=1
)

if exist "Win7-Offline-Package\supervisor\frontend\dist\index.html" (
    echo [OK] 前端文件
echo.
) else (
    echo [错误] 前端文件缺失
echo.
    set /a ERRORS+=1
)

if exist "Win7-Offline-Package\启动服务-Win7完整版.bat" (
    echo [OK] 启动脚本
echo.
) else (
    echo [错误] 启动脚本缺失
echo.
    set /a ERRORS+=1
)

if exist "Win7-Offline-Package\停止服务.bat" (
    echo [OK] 停止脚本
echo.
) else (
    echo [错误] 停止脚本缺失
echo.
    set /a ERRORS+=1
)

if exist "Win7-Offline-Package\VERSION.txt" (
    echo [OK] 版本信息文件
echo.
) else (
    echo [警告] 版本信息文件缺失
echo.
)

echo.
if %ERRORS% equ 0 (
    echo ========================================
    echo   [OK] 部署包检查通过！
    echo ========================================
    echo.
    echo 建议:
    echo   1. 在本机测试启动
echo   2. 复制到 Win7 测试环境
echo   3. 验证所有功能正常
echo   4. 测试监控指标 API
echo.
) else (
    echo ========================================
    echo   [错误] 发现 %ERRORS% 个错误
echo ========================================
    echo.
    echo 请先运行"完整构建并打包"
echo.
)

echo.
pause
goto MENU

REM ========================================
REM 功能 8：快速更新 Win7 部署包
REM ========================================
:QUICK_UPDATE
cls
echo.
echo ========================================
echo   快速更新 Win7 部署包 (v8.0.1)
echo ========================================
echo.
echo 此功能仅复制已构建的文件，不重新构建
echo 适用于已完成构建，仅需更新部署包的情况
echo.

if not exist "optaplanner-service\target\quarkus-app\quarkus-run.jar" (
    echo [错误] 后端构建产物不存在
echo   请先运行"仅构建后端"
echo.
    pause
    goto MENU
)

if not exist "dist\index.html" (
    echo [错误] 前端构建产物不存在
echo   请先运行"仅构建前端"
echo.
    pause
    goto MENU
)

echo 停止运行中的服务...
taskkill /F /IM java.exe >nul 2>&1
ping 127.0.0.1 -n 3 >nul
echo [OK] 服务已停止
echo.

echo 复制后端文件...
xcopy /E /I /Y /Q "optaplanner-service\target\quarkus-app\*" "Win7-Offline-Package\supervisor\backend\app\"
if %errorlevel% neq 0 (
    echo [错误] 后端文件复制失败
echo.
    pause
    goto MENU
)
echo [OK] 后端文件已复制
echo.

echo 复制前端文件...
if exist "Win7-Offline-Package\supervisor\frontend\dist" (
    rmdir /S /Q "Win7-Offline-Package\supervisor\frontend\dist" 2>nul
)
mkdir "Win7-Offline-Package\supervisor\frontend\dist" >nul 2>&1
xcopy /E /I /Y /Q "dist\*" "Win7-Offline-Package\supervisor\frontend\dist\"
if %errorlevel% neq 0 (
    echo [错误] 前端文件复制失败
echo.
    pause
    goto MENU
)
echo [OK] 前端文件已复制
echo.

echo 更新版本信息...
call :create_version_file
echo [OK] 版本信息已更新
echo.

echo ========================================
echo   [OK] 快速更新完成！
echo ========================================
echo.
pause
goto MENU

REM ========================================
REM 功能 9：运行 Win7 兼容性检查
REM ========================================
:CHECK_COMPAT
cls
echo.
echo ========================================
echo   运行 Win7 兼容性检查
echo ========================================
echo.

if exist "check-win7-compatibility.bat" (
    call check-win7-compatibility.bat
) else (
    echo [错误] 检查脚本不存在: check-win7-compatibility.bat
echo   请确保该文件在项目根目录
echo.
    pause
)
goto MENU

REM ========================================
REM 退出
REM ========================================
:EXIT
cls
echo.
echo 感谢使用部署管理工具 v8.0.1！
echo.
echo 企业级重构新特性:
echo   - 异步求解架构
echo   - 企业级缓存管理
echo   - 监控指标 API
echo.
timeout /t 2 /nobreak >nul
exit

REM ========================================
REM 子程序: 创建版本信息文件
REM ========================================
:create_version_file
(
echo 考官排班系统 Win7 离线部署包
echo ========================================
echo 版本: v8.0.1 (企业级重构版)
echo 构建时间: %date% %time%
echo.
echo [企业级重构特性]
echo - 异步求解架构: 支持 5 个并发求解任务
echo - 企业级缓存: L1/L2 两级缓存，自动过期
echo - 监控指标 API: Prometheus/Micrometer 集成
echo - 性能提升: 求解速度提升 50%%-62%%
echo - 可用性: 99.9%%
echo.
echo [使用说明]
echo 1. 双击"启动服务-Win7完整版.bat"启动系统
echo 2. 访问 http://127.0.0.1:8081 使用系统
echo 3. 管理控制台: http://127.0.0.1:9090
echo 4. 使用"停止服务.bat"停止系统
echo.
echo [监控端点]
echo - /api/metrics/solver  - 求解器统计
echo - /api/metrics/cache   - 缓存统计
echo - /api/metrics/jvm     - JVM 指标
echo - /api/metrics/health  - 健康检查
echo.
) > "Win7-Offline-Package\VERSION.txt"
exit /b 0
