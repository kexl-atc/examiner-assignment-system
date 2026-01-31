# 企业级重构升级指南

## 快速开始

### 一键升级脚本
```bash
#!/bin/bash
# upgrade.sh - 企业级重构升级脚本

echo "🚀 开始企业级重构升级..."

# 1. 备份当前版本
echo "📦 备份当前版本..."
git tag backup-$(date +%Y%m%d)
git push origin backup-$(date +%Y%m%d)

# 2. 拉取新代码
echo "⬇️  拉取重构代码..."
git fetch origin
git checkout v8.0.0

# 3. 安装依赖
echo "📥 安装依赖..."
cd optaplanner-service && mvn clean install -DskipTests
cd ../ && npm install

# 4. 数据库迁移
echo "🗄️  数据库迁移..."
cd optaplanner-service
mvn flyway:migrate

# 5. 启动服务
echo "▶️  启动服务..."
mvn quarkus:dev &
cd ../ && npm run dev

echo "✅ 升级完成！访问 http://localhost:5173"
```

## 详细升级步骤

### 步骤1: 环境准备

#### 系统要求
- JDK 17+
- Node.js 18+
- Maven 3.8+
- 内存: 最少4GB，推荐8GB

#### 备份数据
```bash
# 备份数据库
mysqldump -u root -p examiner_scheduler > backup_$(date +%Y%m%d).sql

# 备份配置文件
cp optaplanner-service/src/main/resources/application.properties \
   application.properties.backup

# Git标签备份
git tag v7.1.1-backup
git push origin v7.1.1-backup
```

### 步骤2: 代码更新

#### 方式A: 直接切换分支
```bash
git fetch origin
git checkout enterprise-refactor-v8
git pull origin enterprise-refactor-v8
```

#### 方式B: 合并到当前分支
```bash
git fetch origin
git merge origin/enterprise-refactor-v8
```

### 步骤3: 后端升级

#### 3.1 安装新依赖
```bash
cd optaplanner-service

# 安装Micrometer
mvn dependency:resolve

# 验证安装
mvn clean compile
```

#### 3.2 配置更新
编辑 `src/main/resources/application.properties`:

```properties
# 新增配置
# Micrometer监控
quarkus.micrometer.enabled=true
quarkus.micrometer.export.prometheus.enabled=true
quarkus.micrometer.export.prometheus.path=/metrics/prometheus

# 异步求解配置
examiner.solver.async.enabled=true
examiner.solver.async.pool-size=5
examiner.solver.async.queue-size=10

# 缓存配置
examiner.cache.l1.max-size=1000
examiner.cache.l2.enabled=true
examiner.cache.ttl-seconds=300

# 日志级别调整
quarkus.log.category."com.examiner.scheduler".level=INFO
quarkus.log.category."org.optaplanner".level=WARN
```

#### 3.3 数据库迁移
```bash
# Flyway会自动执行迁移脚本
mvn flyway:migrate

# 验证迁移
mvn flyway:info
```

### 步骤4: 前端升级

#### 4.1 安装依赖
```bash
npm install

# 安装新增依赖（如需要）
npm install @vueuse/core
```

#### 4.2 配置更新
编辑 `vite.config.mjs`:

```javascript
export default defineConfig({
  // 现有配置...
  
  server: {
    // 增加代理超时
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        timeout: 300000, // 5分钟，适应异步求解
      }
    }
  },
  
  build: {
    // 优化代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'solver-vendor': ['axios', 'dayjs'],
          'solver-core': ['./src/services/optaplanner-service'],
          'solver-ui': ['./src/components/performancemonitor']
        }
      }
    }
  }
})
```

### 步骤5: 功能验证

#### 5.1 启动后端
```bash
cd optaplanner-service
mvn quarkus:dev
```

#### 5.2 验证监控端点
```bash
# 健康检查
curl http://localhost:8080/api/metrics/health

# 求解器统计
curl http://localhost:8080/api/metrics/solver

# 缓存统计
curl http://localhost:8080/api/metrics/cache
```

#### 5.3 启动前端
```bash
npm run dev
```

#### 5.4 功能测试
1. 创建排班任务
2. 观察异步求解
3. 查看实时监控
4. 验证结果准确性

## 配置迁移

### 求解器配置迁移

**旧配置 (application.properties):**
```properties
# 旧配置 - 已废弃
optaplanner.solver.termination.time-limit=120
```

**新配置 (代码配置):**
```java
// 新配置 - EnterpriseSolverConfig
SolverConfig config = solverConfig.createConfig(
    studentCount, 
    EnterpriseSolverConfig.SolveMode.BALANCED
);
```

### 缓存配置迁移

**旧代码:**
```java
// 旧代码 - 静态Map
private static final Map<String, DutySchedule> dutyScheduleCache = 
    new ConcurrentHashMap<>();
```

**新代码:**
```java
// 新代码 - EnterpriseCacheManager
@Inject
EnterpriseCacheManager cacheManager;

DutySchedule schedule = cacheManager.getDutySchedule(date);
```

## 兼容性说明

### API兼容性

| API | 旧版本 | 新版本 | 兼容性 |
|-----|--------|--------|--------|
| POST /api/schedule/solve | 同步 | 异步 | ⚠️ 需适配 |
| GET /api/schedule/status | 无 | 新增 | ✅ 新增 |
| GET /api/metrics/* | 无 | 新增 | ✅ 新增 |

### 适配代码

**前端适配 - 异步求解:**
```typescript
// 旧代码 - 同步调用
const result = await optaPlannerService.generateSchedule(request)

// 新代码 - 异步调用
const taskId = await optaPlannerService.submitSolveRequest(request)
const result = await optaPlannerService.waitForResult(taskId, {
  onProgress: (progress) => {
    console.log(`进度: ${progress.percentage}%`)
  }
})
```

## 回滚方案

### 自动回滚脚本
```bash
#!/bin/bash
# rollback.sh - 自动回滚脚本

echo "⚠️  开始回滚..."

# 1. 停止服务
pkill -f quarkus
pkill -f node

# 2. 恢复代码
git checkout v7.1.1-backup

# 3. 恢复数据库
mysql -u root -p examiner_scheduler < backup_$(date +%Y%m%d).sql

# 4. 重启服务
cd optaplanner-service && mvn quarkus:dev &
cd ../ && npm run dev

echo "✅ 回滚完成"
```

### 手动回滚步骤
1. 停止所有服务
2. 恢复Git标签 `v7.1.1-backup`
3. 恢复数据库备份
4. 重启服务

## 故障排查

### 常见问题

#### Q1: 异步求解超时
```
Error: Solve request timeout
```
**解决:**
```properties
# 增加超时时间
quarkus.http.timeout=300s
```

#### Q2: 缓存内存溢出
```
OutOfMemoryError: Java heap space
```
**解决:**
```properties
# 减小缓存大小
examiner.cache.l1.max-size=500
examiner.cache.l2.enabled=false
```

#### Q3: 监控指标不显示
```
404 Not Found: /api/metrics
```
**解决:**
```bash
# 检查Micrometer配置
mvn dependency:tree | grep micrometer

# 确保依赖存在
```

### 日志查看
```bash
# 后端日志
tail -f optaplanner-service/target/quarkus.log

# 前端日志
npm run dev 2>&1 | tee frontend.log
```

## 性能调优

### JVM参数优化
```bash
# 生产环境推荐配置
JAVA_OPTS="-Xms1g -Xmx4g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UseStringDeduplication \
  -XX:+AlwaysPreTouch \
  -Djava.util.concurrent.ForkJoinPool.common.parallelism=8"
```

### 求解器调优
```java
// 根据硬件调整线程数
SolverConfig config = solverConfig.createConfig(
    studentCount,
    EnterpriseSolverConfig.SolveMode.ENTERPRISE  // 企业级模式
);
```

### 缓存调优
```properties
# 根据内存调整
examiner.cache.l1.max-size=2000
examiner.cache.l1.ttl-seconds=600
```

## 验证清单

### 功能验证
- [ ] 排班求解正常
- [ ] 异步进度显示
- [ ] 结果正确性
- [ ] 数据持久化

### 性能验证
- [ ] 求解时间符合预期
- [ ] 内存使用稳定
- [ ] 并发求解正常
- [ ] 缓存命中率>70%

### 监控验证
- [ ] 健康检查正常
- [ ] 指标数据完整
- [ ] 告警触发正常
- [ ] 日志格式正确

## 联系方式

如有问题，请联系：
- 技术支持: support@enterprise.com
- 文档反馈: docs@enterprise.com
- 紧急热线: 400-XXX-XXXX

---

**版本**: 8.0.0  
**更新日期**: 2025-01-30  
**维护团队**: Enterprise Architecture Team
