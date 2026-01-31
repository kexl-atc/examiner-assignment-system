# 企业级系统重构Skill

## 概述

本Skill用于指导企业级系统重构项目，确保重构过程可复用、可追踪、可维护。特别针对基于OptaPlanner的排班优化系统。

**版本**: 8.0.1  
**更新日期**: 2026-01-31  
**维护团队**: Enterprise Architecture Team

## 适用场景

- 遗留系统现代化改造
- 性能优化和架构升级
- 代码质量提升和技术债务清理
- 企业级稳定性保障

## 重构原则

### 1. 渐进式重构 (Strangler Fig Pattern)
- 逐步替换而非一次性重写
- 保持系统持续可用
- 每次迭代都有明确的价值交付

### 2. 可逆性原则
- 每个变更都可以回滚
- 保持数据兼容性
- 使用特性开关控制新功能

### 3. 度量驱动
- 重构前后性能对比
- 代码质量指标监控
- 业务指标追踪

## 出厂测试流程

### 测试检查清单

#### 后端测试
```bash
# 1. 编译测试
cd optaplanner-service
mvn clean compile

# 2. 单元测试
mvn test

# 3. 打包测试
mvn package -DskipTests
```

#### 前端测试
```bash
# 1. 依赖安装
npm install

# 2. 构建测试
npm run build

# 3. 类型检查
npx vue-tsc --noEmit
```

### 常见问题速查

| 问题 | 错误信息 | 解决方案 |
|------|----------|----------|
| 缺少Scheduler | 包io.quarkus.scheduler不存在 | 添加quarkus-scheduler依赖 |
| 缺少Micrometer | 包io.micrometer不存在 | 添加quarkus-micrometer依赖 |
| TerminationConfig | setTimeSpentLimit找不到 | 使用setSecondsSpentLimit |
| SolverMetric | MOVE_COUNT_PER_SECOND找不到 | 使用SOLVE_DURATION |
| MonitoringConfig | EnumSet转List失败 | 使用Arrays.asList |
| Solver类型转换 | Solver<Object>转Solver<T>失败 | 显式创建SolverFactory |

**详细排查指南**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 重构阶段

### 阶段1: 评估与规划 (1-2天)
- [ ] 系统现状分析
- [ ] 性能基线建立
- [ ] 技术债务清单
- [ ] 重构优先级排序
- [ ] 风险评估与缓解方案

### 阶段2: 基础设施升级 (2-3天)
- [ ] 依赖库升级
- [ ] 构建工具优化
- [ ] 测试框架完善
- [ ] CI/CD流水线建立

### 阶段3: 核心优化 (1-2周)
- [ ] 算法优化
- [ ] 数据访问层优化
- [ ] 缓存策略实施
- [ ] 并发处理改进

### 阶段4: 架构演进 (2-4周)
- [ ] 服务拆分
- [ ] API网关引入
- [ ] 事件驱动架构
- [ ] 监控体系完善

## OptaPlanner专项优化

### 求解器配置优化
```java
// 1. 启用多线程求解
solverConfig.withMoveThreadCount("AUTO");

// 2. 优化终止条件（注意方法名）
TerminationConfig termination = new TerminationConfig()
    .withSecondsSpentLimit(120L)  // 不是setTimeSpentLimit
    .withUnimprovedSecondsSpentLimit(30L);

// 3. 构造启发式优化
ConstructionHeuristicPhaseConfig ch = new ConstructionHeuristicPhaseConfig()
    .withConstructionHeuristicType(ConstructionHeuristicType.FIRST_FIT_DECREASING);
```

### 约束流优化
```java
// 1. 使用Joiners减少笛卡尔积
Joiners.equal(ExamAssignment::getExamDate)

// 2. 提前过滤减少计算量
.filter(assignment -> assignment.getExaminer1() != null)

// 3. 缓存高频计算结果
private static final Map<String, LocalDate> parsedDateCache = new ConcurrentHashMap<>();
```

### 约束调试与修复模式

#### HC6 连续日期约束修复案例
**问题**: 原代码检查 `isStudentOnDayShift` 而非实际日期连续性，导致非连续日期通过验证

**错误代码**:
```java
// ❌ 错误：检查的是白班而非日期连续性
.filter((a1, a2) -> a1.getStudent().isStudentOnDayShift(a1.getExamDate()))
```

**正确修复**:
```java
// ✅ 正确：解析日期并计算天数差
.filter((a1, a2) -> {
    // 只检查Day1/Day2配对
    if (!isDay1Day2Pair(a1, a2)) return false;
    
    // 解析日期
    LocalDate d1 = parseDate(a1.getExamDate());
    LocalDate d2 = parseDate(a2.getExamDate());
    if (d1 == null || d2 == null) return true; // 无效日期=违规
    
    // 检查是否连续（1天间隔）
    long daysBetween = ChronoUnit.DAYS.between(d1, d2);
    return daysBetween != 1; // 不连续=违规
})
```

#### 学生跳过问题修复
**问题**: `continue` 语句导致无法找到日期时学生被完全跳过

**修复模式**:
```java
// ❌ 修复前：直接跳过
if (examDates == null) {
    LOGGER.severe("无法安排");
    continue; // 学生被跳过！
}

// ✅ 修复后：回退策略
if (examDates == null) {
    LOGGER.warning("启用回退策略");
    examDates = findAnyConsecutiveDatePair(student, availableDates);
    if (examDates == null) {
        LOGGER.severe("完全无法安排");
        continue; // 只有完全无法时才跳过
    }
}
```

### 内存管理优化
```java
// 1. 使用对象池减少GC
@Poolable
public class ExamAssignment {
    // ...
}

// 2. 软引用缓存
private final SoftReference<Map<String, Object>> cache;

// 3. 定期清理
@Scheduled(every = "10m")
void clearExpiredCaches() {
    // 清理过期缓存
}
```

## 前端优化模式

### Vue 3性能优化
```typescript
// 1. 使用shallowRef减少响应式开销
const largeList = shallowRef([]);

// 2. 虚拟滚动
import { useVirtualList } from '@vueuse/core';
const { list, containerProps, wrapperProps } = useVirtualList(data, {
  itemHeight: 60
});

// 3. 组件懒加载
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
);
```

### 构建优化
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'solver-core': ['./src/solver/core'],
          'ui-components': ['./src/components/ui']
        }
      }
    }
  }
};
```

## 数据库优化

### 索引策略
```sql
-- 1. 复合索引
CREATE INDEX idx_assignment_date_examiner ON exam_assignment(exam_date, examiner_id);

-- 2. 部分索引
CREATE INDEX idx_active_teachers ON teachers(id) WHERE status = 'ACTIVE';

-- 3. 覆盖索引
CREATE INDEX idx_assignment_cover ON exam_assignment(student_id, exam_date, status) 
INCLUDE (examiner1_id, examiner2_id);
```

### 查询优化
```java
// 1. 批量查询替代N+1
@BatchSize(size = 50)
@OneToMany
private List<ExamAssignment> assignments;

// 2. 查询缓存
@QueryHint(name = "org.hibernate.cacheable", value = "true")
@Query("SELECT e FROM ExamAssignment e WHERE e.examDate = :date")
List<ExamAssignment> findByDate(@Param("date") String date);
```

## 算法精准性保证

### 约束完整性验证

#### 硬约束检查清单 (HC1-HC9)
| 约束 | 权重 | 验证方法 | 常见问题 |
|------|------|----------|----------|
| HC1 法定节假日 | 1,000,000 | HolidayConfig.isHoliday() | 日期格式错误 |
| HC2 考官1同科室 | 1,000,000 | normalizeDepartment() + isValidExaminer1Department() | 科室名称标准化不一致 |
| HC3 白班限制 | 1,000,000 | DutySchedule.isGroupOnDayShift() | 班组轮换计算错误 |
| HC4 考官冲突 | 1,000,000 | hasExaminerConflict() | ID比较使用Objects.equals() |
| HC6 连续日期 | 1,000,000 | ChronoUnit.DAYS.between() | 日期解析异常 |
| HC7 考官2不同科室 | 1,000,000 | !examiner1Dept.equals(examiner2Dept) | null检查缺失 |
| HC8 备份考官不同人 | 1,000,000 | !teacherId.equals(backupId) | ID为null |
| HC8b 备份不同科室 | 1,000,000 | !backupDept.equals(examiner1/2Dept) | 科室标准化不一致 |
| HC9 不可用期 | 1,000,000 | isUnavailableOnDate() | 日期区间边界 |

#### 关键Bug修复模式

**1. 约束权重一致性**
```java
// ❌ 错误：权重不一致导致约束被覆盖
private static final HardSoftScore HC_WEIGHT = HardSoftScore.ofHard(100000);
private static final HardSoftScore SC_WEIGHT = HardSoftScore.ofSoft(500);

// ✅ 正确：硬约束统一使用1,000,000，确保绝对优先
private static final HardSoftScore HC_WEIGHT = HardSoftScore.ofHard(1000000);
// 软约束总和 < 硬约束
```

**2. 科室名称标准化缓存**
```java
// 必须确保ExamScheduleService和ConstraintProvider使用相同的标准化逻辑
private String normalizeDepartment(String department) {
    return normalizedDepartmentCache.computeIfAbsent(department, d -> {
        // 统一标准：区域X室 -> X
        if (d.contains("一室") || d.contains("1室")) return "一";
        // ... 其他科室
        return d;
    });
}
```

**3. 初始解质量验证**
```java
// 初始解必须满足所有硬约束，否则求解器无法找到可行解
public boolean validateInitialSolution(ExamSchedule schedule) {
    for (ExamAssignment a : schedule.getExamAssignments()) {
        // HC2: 考官1同科室
        if (!isValidExaminer1Department(a.getStudent().getDepartment(), 
                                        a.getExaminer1().getDepartment())) {
            return false;
        }
        // HC6: 连续日期检查
        // ... 其他硬约束
    }
    return true;
}
```

**4. 求解时间配置**
```java
// ❌ 错误：时间过短导致解质量差
TerminationConfig termination = new TerminationConfig()
    .withSecondsSpentLimit(15L)  // 15秒太短
    .withUnimprovedSecondsSpentLimit(3L);

// ✅ 正确：平衡质量和速度
TerminationConfig termination = new TerminationConfig()
    .withSecondsSpentLimit(30L)  // 30秒足够收敛
    .withUnimprovedSecondsSpentLimit(5L);  // 5秒无改进
```

### 计算流验证

#### 初始解生成流程
```
1. 资源冲突分析
   └── analyzeStudentResourceProfiles()
   └── 计算每个学员的可选窗口
   └── 评估风险等级(CRITICAL/HIGH/MEDIUM/LOW)

2. 智能排序
   └── 2天考试学员优先
   └── 高风险学员优先
   └── 资源紧张科室优先

3. 日期分配
   └── findConsecutiveDatePairWithResourceCheck()
   └── 评估考官资源充足度
   └── 回退策略：findAnyConsecutiveDatePair()

4. 考官预分配
   └── intelligentPreAssignExaminersForSingleDay()
   └── 满足HC2/HC3/HC5/HC8b/HC9
   └── 考虑软约束优先级

5. 验证
   └── validateHC4Constraint()
   └── 确保无考官时间冲突
```

#### 约束执行顺序
```
硬约束 (按优先级):
1. HC6 连续日期 - 首先确保日期连续性
2. HC4 考官冲突 - 确保考官不重复
3. HC2 考官1同科室 - 核心业务规则
4. HC7 考官2不同科室 - 核心业务规则
5. HC3 白班限制 - 班组轮换规则
6. HC1 法定节假日 - 节假日规则
7. HC8/HC8b 备份考官 - 备份规则
8. HC9 不可用期 - 特殊限制

软约束 (按权重):
1. SC16 周末降级 (500)
2. SC10 工作量均衡 (400)
3. SC17 周末晚班优先 (300)
4. SC1 晚班优先 (150)
5. SC14 Day1/Day2互斥 (110)
6. SC2 考官2专业匹配 (100)
```

## 监控与可观测性

### 关键指标
- **求解时间**: 目标 < 60秒 (30学员)
- **内存使用**: 峰值 < 512MB
- **并发数**: 支持5个并发求解
- **API响应**: P95 < 200ms
- **硬约束违反**: 必须为0
- **软约束得分**: 越高越好 (正数)

### 日志规范
```java
// 结构化日志
logger.info("solver.metrics", Map.of(
    "studentCount", students.size(),
    "solveTimeMs", solveTime,
    "finalScore", score,
    "hardViolations", hardScore,
    "softViolations", softScore
));
```

## 重构检查清单

### 代码质量
- [ ] 圈复杂度 < 10
- [ ] 代码覆盖率 > 80%
- [ ] 无SonarQube严重问题
- [ ] 文档覆盖率 100%

### 性能
- [ ] 基准测试通过
- [ ] 压力测试通过
- [ ] 内存泄漏检测通过
- [ ] 并发测试通过

### 运维
- [ ] 健康检查端点
- [ ] 指标监控
- [ ] 日志聚合
- [ ] 告警规则

## 回滚策略

### 数据库回滚
```bash
# Flyway回滚
mvn flyway:undo -Dflyway.target=1.0.0
```

### 应用回滚
```bash
# 蓝绿部署切换
curl -X POST http://gateway/switch?version=stable
```

### 配置回滚
```bash
# 配置中心回滚
curl -X POST http://config-server/rollback/app/profile
```

## 知识沉淀

每次重构完成后，更新以下文档：
1. `docs/refactoring/CHANGELOG.md` - 变更日志
2. `docs/refactoring/LESSONS_LEARNED.md` - 经验教训
3. `docs/refactoring/PERFORMANCE_BASELINE.md` - 性能基线
4. `docs/refactoring/ARCHITECTURE_DECISIONS.md` - 架构决策记录

## 部署脚本规范

### Windows 7/10/11 兼容性要求

所有部署脚本必须遵循以下规范以确保跨版本Windows兼容：

#### 1. 编码规范
```batch
@echo off
setlocal enabledelayedexpansion
REM 使用基本ASCII字符，避免UTF-8特殊字符
```

#### 2. 延迟命令规范
```batch
REM ❌ 避免使用 timeout (Win7基础版可能不支持)
timeout /t 5 /nobreak >nul

REM ✅ 使用 ping 实现延迟 (全版本兼容)
ping 127.0.0.1 -n 6 >nul
```

#### 3. 文件名规范
```batch
REM ❌ 避免中文文件名 (英文版Win7可能乱码)
启动服务.bat
停止服务.bat

REM ✅ 使用英文文件名
start.bat
stop.bat
autostart-enable.bat
```

#### 4. 管理员权限检查
```batch
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Administrator privileges required!
    pause
    exit /b 1
)
```

#### 5. 路径处理
```batch
REM 使用 cd /d 处理含空格路径
cd /d "%~dp0"
```

### 标准脚本清单

| 脚本 | 用途 | 管理员权限 | 兼容性 |
|------|------|------------|--------|
| `start.bat` | 启动所有服务 | 否 | Win7/10/11 |
| `stop.bat` | 停止所有服务 | 否 | Win7/10/11 |
| `autostart-enable.bat` | 启用开机自启 | 是 | Win7/10/11 |
| `autostart-disable.bat` | 禁用开机自启 | 是 | Win7/10/11 |
| `start-silent.vbs` | 静默启动（无窗口） | 否 | Win7/10/11 |

### 部署包结构
```
deploy/win7-package/
├── start.bat              # 启动服务
├── stop.bat               # 停止服务
├── autostart-enable.bat   # 配置开机自启
├── autostart-disable.bat  # 取消开机自启
├── start-silent.vbs       # 静默启动脚本
├── SimpleHttpServer.java  # 前端HTTP服务器源码
├── supervisor/            # 应用目录
│   ├── backend/app/       # 后端JAR
│   └── frontend/          # 前端静态文件
├── java-runtime/          # JDK 17 (分发时不包含，需单独提供)
└── logs/                  # 日志目录
```

## 相关资源

- **故障排查**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **升级指南**: `docs/refactoring/UPGRADE_GUIDE.md`
- **变更日志**: `docs/refactoring/CHANGELOG.md`

## 相关工具

- **性能分析**: JProfiler, Async Profiler
- **代码质量**: SonarQube, SpotBugs
- **测试**: JUnit 5, TestContainers, Gatling
- **监控**: Micrometer, Prometheus, Grafana

---

**维护者**: Enterprise Architecture Team  
**版本**: 8.0.1  
**更新日期**: 2026-01-31
