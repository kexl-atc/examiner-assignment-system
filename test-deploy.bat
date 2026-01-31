@echo off
chcp 65001 >nul 2>&1
if %errorlevel% neq 0 chcp 936 >nul
title 部署文件测试
color 0A

echo.
echo ============================================================
echo   部署文件路径测试
echo ============================================================
echo.

set "TEST_PASS=0"
set "TEST_FAIL=0"

echo [测试] 检查关键文件和目录...
echo.

REM 测试 1: 根目录入口脚本
if exist "deploy.bat" (
    echo   [PASS] deploy.bat
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] deploy.bat
    set /a TEST_FAIL+=1
)

if exist "start.bat" (
    echo   [PASS] start.bat
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] start.bat
    set /a TEST_FAIL+=1
)

if exist "stop.bat" (
    echo   [PASS] stop.bat
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] stop.bat
    set /a TEST_FAIL+=1
)

REM 测试 2: 部署脚本
if exist "deploy\scripts\deploy-win7.bat" (
    echo   [PASS] deploy\scripts\deploy-win7.bat
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] deploy\scripts\deploy-win7.bat
    set /a TEST_FAIL+=1
)

if exist "deploy\scripts\check-compatibility.bat" (
    echo   [PASS] deploy\scripts\check-compatibility.bat
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] deploy\scripts\check-compatibility.bat
    set /a TEST_FAIL+=1
)

if exist "deploy\scripts\build-package.bat" (
    echo   [PASS] deploy\scripts\build-package.bat
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] deploy\scripts\build-package.bat
    set /a TEST_FAIL+=1
)

if exist "deploy\scripts\manage.bat" (
    echo   [PASS] deploy\scripts\manage.bat
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] deploy\scripts\manage.bat
    set /a TEST_FAIL+=1
)

REM 测试 3: 核心程序文件
if exist "deploy\supervisor\supervisor-headless.exe" (
    echo   [PASS] deploy\supervisor\supervisor-headless.exe
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] deploy\supervisor\supervisor-headless.exe
    set /a TEST_FAIL+=1
)

if exist "config\supervisor\config.json" (
    echo   [PASS] config\supervisor\config.json
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] config\supervisor\config.json
    set /a TEST_FAIL+=1
)

REM 测试 4: Java 运行时
if exist "deploy\java-runtime\bin\java.exe" (
    echo   [PASS] deploy\java-runtime\bin\java.exe
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] deploy\java-runtime\bin\java.exe
    set /a TEST_FAIL+=1
)

REM 测试 5: 后端源码
if exist "optaplanner-service\pom.xml" (
    echo   [PASS] optaplanner-service\pom.xml
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] optaplanner-service\pom.xml
    set /a TEST_FAIL+=1
)

REM 测试 6: 前端源码
if exist "src\main.ts" (
    echo   [PASS] src\main.ts
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] src\main.ts
    set /a TEST_FAIL+=1
)

if exist "package.json" (
    echo   [PASS] package.json
    set /a TEST_PASS+=1
) else (
    echo   [FAIL] package.json
    set /a TEST_FAIL+=1
)

echo.
echo ============================================================
echo   测试结果
echo ============================================================
echo.
echo   通过: %TEST_PASS%
echo   失败: %TEST_FAIL%
echo.

if %TEST_FAIL% equ 0 (
    echo   [OK] 所有测试通过！部署文件完整。 -ForegroundColor Green
    exit /b 0
) else (
    echo   [WARN] 存在失败的测试，请检查上方输出。 -ForegroundColor Yellow
    exit /b 1
)
