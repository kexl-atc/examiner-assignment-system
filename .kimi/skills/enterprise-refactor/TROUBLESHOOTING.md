# 企业级重构 - 故障排查与测试指南

## 测试检查清单

### 后端编译测试
```bash
cd optaplanner-service
mvn clean compile
```

### 后端单元测试
```bash
cd optaplanner-service
mvn test
```

### 前端构建测试
```bash
npm run build
```

## 常见问题及解决方案

### 问题1: 缺少Quarkus Scheduler依赖

**错误信息：**
```
[ERROR] 包io.quarkus.scheduler不存在
[ERROR] 找不到符号: 类 Scheduled
```

**解决方案：**
在 `pom.xml` 中添加依赖：
```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-scheduler</artifactId>
</dependency>
```

**经验教训：**
- 使用 `@Scheduled` 注解前必须添加对应依赖
- 定期检查依赖完整性

---

### 问题2: 缺少Micrometer依赖

**错误信息：**
```
[ERROR] 包io.micrometer不存在
[ERROR] 找不到符号: 类 MeterRegistry
```

**解决方案：**
在 `pom.xml` 中添加依赖：
```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-micrometer</artifactId>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-micrometer-registry-prometheus</artifactId>
</dependency>
```

---

### 问题3: TerminationConfig方法名不匹配

**错误信息：**
```
[ERROR] 找不到符号: 方法 setTimeSpentLimit(Duration)
[ERROR] 找不到符号: 方法 setUnimprovedTimeSpentLimit(Duration)
```

**解决方案：**
使用正确的方法名：
```java
// 错误
termination.setTimeSpentLimit(timeLimit);
termination.setUnimprovedTimeSpentLimit(unimprovedLimit);

// 正确
termination.setSecondsSpentLimit(timeLimit.getSeconds());
termination.setUnimprovedSecondsSpentLimit(unimprovedLimit.getSeconds());
```

**经验教训：**
- OptaPlanner 8.x 使用 `setSecondsSpentLimit` 而非 `setTimeSpentLimit`
- 参数类型为 `long` 秒数，而非 `Duration` 对象

---

### 问题4: SolverMetric枚举不存在

**错误信息：**
```
[ERROR] 找不到符号: 变量 MOVE_COUNT_PER_SECOND
```

**解决方案：**
使用正确的枚举值：
```java
// 错误
SolverMetric.MOVE_COUNT_PER_SECOND

// 正确
SolverMetric.SOLVE_DURATION
```

**可用的SolverMetric枚举值：**
- `SOLVE_DURATION` - 求解持续时间
- `SCORE_CALCULATION_COUNT` - 得分计算次数
- `BEST_SCORE` - 最佳得分
- `STEP_SCORE` - 步骤得分
- `CONSTRAINT_MATCH_TOTAL_BEST_SCORE` - 约束匹配总计最佳得分
- `CONSTRAINT_MATCH_TOTAL_STEP_SCORE` - 约束匹配总计步骤得分

---

### 问题5: MonitoringConfig参数类型错误

**错误信息：**
```
[ERROR] 不兼容的类型: EnumSet无法转换为List
```

**解决方案：**
使用 `List` 而非 `EnumSet`：
```java
// 错误
monitoring.setSolverMetricList(EnumSet.of(...));

// 正确
monitoring.setSolverMetricList(Arrays.asList(...));
```

---

### 问题6: SolverFactory类型转换问题

**错误信息：**
```
[ERROR] 不兼容的类型: Solver<Object>无法转换为Solver<ExamSchedule>
```

**解决方案：**
显式创建SolverFactory：
```java
// 错误
Solver<ExamSchedule> solver = (Solver<ExamSchedule>) SolverFactory
    .create(config)
    .buildSolver();

// 正确
SolverFactory<ExamSchedule> solverFactory = SolverFactory.create(config);
Solver<ExamSchedule> solver = solverFactory.buildSolver();
```

---

### 问题7: 方法名冲突

**错误信息：**
```
[ERROR] 已在类中定义了方法 getSolverMetrics()
```

**解决方案：**
重命名私有方法以避免与公共方法冲突：
```java
// 公共方法
@GET
@Path("/solver")
public Response getSolverMetrics() { ... }

// 私有方法
private Map<String, Object> buildSolverMetrics() { ... }
```

---

### 问题8: 未使用的import导致IDE误报

**错误信息（IDE中）:**
```
The import com.examiner.scheduler.rest.ScheduleResponse cannot be resolved
```

**实际情况:**
这是IDE的误报，实际编译可能成功。原因：
1. 导入的类存在但未在代码中使用
2. IDE的索引需要刷新

**解决方案:**
1. 删除未使用的import：
```java
// 删除这行（如果未使用）
import com.examiner.scheduler.rest.ScheduleResponse;
```

2. 或者清理IDE缓存：
- VS Code: `Ctrl+Shift+P` → `Java: Clean Workspace`
- IntelliJ: `File` → `Invalidate Caches`

**经验教训:**
- 定期清理未使用的import
- 以Maven编译结果为准，不完全依赖IDE提示

---

### 问题9: 误删必要的import

**错误信息:**
```
[ERROR] 找不到符号: 类 Uni
[ERROR] 位置: 类 AsyncSolverService
```

**发生场景:**
在清理未使用import时，误删了实际使用的类。

**解决方案:**
使用IDE的"Optimize Imports"功能时要小心，建议：
1. 先检查哪些import真正被使用
2. 使用 `grep` 或IDE查找确认：
```bash
grep -n "Uni" AsyncSolverService.java
```

3. 重新添加必要的import：
```java
import io.smallrye.mutiny.Uni;
```

**经验教训:**
- 清理import前先编译一次确认无误
- 保留Reactive类型（Uni, Multi等）的import

---

### 问题10: BestSolutionChangedEvent过时方法

**警告信息：**
```
[WARNING] isEveryProblemFactChangeProcessed() 已过时
```

**解决方案：**
移除过时方法调用：
```java
// 旧代码
solver.addEventListener(event -> {
    if (event.isEveryProblemFactChangeProcessed()) {
        // 处理逻辑
    }
});

// 新代码
solver.addEventListener(event -> {
    // 直接处理，无需检查
    task.updateProgress(...);
});
```

---

## 版本兼容性矩阵

| 组件 | 版本 | 注意事项 |
|------|------|----------|
| OptaPlanner | 8.38.0 | 使用 `setSecondsSpentLimit` |
| Quarkus | 2.16.12 | 需要显式添加scheduler依赖 |
| JDK | 17 | 使用新特性如Records |
| Vue | 3.4.0 | 使用组合式API |

## 测试脚本

### 完整测试脚本
```bash
#!/bin/bash
# test.sh - 出厂测试脚本

echo "🧪 开始出厂测试..."

# 1. 后端编译测试
echo "📦 后端编译测试..."
cd optaplanner-service
mvn clean compile > /tmp/compile.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 后端编译通过"
else
    echo "❌ 后端编译失败"
    cat /tmp/compile.log
    exit 1
fi

# 2. 后端单元测试
echo "🧪 后端单元测试..."
mvn test > /tmp/test.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 后端测试通过"
else
    echo "❌ 后端测试失败"
    cat /tmp/test.log
    exit 1
fi

# 3. 前端构建测试
echo "🎨 前端构建测试..."
cd ../
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 前端构建通过"
else
    echo "❌ 前端构建失败"
    cat /tmp/build.log
    exit 1
fi

echo "🎉 所有测试通过！"
```

## 性能测试

### 基准测试
```bash
# 安装Gatling
cd optaplanner-service
mvn gatling:test
```

### 压力测试场景
1. **并发求解测试** - 同时提交5个求解请求
2. **大容量测试** - 100学员求解
3. **长时间运行** - 持续运行8小时

## 监控验证

### 验证监控端点
```bash
# 健康检查
curl http://localhost:8080/api/metrics/health

# 求解器统计
curl http://localhost:8080/api/metrics/solver

# 缓存统计
curl http://localhost:8080/api/metrics/cache

# Prometheus指标
curl http://localhost:8080/metrics/prometheus
```

### 预期输出
```json
{
  "overall": true,
  "memory": {
    "status": "UP",
    "usage": "45.2%"
  },
  "threadPool": {
    "status": "UP",
    "queuedTasks": 0
  }
}
```

## 回滚检查

### 回滚前检查
- [ ] 数据库已备份
- [ ] Git标签已创建
- [ ] 配置文件已备份

### 回滚后验证
- [ ] 服务启动正常
- [ ] 基本功能正常
- [ ] 数据完整性验证

## 持续集成配置

### GitHub Actions示例
```yaml
name: Enterprise Refactor CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Backend Compile
        run: |
          cd optaplanner-service
          mvn clean compile
      
      - name: Backend Test
        run: |
          cd optaplanner-service
          mvn test
      
      - name: Frontend Build
        run: |
          npm install
          npm run build
```

---

**最后更新**: 2025-01-30  
**维护者**: Enterprise Architecture Team
