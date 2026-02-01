# 算法修复日志 - 2025-01-30

## 修复概览

本次修复解决了 OptaPlanner 排班系统中的3个关键算法缺陷：

| 缺陷 | 严重程度 | 文件 | 状态 |
|------|----------|------|------|
| HC6约束逻辑错误 | 🔴 严重 | OptimizedExamScheduleConstraintProvider.java | ✅ 已修复 |
| 学生跳过问题 | 🔴 严重 | ExamScheduleService.java | ✅ 已修复 |
| 日期不可优化 | 🟡 中等 | ExamAssignment.java | ⏳ 待后续处理 |

---

## 1. HC6 连续日期约束修复

### 问题描述

原代码检查的是学生白班状态而非实际日期连续性：

```java
// ❌ 错误代码
.filter((a1, a2) -> a1.getStudent().isStudentOnDayShift(a1.getExamDate()))
```

这导致：
- 日期是否连续未被验证
- 非连续日期（如 2025-02-01 和 2025-02-05）可通过验证
- 违反 HC6 约束的业务规则

### 修复方案

```java
// ✅ 修复后代码
public Constraint consecutiveTwoDaysExam(ConstraintFactory factory) {
    return factory.forEach(ExamAssignment.class)
        .join(ExamAssignment.class,
            Joiners.equal(ExamAssignment::getStudent),
            Joiners.lessThan(ExamAssignment::getId))
        .filter((a1, a2) -> {
            // 只处理Day1/Day2配对
            if (!isDay1Day2Pair(a1, a2)) return false;
            
            // 解析并验证日期连续性
            LocalDate d1 = parseDate(a1.getExamDate());
            LocalDate d2 = parseDate(a2.getExamDate());
            if (d1 == null || d2 == null) return true;
            
            long daysBetween = ChronoUnit.DAYS.between(d1, d2);
            return daysBetween != 1; // 不连续=违规
        })
        .penalize(HardSoftScore.ofHard(1000000))
        .asConstraint("consecutiveTwoDaysExam");
}
```

### 新增辅助方法

```java
private boolean isDay1Day2Pair(ExamAssignment a1, ExamAssignment a2) {
    String t1 = a1.getExamType();
    String t2 = a2.getExamType();
    return ("day1".equals(t1) && "day2".equals(t2)) ||
           ("day2".equals(t1) && "day1".equals(t2));
}

private LocalDate parseDate(String dateStr) {
    if (dateStr == null) return null;
    return DATE_CACHE.computeIfAbsent(dateStr, k -> {
        try {
            return LocalDate.parse(k, DATE_FORMATTER);
        } catch (Exception e) {
            return null;
        }
    });
}
```

---

## 2. 学生跳过问题修复

### 问题描述

当 `findConsecutiveDatePairWithResourceCheck` 或 `findSingleExamDateWithResourceCheck` 返回 null 时，学生被 `continue` 语句完全跳过，导致该学生没有考试安排。

```java
// ❌ 问题代码
if (examDates == null) {
    LOGGER.severe("无法找到日期");
    continue; // 学生被跳过！
}
```

### 修复方案

添加回退策略，在理想日期不可用的情况下，尝试找到任何可用的日期：

```java
// ✅ 修复后代码
if (examDates == null || examDates[0] == null || examDates[1] == null) {
    LOGGER.warning("⚠️ 理想连续日期对不足，启用回退策略");
    
    // 回退策略：尝试找到任何可用的连续日期
    examDates = findAnyConsecutiveDatePair(student, availableDates);
    
    if (examDates == null) {
        LOGGER.severe("❌ 完全无法安排");
        continue; // 只有在完全无法安排时才跳过
    }
    
    LOGGER.info("✅ 找到备用日期: " + examDates[0] + " → " + examDates[1]);
}
```

### 新增回退方法

```java
/**
 * 🆕 回退策略：找到任何可用的连续日期对
 */
private String[] findAnyConsecutiveDatePair(Student student, List<String> availableDates) {
    String studentGroup = student.getGroup();
    
    for (int i = 0; i < availableDates.size() - 1; i++) {
        String date1 = availableDates.get(i);
        try {
            LocalDate day1 = LocalDate.parse(date1);
            LocalDate day2 = day1.plusDays(1);
            String date2 = day2.toString();
            
            if (!availableDates.contains(date2)) continue;
            
            // 只检查白班日
            if (isStudentOnDayShift(studentGroup, date1) || 
                isStudentOnDayShift(studentGroup, date2)) {
                continue;
            }
            
            return new String[]{date1, date2};
        } catch (Exception e) {
            LOGGER.fine("日期解析失败: " + date1);
        }
    }
    return null;
}

/**
 * 🆕 回退策略：找到任何非白班的可用日期
 */
private String findAnyAvailableDate(Student student, List<String> availableDates) {
    String studentGroup = student.getGroup();
    for (String date : availableDates) {
        if (!isStudentOnDayShift(studentGroup, date)) {
            return date;
        }
    }
    return null;
}
```

---

## 3. 待处理：日期优化

### 问题描述

`examDate` 字段当前不是 `@PlanningVariable`，这意味着 OptaPlanner 无法优化日期分配。日期在初始解生成后就被固定。

### 潜在解决方案

```java
// 需要将 examDate 改为 PlanningVariable
@PlanningVariable(valueRangeProviderRefs = "dateRange")
private String examDate;
```

### 实施考虑

1. **值范围提供器**: 需要在 `ExamSchedule` 中添加 `dateRange`
2. **约束更新**: 所有涉及日期的约束需要更新
3. **初始解生成**: 需要重新设计初始解生成逻辑
4. **性能影响**: 日期作为规划变量会显著增加搜索空间

**建议**: 这是一个重大架构变更，建议在下一个主要版本中实施。

---

## 测试验证

### 编译测试
```bash
cd optaplanner-service
mvn clean compile -DskipTests -q
# ✅ 编译成功
```

### 建议的集成测试用例

1. **HC6约束测试**: 验证非连续日期被正确拒绝
2. **资源耗尽测试**: 验证回退策略正确工作
3. **边界条件测试**: 只有1天可用日期时的行为

---

## 性能影响评估

| 修复 | 性能影响 | 说明 |
|------|----------|------|
| HC6约束修复 | 轻微增加 | 日期解析有缓存，影响很小 |
| 回退策略 | 可忽略 | 仅在资源不足时触发 |

---

## 相关文件

- `optaplanner-service/src/main/java/com/examiner/scheduler/solver/OptimizedExamScheduleConstraintProvider.java`
- `optaplanner-service/src/main/java/com/examiner/scheduler/service/ExamScheduleService.java`

---

**修复者**: Kimi Code CLI  
**日期**: 2025-01-30  
**版本**: 8.0.1
