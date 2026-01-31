@echo off
chcp 65001 >nul 2>&1
REM 后端服务启动脚本 (Windows)
echo ========================================
echo 启动后端服务 (开发模式)
echo ========================================
echo.

REM 检查Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到Java，请先安装Java 17或更高版本
    pause
    exit /b 1
)

REM 确定使用哪个Maven命令
set MAVEN_CMD=
if exist "mvnw.cmd" (
    set MAVEN_CMD=mvnw.cmd
    echo [信息] 使用 Maven Wrapper
) else (
    REM 检查系统Maven
    mvn -version >nul 2>&1
    if %errorlevel% equ 0 (
        set MAVEN_CMD=mvn
        echo [信息] 使用系统 Maven
    ) else (
        echo [错误] 未找到 Maven
        echo [提示] 请安装 Maven 或确保项目包含 Maven Wrapper (mvnw.cmd)
        pause
        exit /b 1
    )
)

echo [信息] 正在启动后端服务...
echo [信息] 端口: 8082 (已与前端配置一致)
echo [信息] 模式: 开发 (热重载)
echo [信息] 命令: %MAVEN_CMD% quarkus:dev -DskipTests
echo.
echo 提示: 按 Ctrl+C 停止服务
echo ========================================
echo.

REM 启动服务（跳过测试以避免暂停）
call %MAVEN_CMD% quarkus:dev -DskipTests

pause

