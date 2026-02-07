# 人工修改窗口优化 - 执行建议清单

## 核心发现

经过详细分析，人工修改功能的**数据模型设计优秀**，但**API层存在关键缺口**，影响前端交互体验。

---

## 🔴 立即修复（关键缺口）

### 1. 添加实时冲突检测API

**问题：** 前端无法在用户选择新考官时立即获知冲突

**解决方案：**

```java
// 在 LearningResource.java 中添加

@POST
@Path("/check-conflicts")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public Response checkConflicts(ConflictCheckRequest request) {
    try {
        List<ConflictDTO> conflicts = new ArrayList<>();
        
        // 1. 检查硬约束冲突
        conflicts.addAll(checkHardConstraintViolations(request));
        
        // 2. 检查软约束冲突
        conflicts.addAll(checkSoftConstraintViolations(request));
        
        // 3. 检查时间冲突
        conflicts.addAll(checkTimeConflicts(request));
        
        return Response.ok(Map.of(
            "hasConflicts", !conflicts.isEmpty(),
            "conflicts", conflicts,
            "severity", calculateSeverity(conflicts)
        )).build();
        
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(Map.of("error", e.getMessage()))
            .build();
    }
}
```

**前端调用时机：**
- 用户选择新考官后
- 用户点击"确认修改"前
- 实时显示冲突警告

---

### 2. 添加推荐考官API

**问题：** 前端无法显示"智能推荐"列表

**解决方案：**

```java
// 在 LearningResource.java 中添加

@GET
@Path("/recommendations")
@Produces(MediaType.APPLICATION_JSON)
public Response getRecommendations(
    @QueryParam("studentName") String studentName,
    @QueryParam("fieldName") String fieldName,
    @QueryParam("examDate") String examDate,
    @QueryParam("department") String department
) {
    try {
        List<Map<String, Object>> recommendations = new ArrayList<>();
        
        // 1. 基于历史修改数据计算推荐
        List<ManualEditLog> history = ManualEditLog.find(
            "studentName = ?1 AND fieldName = ?2 ORDER BY editedAt DESC",
            studentName, fieldName
        ).list();
        
        // 2. 统计最常选择的考官
        Map<String, Long> teacherFrequency = history.stream()
            .filter(log -> log.newValue != null)
            .collect(Collectors.groupingBy(
                log -> log.newValue,
                Collectors.counting()
            ));
        
        // 3. 构建推荐列表
        teacherFrequency.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(5)
            .forEach(entry -> {
                Map<String, Object> rec = new HashMap<>();
                rec.put("teacherName", entry.getKey());
                rec.put("score", entry.getValue() * 10); // 简单评分
                rec.put("reason", "基于历史修改记录");
                recommendations.add(rec);
            });
        
        return Response.ok(Map.of(
            "recommendations", recommendations,
            "total", recommendations.size()
        )).build();
        
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(Map.of("error", e.getMessage()))
            .build();
    }
}
```

**前端调用时机：**
- 打开人工修改窗口时
- 显示推荐考官列表供用户选择

---

### 3. 增强输入验证

**当前问题：** 日期解析失败时静默处理

**修复方案：**

```java
// 修改 LearningResource.recordManualEdit() 方法

@POST
@Path("/manual-edit")
@Transactional
public Response recordManualEdit(ManualEditLogDTO dto) {
    try {
        // 验证必填字段
        List<String> errors = validateManualEditDTO(dto);
        if (!errors.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of(
                    "success", false,
                    "errors", errors
                ))
                .build();
        }
        
        // 原有保存逻辑...
        
    } catch (Exception e) {
        // 异常处理...
    }
}

private List<String> validateManualEditDTO(ManualEditLogDTO dto) {
    List<String> errors = new ArrayList<>();
    
    if (dto.context == null) {
        errors.add("上下文信息不能为空");
    } else {
        if (isBlank(dto.context.studentName)) {
            errors.add("学员姓名不能为空");
        }
        if (isBlank(dto.context.fieldName)) {
            errors.add("字段名不能为空");
        }
        // 验证fieldName格式
        if (dto.context.fieldName != null && 
            !dto.context.fieldName.matches("^(examiner1_[12]|examiner2_[12]|backup[12])$")) {
            errors.add("字段名格式不正确");
        }
    }
    
    if (dto.selected == null || isBlank(dto.selected.value)) {
        errors.add("选择的考官不能为空");
    }
    
    return errors;
}
```

---

## 🟡 中期优化（用户体验）

### 4. 添加修改撤销功能

```java
@POST
@Path("/manual-edit/{id}/revert")
@Transactional
public Response revertManualEdit(@PathParam("id") Long id) {
    ManualEditLog log = ManualEditLog.findById(id);
    if (log == null) {
        return Response.status(Response.Status.NOT_FOUND)
            .entity(Map.of("error", "修改记录不存在"))
            .build();
    }
    
    // 创建撤销记录
    ManualEditLog revertLog = new ManualEditLog();
    revertLog.studentName = log.studentName;
    revertLog.originalValue = log.newValue;
    revertLog.newValue = log.originalValue;
    revertLog.reasonCategory = "撤销修改";
    revertLog.reasonDetail = "撤销ID为" + id + "的修改";
    revertLog.persist();
    
    return Response.ok(Map.of(
        "success", true,
        "revertId", revertLog.id
    )).build();
}
```

### 5. 批量修改支持

```java
@POST
@Path("/manual-edit/batch")
@Transactional
public Response recordBatchManualEdit(List<ManualEditLogDTO> dtos) {
    List<Long> ids = new ArrayList<>();
    
    for (ManualEditLogDTO dto : dtos) {
        // 验证并保存每个DTO
        // 收集所有ID
    }
    
    return Response.ok(Map.of(
        "success", true,
        "count", ids.size(),
        "ids", ids
    )).build();
}
```

---

## 🟢 长期规划（功能增强）

### 6. 与排班快照集成

在 `ScheduleSnapshot` 中添加：

```java
@Entity
public class ScheduleSnapshot extends PanacheEntity {
    // ... 现有字段 ...
    
    @Column(name = "edit_version")
    public Integer editVersion = 0;
    
    public void incrementVersion() {
        this.editVersion = (this.editVersion == null ? 0 : this.editVersion) + 1;
    }
}
```

在 `ManualEditLog` 中添加：

```java
@Entity
public class ManualEditLog extends PanacheEntity {
    // ... 现有字段 ...
    
    @Column(name = "snapshot_id")
    public Long snapshotId;
    
    @Column(name = "version_after_edit")
    public Integer versionAfterEdit;
}
```

### 7. 添加DTO类

```java
public class ConflictCheckRequest {
    public String studentName;
    public String examDate;
    public String fieldName;
    public String newValue;
    public String originalValue;
}
```

---

## 前端配合建议

### 修改窗口UI设计建议

```
┌─────────────────────────────────────────────┐
│  人工修改 - 张三 - Day1考官1                   │
├─────────────────────────────────────────────┤
│                                              │
│  当前值: 李考官                               │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │ 智能推荐 (基于历史数据)              │    │
│  │  1. 王考官 ⭐ 90分 - 最常被选择      │    │
│  │  2. 赵考官   75分 - 专业匹配         │    │
│  │  3. 刘考官   60分 - 时间可用         │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  选择新考官: [下拉选择框 ▼]                  │
│                                              │
│  ⚠️ 警告: 该考官当天已安排其他考试          │
│     [查看冲突详情]                          │
│                                              │
│  修改原因:                                   │
│  ○ 专业匹配度  ○ 时间冲突  ○ 其他          │
│  [详细说明文本框]                            │
│                                              │
│  [取消]                    [确认修改]       │
└─────────────────────────────────────────────┘
```

### 前端代码结构建议

```typescript
// api/learning.ts
export const learningApi = {
  // 获取推荐考官
  getRecommendations: (params: {
    studentName: string;
    fieldName: string;
    examDate: string;
  }) => api.get('/api/learning/recommendations', { params }),
  
  // 检查冲突
  checkConflicts: (data: ConflictCheckRequest) => 
    api.post('/api/learning/check-conflicts', data),
  
  // 提交修改
  recordManualEdit: (data: ManualEditLogDTO) =>
    api.post('/api/learning/manual-edit', data),
  
  // 撤销修改
  revertEdit: (id: number) =>
    api.post(`/api/learning/manual-edit/${id}/revert`),
};
```

---

## 优先级与时间估计

| 任务 | 优先级 | 预计时间 | 影响 |
|------|--------|----------|------|
| 实时冲突检测API | P0 | 4小时 | 高 |
| 推荐考官API | P0 | 3小时 | 高 |
| 增强输入验证 | P1 | 2小时 | 中 |
| 撤销功能 | P1 | 3小时 | 中 |
| 批量修改 | P2 | 4小时 | 低 |
| 快照集成 | P2 | 6小时 | 低 |

**总计：约22小时开发时间**

---

## 测试建议

### 单元测试

```java
@Test
public void testCheckConflicts() {
    ConflictCheckRequest request = new ConflictCheckRequest();
    request.studentName = "张三";
    request.examDate = "2025-03-15";
    request.fieldName = "examiner1_1";
    request.newValue = "王考官";
    
    Response response = learningResource.checkConflicts(request);
    
    assertEquals(200, response.getStatus());
    Map<String, Object> result = (Map) response.getEntity();
    assertNotNull(result.get("conflicts"));
}
```

### 集成测试

1. 完整修改流程测试
2. 冲突检测准确性测试
3. 推荐算法效果测试
4. 撤销功能测试

---

**建议立即开始实施前3项（高优先级），以提升用户体验。**
