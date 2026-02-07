# 部署文件快速参考卡

## 🚀 常用命令

```bash
# 1. 构建前端
npm run build:prod

# 2. 构建后端
cd optaplanner-service && mvn clean package -Pproduction -DskipTests

# 3. 构建完整部署包
# 方式 A: 通过向导
deploy.bat  → 选择 3

# 方式 B: 直接运行
deploy\scripts\build-package.bat

# 4. 部署到 Win7
deploy\scripts\deploy-win7.bat
```

---

## 📂 重要路径

| 用途 | 路径 |
|------|------|
| 部署包输出 | `deploy\win7-package\` |
| 后端源码 | `optaplanner-service\` |
| 后端构建产物 | `optaplanner-service\target\quarkus-app\` |
| 前端构建产物 | `dist\` |
| 前端部署位置 | `deploy\win7-package\supervisor\frontend\dist\` |
| 后端部署位置 | `deploy\win7-package\supervisor\backend\app\` |
| Java 运行时 | `deploy\java-runtime\` |

---

## 🔢 服务端点

| 服务 | 地址 |
|------|------|
| 前端页面 | http://127.0.0.1:8081 |
| 后端 API | http://127.0.0.1:8082 |
| 管理控制台 | http://127.0.0.1:9090 (admin/000000) |
| 健康检查 | http://127.0.0.1:8082/api/metrics/health |
| 求解器监控 | http://127.0.0.1:8082/api/metrics/solver |
| 缓存监控 | http://127.0.0.1:8082/api/metrics/cache |

---

## 🔄 版本更新步骤

```
1. 修改 package.json 版本号
   "version": "8.0.15" → "8.0.16"

2. 全局替换所有脚本中的版本号
   - deploy.bat
   - start.bat  
   - deploy\scripts\build-package.bat
   - deploy\scripts\deploy-win7.bat
   - deploy\win7-package\VERSION.txt

3. 更新 VERSION.txt 的更新内容

4. 重新构建部署包
   deploy\scripts\build-package.bat

5. 验证版本一致性
   (见下文 PowerShell 命令)
```

---

## 🛠️ PowerShell 验证命令

```powershell
# 检查所有版本号是否一致
$files = @(
    @{Path="package.json"; Pattern='"version": "([0-9.]+)"'},
    @{Path="deploy.bat"; Pattern='v([0-9.]+)'},
    @{Path="start.bat"; Pattern='v([0-9.]+)'},
    @{Path="deploy\scripts\build-package.bat"; Pattern='v([0-9.]+)'},
    @{Path="deploy\scripts\deploy-win7.bat"; Pattern='v([0-9.]+)'},
    @{Path="deploy\win7-package\VERSION.txt"; Pattern='v([0-9.]+)'}
)

foreach ($file in $files) {
    $content = Get-Content $file.Path -Raw
    if ($content -match $file.Pattern) {
        Write-Host "$($file.Path): $($matches[1])"
    }
}
```

---

## ⚠️ 故障排查

### 问题: 启动时找不到 Supervisor
```
# 检查文件是否存在
test-path "deploy\win7-package\supervisor\supervisor-headless.exe"

# 如果不存在，需要重新构建部署包
deploy\scripts\build-package.bat
```

### 问题: 端口被占用
```
# 检查端口占用
netstat -ano | findstr ":8081"
netstat -ano | findstr ":8082"
netstat -ano | findstr ":9090"

# 结束占用端口的进程
taskkill /F /PID <PID>
```

### 问题: 后端无法启动
```
# 检查 Java 是否存在
deploy\win7-package\java-runtime\bin\java.exe -version

# 检查后端 JAR 是否存在
test-path "deploy\win7-package\supervisor\backend\app\quarkus-run.jar"

# 查看后端日志
type deploy\win7-package\logs\backend.log
```

---

## 📞 联系与支持

- **文档**: `docs/DEPLOYMENT_LOGIC.md`
- **版本历史**: `deploy\win7-package\VERSION.txt`
- **日志位置**: `deploy\win7-package\logs\`

---

*最后更新: 2026-02-06 | 版本: 8.0.15*
