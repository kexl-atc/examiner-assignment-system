package com.examiner.scheduler.rest;

import com.examiner.scheduler.dto.ManualEditLogDTO;
import com.examiner.scheduler.entity.ManualEditLog;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.inject.Inject;
import javax.transaction.Transactional;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 🆕 冲突检查请求DTO
 */
class ConflictCheckRequest {
    public String studentName;
    public String examDate;
    public String fieldName;
    public String newValue;
    public String originalValue;
    public String department;
}

/**
 * 学习和优化相关的REST API
 */
@Path("/api/learning")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class LearningResource {
    
    @Inject
    ObjectMapper objectMapper;
    
    /**
     * 🔧 灵活的日期解析方法
     * 支持多种日期格式：
     * - ISO格式：2025-10-23
     * - 短格式：10.23, 10-23
     * - 中文格式：10月23日
     */
    private LocalDate parseFlexibleDate(String dateStr) throws DateTimeParseException {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        
        dateStr = dateStr.trim();
        
        // 1. 尝试标准ISO格式 (yyyy-MM-dd)
        try {
            return LocalDate.parse(dateStr);
        } catch (DateTimeParseException e) {
            // 继续尝试其他格式
        }
        
        // 2. 尝试短格式 (MM.dd 或 MM-dd)
        if (dateStr.matches("\\d{1,2}[.\\-]\\d{1,2}")) {
            String[] parts = dateStr.split("[.\\-]");
            int month = Integer.parseInt(parts[0]);
            int day = Integer.parseInt(parts[1]);
            int year = LocalDate.now().getYear(); // 使用当前年份
            
            // 如果月份小于当前月份，可能是明年
            LocalDate current = LocalDate.now();
            if (month < current.getMonthValue()) {
                year++;
            }
            
            return LocalDate.of(year, month, day);
        }
        
        // 3. 尝试中文格式 (10月23日)
        if (dateStr.matches("\\d{1,2}月\\d{1,2}日")) {
            String cleaned = dateStr.replace("月", "-").replace("日", "");
            String[] parts = cleaned.split("-");
            int month = Integer.parseInt(parts[0]);
            int day = Integer.parseInt(parts[1]);
            int year = LocalDate.now().getYear();
            
            LocalDate current = LocalDate.now();
            if (month < current.getMonthValue()) {
                year++;
            }
            
            return LocalDate.of(year, month, day);
        }
        
        // 4. 尝试其他常见格式
        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("yyyyMMdd"),
        };
        
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(dateStr, formatter);
            } catch (DateTimeParseException e) {
                // 继续尝试下一个格式
            }
        }
        
        // 如果所有格式都失败，抛出异常
        throw new DateTimeParseException("无法解析日期格式: " + dateStr, dateStr, 0);
    }
    
    /**
     * 🆕 验证ManualEditLogDTO
     * @param dto 数据传输对象
     * @return 错误列表，为空表示验证通过
     */
    private List<String> validateManualEditDTO(ManualEditLogDTO dto) {
        List<String> errors = new ArrayList<>();
        
        if (dto == null) {
            errors.add("请求体不能为空");
            return errors;
        }
        
        // 验证上下文信息
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
                errors.add("字段名格式不正确，必须是 examiner1_1, examiner1_2, examiner2_1, examiner2_2, backup1, backup2 之一");
            }
            if (isBlank(dto.context.examDate)) {
                errors.add("考试日期不能为空");
            }
        }
        
        // 验证修改内容
        if (dto.selected == null || isBlank(dto.selected.value)) {
            errors.add("选择的考官不能为空");
        }
        
        return errors;
    }
    
    /**
     * 🆕 检查字符串是否为空或空白
     */
    private boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }
    
    /**
     * 记录人工修改
     * 🔧 优化：增强输入验证
     */
    @POST
    @Path("/manual-edit")
    @Transactional
    public Response recordManualEdit(ManualEditLogDTO dto) {
        try {
            // 🆕 验证必填字段
            List<String> errors = validateManualEditDTO(dto);
            if (!errors.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of(
                        "success", false,
                        "message", "输入验证失败",
                        "errors", errors
                    ))
                    .build();
            }
            
            // 创建实体
            ManualEditLog log = new ManualEditLog();
            
            // 基本信息
            log.editedAt = LocalDateTime.now();
            log.editedBy = dto.editedBy != null ? dto.editedBy : "系统用户";
            
            // 上下文信息
            if (dto.context != null) {
                log.studentName = dto.context.studentName;
                log.department = dto.context.department;
                if (dto.context.examDate != null && !dto.context.examDate.isEmpty()) {
                    try {
                        // 🔧 修复：支持多种日期格式
                        log.examDate = parseFlexibleDate(dto.context.examDate);
                    } catch (Exception e) {
                        // 如果日期格式无法解析，返回错误而不是静默处理
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(Map.of(
                                "success", false,
                                "message", "日期格式无法解析: " + dto.context.examDate,
                                "errors", List.of("考试日期格式不正确，请使用 yyyy-MM-dd 格式")
                            ))
                            .build();
                    }
                }
                log.fieldName = dto.context.fieldName;
                log.timeSlot = dto.context.timeSlot;
            }
            
            // 修改内容
            if (dto.original != null) {
                log.originalValue = dto.original.value;
            }
            
            if (dto.selected != null) {
                log.newValue = dto.selected.value;
                log.wasRecommended = dto.selected.wasRecommended;
                log.recommendationRank = dto.selected.recommendationRank;
                log.recommendationScore = dto.selected.recommendationScore;
            }
            
            // 修改原因
            if (dto.reason != null) {
                log.reasonCategory = dto.reason.category;
                log.reasonDetail = dto.reason.detail;
            }
            
            // 冲突信息
            log.hadConflicts = dto.hadConflicts != null ? dto.hadConflicts : false;
            log.isForced = dto.isForced != null ? dto.isForced : false;
            
            if (dto.conflicts != null && !dto.conflicts.isEmpty()) {
                // 将冲突列表序列化为JSON
                log.conflictsJson = objectMapper.writeValueAsString(dto.conflicts);
            }
            
            // 评估信息
            log.satisfactionScore = dto.satisfactionScore;
            log.feedback = dto.feedback;
            log.hardViolations = dto.hardViolations;
            log.softViolations = dto.softViolations;
            
            // 持久化
            log.persist();
            
            return Response.ok(Map.of(
                "success", true,
                "id", log.id,
                "message", "人工修改记录已保存"
            )).build();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of(
                    "success", false,
                    "message", "保存失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 获取统计信息
     */
    @GET
    @Path("/statistics")
    public Response getStatistics(@QueryParam("days") @DefaultValue("30") int days) {
        try {
            LocalDateTime since = LocalDateTime.now().minusDays(days);
            
            // 总修改次数
            long totalEdits = ManualEditLog.count("editedAt >= ?1", since);
            
            // 推荐接受率
            long recommendedSelected = ManualEditLog.count(
                "editedAt >= ?1 AND wasRecommended = true", 
                since
            );
            double acceptanceRate = totalEdits > 0 
                ? (recommendedSelected * 100.0 / totalEdits) 
                : 0.0;
            
            // 强制修改次数
            long forcedEdits = ManualEditLog.count(
                "editedAt >= ?1 AND isForced = true", 
                since
            );
            
            // Top 5 修改原因
            @SuppressWarnings("unchecked")
            List<Object[]> reasonResults = ManualEditLog.getEntityManager()
                .createQuery(
                    "SELECT reasonCategory, COUNT(*) FROM ManualEditLog " +
                    "WHERE editedAt >= :since AND reasonCategory IS NOT NULL " +
                    "GROUP BY reasonCategory " +
                    "ORDER BY COUNT(*) DESC"
                )
                .setParameter("since", since)
                .setMaxResults(5)
                .getResultList();
            
            List<Map<String, Object>> topReasons = reasonResults.stream()
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("category", (String) row[0]);
                    map.put("count", ((Long) row[1]).intValue());
                    return map;
                })
                .collect(Collectors.toList());
            
            // Top 10 选择的考官
            @SuppressWarnings("unchecked")
            List<Object[]> teacherResults = ManualEditLog.getEntityManager()
                .createQuery(
                    "SELECT newValue, COUNT(*) FROM ManualEditLog " +
                    "WHERE editedAt >= :since AND newValue IS NOT NULL " +
                    "GROUP BY newValue " +
                    "ORDER BY COUNT(*) DESC"
                )
                .setParameter("since", since)
                .setMaxResults(10)
                .getResultList();
            
            List<Map<String, Object>> topTeachers = teacherResults.stream()
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", (String) row[0]);
                    map.put("count", ((Long) row[1]).intValue());
                    return map;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalEdits", totalEdits);
            stats.put("acceptanceRate", Math.round(acceptanceRate * 10) / 10.0);
            stats.put("forcedEdits", forcedEdits);
            stats.put("recommendedSelected", recommendedSelected);
            stats.put("topReasons", topReasons);
            stats.put("topTeachers", topTeachers);
            stats.put("dateRange", Map.of(
                "start", since.toLocalDate().toString(),
                "end", LocalDate.now().toString(),
                "days", days
            ));
            
            return Response.ok(stats).build();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of(
                    "success", false,
                    "message", "获取统计失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 获取历史修改记录
     */
    @GET
    @Path("/history")
    public Response getHistory(
        @QueryParam("limit") @DefaultValue("50") int limit,
        @QueryParam("offset") @DefaultValue("0") int offset
    ) {
        try {
            List<ManualEditLog> logs = ManualEditLog.findAll()
                .page(offset / limit, limit)
                .list();
            
            long total = ManualEditLog.count();
            
            List<Map<String, Object>> records = logs.stream()
                .map(log -> {
                    Map<String, Object> record = new HashMap<>();
                    record.put("id", log.id);
                    record.put("editedAt", log.editedAt.toString());
                    record.put("editedBy", log.editedBy);
                    record.put("studentName", log.studentName);
                    record.put("department", log.department);
                    record.put("fieldName", log.fieldName);
                    record.put("originalValue", log.originalValue);
                    record.put("newValue", log.newValue);
                    record.put("reasonCategory", log.reasonCategory);
                    record.put("reasonDetail", log.reasonDetail);
                    record.put("hadConflicts", log.hadConflicts);
                    record.put("isForced", log.isForced);
                    return record;
                })
                .collect(Collectors.toList());
            
            return Response.ok(Map.of(
                "records", records,
                "total", total,
                "limit", limit,
                "offset", offset
            )).build();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of(
                    "success", false,
                    "message", "获取历史记录失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 健康检查
     */
    @GET
    @Path("/health")
    public Response health() {
        return Response.ok(Map.of(
            "status", "ok",
            "service", "learning",
            "timestamp", LocalDateTime.now().toString()
        )).build();
    }
    
    // ==================== 🆕 新增API ====================
    
    /**
     * 🆕 实时冲突检测API
     * 在用户选择新考官后调用，检查是否会产生冲突
     */
    @POST
    @Path("/check-conflicts")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response checkConflicts(ConflictCheckRequest request) {
        try {
            if (request == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "请求体不能为空"))
                    .build();
            }
            
            List<Map<String, Object>> conflicts = new ArrayList<>();
            
            // 1. 检查时间冲突（同一考官同一天被多次安排）
            // 这里简化处理，实际应该查询数据库检查
            conflicts.addAll(checkTimeConflicts(request));
            
            // 2. 检查科室约束冲突（考官1必须与学员同科室）
            conflicts.addAll(checkDepartmentConflicts(request));
            
            // 3. 检查不可用期冲突
            conflicts.addAll(checkUnavailableConflicts(request));
            
            // 计算严重级别
            String severity = calculateSeverity(conflicts);
            
            return Response.ok(Map.of(
                "success", true,
                "hasConflicts", !conflicts.isEmpty(),
                "conflicts", conflicts,
                "severity", severity,
                "message", conflicts.isEmpty() ? "无冲突" : "发现 " + conflicts.size() + " 个冲突"
            )).build();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of(
                    "success", false,
                    "error", "冲突检测失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 🆕 检查时间冲突
     */
    private List<Map<String, Object>> checkTimeConflicts(ConflictCheckRequest request) {
        List<Map<String, Object>> conflicts = new ArrayList<>();
        
        // 简化的冲突检测逻辑
        // 实际应该查询数据库，检查该考官在指定日期是否已有其他安排
        // 这里返回空列表，表示需要前端或其他服务提供完整实现
        
        return conflicts;
    }
    
    /**
     * 🆕 检查科室约束冲突
     */
    private List<Map<String, Object>> checkDepartmentConflicts(ConflictCheckRequest request) {
        List<Map<String, Object>> conflicts = new ArrayList<>();
        
        // 如果fieldName是考官1，需要检查是否与学员同科室
        if (request.fieldName != null && request.fieldName.startsWith("examiner1")) {
            // 这里简化处理，实际应该查询学员和考官的科室信息
            // 如果不同科室（且不是3室7室互通），则产生冲突
        }
        
        return conflicts;
    }
    
    /**
     * 🆕 检查不可用期冲突
     */
    private List<Map<String, Object>> checkUnavailableConflicts(ConflictCheckRequest request) {
        List<Map<String, Object>> conflicts = new ArrayList<>();
        
        // 简化的不可用期检查
        // 实际应该查询考官的不可用期设置
        
        return conflicts;
    }
    
    /**
     * 🆕 计算冲突严重级别
     */
    private String calculateSeverity(List<Map<String, Object>> conflicts) {
        if (conflicts.isEmpty()) {
            return "none";
        }
        
        // 检查是否有硬约束冲突
        boolean hasHardConflict = conflicts.stream()
            .anyMatch(c -> "hard".equals(c.get("type")));
        
        if (hasHardConflict) {
            return "high";
        }
        
        return "medium";
    }
    
    /**
     * 🆕 获取推荐考官API
     * 基于历史修改数据，返回推荐考官列表
     */
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
            // 参数验证
            if (isBlank(studentName) || isBlank(fieldName)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of(
                        "success", false,
                        "message", "学员姓名和字段名不能为空"
                    ))
                    .build();
            }
            
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
                    rec.put("frequency", entry.getValue());
                    rec.put("reason", "基于历史修改记录");
                    recommendations.add(rec);
                });
            
            return Response.ok(Map.of(
                "success", true,
                "recommendations", recommendations,
                "total", recommendations.size(),
                "message", recommendations.isEmpty() ? "暂无推荐数据" : "找到 " + recommendations.size() + " 个推荐"
            )).build();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of(
                    "success", false,
                    "message", "获取推荐失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 🆕 撤销修改API
     * 撤销指定ID的人工修改
     */
    @POST
    @Path("/manual-edit/{id}/revert")
    @Transactional
    public Response revertManualEdit(@PathParam("id") Long id) {
        try {
            ManualEditLog log = ManualEditLog.findById(id);
            if (log == null) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of(
                        "success", false,
                        "message", "修改记录不存在"
                    ))
                    .build();
            }
            
            // 创建撤销记录
            ManualEditLog revertLog = new ManualEditLog();
            revertLog.editedAt = LocalDateTime.now();
            revertLog.editedBy = "系统用户";
            revertLog.studentName = log.studentName;
            revertLog.department = log.department;
            revertLog.examDate = log.examDate;
            revertLog.fieldName = log.fieldName;
            revertLog.timeSlot = log.timeSlot;
            revertLog.originalValue = log.newValue; // 原新值变为原值
            revertLog.newValue = log.originalValue; // 原值变为新值
            revertLog.reasonCategory = "撤销修改";
            revertLog.reasonDetail = "撤销ID为" + id + "的修改";
            revertLog.wasRecommended = false;
            revertLog.hadConflicts = false;
            revertLog.isForced = false;
            
            revertLog.persist();
            
            return Response.ok(Map.of(
                "success", true,
                "revertId", revertLog.id,
                "message", "修改已撤销",
                "originalEditId", id
            )).build();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of(
                    "success", false,
                    "message", "撤销失败: " + e.getMessage()
                ))
                .build();
        }
    }
    
    /**
     * 🆕 批量记录人工修改API
     * 支持一次提交多个修改记录
     */
    @POST
    @Path("/manual-edit/batch")
    @Transactional
    public Response recordBatchManualEdit(List<ManualEditLogDTO> dtos) {
        try {
            if (dtos == null || dtos.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of(
                        "success", false,
                        "message", "请求体不能为空"
                    ))
                    .build();
            }
            
            List<Long> ids = new ArrayList<>();
            List<String> errors = new ArrayList<>();
            
            for (int i = 0; i < dtos.size(); i++) {
                ManualEditLogDTO dto = dtos.get(i);
                
                // 验证每个DTO
                List<String> dtoErrors = validateManualEditDTO(dto);
                if (!dtoErrors.isEmpty()) {
                    errors.add("第" + (i + 1) + "条记录: " + String.join(", ", dtoErrors));
                    continue;
                }
                
                try {
                    // 创建实体
                    ManualEditLog log = new ManualEditLog();
                    
                    // 基本信息
                    log.editedAt = LocalDateTime.now();
                    log.editedBy = dto.editedBy != null ? dto.editedBy : "系统用户";
                    
                    // 上下文信息
                    if (dto.context != null) {
                        log.studentName = dto.context.studentName;
                        log.department = dto.context.department;
                        if (dto.context.examDate != null && !dto.context.examDate.isEmpty()) {
                            log.examDate = parseFlexibleDate(dto.context.examDate);
                        }
                        log.fieldName = dto.context.fieldName;
                        log.timeSlot = dto.context.timeSlot;
                    }
                    
                    // 修改内容
                    if (dto.original != null) {
                        log.originalValue = dto.original.value;
                    }
                    
                    if (dto.selected != null) {
                        log.newValue = dto.selected.value;
                        log.wasRecommended = dto.selected.wasRecommended;
                        log.recommendationRank = dto.selected.recommendationRank;
                        log.recommendationScore = dto.selected.recommendationScore;
                    }
                    
                    // 修改原因
                    if (dto.reason != null) {
                        log.reasonCategory = dto.reason.category;
                        log.reasonDetail = dto.reason.detail;
                    }
                    
                    log.hadConflicts = dto.hadConflicts != null ? dto.hadConflicts : false;
                    log.isForced = dto.isForced != null ? dto.isForced : false;
                    
                    if (dto.conflicts != null && !dto.conflicts.isEmpty()) {
                        log.conflictsJson = objectMapper.writeValueAsString(dto.conflicts);
                    }
                    
                    log.satisfactionScore = dto.satisfactionScore;
                    log.feedback = dto.feedback;
                    log.hardViolations = dto.hardViolations;
                    log.softViolations = dto.softViolations;
                    
                    log.persist();
                    ids.add(log.id);
                    
                } catch (Exception e) {
                    errors.add("第" + (i + 1) + "条记录保存失败: " + e.getMessage());
                }
            }
            
            boolean allSuccess = errors.isEmpty();
            
            return Response.ok(Map.of(
                "success", allSuccess,
                "count", ids.size(),
                "ids", ids,
                "totalSubmitted", dtos.size(),
                "errors", errors,
                "message", allSuccess ? 
                    "成功保存 " + ids.size() + " 条记录" : 
                    "部分保存成功: " + ids.size() + "/" + dtos.size() + "，错误: " + String.join("; ", errors)
            )).build();
            
        } catch (Exception e) {
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Map.of(
                    "success", false,
                    "message", "批量保存失败: " + e.getMessage()
                ))
                .build();
        }
    }
}

