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
     * 记录人工修改
     */
    @POST
    @Path("/manual-edit")
    @Transactional
    public Response recordManualEdit(ManualEditLogDTO dto) {
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
                    try {
                        // 🔧 修复：支持多种日期格式
                        log.examDate = parseFlexibleDate(dto.context.examDate);
                    } catch (Exception e) {
                        // 如果日期格式无法解析，记录警告但不阻塞整个操作
                        System.err.println("⚠️ 无法解析日期格式: " + dto.context.examDate + ", 错误: " + e.getMessage());
                        log.examDate = null;
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
}

