#!/bin/bash
# 后端服务启动脚本 (Linux/Mac)

echo "========================================"
echo "启动后端服务 (开发模式)"
echo "========================================"
echo ""

# 检查Java
if ! command -v java &> /dev/null; then
    echo "[错误] 未找到Java，请先安装Java 17或更高版本"
    exit 1
fi

# 确定使用哪个Maven命令
MAVEN_CMD=""
if [ -f "mvnw" ]; then
    MAVEN_CMD="./mvnw"
    chmod +x mvnw
    echo "[信息] 使用 Maven Wrapper"
elif command -v mvn &> /dev/null; then
    MAVEN_CMD="mvn"
    echo "[信息] 使用系统 Maven"
else
    echo "[错误] 未找到 Maven"
    echo "[提示] 请安装 Maven 或确保项目包含 Maven Wrapper (mvnw)"
    exit 1
fi

echo "[信息] 正在启动后端服务..."
echo "[信息] 端口: 8082 (已与前端配置一致)"
echo "[信息] 模式: 开发 (热重载)"
echo "[信息] 命令: $MAVEN_CMD quarkus:dev -DskipTests"
echo ""
echo "提示: 按 Ctrl+C 停止服务"
echo "========================================"
echo ""

# 启动服务（跳过测试以避免暂停）
$MAVEN_CMD quarkus:dev -DskipTests

