package com.examiner.service;

import com.examiner.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 约束违规报告服务
 * 提供约束违规报告生成、修复建议和交互式修复功能的业务逻辑
 */
@ApplicationScoped
public class ConstraintViolationReportService {

    private static final Logger logger = LoggerFactory.getLogger(ConstraintViolationReportService.class);
    
    // 模拟数据存储
    private final Map<String, ConstraintViolationReportDto> reportCache = new HashMap<>();
    private final Map<String, ViolationDetailDto> violationCache = new HashMap<>();
    private final Map<String, List<RepairSuggestionDto>> suggestionCache = new HashMap<>();

    /**
     * 生成约束违规报告
     */
    public ConstraintViolationReportDto generateReport(String scheduleId) {
        logger.info("生成约束违规报告，scheduleId: {}", scheduleId);
        
        try {
            // 模拟生成报告数据
            ConstraintViolationReportDto report = new ConstraintViolationReportDto();
            report.setScheduleId(scheduleId);
            report.setGeneratedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            report.setOverallScore(-150); // 模拟分数
            
            // 生成硬约束违规
            List<ViolationDetailDto> hardViolations = generateMockHardViolations(scheduleId);
            report.setHardConstraintViolations(hardViolations);
            
            // 生成软约束违规
            List<ViolationDetailDto> softViolations = generateMockSoftViolations(scheduleId);
            report.setSoftConstraintViolations(softViolations);
            
            // 生成统计信息
            ViolationStatisticsDto statistics = generateStatistics(hardViolations, softViolations);
            report.setStatistics(statistics);
            
            // 生成修复建议
            List<RepairSuggestionDto> suggestions = generateRepairSuggestions(hardViolations, softViolations);
            report.setRepairSuggestions(suggestions);
            
            // 缓存报告
            reportCache.put(scheduleId, report);
            
            // 缓存违规详情
            hardViolations.forEach(v -> violationCache.put(v.getId(), v));
            softViolations.forEach(v -> violationCache.put(v.getId(), v));
            
            logger.info("约束违规报告生成完成，硬约束违规: {}, 软约束违规: {}", 
                       hardViolations.size(), softViolations.size());
            
            return report;
        } catch (Exception e) {
            logger.error("生成约束违规报告失败", e);
            throw new RuntimeException("Failed to generate constraint violation report", e);
        }
    }

    /**
     * 获取现有报告
     */
    public ConstraintViolationReportDto getReport(String scheduleId) {
        logger.info("获取约束违规报告，scheduleId: {}", scheduleId);
        return reportCache.get(scheduleId);
    }

    /**
     * 获取违规详情
     */
    public ViolationDetailDto getViolationDetail(String violationId) {
        logger.info("获取违规详情，violationId: {}", violationId);
        return violationCache.get(violationId);
    }

    /**
     * 获取修复建议
     */
    public List<RepairSuggestionDto> getRepairSuggestions(String violationId) {
        logger.info("获取修复建议，violationId: {}", violationId);
        
        // 如果缓存中有建议，直接返回
        if (suggestionCache.containsKey(violationId)) {
            return suggestionCache.get(violationId);
        }
        
        // 生成修复建议
        ViolationDetailDto violation = violationCache.get(violationId);
        if (violation == null) {
            return Collections.emptyList();
        }
        
        List<RepairSuggestionDto> suggestions = generateRepairSuggestionsForViolation(violation);
        suggestionCache.put(violationId, suggestions);
        
        return suggestions;
    }

    /**
     * 应用自动修复
     */
    public RepairResultDto applyAutoRepair(String violationId) {
        logger.info("应用自动修复，violationId: {}", violationId);
        
        RepairResultDto result = new RepairResultDto();
        result.setSuccess(true);
        result.setMessage("自动修复已成功应用");
        result.setAffectedViolations(Arrays.asList(violationId));
        result.setUpdatedScore(-120); // 模拟修复后的分数
        
        return result;
    }

    /**
     * 应用修复建议
     */
    public RepairResultDto applySuggestion(String suggestionId, Map<String, Object> parameters) {
        logger.info("应用修复建议，suggestionId: {}, parameters: {}", suggestionId, parameters);
        
        RepairResultDto result = new RepairResultDto();
        result.setSuccess(true);
        result.setMessage("修复建议已成功应用");
        result.setAffectedViolations(Arrays.asList("violation-1", "violation-2"));
        result.setUpdatedScore(-100); // 模拟修复后的分数
        
        return result;
    }

    /**
     * 提交手动修复方案
     */
    public RepairResultDto submitManualRepair(ManualRepairRequestDto request) {
        logger.info("提交手动修复方案，violationId: {}", request.getViolationId());
        
        RepairResultDto result = new RepairResultDto();
        result.setSuccess(true);
        result.setMessage("手动修复方案已成功提交");
        result.setAffectedViolations(Arrays.asList(request.getViolationId()));
        result.setUpdatedScore(-80); // 模拟修复后的分数
        
        return result;
    }

    /**
     * 验证修复结果
     */
    public ConstraintViolationReportDto validateRepairResult(String scheduleId) {
        logger.info("验证修复结果，scheduleId: {}", scheduleId);
        
        // 重新生成报告以验证修复结果
        return generateReport(scheduleId);
    }

    /**
     * 导出报告
     */
    public byte[] exportReport(String scheduleId, String format) {
        logger.info("导出报告，scheduleId: {}, format: {}", scheduleId, format);
        
        ConstraintViolationReportDto report = reportCache.get(scheduleId);
        if (report == null) {
            throw new RuntimeException("Report not found for scheduleId: " + scheduleId);
        }
        
        // 模拟导出不同格式的报告
        String content = "Constraint Violation Report for " + scheduleId + " in " + format + " format";
        return content.getBytes();
    }

    /**
     * 获取约束统计信息
     */
    public ViolationStatisticsDto getConstraintStatistics(String scheduleId) {
        logger.info("获取约束统计信息，scheduleId: {}", scheduleId);
        
        ConstraintViolationReportDto report = reportCache.get(scheduleId);
        if (report != null) {
            return report.getStatistics();
        }
        
        // 返回默认统计信息
        ViolationStatisticsDto statistics = new ViolationStatisticsDto();
        statistics.setTotalViolations(0);
        statistics.setHardConstraintViolations(0);
        statistics.setSoftConstraintViolations(0);
        statistics.setCriticalCount(0);
        statistics.setHighCount(0);
        statistics.setMediumCount(0);
        statistics.setLowCount(0);
        statistics.setConstraintViolationCounts(new HashMap<>());
        
        return statistics;
    }

    /**
     * 预览修复效果
     */
    public Map<String, Object> previewRepair(String violationId, String suggestionId) {
        logger.info("预览修复效果，violationId: {}, suggestionId: {}", violationId, suggestionId);
        
        Map<String, Object> preview = new HashMap<>();
        
        // 模拟预览报告
        ConstraintViolationReportDto previewReport = new ConstraintViolationReportDto();
        previewReport.setScheduleId("preview-" + violationId);
        previewReport.setGeneratedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        previewReport.setOverallScore(-50); // 模拟修复后的分数
        
        preview.put("previewReport", previewReport);
        
        // 模拟变更列表
        List<Map<String, String>> changes = Arrays.asList(
            Map.of("type", "REMOVE", "entity", "Violation", "description", "移除约束违规: " + violationId),
            Map.of("type", "MODIFY", "entity", "Schedule", "description", "更新排班安排")
        );
        preview.put("changes", changes);
        
        return preview;
    }

    /**
     * 获取修复建议的详细参数
     */
    public Map<String, Object> getSuggestionParameters(String suggestionId) {
        logger.info("获取修复建议参数，suggestionId: {}", suggestionId);
        
        Map<String, Object> result = new HashMap<>();
        
        // 模拟参数列表
        List<Map<String, Object>> parameters = Arrays.asList(
            Map.of(
                "name", "priority",
                "type", "string",
                "description", "修复优先级",
                "required", true,
                "options", Arrays.asList("HIGH", "MEDIUM", "LOW")
            ),
            Map.of(
                "name", "autoApply",
                "type", "boolean",
                "description", "是否自动应用修复",
                "required", false,
                "defaultValue", false
            )
        );
        
        result.put("parameters", parameters);
        return result;
    }

    /**
     * 搜索类似违规
     */
    public List<ViolationDetailDto> searchSimilarViolations(String violationId) {
        logger.info("搜索类似违规，violationId: {}", violationId);
        
        ViolationDetailDto targetViolation = violationCache.get(violationId);
        if (targetViolation == null) {
            return Collections.emptyList();
        }
        
        // 查找相同约束类型的违规
        return violationCache.values().stream()
                .filter(v -> !v.getId().equals(violationId))
                .filter(v -> v.getConstraintName().equals(targetViolation.getConstraintName()))
                .limit(5)
                .collect(Collectors.toList());
    }

    /**
     * 获取约束违规趋势
     */
    public Map<String, Object> getViolationTrends(String scheduleId, String timeRange) {
        logger.info("获取约束违规趋势，scheduleId: {}, timeRange: {}", scheduleId, timeRange);
        
        Map<String, Object> result = new HashMap<>();
        
        // 模拟趋势数据
        List<Map<String, Object>> trends = Arrays.asList(
            Map.of("date", "2024-01-01", "totalViolations", 15, "hardViolations", 5, "softViolations", 10, "score", -150),
            Map.of("date", "2024-01-02", "totalViolations", 12, "hardViolations", 3, "softViolations", 9, "score", -120),
            Map.of("date", "2024-01-03", "totalViolations", 8, "hardViolations", 2, "softViolations", 6, "score", -80)
        );
        
        Map<String, Object> summary = Map.of(
            "averageScore", -116.67,
            "improvementRate", 0.47,
            "mostCommonViolationType", "考官时间冲突"
        );
        
        result.put("trends", trends);
        result.put("summary", summary);
        
        return result;
    }

    /**
     * 生成修复报告
     */
    public Map<String, Object> generateRepairReport(String scheduleId) {
        logger.info("生成修复报告，scheduleId: {}", scheduleId);
        
        Map<String, Object> result = new HashMap<>();
        
        result.put("reportId", "repair-" + scheduleId + "-" + System.currentTimeMillis());
        
        Map<String, Object> summary = Map.of(
            "totalRepairs", 10,
            "successfulRepairs", 8,
            "failedRepairs", 2,
            "scoreImprovement", 70
        );
        result.put("summary", summary);
        
        // 模拟修复详情
        List<RepairResultDto> details = Arrays.asList(
            createMockRepairResult(true, "自动修复考官时间冲突", Arrays.asList("violation-1")),
            createMockRepairResult(true, "调整考场分配", Arrays.asList("violation-2", "violation-3")),
            createMockRepairResult(false, "无法解决资源不足问题", Arrays.asList("violation-4"))
        );
        result.put("details", details);
        
        return result;
    }

    // 私有辅助方法

    private List<ViolationDetailDto> generateMockHardViolations(String scheduleId) {
        List<ViolationDetailDto> violations = new ArrayList<>();
        
        ViolationDetailDto violation1 = new ViolationDetailDto();
        violation1.setId("hard-violation-1");
        violation1.setConstraintType("HARD");
        violation1.setConstraintName("考官时间冲突");
        violation1.setViolationType("TIME_CONFLICT");
        violation1.setSeverity("CRITICAL");
        violation1.setMessage("考官张三在同一时间段被分配到多个考试");
        violation1.setAffectedEntity("Teacher");
        violation1.setEntityId("teacher-001");
        violation1.setDetails(Map.of("teacherName", "张三", "conflictTime", "09:00-11:00", "examCount", 2));
        violations.add(violation1);
        
        ViolationDetailDto violation2 = new ViolationDetailDto();
        violation2.setId("hard-violation-2");
        violation2.setConstraintType("HARD");
        violation2.setConstraintName("考场容量超限");
        violation2.setViolationType("CAPACITY_EXCEEDED");
        violation2.setSeverity("HIGH");
        violation2.setMessage("考场A101容量不足，当前分配学生数超过最大容量");
        violation2.setAffectedEntity("Room");
        violation2.setEntityId("room-A101");
        violation2.setDetails(Map.of("roomName", "A101", "capacity", 30, "assignedStudents", 35));
        violations.add(violation2);
        
        return violations;
    }

    private List<ViolationDetailDto> generateMockSoftViolations(String scheduleId) {
        List<ViolationDetailDto> violations = new ArrayList<>();
        
        ViolationDetailDto violation1 = new ViolationDetailDto();
        violation1.setId("soft-violation-1");
        violation1.setConstraintType("SOFT");
        violation1.setConstraintName("考官工作负荷不均");
        violation1.setViolationType("WORKLOAD_IMBALANCE");
        violation1.setSeverity("MEDIUM");
        violation1.setMessage("考官李四的工作负荷过重");
        violation1.setAffectedEntity("Teacher");
        violation1.setEntityId("teacher-002");
        violation1.setDetails(Map.of("teacherName", "李四", "assignedHours", 25, "recommendedHours", 20));
        violations.add(violation1);
        
        return violations;
    }

    private ViolationStatisticsDto generateStatistics(List<ViolationDetailDto> hardViolations, 
                                                     List<ViolationDetailDto> softViolations) {
        ViolationStatisticsDto statistics = new ViolationStatisticsDto();
        
        statistics.setTotalViolations(hardViolations.size() + softViolations.size());
        statistics.setHardConstraintViolations(hardViolations.size());
        statistics.setSoftConstraintViolations(softViolations.size());
        
        // 统计严重程度
        long criticalCount = Stream.concat(hardViolations.stream(), softViolations.stream())
                .filter(v -> "CRITICAL".equals(v.getSeverity()))
                .count();
        long highCount = Stream.concat(hardViolations.stream(), softViolations.stream())
                .filter(v -> "HIGH".equals(v.getSeverity()))
                .count();
        long mediumCount = Stream.concat(hardViolations.stream(), softViolations.stream())
                .filter(v -> "MEDIUM".equals(v.getSeverity()))
                .count();
        long lowCount = Stream.concat(hardViolations.stream(), softViolations.stream())
                .filter(v -> "LOW".equals(v.getSeverity()))
                .count();
        
        statistics.setCriticalCount((int) criticalCount);
        statistics.setHighCount((int) highCount);
        statistics.setMediumCount((int) mediumCount);
        statistics.setLowCount((int) lowCount);
        
        // 统计约束违规数量
        Map<String, Integer> constraintCounts = Stream.concat(hardViolations.stream(), softViolations.stream())
                .collect(Collectors.groupingBy(
                    ViolationDetailDto::getConstraintName,
                    Collectors.collectingAndThen(Collectors.counting(), Math::toIntExact)
                ));
        statistics.setConstraintViolationCounts(constraintCounts);
        
        return statistics;
    }

    private List<RepairSuggestionDto> generateRepairSuggestions(List<ViolationDetailDto> hardViolations,
                                                               List<ViolationDetailDto> softViolations) {
        List<RepairSuggestionDto> suggestions = new ArrayList<>();
        
        for (ViolationDetailDto violation : hardViolations) {
            suggestions.addAll(generateRepairSuggestionsForViolation(violation));
        }
        
        for (ViolationDetailDto violation : softViolations) {
            suggestions.addAll(generateRepairSuggestionsForViolation(violation));
        }
        
        return suggestions;
    }

    private List<RepairSuggestionDto> generateRepairSuggestionsForViolation(ViolationDetailDto violation) {
        List<RepairSuggestionDto> suggestions = new ArrayList<>();
        
        RepairSuggestionDto suggestion = new RepairSuggestionDto();
        suggestion.setId("suggestion-" + violation.getId());
        suggestion.setViolationId(violation.getId());
        suggestion.setConstraintType(violation.getConstraintType());
        suggestion.setPriority(violation.getSeverity());
        suggestion.setTitle("自动修复建议");
        suggestion.setDescription("系统建议的自动修复方案");
        suggestion.setRepairType("AUTO");
        suggestion.setActions(Arrays.asList("重新分配资源", "调整时间安排"));
        suggestion.setEstimatedEffort("MEDIUM");
        
        suggestions.add(suggestion);
        
        return suggestions;
    }

    private RepairResultDto createMockRepairResult(boolean success, String message, List<String> affectedViolations) {
        RepairResultDto result = new RepairResultDto();
        result.setSuccess(success);
        result.setMessage(message);
        result.setAffectedViolations(affectedViolations);
        result.setUpdatedScore(success ? -50 : -150);
        return result;
    }
}