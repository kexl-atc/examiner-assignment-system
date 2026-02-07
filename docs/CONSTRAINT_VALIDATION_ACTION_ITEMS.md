# 约束验证修复 - 执行清单

## 🚨 立即行动项（今天完成）

### 1. 添加HC1验证（法定节假日）

**文件**：`ExamScheduleService.java`

**在`buildScheduleResponse`方法中添加**：

```java
// 在 HC2 验证之后添加

// ✅ HC1验证：法定节假日不能安排考试
int hc1ViolationCount = 0;
for (ExamAssignment assignment : assignments) {
    if (assignment.getExamDate() != null) {
        try {
            LocalDate date = LocalDate.parse(assignment.getExamDate());
            if (holidayConfig.isHoliday(date)) {
                hc1ViolationCount++;
                LOGGER.severe("🚨 [HC1违反] 节假日安排了考试: " + 
                    assignment.getExamDate() + " 学员: " + 
                    (assignment.getStudent() != null ? assignment.getStudent().getName() : "未知"));
            }
        } catch (Exception e) {
            LOGGER.warning("⚠️ [HC1验证] 日期解析失败: " + assignment.getExamDate());
        }
    }
}
if (hc1ViolationCount > 0) {
    LOGGER.severe("🚨🚨🚨 [HC1验证失败] 发现 " + hc1ViolationCount + " 个节假日排班！");
}
```

---

### 2. 添加HC9验证（考官不可用期）

**文件**：`ExamScheduleService.java`

**在`buildScheduleResponse`方法中添加**：

```java
// ✅ HC9验证：考官不可用期不能安排考试
int hc9ViolationCount = 0;
for (ExamAssignment assignment : assignments) {
    String examDate = assignment.getExamDate();
    if (examDate == null) continue;
    
    // 检查考官1
    if (assignment.getExaminer1() != null && 
        assignment.getExaminer1().isUnavailableOnDate(examDate, holidayConfig)) {
        hc9ViolationCount++;
        LOGGER.severe("🚨 [HC9违反] 考官1 " + assignment.getExaminer1().getName() + 
            " 在不可用期被安排考试: " + examDate);
    }
    
    // 检查考官2
    if (assignment.getExaminer2() != null && 
        assignment.getExaminer2().isUnavailableOnDate(examDate, holidayConfig)) {
        hc9ViolationCount++;
        LOGGER.severe("🚨 [HC9违反] 考官2 " + assignment.getExaminer2().getName() + 
            " 在不可用期被安排考试: " + examDate);
    }
    
    // 检查备份考官
    if (assignment.getBackupExaminer() != null && 
        assignment.getBackupExaminer().isUnavailableOnDate(examDate, holidayConfig)) {
        hc9ViolationCount++;
        LOGGER.severe("🚨 [HC9违反] 备份考官 " + assignment.getBackupExaminer().getName() + 
            " 在不可用期被安排考试: " + examDate);
    }
}
if (hc9ViolationCount > 0) {
    LOGGER.severe("🚨🚨🚨 [HC9验证失败] 发现 " + hc9ViolationCount + " 个不可用期排班！");
}
```

---

## 📋 本周完成项

### 3. 添加HC3验证（白班考官）

```java
// ✅ HC3验证：考官执勤白班不能安排考试
int hc3ViolationCount = 0;
for (ExamAssignment assignment : assignments) {
    String examDate = assignment.getExamDate();
    if (examDate == null) continue;
    
    DutySchedule dutySchedule = DutySchedule.forDate(examDate);
    String dayShiftGroup = dutySchedule.getDayShift();
    
    // 检查考官1（非行政班）
    if (assignment.getExaminer1() != null && 
        !isAdminTeacher(assignment.getExaminer1()) &&
        dayShiftGroup.equals(assignment.getExaminer1().getGroup())) {
        hc3ViolationCount++;
        LOGGER.severe("🚨 [HC3违反] 考官1 " + assignment.getExaminer1().getName() + 
            " 在白班执勤日被安排考试: " + examDate);
    }
    
    // 同样检查考官2和备份考官...
}
```

### 4. 添加HC6验证（连续两天考试）

```java
// ✅ HC6验证：考生需要在连续两天完成考试
int hc6ViolationCount = 0;
Map<Student, List<ExamAssignment>> studentAssignments = assignments.stream()
    .filter(a -> a.getStudent() != null)
    .collect(Collectors.groupingBy(ExamAssignment::getStudent));

for (Map.Entry<Student, List<ExamAssignment>> entry : studentAssignments.entrySet()) {
    List<ExamAssignment> studentExams = entry.getValue();
    if (studentExams.size() == 2) {
        try {
            LocalDate day1 = LocalDate.parse(studentExams.get(0).getExamDate());
            LocalDate day2 = LocalDate.parse(studentExams.get(1).getExamDate());
            long daysBetween = ChronoUnit.DAYS.between(day1, day2);
            
            if (Math.abs(daysBetween) != 1) {
                hc6ViolationCount++;
                LOGGER.severe("🚨 [HC6违反] 学员 " + entry.getKey().getName() + 
                    " 两天考试不连续: " + day1 + " 和 " + day2 + " (间隔" + Math.abs(daysBetween) + "天)");
            }
        } catch (Exception e) {
            LOGGER.warning("⚠️ [HC6验证] 日期解析失败");
        }
    }
}
```

### 5. 添加HC7验证（两名不同科室考官）

```java
// ✅ HC7验证：必须有考官1和考官2两名考官，且不能同科室
int hc7ViolationCount = 0;
for (ExamAssignment assignment : assignments) {
    if (assignment.getExaminer1() == null || assignment.getExaminer2() == null) {
        hc7ViolationCount++;
        LOGGER.severe("🚨 [HC7违反] 缺少考官: " + 
            (assignment.getStudent() != null ? assignment.getStudent().getName() : "未知"));
        continue;
    }
    
    String examiner1Dept = normalizeDepartment(assignment.getExaminer1().getDepartment());
    String examiner2Dept = normalizeDepartment(assignment.getExaminer2().getDepartment());
    
    if (examiner1Dept.equals(examiner2Dept)) {
        hc7ViolationCount++;
        LOGGER.severe("🚨 [HC7违反] 两名考官同科室: " + 
            assignment.getExaminer1().getName() + "(" + examiner1Dept + ") 和 " +
            assignment.getExaminer2().getName() + "(" + examiner2Dept + ")");
    }
}
```

### 6. 添加HC8验证（备份考官不重复）

```java
// ✅ HC8验证：备份考官不能与考官1和考官2是同一人
int hc8ViolationCount = 0;
for (ExamAssignment assignment : assignments) {
    if (assignment.getBackupExaminer() == null) continue;
    
    String backupId = assignment.getBackupExaminer().getId();
    
    if (assignment.getExaminer1() != null && 
        backupId.equals(assignment.getExaminer1().getId())) {
        hc8ViolationCount++;
        LOGGER.severe("🚨 [HC8违反] 备份考官与考官1是同一人: " + 
            assignment.getBackupExaminer().getName());
    }
    
    if (assignment.getExaminer2() != null && 
        backupId.equals(assignment.getExaminer2().getId())) {
        hc8ViolationCount++;
        LOGGER.severe("🚨 [HC8违反] 备份考官与考官2是同一人: " + 
            assignment.getBackupExaminer().getName());
    }
}
```

---

## 🔧 集成到buildScheduleResponse

**在`buildScheduleResponse`方法中，整合所有验证**：

```java
public ScheduleResponse buildScheduleResponse(ExamSchedule solution) {
    ScheduleResponse response = new ScheduleResponse();
    response.setSuccess(true);
    response.setScore(solution.getScore());
    
    List<ExamAssignment> assignments = solution.getExamAssignments();
    
    // ... 现有去重和修复代码 ...
    
    // ✅ 全面硬约束验证
    LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    LOGGER.info("🔍 [全面约束验证] 开始验证所有硬约束...");
    
    int hc1Violations = validateHC1(assignments);
    int hc2Violations = validateHC2(assignments);  // 已存在
    int hc3Violations = validateHC3(assignments, solution.getTeachers());
    int hc4Violations = validateHC4(assignments);  // 已存在
    int hc6Violations = validateHC6(assignments);
    int hc7Violations = validateHC7(assignments);
    int hc8Violations = validateHC8(assignments);
    int hc9Violations = validateHC9(assignments);
    
    int totalHardViolations = hc1Violations + hc2Violations + hc3Violations + 
                              hc4Violations + hc6Violations + hc7Violations + 
                              hc8Violations + hc9Violations;
    
    LOGGER.info("📊 [约束验证结果] 总违反数: " + totalHardViolations);
    LOGGER.info("   HC1(节假日): " + hc1Violations);
    LOGGER.info("   HC2(科室): " + hc2Violations);
    LOGGER.info("   HC3(白班): " + hc3Violations);
    LOGGER.info("   HC4(重复): " + hc4Violations);
    LOGGER.info("   HC6(连续): " + hc6Violations);
    LOGGER.info("   HC7(两名考官): " + hc7Violations);
    LOGGER.info("   HC8(备份不重复): " + hc8Violations);
    LOGGER.info("   HC9(不可用期): " + hc9Violations);
    LOGGER.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // 如果有硬约束违反，标记为不成功
    if (totalHardViolations > 0) {
        response.setSuccess(false);
        LOGGER.severe("🚨🚨🚨 [约束验证失败] 发现 " + totalHardViolations + " 个硬约束违反！");
    }
    
    // ... 现有统计和响应构建代码 ...
    
    // 在message中包含约束违反信息
    if (totalHardViolations > 0) {
        response.setMessage("排班完成，但存在 " + totalHardViolations + " 个硬约束违反，请检查结果");
    }
    
    return response;
}
```

---

## 📊 验证效果检查

### 编译测试
```bash
cd optaplanner-service
mvn clean compile -q
```

### 运行时检查
在日志中搜索以下关键词确认验证生效：
```
🔍 [全面约束验证]
📊 [约束验证结果]
🚨 [HC1违反]
🚨 [HC3违反]
...
```

---

## ⏱️ 时间估计

| 任务 | 预计时间 | 优先级 |
|------|----------|--------|
| HC1验证 | 30分钟 | P0 |
| HC9验证 | 30分钟 | P0 |
| HC3验证 | 45分钟 | P1 |
| HC6验证 | 45分钟 | P1 |
| HC7验证 | 30分钟 | P1 |
| HC8验证 | 30分钟 | P1 |
| 集成测试 | 60分钟 | P1 |
| **总计** | **约4.5小时** | - |

---

## 🎯 预期结果

实施后，日志输出示例：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [全面约束验证] 开始验证所有硬约束...
📊 [约束验证结果] 总违反数: 0
   HC1(节假日): 0
   HC2(科室): 0
   HC3(白班): 0
   HC4(重复): 0
   HC6(连续): 0
   HC7(两名考官): 0
   HC8(备份不重复): 0
   HC9(不可用期): 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [约束验证通过] 所有硬约束都已满足
```

---

## ⚠️ 注意事项

1. **holidayConfig注入**：确保ExamScheduleService中有HolidayConfig的注入
2. **方法提取**：建议将每个约束验证提取为独立方法，提高可维护性
3. **性能考虑**：验证循环可能耗时，对于大批量数据考虑优化
4. **日志级别**：生产环境建议将详细日志改为DEBUG级别

---

**建议立即开始实施P0级别的HC1和HC9验证，这两个约束的违反后果最严重。**
